import React, { useEffect, useState } from "react";
import SplineBG from "../components/SplineBG";
import "../styles/Login.css";
import { useNavigate } from "react-router-dom";
import { EMAIL_RX } from "../lib/patterns";
import { useSession } from "../hooks/useSession";

const logo = "/Logo.webp";

export default function Forgot() {
  const navigate = useNavigate();
  const { user, loading } = useSession();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [disabled, setDisabled] = useState(false);

  useEffect(() => { if (!loading && user) navigate("/dashboard"); }, [loading, user, navigate]);

  const RAW = import.meta.env.VITE_API_URL ?? "/";
  const API_BASE = RAW.endsWith("/") ? RAW : RAW + "/";

  const safeJson = async (r) => { try { return await r.clone().json(); } catch { return null; } };

  const submit = async (e) => {
    e.preventDefault();
    if (!EMAIL_RX.test(email)) { setMsg("Enter a valid email."); return; }
    setDisabled(true); setMsg("");
    try {
      const res = await fetch(`${API_BASE}auth/forgot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim() })
      });
      await safeJson(res);
      // Always say success (no user enumeration)
      setMsg("If that email exists, we've sent a reset link. (Check server console in dev.)");
    } catch (err) {
      setMsg(err?.message || "Network error");
    } finally {
      setDisabled(false);
    }
  };

  return (
    <>
      <SplineBG />
      <div className="bg-vignette" />
      <div className="brand-fixed">
        <img className="logo" src={logo} alt="Iron Bank logo" />
        <div><h1>Iron Bank</h1><small>Reset your password</small></div>
      </div>

      <div className="auth-shell">
        <div className="auth-card">
          <h2 className="card-title">Forgot password</h2>
          <p className="card-sub">Enter your email and we’ll send you a reset link.</p>
          {msg && <div className="error-banner">{msg}</div>}

          <form onSubmit={submit} noValidate>
            <div className="input-group">
              <label htmlFor="em">Email</label>
              <input
                id="em" className="input" type="email" inputMode="email"
                value={email} onChange={(e)=>setEmail(e.target.value)} required
                pattern={EMAIL_RX.source} placeholder="you@bankmail.com"
              />
            </div>
            <button className="btn" disabled={disabled}>{disabled ? "Sending…" : "Send reset link"}</button>
          </form>

          <p className="footer">
            Remembered? <button className="link-btn" onClick={()=>navigate("/login")}>Back to sign in</button>
          </p>
        </div>
        <div />
      </div>
    </>
  );
}
