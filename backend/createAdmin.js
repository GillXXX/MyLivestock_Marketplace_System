const dotenv = require("dotenv");
dotenv.config();

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("./config/db");

async function createAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL || "admin@herdmarket.com";
    const generatedPassword = crypto.randomBytes(9).toString("base64url");
    const password = process.env.ADMIN_PASSWORD || generatedPassword;

    const [existing] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      console.log("Admin already exists");
      process.exit();
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO users
      (full_name, email, phone, location, role, password)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        "MAO Administrator",
        email,
        "0000000000",
        "Veruela, Agusan del Sur",
        "admin",
        hashedPassword,
      ]
    );

    console.log("Admin account created!");
    console.log(`  Email:    ${email}`);

    if (process.env.ADMIN_PASSWORD) {
      console.log("  Password: (set via ADMIN_PASSWORD env var)");
    } else {
      console.log(`  Password: ${password}`);
      console.log("  This was randomly generated and is not stored anywhere — save it now.");
    }

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

createAdmin();
