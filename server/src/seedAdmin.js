import "dotenv/config";
import mongoose from "mongoose";
import argon2 from "argon2";
import { User } from "./models/User.js";
import { EMAIL_RX, ID_RX, ACCOUNT_RX, PASSWORD_RX, NAME_RX } from "./patterns.js";

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const accountNumber = process.env.ADMIN_ACCOUNT;
  const idNumber = process.env.ADMIN_ID;
  const firstName = process.env.ADMIN_FIRST || "Iron";
  const lastName  = process.env.ADMIN_LAST  || "Admin";

  if (!EMAIL_RX.test(email)) throw new Error("ADMIN_EMAIL invalid");
  if (!PASSWORD_RX.test(password)) throw new Error("ADMIN_PASSWORD too weak");
  if (!ACCOUNT_RX.test(accountNumber)) throw new Error("ADMIN_ACCOUNT must be 10 digits");
  if (!ID_RX.test(idNumber)) throw new Error("ADMIN_ID must be 13 digits");
  if (!NAME_RX.test(firstName) || !NAME_RX.test(lastName)) throw new Error("ADMIN names invalid");

  const existing = await User.findOne({ email }).lean();
  if (existing) {
    console.log("Admin already exists:", email);
    return process.exit(0);
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1
  });

  const user = await User.create({
    firstName, lastName, email, idNumber,
    accountNumber, passwordHash, role: "admin"
  });

  console.log("✅ Admin created:", user.email);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
