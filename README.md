# VerifiVote

**Blind Signature-Based Anonymous & Verifiable E-Voting System**

> ⚠️ **Educational Prototype** — This project demonstrates cryptographic concepts for a Cryptography & Network Security course. It is **not** intended for use in real elections.

---

## Problem Statement

Traditional electronic voting systems require either:
- Trusting a central authority with voter identities **and** votes, or
- Providing no verifiability at all

RSA blind signatures offer a way to **decouple voter authorization from ballot casting** so that:
- The authority can confirm a voter is eligible, but
- Cannot link that voter's identity to their specific ballot

## Features

| Feature | Status |
|---|---|
| Voter registration & login | ✅ |
| Admin dashboard | ✅ |
| Election creation / activation / closure | ✅ |
| Client-side RSA blind signature (browser BigInt) | ✅ |
| Anonymous vote casting (no JWT on /voting/cast) | ✅ |
| Server-side signature verification | ✅ |
| Double-vote prevention (token hash uniqueness) | ✅ |
| Double-authorization prevention | ✅ |
| Election results with Recharts charts | ✅ |
| Public RSA key endpoint (private key never exposed) | ✅ |

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS |
| Backend | Node.js + Express 5 |
| Database | MongoDB + Mongoose |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Crypto | Node.js built-in `crypto` + native BigInt |
| Charts | Recharts |
| Icons | Lucide React |

## Installation

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Clone and install

```bash
git clone <repo-url>
cd VerifiVote

cd server && npm install
cd ../client && npm install
```

### 2. Environment setup

**server/.env**
```env
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/verifivote
JWT_SECRET=change_this_to_a_secure_random_string
NODE_ENV=development
```

**client/.env**
```env
VITE_API_BASE_URL=http://localhost:5001/api
```

### 3. Generate RSA keys

```bash
cd server
node utils/generateKeys.js
```

This creates `server/keys/rsaKeys.json` (never commit this file).

### 4. Create admin account

```bash
cd server
node utils/createAdmin.js
```

Default admin: `admin@verifivote.com` / `Admin@12345`

### 5. Run the project

**Backend:**
```bash
cd server
npm run dev
```

**Frontend:**
```bash
cd client
npm run dev
```

Frontend: http://localhost:5173  
API: http://localhost:5001/api

## Architecture

```
Browser (React)
    │
    ├── Auth.jsx          → POST /api/auth/register|login
    ├── Dashboard.jsx     → GET /api/elections
    ├── Ballot.jsx        ──── Blind Signature Flow ────
    │       │             → GET /api/voting/public-key
    │       │             → POST /api/voting/authorize  (with JWT)
    │       │             → POST /api/voting/cast       (no JWT)
    └── ElectionResults.jsx → GET /api/voting/results/:id
    
Express API (port 5001)
    ├── /api/auth         → authController.js
    ├── /api/elections    → electionController.js
    └── /api/voting       → votingController.js
                              → blindSignature.js (RSA crypto)
    
MongoDB
    ├── users
    ├── elections
    ├── authorizations    (voterId → electionId, unique index)
    └── votes             (tokenHash → candidateId, no voterId)
```

## Blind Signature Voting Flow

```
VOTER (Browser)                    ELECTION AUTHORITY (Server)
─────────────────                  ──────────────────────────
Generate random token T
Compute m = SHA256("VERIFIVOTE-EDU-V1:" || T)
Generate random r (blinding factor)
blindedMsg = m · r^e mod n

           ──── blindedMsg ──────────────────►
                                   Verify voter eligibility (JWT)
                                   Record authorization (voterId, electionId)
                                   blindedSig = blindedMsg^d mod n
           ◄─── blindedSig ─────────────────

sig = blindedSig · r⁻¹ mod n
(Unblind locally — server never saw T)

           ──── (T, sig, candidateId) ───────►  ← No JWT sent
                                   Verify: sig^e mod n == SHA256(T)
                                   Store Vote(electionId, candidateId, SHA256(T))
           ◄─── 201 Vote recorded ──────────
```

**Privacy property:** The `Authorization` document stores `(voterId, electionId)`. The `Vote` document stores `(tokenHash, candidateId)`. These cannot be joined — the server cannot determine which candidate a voter chose.

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | None | Register voter |
| POST | /api/auth/login | None | Login, receive JWT |
| GET | /api/elections | None | List all elections |
| POST | /api/elections | Admin JWT | Create election |
| PATCH | /api/elections/:id/status | Admin JWT | Update status |
| GET | /api/voting/public-key | None | RSA public key (kty, n, e) |
| POST | /api/voting/authorize | Voter JWT | Sign blinded message |
| POST | /api/voting/cast | None | Cast anonymous vote |
| GET | /api/voting/results/:id | None | Get election results |

## Testing

```bash
# Crypto unit test
cd server && node utils/testBlindSignature.js

# Health check
curl http://localhost:5001/api/health

# Public key (verify no private fields)
curl http://localhost:5001/api/voting/public-key
```

## Security Considerations & Limitations

This project **demonstrates** the concept of blind signatures. It has many limitations that make it unsuitable for production:

| Limitation | Why it matters |
|---|---|
| Textbook RSA (no PSS/OAEP padding) | Vulnerable to certain algebraic attacks |
| Private key stored as JSON file | Should use HSM or key management service |
| No formal cryptographic audit | Bugs in BigInt arithmetic could break anonymity |
| Single election authority | Real systems use distributed/threshold signing |
| No coercion resistance | Voters can be forced to reveal tokens |
| No mixnet | Vote order may leak timing information |
| No zero-knowledge proofs | Stronger anonymity guarantees require ZKPs |
| No independent bulletin board | Results cannot be publicly audited |
| Client-side security | Compromised browser undermines all guarantees |
| No secure voter identity verification | Uses email/password, not government ID |

**Do not claim** this system provides "complete anonymity" or is "100% secure". It demonstrates **the concept** of unlinking voter authorization from ballot casting using blind signatures.

## Database Design

### User
```
name, email, voterId, password (hashed), role, isEligible
```

### Election
```
title, description, candidates[], startTime, endTime, status, createdBy
```

### Authorization ← identity side
```
voterId, electionId  [unique compound index]
```

### Vote ← anonymous side
```
electionId, candidateId, tokenHash, signatureVerified  [no voterId]
```

## Future Enhancements

- Threshold blind signatures (multiple authorities)
- Mixnet for additional unlinkability
- Zero-knowledge eligibility proofs
- Secure hardware key storage (HSM)
- Public cryptographic bulletin board
- Receipt-freeness mechanisms
- Formal audit trail

---

*VerifiVote — Cryptography & Network Security Academic Project*
