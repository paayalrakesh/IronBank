import mongoose from "mongoose";

const mfaSchema = new mongoose.Schema({
  otpHash: { type: String },
  otpExpiresAt: { type: Date },
  attempts: { type: Number, default: 0 },     // ⬅️ track wrong tries
  lastSentAt: { type: Date }                  // ⬅️ resend cooldown
}, { _id: false });

const userSchema = new mongoose.Schema({
  firstName:     { type: String, required: true, trim: true },
  lastName:      { type: String, required: true, trim: true },
  email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
  idNumber:      { type: String, required: true },
  accountNumber: { type: String, required: true, unique: true },
  passwordHash:  { type: String, required: true },
  role:          { type: String, enum: ["customer", "admin"], default: "customer", index: true },
  mfa:           { type: mfaSchema, default: {} }
}, { timestamps: true });

export const User = mongoose.model("User", userSchema);
