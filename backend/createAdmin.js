const dotenv = require("dotenv");
dotenv.config();

const bcrypt = require("bcryptjs");
const db = require("./config/db");

async function createAdmin() {
  try {
    const email = "admin@herdmarket.com";
    const password = "admin123";

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
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit();
  }
}

createAdmin();