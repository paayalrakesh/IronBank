import mongoose from "mongoose";

const accountSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
    number: { type: String, required: true, unique: true }, // unique creates the index – no extra index needed
    type: { type: String, enum: ["Cheque", "Savings"], default: "Cheque" },
    currency: { type: String, default: "ZAR" },
    balanceCents: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ⛔ Do NOT add another accountSchema.index({ number: 1 }, ...)

export const Account = mongoose.model("Account", accountSchema);
