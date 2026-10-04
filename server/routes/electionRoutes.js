const express = require("express");

const router = express.Router();

const {
    createElection,
    getElections,
    getElectionById,
    updateElectionStatus
} = require("../controllers/electionController");

const {protect, adminOnly} = require("../middleware/authMiddleware");

router.get("/", getElections);
router.get("/:id", getElectionById);

router.post(
    "/",
    protect,
    adminOnly,
    createElection
);

router.patch(
    "/:id/status",
    protect,
    adminOnly,
    updateElectionStatus
);

module.exports = router;