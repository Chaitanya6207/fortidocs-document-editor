import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [useWallet, setUseWallet] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert("MetaMask is not installed.");
        return;
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      setWalletAddress(accounts[0]);
    } catch (err) {
      console.error("Wallet connection error:", err);
    }
  };

  const getNonce = async (email) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/auth/nonce/${email}`);
      return res.data.nonce;
    } catch (err) {
      console.error("Nonce fetch error:", err);
      alert("Error fetching user nonce.");
      return null;
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!useWallet) {
      try {
        const res = await axios.post("http://localhost:5000/api/auth/login", {
          email,
          password,
        });

        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        navigate("/editor");
      } catch (err) {
        alert(err.response?.data?.error || "Login failed");
      }
      setLoading(false);
      return;
    }

    if (useWallet && !walletAddress) {
      alert("Please connect your wallet first.");
      setLoading(false);
      return;
    }

    try {
      const nonce = await getNonce(email);

      const message = `Login nonce: ${nonce}`;
      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [message, walletAddress],
      });

      const res = await axios.post("http://localhost:5000/api/auth/login-verify", {
        email,
        password,
        walletAddress,
        signature,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      alert("Login Verified with Wallet!");
      navigate("/editor");
    } catch (err) {
      alert(err.response?.data?.error || "Secure login failed");
    }

    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>Login</h2>

        <form onSubmit={handleLogin} style={styles.form}>
          <label>Email</label>
          <input style={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

          <label>Password</label>
          <input style={styles.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={useWallet} onChange={(e) => setUseWallet(e.target.checked)} />
            Enable Secure Wallet Login
          </label>

          {useWallet && (
            <button type="button" onClick={connectWallet} style={styles.walletBtn}>
              {walletAddress
                ? `Wallet: ${walletAddress.substring(0, 6)}...${walletAddress.slice(-4)}`
                : "Connect Wallet"}
            </button>
          )}

          <button disabled={loading} style={styles.button}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p>Don't have an account? <Link to="/register">Register</Link></p>
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#eef2ff" },
  card: { background: "white", padding: 20, borderRadius: 10, width: 320, boxShadow: "0 3px 10px rgba(0,0,0,0.15)" },
  form: { display: "flex", flexDirection: "column", gap: 10 },
  input: { padding: 8, border: "1px solid #aaa", borderRadius: 4 },
  button: { padding: 10, background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", marginTop: 10 },
  walletBtn: { padding: 10, background: "#22c55e", color: "white", border: "none", borderRadius: 6, cursor: "pointer" },
};

export default Login;
