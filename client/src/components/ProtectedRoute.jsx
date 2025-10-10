import React from "react";
import { Navigate } from "react-router-dom";
import { useSession } from "../hooks/useSession";

export default function ProtectedRoute({ children, allow = ["customer", "admin"] }) {
  const { user, loading } = useSession();

  if (loading) {
    return (
      <div style={{
        height: "100vh", display: "grid", placeItems: "center",
        color: "#E8E8F0", fontSize: 16, letterSpacing: 0.3
      }}>
        Checking your session…
      </div>
    );
  }

  if (!user || (allow && !allow.includes(user.role))) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
