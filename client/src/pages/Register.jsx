import React, { useState, useRef, useEffect } from "react";
import SplineBG from "../components/SplineBG";
import "../styles/Login.css";
import { Link, useNavigate } from "react-router-dom";
import { EMAIL_RX, NAME_RX, ID_RX, ACCOUNT_RX, PASSWORD_RX } from "../lib/patterns";
import { useSession } from "../hooks/useSession";

const logo = "/Logo.webp"; // place in client/public/Logo.webp

export default function Register() {
  const [formData, setFormData] = useState({
    firstName: "", surname: "", email: "",
    idNumber: "", accountNumber: "", password: "", confirmPassword: ""
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [disabled, setDisabled] = useState(false);

  const navigate = useNavigate();
  const { user, loading } = useSession();

  // if already authenticated, go straight to dashboard
  useEffect(() => {
    if (!loading && user) navigate("/dashboard");
  }, [loading, user, navigate]);

  // Base URL
  const RAW_API = import.meta.env.VITE_API_URL ?? "/";
  const API_BASE = RAW_API.endsWith("/") ? RAW_API : RAW_API + "/";

  const setField = (k, v) => setFormData((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const e = {};
    if (!NAME_RX.test(formData.firstName)) e.firstName = "Letters, spaces, ', - (2–50).";
    if (!NAME_RX.test(formData.surname))   e.surname  = "Letters, spaces, ', - (2–50).";
    if (!EMAIL_RX.test(formData.email))    e.email    = "Invalid email.";
    if (!ID_RX.test(formData.idNumber))    e.idNumber = "ID must be 13 digits.";
    if (!ACCOUNT_RX.test(formData.accountNumber)) e.accountNumber = "Account number must be 10 digits.";
    if (!PASSWORD_RX.test(formData.password)) e.password = "Min 10, upper, lower, digit, symbol.";
    if (formData.password !== formData.confirmPassword) e.confirmPassword = "Passwords do not match.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const safeJson = async (res) => {
    try { return await res.clone().json(); }
    catch { const t = await res.text(); return t ? { message: t } : null; }
  };

  const handleRegister = async (ev) => {
    ev.preventDefault();
    setSubmitted(true);
    if (!validate()) return;

    setDisabled(true);
    try {
      const res = await fetch(`${API_BASE}auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: formData.email.trim(),
          username: `${formData.firstName} ${formData.surname}`.trim(),
          firstName: formData.firstName.trim(),
          lastName: formData.surname.trim(),
          idNumber: formData.idNumber,
          accountNumber: formData.accountNumber,
          password: formData.password,
        }),
      });

      const data = await safeJson(res);
      if (!res.ok) {
        alert((data && (data.message || data.error)) || `Request failed (${res.status})`);
        return;
      }

      alert("✅ Registration successful!");
      navigate("/login");
    } catch (err) {
      console.error("Register error:", err);
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
    handleRegister(e);
  };

  return (
    <>
      <SplineBG />
      <div className="bg-vignette" />

      <div className="brand-fixed">
        <img className="logo" src={logo} alt="Iron Bank logo" />
        <div>
          <h1>Iron Bank</h1>
          <small>Create your secure profile</small>
        </div>
      </div>

      <div className="auth-shell">
        <div className="auth-card">
          <h2 className="card-title">Create account</h2>
          <p className="card-sub">Fill in your details to continue.</p>

          {submitted && Object.keys(errors).length > 0 && (
            <div className="error-banner">Please fix the highlighted fields.</div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="row">
              <div className="input-group">
                <label htmlFor="first">First name</label>
                <input
                  className={`input ${errors.firstName ? "invalid" : ""}`}
                  id="first"
                  value={formData.firstName}
                  onChange={(e) => setField("firstName", e.target.value)}
                  required
                  pattern={NAME_RX.source}
                />
                {errors.firstName && <small className="error">{errors.firstName}</small>}
              </div>

              <div className="input-group">
                <label htmlFor="last">Surname</label>
                <input
                  className={`input ${errors.surname ? "invalid" : ""}`}
                  id="last"
                  value={formData.surname}
                  onChange={(e) => setField("surname", e.target.value)}
                  required
                  pattern={NAME_RX.source}
                />
                {errors.surname && <small className="error">{errors.surname}</small>}
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input
                className={`input ${errors.email ? "invalid" : ""}`}
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setField("email", e.target.value)}
                required
                inputMode="email"
                pattern={EMAIL_RX.source}
              />
              {errors.email && <small className="error">{errors.email}</small>}
            </div>

            <div className="row">
              <div className="input-group">
                <label htmlFor="idn">ID Number</label>
                <input
                  className={`input ${errors.idNumber ? "invalid" : ""}`}
                  id="idn"
                  value={formData.idNumber}
                  onChange={(e) => setField("idNumber", e.target.value.replace(/[^\d]/g, "").slice(0, 13))}
                  required
                  inputMode="numeric"
                  pattern={ID_RX.source}
                  title="13 digits"
                />
                {errors.idNumber && <small className="error">{errors.idNumber}</small>}
              </div>

              <div className="input-group">
                <label htmlFor="acct">Account Number</label>
                <input
                  className={`input ${errors.accountNumber ? "invalid" : ""}`}
                  id="acct"
                  value={formData.accountNumber}
                  onChange={(e) => setField("accountNumber", e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
                  required
                  inputMode="numeric"
                  pattern={ACCOUNT_RX.source}
                  title="10 digits"
                />
                {errors.accountNumber && <small className="error">{errors.accountNumber}</small>}
              </div>
            </div>

            <div className="row">
              <div className="input-group">
                <label htmlFor="pw">Password</label>
                <input
                  className={`input ${errors.password ? "invalid" : ""}`}
                  id="pw"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setField("password", e.target.value)}
                  required
                  pattern={PASSWORD_RX.source}
                />
                {errors.password && <small className="error">{errors.password}</small>}
              </div>

              <div className="input-group">
                <label htmlFor="cpw">Confirm password</label>
                <input
                  className={`input ${errors.confirmPassword ? "invalid" : ""}`}
                  id="cpw"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setField("confirmPassword", e.target.value)}
                  required
                />
                {errors.confirmPassword && <small className="error">{errors.confirmPassword}</small>}
              </div>
            </div>

            <button type="submit" className="btn" disabled={disabled}>
              {disabled ? "Please wait..." : "Create account"}
            </button>
          </form>

          <p className="footer">Already have an account? <Link to="/login">Sign in</Link>.</p>
        </div>
        <div />
      </div>
    </>
  );
}
