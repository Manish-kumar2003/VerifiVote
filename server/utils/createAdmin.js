/**
 * createAdmin.js
 * Run once to seed the admin user into MongoDB.
 *
 * Usage:
 *   cd server
 *   node utils/createAdmin.js
 */

require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
const User     = require("../models/User");

const ADMIN_EMAIL    = "admin@verifivote.com";
const ADMIN_NAME     = "VerifiVote Admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@12345";

async function createAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected");

        const existing = await User.findOne({ email: ADMIN_EMAIL });
        if (existing) {
            console.log("Admin already exists:", ADMIN_EMAIL);
            return;
        }

        const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);
        await User.create({
            name:       ADMIN_NAME,
            email:      ADMIN_EMAIL,
            password:   hashed,
            role:       "admin",
            isEligible: false
        });

        console.log("Admin created successfully:", ADMIN_EMAIL);
        console.log("Password:", ADMIN_PASSWORD);

    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await mongoose.disconnect();
    }
}

createAdmin();