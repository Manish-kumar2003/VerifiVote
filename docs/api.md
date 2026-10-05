# API Reference

Base URL: `http://localhost:5001/api`

All request/response bodies are JSON. All error responses follow:
```json
{ "success": false, "message": "Human-readable error" }
```

---

## Authentication

### POST /auth/register
Register a new voter account.

**Request:**
```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "minimum8chars"
}
```

**Response 201:**
```json
{ "success": true, "message": "Registration successful", "voterId": "VOTER-<uuid>" }
```

**Errors:** 400 (missing fields, short password), 409 (email exists)

---

### POST /auth/login
Authenticate and receive a JWT.

**Request:**
```json
{ "email": "alice@example.com", "password": "minimum8chars" }
```

**Response 200:**
```json
{
  "success": true,
  "token": "<jwt>",
  "user": { "id": "...", "name": "Alice", "email": "...", "voterId": "...", "role": "voter" }
}
```

**Errors:** 401 (invalid credentials)

---

## Elections

### GET /elections
List all elections (public).

**Response 200:**
```json
{
  "success": true,
  "count": 2,
  "elections": [{ "_id": "...", "title": "...", "status": "active", "candidates": [...] }]
}
```

---

### POST /elections *(Admin JWT required)*
Create a new election.

**Headers:** `Authorization: Bearer <admin-jwt>`

**Request:**
```json
{
  "title": "Student Council Election 2026",
  "description": "...",
  "candidates": [
    { "name": "Alice", "party": "Party A", "symbol": "🅰️" },
    { "name": "Bob",   "party": "Party B", "symbol": "🅱️" }
  ],
  "startTime": "2026-10-05T10:00:00.000Z",
  "endTime":   "2026-10-06T10:00:00.000Z"
}
```

**Response 201:** `{ "success": true, "election": { ... } }`

**Errors:** 400 (missing fields, < 2 candidates, invalid dates), 403 (not admin)

---

### PATCH /elections/:id/status *(Admin JWT required)*
Change election status.

**Request:** `{ "status": "active" | "upcoming" | "closed" }`

**Notes:**
- Closed elections cannot be re-opened
- Cannot activate before `startTime`

---

## Voting

### GET /voting/public-key
Retrieve the election authority's RSA public key for client-side blinding.

**Response 200:**
```json
{
  "success": true,
  "publicKey": { "kty": "RSA", "n": "<base64url>", "e": "<base64url>" }
}
```

> Only `kty`, `n`, `e` are returned. Private key fields (`d`, `p`, `q`, etc.) are **never** included.

---

### POST /voting/authorize *(Voter JWT required)*
Request a blind signature from the election authority.

**Headers:** `Authorization: Bearer <voter-jwt>`

**Request:**
```json
{
  "electionId": "<election-id>",
  "blindedMessage": "<decimal-bigint-string>"
}
```

**Response 200:**
```json
{ "success": true, "message": "Anonymous authorization issued", "blindedSignature": "<decimal-bigint-string>" }
```

**Errors:**
- 400 — Missing fields / election not active
- 403 — Voter not eligible
- 409 — Authorization already issued for this voter+election

---

### POST /voting/cast
Cast an anonymous vote. **No JWT required.**

**Request:**
```json
{
  "electionId":  "<election-id>",
  "candidateId": "<candidate-id>",
  "token":       "<hex-string>",
  "signature":   "<decimal-bigint-string>"
}
```

**Response 201:** `{ "success": true, "message": "Anonymous vote recorded successfully" }`

**Errors:**
- 400 — Election not active / invalid candidate
- 401 — Invalid voting signature
- 409 — Token already used

---

### GET /voting/results/:electionId
Retrieve vote tallies for an election (public).

**Response 200:**
```json
{
  "success": true,
  "election": "Student Council Election 2026",
  "totalVotes": 42,
  "candidates": [
    { "candidateId": "...", "name": "Alice", "party": "Party A", "votes": 25 },
    { "candidateId": "...", "name": "Bob",   "party": "Party B", "votes": 17 }
  ]
}
```
