/**
 * client/src/services/crypto/blindSignature.js
 *
 * Voter-side RSA Blind Signature operations — runs entirely in the browser.
 *
 * EDUCATIONAL DEMONSTRATION ONLY
 * ================================
 * This implements textbook RSA blind signatures using the Web Crypto API
 * (SubtleCrypto) and native BigInt. It is NOT suitable for production use.
 *
 * Limitations:
 * - Textbook RSA (no OAEP/PSS padding)
 * - No formal cryptographic audit
 * - Browser compromise can undermine all guarantees
 * - Private key operations happen server-side, but client security depends
 *   on a trusted browser and network environment
 *
 * How blind signatures work (simplified):
 * =========================================
 *  1. Voter generates a random token T.
 *  2. Voter computes: m = H("VERIFIVOTE-EDU-V1:" || T)  as a BigInt.
 *  3. Voter picks a random blinding factor r coprime to n.
 *  4. Voter sends:  blindedMsg = m * r^e mod n  to the authority.
 *  5. Authority signs:  blindedSig = blindedMsg^d mod n  and returns it.
 *  6. Voter computes:   sig = blindedSig * r^-1 mod n   (unblinding).
 *  7. sig is a valid RSA signature on T — but the authority never saw T.
 *  8. Voter submits (T, sig, candidateId) anonymously.
 *  9. Server verifies:  sig^e mod n == H("VERIFIVOTE-EDU-V1:" || T).
 */

// ---------------------------------------------------------------------------
// BigInt helpers (mirrors server/services/crypto/blindSignature.js)
// ---------------------------------------------------------------------------

/** Safe positive modulo: ((a % m) + m) % m */
const mod = (a, m) => ((a % m) + m) % m;

/** Euclidean GCD */
const gcd = (a, b) => {
    while (b !== 0n) {
        [a, b] = [b, a % b];
    }
    return a;
};

/** Fast modular exponentiation using square-and-multiply */
const modPow = (base, exponent, modulus) => {
    let result = 1n;
    base = mod(base, modulus);
    while (exponent > 0n) {
        if (exponent & 1n) result = (result * base) % modulus;
        base     = (base * base) % modulus;
        exponent >>= 1n;
    }
    return result;
};

/** Extended Euclidean modular inverse — throws if inverse doesn't exist */
const modInverse = (a, m) => {
    let [oldR, r] = [a, m];
    let [oldS, s] = [1n, 0n];
    while (r !== 0n) {
        const q = oldR / r;
        [oldR, r] = [r, oldR - q * r];
        [oldS, s] = [s, oldS - q * s];
    }
    if (oldR !== 1n) throw new Error("Modular inverse does not exist");
    return mod(oldS, m);
};

// ---------------------------------------------------------------------------
// Hashing (must match server hashToInteger)
// ---------------------------------------------------------------------------

/**
 * Compute SHA-256("VERIFIVOTE-EDU-V1:" || message) and return as BigInt.
 * Uses the domain-separation prefix to match the server's hashToInteger().
 *
 * @param {string} message
 * @returns {Promise<bigint>}
 */
const hashToInteger = async (message) => {
    const enc     = new TextEncoder();
    const prefix  = enc.encode("VERIFIVOTE-EDU-V1:");
    const msgBytes = enc.encode(message);

    const combined = new Uint8Array(prefix.length + msgBytes.length);
    combined.set(prefix, 0);
    combined.set(msgBytes, prefix.length);

    const digest = await crypto.subtle.digest("SHA-256", combined);
    const hex = Array.from(new Uint8Array(digest))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
    return BigInt("0x" + hex);
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically secure random voting token.
 * Uses getRandomValues() — never Math.random().
 *
 * @returns {string} 32-byte hex string
 */
export const generateToken = () => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
};

/**
 * Convert base64url-encoded JWK parameter to BigInt.
 * Used to decode the n and e fields from the server's JWK response.
 *
 * @param {string} b64url  Base64url string (e.g. publicJWK.n)
 * @returns {bigint}
 */
export const jwkParamToBigInt = (b64url) => {
    // atob requires standard base64 (not base64url)
    const base64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64);
    let hex = "";
    for (let i = 0; i < binary.length; i++) {
        hex += binary.charCodeAt(i).toString(16).padStart(2, "0");
    }
    return BigInt("0x" + hex);
};

/**
 * Blind a token using the election authority's RSA public key.
 *
 * Steps:
 *  1. m = H(token)
 *  2. r = random blinding factor coprime to n
 *  3. blindedMessage = (m * r^e) mod n
 *
 * The server sees only blindedMessage — it cannot determine token from it.
 *
 * @param {string} token   - The voter's random token (hex string)
 * @param {bigint} n       - RSA modulus
 * @param {bigint} e       - RSA public exponent
 * @returns {Promise<{ blindedMessage: string, blindingFactor: string }>}
 */
export const blindToken = async (token, n, e) => {
    const m = await hashToInteger(token);

    // Generate r such that 2 <= r < n and gcd(r, n) == 1
    let r;
    do {
        const bytes = new Uint8Array(256);
        crypto.getRandomValues(bytes);
        const hex = Array.from(bytes)
            .map(b => b.toString(16).padStart(2, "0"))
            .join("");
        r = (BigInt("0x" + hex) % (n - 3n)) + 2n;
    } while (gcd(r, n) !== 1n);

    const blindedMessage = mod(m * modPow(r, e, n), n);

    return {
        blindedMessage: blindedMessage.toString(),
        blindingFactor: r.toString()
    };
};

/**
 * Unblind a signature returned by the election authority.
 *
 * sig = blindedSignature * r^-1 mod n
 *
 * @param {string} blindedSignature  - Returned by POST /api/voting/authorize
 * @param {string} blindingFactor    - r used during blinding
 * @param {bigint} n                 - RSA modulus
 * @returns {string}  The valid unblinded signature as decimal string
 */
export const unblindSignature = (blindedSignature, blindingFactor, n) => {
    const sBlind = BigInt(blindedSignature);
    const r      = BigInt(blindingFactor);
    return mod(sBlind * modInverse(r, n), n).toString();
};
