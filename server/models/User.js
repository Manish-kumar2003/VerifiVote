const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    voterId: {
        type: String,
        unique: true,
        sparse: true
    },

    password: {
        type: String,
        required: true,
        select: false
    },

    role: {
        type: String,
        enum: ["voter", "admin"],
        default: "voter"
    },

    isEligible: {
        type: Boolean,
        default: true
    }
    
}, {
    timestamps: true
});

module.exports = mongoose.model("User", userSchema);