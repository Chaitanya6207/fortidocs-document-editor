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
        alert("MetaMask is not installed!");
        return;
      }

      // Force popup by requesting connection
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length === 0) {
        alert("No accounts found in MetaMask!");
        return;
      }

      setWalletAddress(accounts[0]);
    } catch (err) {
      console.error("MetaMask connection failed:", err);
      alert("Failed to connect wallet.");
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
      const payload = {
        name,
        email,
        password,
        walletAddress,
      };

      await axios.post("http://localhost:5000/api/auth/register", payload);

      alert("Registered successfully!");
      navigate("/login");
    } catch (err) {
      console.error("Registration Error:", err);
      alert(err.response?.data?.error || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>Create Account</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label>Name</label>
          <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} required />

          <label>Email</label>
          <input style={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

          <label>Password</label>
          <input style={styles.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

          <label>Confirm Password</label>
          <input style={styles.input} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />

          <button
            type="button"
            onClick={handleConnectWallet}
            style={styles.walletBtn}
          >
            {walletAddress
              ? `Connected: ${walletAddress.substring(0, 6)}...${walletAddress.slice(-4)}`
              : "Connect Wallet"}
          </button>

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <p>Already have an account? <Link to="/login">Log in</Link></p>
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#f1f5f9" },
  card: { background: "#fff", padding: 20, borderRadius: 8, boxShadow: "0 2px 10px rgba(0,0,0,0.1)", width: 320 },
  form: { display: "flex", flexDirection: "column", gap: 10 },
  input: { padding: 8, borderRadius: 4, border: "1px solid #ccc" },
  button: { padding: 10, background: "#2563eb", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", marginTop: 10 },
  walletBtn: { padding: 10, background: "#22c55e", color: "#fff", borderRadius: 4, border: "none", cursor: "pointer" },
};

export default Register;
