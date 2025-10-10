import React, { useEffect, useRef, useState } from "react";
import SplineBG from "../components/SplineBG";
import "../styles/Login.css";
import { useNavigate } from "react-router-dom";
import { useSession } from "../hooks/useSession";

const logo = "/Logo.webp"; // place in client/public/Logo.webp

export default function MFA() {
  const navigate = useNavigate();
  const { user, loading } = useSession();

  // if already authenticated, skip MFA
  useEffect(() => {
    if (!loading && user) navigate("/dashboard");
  }, [loading, user, navigate]);

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const inputsRef = useRef([]);
  const [disabled, setDisabled] = useState(false);
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(30);   // resend cooldown
  const [expires, setExpires] = useState(5 * 60); // soft expiry countdown

  const RAW_API = import.meta.env.VITE_API_URL ?? "/";
  const API_BASE = RAW_API.endsWith("/") ? RAW_API : RAW_API + "/";

  const email = (typeof window !== "undefined" && localStorage.getItem("email")) || "";

  useEffect(() => {
    inputsRef.current[0]?.focus();
    const cd = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    const ex = setInterval(() => setExpires((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => { clearInterval(cd); clearInterval(ex); };
  }, []);

  const onChange = (idx, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[idx] = val;
    setDigits(next);
    if (val && idx < 5) inputsRef.current[idx + 1]?.focus();
  };

  const onKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      const next = [...digits];
      next[idx - 1] = "";
      setDigits(next);
      inputsRef.current[idx - 1]?.focus();
      e.preventDefault();
    }
    if (e.key === "ArrowLeft" && idx > 0) inputsRef.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < 5) inputsRef.current[idx + 1]?.focus();

    if (e.ctrlKey && e.key.toLowerCase() === "v") {
      navigator.clipboard.readText().then((t) => {
        const only = (t || "").replace(/\D/g, "").slice(0, 6).padEnd(6, "");
        if (!only) return;
        setDigits(only.split(""));
        inputsRef.current[5]?.focus();
      });
    }
  };

  const code = digits.join("");

  const safeJson = async (res) => {
    try { return await res.clone().json(); }
    catch { const t = await res.text(); return t ? { message: t } : null; }
  };

  const submit = async () => {
    if (code.length !== 6) { setMessage("Enter all 6 digits."); return; }
    if (!email) { alert("Missing email. Please sign in again."); navigate("/login"); return; }

    setDisabled(true); setMessage("");
    try {
      const res = await fetch(`${API_BASE}auth/verifyOTP`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, code })
      });
      const data = await safeJson(res);
      if (!res.ok) {
        setMessage((data && (data.message || data.error)) || `Verification failed (${res.status})`);
        return;
      }
      alert("✅ MFA verified");
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setMessage(err?.message || "Network error");
    } finally {
      setDisabled(false);
    }
  };

  const resend = async () => {
    if (!email || cooldown > 0) return;
    setDisabled(true); setMessage("");
    try {
      const res = await fetch(`${API_BASE}auth/requestOTP`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email })
      });
      const data = await safeJson(res);
      if (!res.ok) {
        setMessage((data && (data.message || data.error)) || `Could not resend (${res.status})`);
        return;
      }
      setCooldown(30);
      setExpires(5 * 60);
      setDigits(["", "", "", "", "", ""]);
      inputsRef.current[0]?.focus();
      setMessage("A new code was sent (check server console in dev).");
    } catch (err) {
      console.error(err);
      setMessage(err?.message || "Network error");
    } finally {
      setDisabled(false);
    }
  };

  const mmss = (s) => `${String(Math.floor(s/60))}:${String(s%60).padStart(2,"0")}`;

  return (
    <>
      <SplineBG />
      <div className="bg-vignette" />

      <div className="brand-fixed">
        <img className="logo" src={logo} alt="Iron Bank logo" />
        <div>
          <h1>Iron Bank</h1>
          <small>Multi-Factor Authentication</small>
        </div>
      </div>

      <div className="auth-shell">
        <div className="auth-card">
          <h2 className="card-title">Verify your identity</h2>
          <p className="card-sub">
            Enter the 6-digit code sent to <b>{email || "your email"}</b>.
            <br />
            <span style={{opacity:.9}}>Code expires in {mmss(expires)}.</span>
          </p>

          {message && <div className="error-banner" role="status">{message}</div>}

          <div className="code-grid">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (inputsRef.current[i] = el)}
                className="code-cell"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => onChange(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
              />
            ))}
          </div>

          <button className="btn" style={{ marginTop: 12 }} disabled={disabled} onClick={submit}>
            {disabled ? "Verifying..." : "Verify"}
          </button>

          <div className="mfa-actions">
            <button className="link-btn" disabled={disabled || cooldown>0} onClick={resend}>
              {cooldown>0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
            <button className="link-btn" disabled={disabled} onClick={() => navigate("/login")}>
              Use a different account
            </button>
          </div>
        </div>
        <div />
      </div>
    </>
  );
}
