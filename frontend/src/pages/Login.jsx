// frontend/src/pages/Login.jsx
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

  const handleConnectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask not detected. Install MetaMask first.");
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (accounts && accounts.length > 0) setWalletAddress(accounts[0]);
    } catch (err) {
      console.error("Wallet connect error", err);
    }
  };

  async function getNonce(email) {
    try {
      const res = await axios.get(`http://localhost:5000/api/auth/nonce/${encodeURIComponent(email)}`);
      return res.data.nonce;
    } catch (err) {
      console.error("Failed to get nonce:", err);
      return null;
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (useWallet) {
      if (!walletAddress) {
        alert("Connect a wallet to use the secure login");
        setLoading(false);
        return;
      }
      try {
        const nonce = await getNonce(email);
        if (!nonce) throw new Error("Could not obtain nonce");

        const message = `Login nonce: ${nonce}`;
        const signature = await window.ethereum.request({
          method: "personal_sign",
          params: [message, walletAddress],
        });

        const payload = { email, password, walletAddress, signature };
        const res = await axios.post("http://localhost:5000/api/auth/login-verify", payload);

        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        alert("Login successful (verified with wallet)");
        navigate("/editor");
      } catch (err) {
        console.error("Secure login error:", err);
        alert(err.response?.data?.error || err.message || "Login failed");
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      alert("Login successful");
      navigate("/editor");
    } catch (err) {
      console.error("Login error:", err);
      alert(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>FortiDocs Login</h2>
        <form onSubmit={handleSubmit} style={styles.form}>
          <label>Email
            <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required style={styles.input} />
          </label>

          <label>Password
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required style={styles.input} />
          </label>

          <label style={{display:"flex", gap:8, alignItems:"center"}}>
            <input type="checkbox" checked={useWallet} onChange={(e)=>setUseWallet(e.target.checked)} />
            <span>Use connected wallet for extra verification</span>
          </label>

          {useWallet && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button type="button" onClick={handleConnectWallet} style={styles.walletBtn}>
                {walletAddress ? `Connected: ${walletAddress.substring(0,6)}...${walletAddress.slice(-4)}` : "Connect Wallet (MetaMask)"}
              </button>
              <div style={{ fontSize: 12, color: "#666" }}>{walletAddress ? "" : "Click connect then sign when prompted"}</div>
            </div>
          )}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p style={{ marginTop: 10 }}>
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight:"100vh", display:"flex", justifyContent:"center", alignItems:"center", background:"#f4f4f4" },
  card: { background:"#fff", padding:24, borderRadius:8, boxShadow:"0 2px 8px rgba(0,0,0,0.1)", minWidth:320 },
  form: { display:"flex", flexDirection:"column", gap:12 },
  input: { width:"100%", padding:8, marginTop:4 },
  button: { marginTop:8, padding:10, border:"none", background:"#2563eb", color:"#fff", borderRadius:4, cursor:"pointer" },
  walletBtn: { padding:"8px 12px", border:"1px solid #ddd", background:"#fff", cursor:"pointer", borderRadius:6 }
};

export default Login;
