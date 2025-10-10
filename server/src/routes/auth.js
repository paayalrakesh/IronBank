import { Router } from "express";
import { z } from "zod";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { User } from "../models/User.js";
import { Account } from "../models/Account.js";
import { PasswordReset } from "../models/PasswordReset.js";
import { EMAIL_RX, NAME_RX, ID_RX, ACCOUNT_RX, PASSWORD_RX } from "../patterns.js";
import { sendMail, otpEmailTemplate, resetEmailTemplate, CLIENT_ORIGIN } from "../lib/mailer.js";

const router = Router();

const registerSchema = z.object({
  email: z.string().regex(EMAIL_RX),
  username: z.string().min(2).max(60),
  firstName: z.string().regex(NAME_RX),
  lastName: z.string().regex(NAME_RX),
  idNumber: z.string().regex(ID_RX),
  accountNumber: z.string().regex(ACCOUNT_RX),
  password: z.string().regex(PASSWORD_RX)
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

function makeOTP() { return String(Math.floor(100000 + Math.random() * 900000)); }
async function storeOtpForUser(user, code) {
  const otpHash = await argon2.hash(code, { type: argon2.argon2id });
  user.mfa = {
    otpHash,
    otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
    attempts: 0,
    lastSentAt: new Date()
  };
  await user.save();
}
function sign(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role, email: user.email },
    process.env.JWT_SECRET, { expiresIn: "2h" });
}
function random10() { return String(Math.floor(1000000000 + Math.random() * 9000000000)); }

// ---------- REGISTER -> also send OTP and start MFA ----------
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

    await Account.create([
      { user: user._id, number: input.accountNumber, type: "Cheque",  currency: "ZAR", balanceCents: 1250000 },
      { user: user._id, number: random10(),          type: "Savings", currency: "ZAR", balanceCents: 2589000 }
    ]);

    // start MFA right away
    const code = makeOTP();
    await storeOtpForUser(user, code);
    await sendMail(user.email, "Your Iron Bank verification code", otpEmailTemplate(code));
    console.log(`🔐 OTP for ${user.email}: ${code} (valid 5m)`);

    return res.status(201).json({ message: "Registered. OTP sent.", email: user.email });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid input", issues: err.issues });
    if (err?.code === 11000) return res.status(409).json({ message: "Email or account already registered" });
    console.error(err); return res.status(500).json({ message: "Server error" });
  }
});

// ---------- LOGIN -> send OTP ----------
router.post("/login", async (req, res) => {
  try {
    const input = loginSchema.parse(req.body);

    const user = await User.findOne({
      email: input.email.toLowerCase().trim(),
      accountNumber: input.accountNumber
    }).exec();
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    if (input.role && input.role !== user.role) return res.status(403).json({ message: "Forbidden: role mismatch" });

    const ok = await argon2.verify(user.passwordHash, input.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const code = makeOTP();
    await storeOtpForUser(user, code);
    await sendMail(user.email, "Your Iron Bank verification code", otpEmailTemplate(code));
    console.log(`🔐 OTP for ${user.email}: ${code} (valid 5m)`);
    return res.json({ message: "OTP sent" });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid input", issues: err.issues });
    console.error(err); return res.status(500).json({ message: "Server error" });
  }
});

// ---------- VERIFY OTP -> issue session ----------
router.post("/verifyOTP", async (req, res) => {
  try {
    const input = verifySchema.parse(req.body);
    const user = await User.findOne({ email: input.email.toLowerCase().trim() }).exec();
    if (!user || !user.mfa?.otpHash || !user.mfa?.otpExpiresAt)
      return res.status(400).json({ message: "No pending verification" });

    if (user.mfa.attempts >= 5) return res.status(429).json({ message: "Too many attempts." });
    if (user.mfa.otpExpiresAt.getTime() < Date.now()) { user.mfa = {}; await user.save(); return res.status(400).json({ message: "Code expired." }); }

    const ok = await argon2.verify(user.mfa.otpHash, input.code);
    if (!ok) { user.mfa.attempts = (user.mfa.attempts || 0) + 1; await user.save(); return res.status(400).json({ message: "Invalid code" }); }

    user.mfa = {}; await user.save();
    const token = sign(user);
    res.cookie("auth", token, { httpOnly: true, secure: false, sameSite: "strict", maxAge: 1000 * 60 * 60 * 2 });
    return res.json({ message: "MFA verified", token, user: { id: user._id, email: user.email, role: user.role } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid input", issues: err.issues });
    console.error(err); return res.status(500).json({ message: "Server error" });
  }
});

// ---------- RESEND ----------
router.post("/requestOTP", async (req, res) => {
  try {
    const email = z.string().regex(EMAIL_RX).parse(req.body?.email ?? "");
    const user = await User.findOne({ email: email.toLowerCase().trim() }).exec();
    if (!user) return res.status(200).json({ message: "If that email exists, a new code was sent." });

    const now = Date.now();
    const last = user.mfa?.lastSentAt?.getTime?.() || 0;
    if (now - last < 30_000) {
      const wait = Math.ceil((30_000 - (now - last)) / 1000);
      return res.status(429).json({ message: `Please wait ${wait}s before requesting a new code.` });
    }

    const code = makeOTP();
    await storeOtpForUser(user, code);
    await sendMail(user.email, "Your Iron Bank verification code", otpEmailTemplate(code));
    console.log(`🔐 (Resent) OTP for ${user.email}: ${code} (valid 5m)`);
    return res.json({ message: "OTP resent" });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid email" });
    console.error(err); return res.status(500).json({ message: "Server error" });
  }
});

// ---------- LOGOUT ----------
router.post("/logout", (req, res) => {
  res.clearCookie("auth", { httpOnly: true, sameSite: "strict", secure: false });
  return res.json({ message: "Logged out" });
});

// ---------- SESSION ----------
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

// ---------- FORGOT/RESET (unchanged from earlier) ----------
router.post("/forgot", async (req, res) => {
  try {
    const email = z.string().regex(EMAIL_RX).parse(req.body?.email ?? "");
    const user = await User.findOne({ email: email.toLowerCase().trim() }).exec();
    if (!user) return res.json({ message: "If that email exists, we sent a reset link." });

    const rawToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = await argon2.hash(rawToken, { type: argon2.argon2id });
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await PasswordReset.updateMany({ user: user._id, used: false }, { $set: { used: true } }).exec();
    await PasswordReset.create({ user: user._id, tokenHash, expiresAt, used: false });

    const resetUrl = `${CLIENT_ORIGIN}/reset?token=${rawToken}&email=${encodeURIComponent(user.email)}`;
    await sendMail(user.email, "Reset your Iron Bank password", resetEmailTemplate(resetUrl));

    return res.json({ message: "If that email exists, we sent a reset link." });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid email" });
    console.error(err); return res.status(500).json({ message: "Server error" });
  }
});

router.post("/reset", async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().regex(EMAIL_RX),
      token: z.string().min(10),
      newPassword: z.string().regex(PASSWORD_RX)
    });
    const input = schema.parse(req.body);

    const user = await User.findOne({ email: input.email.toLowerCase().trim() }).exec();
    if (!user) return res.status(400).json({ message: "Invalid token or email" });

    const pr = await PasswordReset.findOne({ user: user._id, used: false }).sort({ createdAt: -1 }).exec();
    if (!pr || pr.expiresAt.getTime() < Date.now()) {
      if (pr && pr.expiresAt.getTime() < Date.now()) { pr.used = true; await pr.save(); }
      return res.status(400).json({ message: "Token expired. Please request a new reset link." });
    }

    const ok = await argon2.verify(pr.tokenHash, input.token);
    if (!ok) return res.status(400).json({ message: "Invalid token." });

    const passwordHash = await argon2.hash(input.newPassword, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
    user.passwordHash = passwordHash;
    await user.save();

    pr.used = true; await pr.save();
    return res.json({ message: "Password updated. You can now sign in with your new password." });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid input", issues: err.issues });
    console.error(err); return res.status(500).json({ message: "Server error" });
  }
});

export default router;
