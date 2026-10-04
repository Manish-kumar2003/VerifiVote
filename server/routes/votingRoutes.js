const express = require("express");
const router = express.Router();

const {protect, adminOnly} = require("../middleware/authMiddleware");
const {requestAuthorization, submitVote, getResults} = require("../controllers/votingController");

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

module.exports = router;