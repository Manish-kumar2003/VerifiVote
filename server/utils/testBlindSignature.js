const {
    blindMessage,
    signBlindedMessage,
    unblindSignature,
    verifySignature
} = require("../services/crypto/blindSignature");

const crypto = require("crypto");
const token = crypto.randomBytes(32).toString("hex");

console.log("\n========== VERIFIVOTE CRYPTO TEST ==========\n");
console.log("Original Token:", token);

// Step 1: Blind
const {blindedMessage, blindingFactor} = blindMessage(token);
console.log("\n1. Blinded Message Generated");

// Step 2: Authority signs
const blindedSignature = signBlindedMessage(blindedMessage);
console.log("2. Authority Signed Blinded Message");

// Step 3: Unblind
const signature = unblindSignature(blindedSignature, blindingFactor);
console.log("3. Signature Unblinded");

// Step 4: Verify
const isValid = verifySignature(token, signature);
console.log("\n4. Signature Verification:", isValid);

// Step 5: Tampering test
const tamperedToken = token + "modified";
const tamperedValid = verifySignature(tamperedToken, signature);
console.log("5. Tampered Token Verification:", tamperedValid);
console.log("\n============================================");