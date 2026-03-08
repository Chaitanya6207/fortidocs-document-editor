import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { getEncryptionPublicKey } from "../utils/crypto";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [useWallet, setUseWallet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setError("MetaMask is not installed.");
        return;
      }
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setWalletAddress(accounts[0]);
      setError("");
    } catch (err) {
      console.error("Wallet connection error:", err);
      setError("Failed to connect wallet.");
    }
  };

  const getNonce = async (email) => {
    try {
      const res = await api.get(`/api/auth/nonce/${email}`);
      return res.data.nonce;
    } catch (err) {
      console.error("Nonce fetch error:", err);
      setError("Error fetching user nonce.");
      return null;
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!useWallet) {
      try {
        const res = await api.post("/api/auth/login", { email, password });
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        navigate("/editor");
      } catch (err) {
        setError(err.response?.data?.error || "Login failed");
      }
      setLoading(false);
      return;
    }

    if (useWallet && !walletAddress) {
      setError("Please connect your wallet first.");
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

      const res = await api.post("/api/auth/login-verify", {
        email, password, walletAddress, signature,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      // Get and store encryption public key from MetaMask
      try {
        const encPubKey = await getEncryptionPublicKey(walletAddress);
        await api.post("/api/keys/public", { encryptionPublicKey: encPubKey });
        // Update local user object with the key
        const updatedUser = { ...res.data.user, encryptionPublicKey: encPubKey };
        localStorage.setItem("user", JSON.stringify(updatedUser));
      } catch (keyErr) {
        console.warn("Could not get encryption public key:", keyErr);
      }

      navigate("/editor");
    } catch (err) {
      setError(err.response?.data?.error || "Secure login failed");
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      {/* Left branding panel */}
      <div style={styles.brandPanel}>
        <div>
          <h1 style={styles.brandTitle}>FortiDocs</h1>
          <p style={styles.brandSub}>
            Blockchain-powered document sharing.<br />
            Secure. Decentralized. Verified.
          </p>
          <div style={styles.features}>
            <div style={styles.feature}>🔗 IPFS Storage</div>
            <div style={styles.feature}>🔐 Wallet Authentication</div>
            <div style={styles.feature}>📄 Rich Document Editor</div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div style={styles.formPanel}>
        <div style={styles.card}>
          <h2 style={styles.heading}>Welcome back</h2>
          <p style={styles.subheading}>Sign in to your account</p>

          {error && <div style={styles.errorBox}>{error}</div>}

          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <label style={styles.checkRow}>
              <input
                type="checkbox"
                checked={useWallet}
                onChange={(e) => setUseWallet(e.target.checked)}
                style={styles.checkbox}
              />
              <span>Enable Secure Wallet Login</span>
            </label>

            {useWallet && (
              <button type="button" onClick={connectWallet} style={styles.walletBtn}>
                {walletAddress
                  ? `🔗 ${walletAddress.substring(0, 6)}...${walletAddress.slice(-4)}`
                  : "🦊 Connect MetaMask"}
              </button>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={styles.submitBtn}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p style={styles.footer}>
            Don't have an account?{" "}
            <Link to="/register" style={styles.link}>Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
  },
  brandPanel: {
    flex: "0 0 45%",
    background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 48,
  },
  brandTitle: {
    fontSize: 42,
    fontWeight: 800,
    marginBottom: 12,
    letterSpacing: "-0.02em",
  },
  brandSub: {
    fontSize: 16,
    color: "#94a3b8",
    lineHeight: 1.7,
    marginBottom: 32,
  },
  features: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  feature: {
    background: "rgba(255,255,255,0.08)",
    padding: "10px 16px",
    borderRadius: 8,
    fontSize: 14,
    backdropFilter: "blur(8px)",
  },
  formPanel: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    background: "#f8fafc",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    background: "#fff",
    borderRadius: 16,
    padding: 36,
    boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
    border: "1px solid #e2e8f0",
  },
  heading: {
    fontSize: 24,
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 24,
  },
  errorBox: {
    background: "#fef2f2",
    color: "#dc2626",
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 16,
    border: "1px solid #fecaca",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
  },
  checkRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "#475569",
    cursor: "pointer",
  },
  checkbox: {
    width: 16,
    height: 16,
    accentColor: "#2563eb",
  },
  walletBtn: {
    padding: "10px 16px",
    background: "linear-gradient(135deg, #059669, #10b981)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  },
  submitBtn: {
    width: "100%",
    padding: "12px 0",
    fontSize: 15,
    fontWeight: 600,
    borderRadius: 8,
    marginTop: 4,
  },
  footer: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 13,
    color: "#64748b",
  },
  link: {
    color: "#2563eb",
    fontWeight: 600,
  },
};

export default Login;
