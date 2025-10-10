import mongoose from "mongoose";

const prSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true }, // no inline index here
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Single TTL index (Mongo will auto-expire docs after expiresAt)
prSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordReset = mongoose.model("PasswordReset", prSchema);
