import { Router } from "express";
import { z } from "zod";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { EMAIL_RX, NAME_RX, ID_RX, ACCOUNT_RX, PASSWORD_RX } from "../patterns.js";

const router = Router();

const registerSchema = z.object({
  email: z.string().regex(EMAIL_RX, "Invalid email"),
  username: z.string().min(2).max(60),
  firstName: z.string().regex(NAME_RX, "Invalid first name"),
  lastName: z.string().regex(NAME_RX, "Invalid surname"),
  idNumber: z.string().regex(ID_RX, "ID must be 13 digits"),
  accountNumber: z.string().regex(ACCOUNT_RX, "Account must be 10 digits"),
  password: z.string().regex(PASSWORD_RX, "Password too weak")
});

const loginSchema = z.object({
  email: z.string().regex(EMAIL_RX),
  password: z.string().min(1),
  accountNumber: z.string().regex(ACCOUNT_RX),
  role: z.enum(["customer", "admin"]).optional()
});

const verifySchema = z.object({
  email: z.string().regex(EMAIL_RX),
  code: z.string().regex(/^\d{6}$/)
});

// ----------------------------------------------------------------

function sign(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );
}

function makeOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function storeOtpForUser(user, code) {
  const otpHash = await argon2.hash(code, { type: argon2.argon2id });
  user.mfa = {
    otpHash,
    otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 mins
    attempts: 0,
    lastSentAt: new Date()
  };
  await user.save();
}

// ----------------------------------------------------------------

router.post("/register", async (req, res) => {
  try {
    const input = registerSchema.parse(req.body);

    const dup = await User.findOne({
      $or: [{ email: input.email.toLowerCase().trim() }, { accountNumber: input.accountNumber }]
    }).lean();
    if (dup) return res.status(409).json({ message: "Email or account already registered" });

    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1
    });

    const user = await User.create({
      firstName: input.firstName.trim(),
      lastName:  input.lastName.trim(),
      email:     input.email.toLowerCase().trim(),
      idNumber:  input.idNumber,
      accountNumber: input.accountNumber,
      passwordHash,
      role: "customer"
    });

    return res.status(201).json({
      message: "Registered",
      user: { id: user._id, email: user.email, role: user.role }
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", issues: err.issues });
    }
    if (err?.code === 11000) {
      return res.status(409).json({ message: "Email or account already registered" });
    }
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Login → generate OTP (no session cookie yet)
router.post("/login", async (req, res) => {
  try {
    const input = loginSchema.parse(req.body);

    const user = await User.findOne({
      email: input.email.toLowerCase().trim(),
      accountNumber: input.accountNumber
    }).exec();
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    if (input.role && input.role !== user.role) {
      return res.status(403).json({ message: "Forbidden: role mismatch" });
    }

    const ok = await argon2.verify(user.passwordHash, input.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const code = makeOTP();
    await storeOtpForUser(user, code);
    console.log(`🔐 OTP for ${user.email}: ${code} (valid 5m)`); // DEV ONLY

    return res.json({ message: "OTP sent" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", issues: err.issues });
    }
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Verify OTP → issue session cookie
router.post("/verifyOTP", async (req, res) => {
  try {
    const input = verifySchema.parse(req.body);

    const user = await User.findOne({ email: input.email.toLowerCase().trim() }).exec();
    if (!user || !user.mfa?.otpHash || !user.mfa?.otpExpiresAt) {
      return res.status(400).json({ message: "No pending verification" });
    }

    // lockout after 5 bad attempts
    if (user.mfa.attempts >= 5) {
      return res.status(429).json({ message: "Too many attempts. Request a new code." });
    }

    if (user.mfa.otpExpiresAt.getTime() < Date.now()) {
      user.mfa = {}; await user.save();
      return res.status(400).json({ message: "Code expired. Request a new code." });
    }

    const ok = await argon2.verify(user.mfa.otpHash, input.code);
    if (!ok) {
      user.mfa.attempts = (user.mfa.attempts || 0) + 1;
      await user.save();
      return res.status(400).json({ message: "Invalid code" });
    }

    // success: clear OTP, issue cookie
    user.mfa = {};
    await user.save();

    const token = sign(user);
    res.cookie("auth", token, {
      httpOnly: true,
      secure: false,          // true when HTTPS
      sameSite: "strict",
      maxAge: 1000 * 60 * 60 * 2
    });

    return res.json({
      message: "MFA verified",
      token,
      user: { id: user._id, email: user.email, role: user.role }
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", issues: err.issues });
    }
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Resend code with 30s cooldown
router.post("/requestOTP", async (req, res) => {
  try {
    const email = z.string().regex(EMAIL_RX).parse(req.body?.email ?? "");
    const user = await User.findOne({ email: email.toLowerCase().trim() }).exec();
    if (!user) return res.status(404).json({ message: "User not found" });

    const now = Date.now();
    const last = user.mfa?.lastSentAt?.getTime?.() || 0;
    const delta = now - last;
    const cooldownMs = 30_000; // 30s

    if (delta < cooldownMs) {
      const wait = Math.ceil((cooldownMs - delta) / 1000);
      return res.status(429).json({ message: `Please wait ${wait}s before requesting a new code.` });
    }

    const code = makeOTP();
    await storeOtpForUser(user, code);
    console.log(`🔐 (Resent) OTP for ${user.email}: ${code} (valid 5m)`); // DEV ONLY

    return res.json({ message: "OTP resent" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid email" });
    }
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Simple logout
router.post("/logout", (req, res) => {
  res.clearCookie("auth", { httpOnly: true, sameSite: "strict", secure: false });
  return res.json({ message: "Logged out" });
});

// Session check
router.get("/me", async (req, res) => {
  try {
    const auth = req.cookies?.auth;
    if (!auth) return res.status(401).json({ message: "No session" });
    const payload = jwt.verify(auth, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).lean();
    if (!user) return res.status(401).json({ message: "Invalid session" });
    return res.json({ id: user._id, email: user.email, role: user.role });
  } catch {
    return res.status(401).json({ message: "Invalid session" });
  }
});

export default router;
