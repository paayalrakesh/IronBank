import React, { useEffect, useMemo, useState } from "react";
import SplineBG from "../components/SplineBG";
import "../styles/Login.css";
import { useNavigate, useSearchParams } from "react-router-dom";
import { EMAIL_RX, PASSWORD_RX } from "../lib/patterns";
import { useSession } from "../hooks/useSession";

const logo = "/Logo.webp";

export default function Reset() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, loading } = useSession();

  // If signed in already, go dashboard
  useEffect(()=>{ if (!loading && user) navigate("/dashboard"); }, [loading, user, navigate]);

  const token = params.get("token") || "";
  const emailFromLink = params.get("email") || "";
  const [email, setEmail] = useState(emailFromLink);
  const [pw, setPw] = useState("");
  const [cpw, setCpw] = useState("");
  const [msg, setMsg] = useState("");
  const [disabled, setDisabled] = useState(false);

  const RAW = import.meta.env.VITE_API_URL ?? "/";
  const API_BASE = RAW.endsWith("/") ? RAW : RAW + "/";

  const valid = useMemo(() => {
    if (!EMAIL_RX.test(email)) return false;
    if (!PASSWORD_RX.test(pw)) return false;
    if (pw !== cpw) return false;
    if (!token || token.length < 10) return false;
    return true;
  }, [email, pw, cpw, token]);

  const safeJson = async (r) => { try { return await r.clone().json(); } catch { return null; } };

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) { setMsg("Please complete all fields correctly."); return; }
    setDisabled(true); setMsg("");
    try {
      const res = await fetch(`${API_BASE}auth/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), token, newPassword: pw })
      });
      const data = await safeJson(res);
      if (!res.ok) {
        setMsg((data && (data.message || data.error)) || `Reset failed (${res.status})`);
        return;
      }
      alert("✅ Password updated. Please sign in.");
      navigate("/login");
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
        <div><h1>Iron Bank</h1><small>Choose a new password</small></div>
      </div>

      <div className="auth-shell">
        <div className="auth-card">
          <h2 className="card-title">Reset password</h2>
          <p className="card-sub">Create a strong new password.</p>
          {msg && <div className="error-banner">{msg}</div>}

          <form onSubmit={submit} noValidate>
            <div className="input-group">
              <label htmlFor="em">Email</label>
              <input id="em" className="input" type="email" value={email}
                onChange={(e)=>setEmail(e.target.value)} required inputMode="email" pattern={EMAIL_RX.source}/>
            </div>
            <div className="row">
              <div className="input-group">
                <label htmlFor="pw">New password</label>
                <input id="pw" className="input" type="password" value={pw}
                  onChange={(e)=>setPw(e.target.value)} required pattern={PASSWORD_RX.source}/>
                <small className="error" style={{opacity:.85}}>
                  Must be 10+ chars, include upper, lower, digit, and symbol.
                </small>
              </div>
              <div className="input-group">
                <label htmlFor="cpw">Confirm password</label>
                <input id="cpw" className="input" type="password" value={cpw}
                  onChange={(e)=>setCpw(e.target.value)} required/>
              </div>
            </div>
            <button className="btn" disabled={disabled || !valid}>
              {disabled ? "Updating…" : "Update password"}
            </button>
          </form>

          <p className="footer">
            Changed your mind? <button className="link-btn" onClick={()=>navigate("/login")}>Back to sign in</button>
          </p>
        </div>
        <div />
      </div>
    </>
  );
}
