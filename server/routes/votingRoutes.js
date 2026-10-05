const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { requestAuthorization, submitVote, getResults, getPublicKey } = require("../controllers/votingController");

router.post(
    "/authorize",
    protect,
    requestAuthorization
);

router.post(
    "/cast",
    submitVote
);

router.get(
    "/results/:electionId",
    getResults
);

// Public RSA key — only exposes kty/n/e, never private key material
router.get("/public-key", getPublicKey);

module.exports = router;