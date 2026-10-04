const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const KEY_DIR = path.join(__dirname, "../../keys");
const KEY_PATH = path.join(KEY_DIR, "rsaKeys.json");

const generateKeys = () => {
    if(!fs.existsSync(KEY_DIR)) {
        fs.mkdirSync(KEY_DIR, { recursive: true });
    }

    const {publicKey, privateKey} = crypto.generateKeyPairSync(
        "rsa", {
            modulusLength: 2048,
            publicExponent: 0x10001,
            publicKeyEncoding: {
                type: "spki",
                format: "pem"
            },
            privateKeyEncoding: {
                type: "pkcs8",
                format: "pem"
            }
        }
    );

    fs.writeFileSync(
        KEY_PATH,
        JSON.stringify({ publicKey, privateKey }, null, 2),
        {mode: 0o600}
    );

    console.log("RSA key pair generated successfully");
};

const getKeys = () => {
    if (!fs.existsSync(KEY_PATH)) {
        throw new Error("RSA keys not found. Generate keys first.");
    }
    return JSON.parse(fs.readFileSync(KEY_PATH, "utf8"));
};

module.exports = {generateKeys, getKeys};