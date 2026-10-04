const mongoose = require("mongoose");

const candidateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    party: {
        type: String,
        default: "Independent"
    },

    symbol: {
        type: String,
        default: ""
    }
});

const electionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },

    description: {
        type: String,
        default: ""
    },

    candidates: {
        type: [candidateSchema],
        validate: {
            validator: function(value) {
                return value.length >= 2;
            },
            message: "An election must have at least two candidates"
        }
    },

    startTime: {
        type: Date,
        required: true
    },

    endTime: {
        type: Date,
        required: true
    },

    status: {
        type: String,
        enum: ["upcoming", "active", "closed"],
        default: "upcoming"
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }

}, {
    timestamps: true
});

module.exports = mongoose.model("Election", electionSchema);