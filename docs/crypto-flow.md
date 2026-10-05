# Crypto Flow — Blind Signature Protocol

## Overview

VerifiVote uses **textbook RSA Blind Signatures** to decouple voter identity from the ballot.

> ⚠️ Educational implementation — not cryptographically audited.

---

## RSA Key Generation

On first startup, `utils/generateKeys.js` generates a 2048-bit RSA key pair using Node.js `crypto.generateKeyPairSync()`.

- Keys stored in `server/keys/rsaKeys.json`
- File permissions: `0o600` (owner read-only)
- **Never committed to Git** (in `.gitignore`)
- Only the public key (`n`, `e`) is ever exposed via API

---

## Algorithm: RSA Blind Signature

### Parameters

| Symbol | Meaning |
|---|---|
| `n` | RSA modulus (2048-bit) |
| `e` | Public exponent (65537) |
| `d` | Private exponent (server only) |
| `T` | Random voting token (32-byte hex) |
| `m` | `SHA256("VERIFIVOTE-EDU-V1:" || T)` as BigInt |
| `r` | Blinding factor: random, coprime to `n` |

### Step-by-Step

```
STEP 1 — Token generation (browser)
  T = getRandomValues(32 bytes).toHex()

STEP 2 — Hash to integer (browser)
  m = BigInt("0x" + SHA256("VERIFIVOTE-EDU-V1:" + T))

STEP 3 — Blinding factor (browser)
  r = random BigInt, 2 ≤ r < n, gcd(r, n) = 1

STEP 4 — Blind message (browser)
  blindedMsg = (m × r^e) mod n

STEP 5 — Authority signs (server) [POST /api/voting/authorize]
  Records Authorization(voterId, electionId) in DB
  blindedSig = blindedMsg^d mod n
  Returns blindedSig to voter
  ← Server never sees T ←

STEP 6 — Unblind signature (browser)
  sig = (blindedSig × r⁻¹) mod n

STEP 7 — Verify locally (browser, optional sanity check)
  sig^e mod n == m  →  true

STEP 8 — Cast vote (browser → server) [POST /api/voting/cast]
  Sends { electionId, candidateId, token: T, signature: sig }
  NO JWT header → anonymous request

STEP 9 — Verify and store (server)
  Recompute m' = SHA256("VERIFIVOTE-EDU-V1:" + T)
  Check: sig^e mod n == m'
  If valid: store Vote(electionId, candidateId, SHA256(T))
  Unique index on (electionId, tokenHash) prevents reuse
```

---

## Why Blindness Works

The authority signs `blindedMsg = m × r^e mod n`.

Because `r^e mod n` acts as a "mask" over `m`, the authority cannot factor out `m` without knowing `r`.

When the voter computes `sig = blindedSig × r⁻¹ mod n`:

```
sig = (blindedMsg^d) × r⁻¹  mod n
    = (m × r^e)^d × r⁻¹     mod n
    = m^d × r^(e×d) × r⁻¹   mod n
    = m^d × r × r⁻¹          mod n  (since r^(e×d) ≡ r mod n by RSA)
    = m^d                     mod n
```

`sig` is a valid RSA signature on `m` — but the authority only ever saw `blindedMsg`, which is uniformly random from the authority's perspective.

---

## Privacy Property Demonstration

```
Authorization collection:
┌─────────────────────────────────────────────┐
│  voterId     │  electionId  │  issuedAt      │
│──────────────┼──────────────┼────────────────│
│  <alice_id>  │  <elec_id>   │  2026-10-05    │
└─────────────────────────────────────────────┘
     ↑ knows WHO was authorized

Vote collection:
┌────────────────────────────────────────────────────┐
│  electionId  │  candidateId  │  tokenHash           │
│──────────────┼───────────────┼──────────────────────│
│  <elec_id>   │  <alice_id>   │  sha256(T)           │
└────────────────────────────────────────────────────┘
     ↑ knows WHAT was voted, but NOT who voted it

No JOIN is possible between these collections.
```

---

## BigInt Operations

All RSA operations use native JavaScript `BigInt` to avoid floating-point precision loss.

Key functions implemented in both `server/services/crypto/blindSignature.js` and `client/src/services/crypto/blindSignature.js`:

| Function | Purpose |
|---|---|
| `mod(a, m)` | Safe positive modulo: `((a % m) + m) % m` |
| `gcd(a, b)` | Euclidean greatest common divisor |
| `modPow(base, exp, mod)` | Square-and-multiply exponentiation |
| `modInverse(a, m)` | Extended Euclidean algorithm |
| `hashToInteger(msg)` | SHA-256 with domain prefix → BigInt |

---

## Limitations of Textbook RSA Blind Signatures

1. **No message padding** — Production systems use RSA-PSS or RSA-FDH (Full Domain Hash)
2. **Algebraic structure** — An adversary who can query many blind signatures might exploit multiplicative properties
3. **Chosen-plaintext** — Authority could try to learn `T` by correlating timing or signing requests
4. **One-more forgery** — Textbook schemes may be vulnerable depending on implementation
5. **Key management** — Private key is a local JSON file, not stored in a Hardware Security Module

For a production system, consider using a vetted library such as `blind-rsa-signatures` (RFC 9474).
