const crypto = require("crypto");

const Election = require("../models/Election");
const User = require("../models/User");
const Vote = require("../models/Vote");
const Authorization = require("../models/Authorization");

const {signBlindedMessage, verifySignature} = require("../services/crypto/blindSignature");

const hashToken = (token) => {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
};

const isElectionActive = (election) => {
    const now = new Date();

    return (
        election.status === "active" &&
        now >= election.startTime &&
        now <= election.endTime
    );
};

// Request anonymous authorization
const requestAuthorization = async (req, res) => {
    try {
        const { electionId, blindedMessage } = req.body;

        if(!electionId || !blindedMessage) {
            return res.status(400).json({
                success: false,
                message: "Election ID and blinded message are required"
            });
        }
        const voter = await User.findById(req.user.id);

        if(!voter || voter.role !== "voter" || !voter.isEligible) {
            return res.status(403).json({
                success: false,
                message: "Voter is not eligible"
            });
        }
        const election = await Election.findById(electionId);

        if(!election || !isElectionActive(election)) {
            return res.status(400).json({
                success: false,
                message: "Election is not currently active"
            });
        }

        // Record authorization without storing the blinded message.
        await Authorization.create({
            electionId,
            voterId: voter._id
        });

        // Educational textbook RSA blind-signature operation.
        const blindedSignature = signBlindedMessage(blindedMessage);

        return res.status(200).json({
            success: true,
            message: "Anonymous authorization issued",
            blindedSignature
        });

    } catch(error) {
        if(error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Authorization has already been issued"
            });
        }
        console.error("Authorization error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to issue authorization"
        });
    }
};

// Submit anonymous ballot
const submitVote = async (req, res) => {
    try {
        const {electionId, candidateId, token, signature} = req.body;

        if(!electionId || !candidateId || !token || !signature) {
            return res.status(400).json({
                success: false,
                message: "All voting fields are required"
            });
        }
        const election = await Election.findById(electionId);

        if(!election || !isElectionActive(election)) {
            return res.status(400).json({
                success: false,
                message: "Election is not active"
            });
        }

        const candidateExists = election.candidates.some(
            candidate => candidate._id.toString() === candidateId
        );

        if(!candidateExists) {
            return res.status(400).json({
                success: false,
                message: "Invalid candidate"
            });
        }
        const validSignature = verifySignature(token, signature);

        if(!validSignature) {
            return res.status(401).json({
                success: false,
                message: "Invalid voting signature"
            });
        }
        const tokenHash = hashToken(token);

        await Vote.create({
            electionId,
            candidateId,
            tokenHash,
            signatureVerified: true
        });

        return res.status(201).json({
            success: true,
            message: "Anonymous vote recorded successfully"
        });

    } catch(error) {
        if(error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "This voting token has already been used"
            });
        }
        console.error("Vote submission error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to record vote"
        });
    }
};

// Election results
const getResults = async (req, res) => {
    try {
        const { electionId } = req.params;
        const election = await Election.findById(electionId);

        if(!election) {
            return res.status(404).json({
                success: false,
                message: "Election not found"
            });
        }

        const results = await Vote.aggregate([{
                $match: {
                    electionId: election._id
                }
            }, {
                $group: {
                    _id: "$candidateId",
                    votes: { $sum: 1 }
                }
            }
        ]);

        const resultMap = new Map(
            results.map(item => [
                item._id.toString(),
                item.votes
            ])
        );

        const candidates = election.candidates.map(candidate => ({
            candidateId: candidate._id,
            name: candidate.name,
            party: candidate.party,
            votes: resultMap.get(candidate._id.toString()) || 0
        }));

        const totalVotes = candidates.reduce((sum, candidate) => sum + candidate.votes, 0);

        return res.status(200).json({
            success: true,
            election: election.title,
            totalVotes,
            candidates
        });

    } catch(error) {
        console.error("Results error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch results"
        });
    }
};

module.exports = {
    requestAuthorization,
    submitVote,
    getResults
};