// frontend/src/pages/Register.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleConnectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert("MetaMask not detected. Install MetaMask and import Ganache account first.");
        return;
      }
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (accounts && accounts.length > 0) {
        setWalletAddress(accounts[0]);
      }
    } catch (err) {
      console.error("Wallet connect error:", err);
      alert("Could not connect wallet. See console for details.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      alert("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const payload = { name, email, password, walletAddress };
      const res = await axios.post("http://localhost:5000/api/auth/register", payload);
      alert("Registered successfully. Please login.");
      navigate("/login");
    } catch (err) {
      console.error("Registration error:", err);
      const message = err.response?.data?.error || "Registration failed";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>FortiDocs Registration</h2>
        <form onSubmit={handleSubmit} style={styles.form}>
          <label>
            Full Name
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={styles.input} />
          </label>

          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={styles.input} />
          </label>

          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={styles.input} />
          </label>

          <label>
            Confirm Password
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required style={styles.input} />
          </label>

          <div style={{ marginTop: 8 }}>
            <button type="button" onClick={handleConnectWallet} style={styles.walletBtn}>
              {walletAddress ? `Connected: ${walletAddress.substring(0, 6)}...${walletAddress.slice(-4)}` : "Connect Wallet (MetaMask)"}
            </button>
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <p style={{ marginTop: "10px" }}>
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#f4f4f4" },
  card: { background: "#fff", padding: "24px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", minWidth: "320px" },
  form: { display: "flex", flexDirection: "column", gap: "12px" },
  input: { width: "100%", padding: "8px", marginTop: "4px" },
  button: { marginTop: "8px", padding: "10px", border: "none", background: "#16a34a", color: "white", borderRadius: "4px", cursor: "pointer" },
  walletBtn: { padding: "8px 12px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", borderRadius: 6 },
};

export default Register;
