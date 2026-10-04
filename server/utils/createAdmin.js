require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const email = "admin@verifivote.com";
        const existingAdmin = await User.findOne({ email });

        if (existingAdmin) {
            console.log("Admin already exists");
            return;
        }

        const hashedPassword = await bcrypt.hash("Admin@12345", 12);

        await User.create({
            name: "VerifiVote Administrator",
            email,
            password: hashedPassword,
            role: "admin",
            isEligible: false
        });

        console.log("Admin created successfully");

    } catch(error) {
        console.error("Admin creation failed:", error.message);
    } finally {
        await mongoose.disconnect();
    }
};

createAdmin();