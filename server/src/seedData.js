import "dotenv/config";
import mongoose from "mongoose";
import { User } from "./models/User.js";
import { Account } from "./models/Account.js";

function random10() { return String(Math.floor(1000000000 + Math.random() * 9000000000)); }

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const admin = await User.findOne({ email: process.env.ADMIN_EMAIL }).exec();
  if (!admin) { console.log("No admin user found."); process.exit(0); }

  const existing = await Account.find({ user: admin._id }).lean();
  if (existing.length > 0) {
    console.log("Admin accounts already exist.");
    process.exit(0);
  }

  await Account.create([
    { user: admin._id, number: process.env.ADMIN_ACCOUNT, type: "Cheque", currency: "ZAR", balanceCents: 5050000 },
    { user: admin._id, number: random10(), type: "Savings", currency: "ZAR", balanceCents: 12050000 }
  ]);
  console.log("✅ Seeded admin accounts.");
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
