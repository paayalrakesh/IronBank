import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import hpp from "hpp";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.js";
import bankingRoutes from "./routes/banking.js";
import { requireAuth } from "./middleware/auth.js";

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(hpp());
app.use(compression());
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

const ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
app.use(cors({ origin: ORIGIN, credentials: true }));

const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
const loginLimiter  = rateLimit({ windowMs: 10 * 60 * 1000, max: 30 });
const otpVerifyLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 50 });
const otpSendLimiter   = rateLimit({ windowMs: 10 * 60 * 1000, max: 20 });
app.use(globalLimiter);
app.use("/auth/login", loginLimiter);
app.use("/auth/verifyOTP", otpVerifyLimiter);
app.use("/auth/requestOTP", otpSendLimiter);

app.get("/health", (_, res) => res.json({ ok: true }));
app.use("/auth", authRoutes);

// ✅ Protected banking API
app.use("/banking", requireAuth, bankingRoutes);

const PORT = Number(process.env.PORT || 3001);
await mongoose.connect(process.env.MONGO_URI);
console.log("✅ MongoDB connected");
app.listen(PORT, () => console.log(`🔓 API running on http://localhost:${PORT}`));
