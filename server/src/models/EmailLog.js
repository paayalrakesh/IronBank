import mongoose from "mongoose";

const emailLogSchema = new mongoose.Schema(
  {
    to: String,
    subject: String,
    htmlPreview: String,
    status: { type: String, enum: ["sent", "console", "error"], default: "console" },
    error: String,
  },
  { timestamps: true }
);

export const EmailLog = mongoose.model("EmailLog", emailLogSchema);