import React from "react";
import "../styles/Login.css";
import SplineBG from "../components/SplineBG";
import { useSession } from "../hooks/useSession";
import { useNavigate } from "react-router-dom";

const logo = "/Logo.webp";

export default function Dashboard() {
  const { user, logout } = useSession();
  const navigate = useNavigate();

  const doLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <>
      <SplineBG />
      <div className="bg-vignette" />

      {/* brand */}
      <div className="brand-fixed">
        <img className="logo" src={logo} alt="Iron Bank logo" />
        <div>
          <h1>Iron Bank</h1>
          <small>Account dashboard</small>
        </div>
      </div>

      {/* centered card using existing style */}
      <div className="dash-shell">
        <div className="auth-card">
          <h2 className="card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Welcome</span>
            <button className="link-btn" onClick={doLogout} title="Log out">Logout</button>
          </h2>
          <p className="card-sub" style={{ marginBottom: 18 }}>
            You are signed in as <b>{user?.email}</b> ({user?.role}).
          </p>

          <div className="dash-grid">
            <div className="dash-tile">
              <h3>Balances</h3>
              <p>Coming soon…</p>
            </div>
            <div className="dash-tile">
              <h3>Recent activity</h3>
              <p>Coming soon…</p>
            </div>
            <div className="dash-tile">
              <h3>Transfers</h3>
              <p>Coming soon…</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
