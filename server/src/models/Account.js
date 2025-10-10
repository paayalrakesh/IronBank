import mongoose from "mongoose";

const accountSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
  number: { type: String, required: true, unique: true },   // 10 digits
  type: { type: String, enum: ["Cheque", "Savings"], default: "Cheque" },
  currency: { type: String, default: "ZAR" },
  balanceCents: { type: Number, default: 0 },                // store cents
}, { timestamps: true });

accountSchema.index({ number: 1 }, { unique: true });

export const Account = mongoose.model("Account", accountSchema);
