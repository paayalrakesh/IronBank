import React, { useState, useRef, useEffect } from "react";
import SplineBG from "../components/SplineBG";
import "../styles/Login.css";
import { Link, useNavigate } from "react-router-dom";
import { EMAIL_RX, ACCOUNT_RX } from "../lib/patterns";
import { useSession } from "../hooks/useSession";

const logo = "/Logo.jpg"; // place in client/public/Logo.webp

export default function Login() {
  const [userType, setUserType] = useState("customer");
  const [username, setUsername] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [disabled, setDisabled] = useState(false);

  const navigate = useNavigate();
  const { user, loading } = useSession();

  // if already authenticated, go straight to dashboard
  useEffect(() => {
    if (!loading && user) navigate("/dashboard");
  }, [loading, user, navigate]);

  // Base URL works with proxy ("/") or direct .env (http://localhost:3001/)
  const RAW_API = import.meta.env.VITE_API_URL ?? "/";
  const API_BASE = RAW_API.endsWith("/") ? RAW_API : RAW_API + "/";

  const validate = () => {
    const e = {};
    if (!EMAIL_RX.test(username)) e.username = "Enter a valid email.";
    if (!ACCOUNT_RX.test(accountNumber)) e.accountNumber = "Account number must be 10 digits.";
    if (!password) e.password = "Password is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const safeJson = async (res) => {
    try { return await res.clone().json(); }
    catch { const t = await res.text(); return t ? { message: t } : null; }
  };

  const doLogin = async (ev) => {
    ev.preventDefault();
    setSubmitted(true);
    if (!validate()) return;

    setDisabled(true);
    try {
      const res = await fetch(`${API_BASE}auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: username.trim(),
          password,
          accountNumber,
          role: userType,
        }),
      });

      const data = await safeJson(res);
      if (!res.ok) {
        alert((data && (data.message || data.error)) || `Request failed (${res.status})`);
        return;
      }

      localStorage.setItem("email", username.trim());
      navigate("/mfa");
    } catch (err) {
      console.error("Login error:", err);
      alert(err?.message || "Network or server error");
    } finally {
      setDisabled(false);
    }
  };

  const lastClickRef = useRef(0);
  const handleSubmit = (e) => {
    const now = Date.now();
    if (now - lastClickRef.current < 1200) { e.preventDefault(); return; }
    lastClickRef.current = now;
    doLogin(e);
  };

  return (
    <>
      <SplineBG />
      <div className="bg-vignette" />

      <div className="brand-fixed">
        <img className="logo" src={logo} alt="Iron Bank logo" />
        <div>
          <h1>Iron Bank</h1>
          <small>International Payments Portal</small>
        </div>
      </div>

      <div className="auth-shell">
        <div className="auth-card">
          <h2 className="card-title">Sign in</h2>
          <p className="card-sub">Welcome back. Please enter your details.</p>

          {submitted && Object.keys(errors).length > 0 && (
            <div className="error-banner">Please fix the highlighted fields.</div>
          )}

          <div className="user-type-toggle">
            <button
              type="button"
              className={`toggle-btn ${userType === "customer" ? "active" : ""}`}
              onClick={() => setUserType("customer")}
            >User</button>
            <button
              type="button"
              className={`toggle-btn ${userType === "admin" ? "active" : ""}`}
              onClick={() => setUserType("admin")}
            >Admin</button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input
                className={`input ${errors.username ? "invalid" : ""}`}
                id="email"
                type="email"
                placeholder="you@bankmail.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                inputMode="email"
                pattern={EMAIL_RX.source}
              />
              {errors.username && <small className="error">{errors.username}</small>}
            </div>

            <div className="input-group">
              <label htmlFor="acct">Account Number</label>
              <input
                className={`input ${errors.accountNumber ? "invalid" : ""}`}
                id="acct"
                type="text"
                placeholder="10 digits"
                value={accountNumber}
                onChange={(e) =>
                  setAccountNumber(e.target.value.replace(/[^\d]/g, "").slice(0, 10))
                }
                required
                inputMode="numeric"
                pattern={ACCOUNT_RX.source}
              />
              {errors.accountNumber && <small className="error">{errors.accountNumber}</small>}
            </div>

            <div className="input-group">
              <label htmlFor="pw">Password</label>
              <div className="password-wrap">
                <input
                  className={`input ${errors.password ? "invalid" : ""}`}
                  id="pw"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <img
                  className="eye"
                  src="/password_eye.svg"
                  alt="toggle"
                  onClick={() => setShowPassword(!showPassword)}
                />
              </div>
                  {errors.password && <small className="error">{errors.password}</small>}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                  <Link to="/forgot" className="link-btn">Forgot password?</Link>
              </div>
              </div>


            <button type="submit" className="btn" disabled={disabled}>
              {disabled ? "Please wait..." : "Login"}
            </button>
          </form>

          <p className="footer">Don’t have an account? <Link to="/register">Register</Link>.</p>
        </div>
        <div />
      </div>
    </>
  );
}
