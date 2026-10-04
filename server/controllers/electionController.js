const Election = require("../models/Election");

const createElection = async (req, res) => {
    try {
        const {title, description, candidates, startTime, endTime} = req.body;

        if(!title || !candidates || !startTime || !endTime) {
            return res.status(400).json({
                success: false,
                message: "Required election fields are missing"
            });
        }

        if(!Array.isArray(candidates) || candidates.length < 2) {
            return res.status(400).json({
                success: false,
                message: "At least two candidates are required"
            });
        }

        const start = new Date(startTime);
        const end = new Date(endTime);

        if(Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
            return res.status(400).json({
                success: false,
                message: "Invalid election dates"
            });
        }

        const election = await Election.create({
            title,
            description,
            candidates,
            startTime: start,
            endTime: end,
            status: start > new Date() ? "upcoming" : "active",
            createdBy: req.user.id
        });

        res.status(201).json({
            success: true,
            message: "Election created successfully",
            election
        });

    } catch(error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Unable to create election"
        });
    }
};

// Get all elections
const getElections = async (req, res) => {
    try {
        const elections = await Election.find()
            .select("-__v")
            .sort({createdAt: -1});

        res.status(200).json({
            success: true,
            count: elections.length,
            elections
        });

    } catch(error) {
        res.status(500).json({
            success: false,
            message: "Unable to fetch elections"
        });
    }
};

// Get one election
const getElectionById = async (req, res) => {
    try {
        const election = await Election.findById(req.params.id);

        if(!election) {
            return res.status(404).json({
                success: false,
                message: "Election not found"
            });
        }

        res.status(200).json({
            success: true,
            election
        });

    } catch(error) {
        res.status(400).json({
            success: false,
            message: "Invalid election ID"
        });
    }
};

// Update election status
const updateElectionStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if(!["upcoming", "active", "closed"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid election status"
            });
        }

        const election = await Election.findById(req.params.id);

        if(!election) {
            return res.status(404).json({
                success: false,
                message: "Election not found"
            });
        }

        if(election.status === "closed") {
            return res.status(400).json({
                success: false,
                message: "Closed elections cannot be reopened"
            });
        }

        if(status === "active" && new Date() < election.startTime) {
            return res.status(400).json({
                success: false,
                message: "Election start time has not arrived"
            });
        }

        election.status = status;

        await election.save();

        res.status(200).json({
            success: true,
            message: "Election status updated",
            election
        });

    } catch(error){ 
        res.status(500).json({
            success: false,
            message: "Unable to update election"
        });
    }
};

module.exports = {
    createElection,
    getElections,
    getElectionById,
    updateElectionStatus
};