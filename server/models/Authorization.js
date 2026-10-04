const mongoose = require("mongoose");

const authorizationSchema = new mongoose.Schema({
    electionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Election",
        required: true
    },
    voterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    issuedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

authorizationSchema.index({
        electionId: 1,
        voterId: 1
    }, {
        unique: true
    }
);

module.exports = mongoose.model(
    "Authorization",
    authorizationSchema
);