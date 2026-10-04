const mongoose = require("mongoose");

const voteSchema = new mongoose.Schema({
    electionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Election",
        required: true
    },

    candidateId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },

    tokenHash: {
        type: String,
        required: true
    },

    signatureVerified: {
        type: Boolean,
        default: false
    }

}, {
    timestamps: true
});

// Prevent the same token from voting twice
voteSchema.index({
        electionId: 1,
        tokenHash: 1
    }, {
        unique: true
    }
);

module.exports = mongoose.model("Vote", voteSchema);