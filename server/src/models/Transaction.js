import mongoose from "mongoose";

const txSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
  account: { type: mongoose.Schema.Types.ObjectId, ref: "Account", index: true, required: true },
  direction: { type: String, enum: ["in", "out"], required: true },
  amountCents: { type: Number, required: true },           // positive magnitude
  balanceAfterCents: { type: Number, required: true },
  memo: { type: String, default: "" },
  counterpartyNumber: { type: String },                    // other account number (if internal)
}, { timestamps: true });

txSchema.index({ user: 1, createdAt: -1 });

export const Transaction = mongoose.model("Transaction", txSchema);
