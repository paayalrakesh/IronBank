import React, { useEffect, useMemo, useState } from "react";
import "../styles/Login.css";
import SplineBG from "../components/SplineBG";
import { useSession } from "../hooks/useSession";
import { useNavigate } from "react-router-dom";

const logo = "/Logo.webp";

function rands(cents) {
  const n = Number(cents || 0);
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(n / 100);
}
function shortDate(iso) {
  return new Date(iso).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
}

export default function Dashboard() {
  const { user, logout, API_BASE } = useSession();
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [tx, setTx] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transfer, setTransfer] = useState({
    fromAccountId: "",
    toAccountNumber: "",
    amount: "",
    memo: ""
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const pull = async () => {
    setLoading(true);
    try {
      const [aRes, tRes] = await Promise.all([
        fetch(`${API_BASE}banking/accounts`, { credentials: "include" }),
        fetch(`${API_BASE}banking/transactions?limit=20`, { credentials: "include" })
      ]);
      const [a, t] = await Promise.all([aRes.json(), tRes.json()]);
      setAccounts(a || []);
      setTx(t || []);
      if (!transfer.fromAccountId && a?.[0]?.id) {
        setTransfer((p) => ({ ...p, fromAccountId: a[0].id }));
      }
    } catch (err) {
      console.error(err);
      setMsg("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { pull(); /* eslint-disable-next-line */ }, []);

  const totalBalance = useMemo(
    () => accounts.reduce((s, a) => s + (a.balanceCents || 0), 0),
    [accounts]
  );

  const doLogout = async () => {
    await logout();
    navigate("/login");
  };

  const submitTransfer = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`${API_BASE}banking/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(transfer)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data?.message || `Transfer failed (${res.status})`);
        return;
      }
      setMsg("✅ Transfer complete");
      setTransfer((p) => ({ ...p, amount: "", memo: "", toAccountNumber: "" }));
      await pull();
    } catch (err) {
      console.error(err);
      setMsg(err?.message || "Network error");
    } finally {
      setBusy(false);
    }
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

      {/* dashboard content */}
      <div className="dash-shell">
        <div className="auth-card" style={{ minWidth: 320, width: "min(1100px, 92vw)" }}>
          <div className="card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Welcome, {user?.email}</span>
            <button className="link-btn" onClick={doLogout}>Logout</button>
          </div>
          <p className="card-sub" style={{ marginBottom: 8 }}>
            Total balance across accounts: <b>{rands(totalBalance)}</b>
          </p>

          {/* Accounts */}
          <h3 style={{ marginTop: 8, marginBottom: 6 }}>Your accounts</h3>
          {loading ? (
            <p>Loading…</p>
          ) : (
            <div className="dash-grid">
              {accounts.map((a) => (
                <div className="dash-tile" key={a.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{a.type} ({a.currency})</div>
                      <div style={{ opacity: .8, fontSize: 13 }}>Acct: {a.number}</div>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{rands(a.balanceCents)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Transfer */}
          <h3 style={{ marginTop: 16, marginBottom: 6 }}>New transfer</h3>
          <form onSubmit={submitTransfer} className="transfer-grid">
            <select
              className="input"
              value={transfer.fromAccountId}
              onChange={(e) => setTransfer((p) => ({ ...p, fromAccountId: e.target.value }))}
              required
            >
              <option value="">From account…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.type} • {a.number} • {rands(a.balanceCents)}
                </option>
              ))}
            </select>

            <input
              className="input"
              placeholder="To account number (10 digits)"
              value={transfer.toAccountNumber}
              onChange={(e) => setTransfer((p) => ({ ...p, toAccountNumber: e.target.value.replace(/[^\d]/g, "").slice(0,10) }))}
              pattern="^\d{10}$"
              required
            />
            <input
              className="input"
              placeholder="Amount (e.g. 250.00)"
              value={transfer.amount}
              onChange={(e) => setTransfer((p) => ({ ...p, amount: e.target.value }))}
              inputMode="decimal"
              required
            />
            <input
              className="input"
              placeholder="Memo (optional)"
              value={transfer.memo}
              onChange={(e) => setTransfer((p) => ({ ...p, memo: e.target.value }))}
            />
            <button className="btn" disabled={busy} type="submit">
              {busy ? "Processing…" : "Send"}
            </button>
          </form>
          {msg && <div className="error-banner" style={{ marginTop: 8 }}>{msg}</div>}

          {/* Activity */}
          <h3 style={{ marginTop: 16, marginBottom: 6 }}>Recent activity</h3>
          {loading ? (
            <p>Loading…</p>
          ) : tx.length === 0 ? (
            <p>No transactions yet.</p>
          ) : (
            <div className="tx-table">
              <div className="tx-head">
                <span>Date</span>
                <span>Account</span>
                <span>Memo</span>
                <span>Amount</span>
                <span>Balance</span>
              </div>
              {tx.map((t) => (
                <div className="tx-row" key={t.id}>
                  <span>{shortDate(t.createdAt)}</span>
                  <span>{t.account?.type} • {t.account?.number}</span>
                  <span>{t.memo || (t.direction === "in" ? "Credit" : "Debit")} {t.counterpartyNumber ? `(${t.counterpartyNumber})` : ""}</span>
                  <span style={{ fontWeight: 700, color: t.direction === "in" ? "#7EE787" : "#FF9AA2" }}>
                    {t.direction === "in" ? "+" : "-"}{rands(t.amountCents)}
                  </span>
                  <span>{rands(t.balanceAfterCents)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
