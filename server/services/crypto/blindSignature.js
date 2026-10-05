const crypto = require("crypto");
const { getKeys } = require("./keyManager");

const publicKey = crypto.createPublicKey(getKeys().publicKey);
const privateKey = crypto.createPrivateKey(getKeys().privateKey);

const publicJWK = publicKey.export({ format: "jwk" });
const privateJWK = privateKey.export({ format: "jwk" });

const toBigInt = (value) => {
    return BigInt("0x" + Buffer.from(value, "base64url").toString("hex"));
};

const n = toBigInt(publicJWK.n);
const e = toBigInt(publicJWK.e);
const d = toBigInt(privateJWK.d);

const mod = (a, m) => ((a % m) + m) % m;

const gcd = (a, b) => {
    while (b !== 0n) {
        [a, b] = [b, a % b];
    }
    return a;
};

const modPow = (base, exponent, modulus) => {
    let result = 1n;
    base = mod(base, modulus);

    while (exponent > 0n) {
        if (exponent & 1n) {
            result = (result * base) % modulus;
        }
        base = (base * base) % modulus;
        exponent >>= 1n;
    }
    return result;
};

const modInverse = (a, m) => {
    let [oldR, r] = [a, m];
    let [oldS, s] = [1n, 0n];

    while (r !== 0n) {
        const q = oldR / r;
        [oldR, r] = [r, oldR - q * r];
        [oldS, s] = [s, oldS - q * s];
    }
    if (oldR !== 1n) {
        throw new Error("Modular inverse does not exist");
    }

    return mod(oldS, m);
};

const hashToInteger = (message) => {
    const digest = crypto
        .createHash("sha256")
        .update("VERIFIVOTE-EDU-V1:")
        .update(message)
        .digest("hex");

    return BigInt("0x" + digest);
};

const generateBlindingFactor = () => {
    while (true) {
        const randomBytes = crypto.randomBytes(256);
        const r = BigInt("0x" + randomBytes.toString("hex")) % (n - 3n) + 2n;

        if (gcd(r, n) === 1n) {
            return r;
        }
    }
};

// Voter-side operation
const blindMessage = (message) => {
    const m = hashToInteger(message);
    const r = generateBlindingFactor();

    const blindedMessage = mod(m * modPow(r, e, n), n);

    return {
        blindedMessage: blindedMessage.toString(),
        blindingFactor: r.toString()
    };
};

// Election authority operation
const signBlindedMessage = (blindedMessage) => {
    const blinded = BigInt(blindedMessage);

    if (blinded <= 0n || blinded >= n) {
        throw new Error("Invalid blinded message");
    }
    return modPow(blinded, d, n).toString();
};

// Voter-side operation
const unblindSignature = (blindedSignature, blindingFactor) => {
    const sBlind = BigInt(blindedSignature);
    const r = BigInt(blindingFactor);

    return mod(sBlind * modInverse(r, n), n).toString();
};

// Public verification
const verifySignature = (message, signature) => {
    const m = hashToInteger(message);
    const s = BigInt(signature);

    if (s <= 0n || s >= n) {
        return false;
    }
    return modPow(s, e, n) === m;
};

// Return ONLY the public JWK fields — never expose private key material
const getPublicJWK = () => ({
    kty: publicJWK.kty,
    n:   publicJWK.n,
    e:   publicJWK.e
});

module.exports = {
    blindMessage,
    signBlindedMessage,
    unblindSignature,
    verifySignature,
    getPublicJWK
};