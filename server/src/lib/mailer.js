import nodemailer from "nodemailer";
import { EmailLog } from "../models/EmailLog.js";

export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const MAIL_FROM = process.env.MAIL_FROM || "Iron Bank <no-reply@ironbank.local>";

const host = process.env.MAIL_HOST;
const port = Number(process.env.MAIL_PORT || 587);
const user = process.env.MAIL_USER;
const pass = process.env.MAIL_PASS;

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  if (!host || !user || !pass) return null; // console mode
  transporter = nodemailer.createTransport({ host, port, auth: { user, pass } });
  return transporter;
}

export async function sendMail(to, subject, html) {
  const mode = (process.env.MAIL_MODE || "").toLowerCase();

  // default: console mode or missing creds -> log but never throw
  try {
    const t = getTransporter();
    if (mode === "console" || !t) {
      console.log("📧 [DEV] Would send email:", { to, subject });
      console.log(html);
      await EmailLog.create({ to, subject, htmlPreview: html.slice(0, 2000), status: "console" });
      return;
    }
    await t.sendMail({ from: MAIL_FROM, to, subject, html });
    await EmailLog.create({ to, subject, htmlPreview: html.slice(0, 2000), status: "sent" });
  } catch (err) {
    console.warn("📧 Email send failed; using DB log only:", err?.message);
    await EmailLog.create({
      to,
      subject,
      htmlPreview: html.slice(0, 2000),
      status: "error",
      error: err?.message
    });
    // do NOT throw – auth flow must continue
  }
}

/* ---------- simple dark HTML ---------- */
const base = (title, body) => `
<!doctype html><html><head>
<meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light">
<style>
body{margin:0;padding:24px;background:#0b0d12;color:#e8e8f0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica,Arial,sans-serif}
.card{max-width:560px;margin:0 auto;background:#121521;border:1px solid #262b3a;border-radius:16px;padding:24px}
.brand{display:flex;gap:12px;align-items:center;margin-bottom:8px}
.brand h1{margin:0;font-size:20px;letter-spacing:.4px}
.btn{display:inline-block;margin-top:14px;background:#8b5cf6;color:white;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:700}
code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:#0b0d12;border:1px solid #262b3a;padding:6px 8px;border-radius:10px;font-size:18px;letter-spacing:3px}
.muted{opacity:.85;font-size:12px;margin-top:12px}
</style></head><body><div class="card">
  <div class="brand"><h1>Iron Bank</h1></div>
  <h2 style="margin:6px 0 14px;">${title}</h2>
  <div>${body}</div>
  <div class="muted">If you didn’t request this, you can ignore this email.</div>
</div></body></html>`;

export function otpEmailTemplate(code) {
  return base("Your one-time verification code",
    `<p>Use this code to finish signing in. It expires in 5 minutes.</p><p><code>${code}</code></p>`);
}

export function resetEmailTemplate(link) {
  return base("Reset your Iron Bank password",
    `<p>Click the button below to choose a new password (valid 15 minutes):</p>
     <p><a class="btn" href="${link}">Reset password</a></p>
     <p>Or open this link:</p><p><a href="${link}">${link}</a></p>`);
}
