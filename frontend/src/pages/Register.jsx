import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { getEncryptionPublicKey } from "../utils/crypto";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [encPubKey, setEncPubKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleConnectWallet = async () => {
    try {
      if (!window.ethereum) {
        setError("MetaMask is not installed!");
        return;
      }
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      if (accounts.length === 0) {
        setError("No accounts found in MetaMask!");
        return;
      }
      setWalletAddress(accounts[0]);
      setError("");

      // Get encryption public key from MetaMask
      try {
        const pubKey = await getEncryptionPublicKey(accounts[0]);
        setEncPubKey(pubKey);
      } catch (keyErr) {
        console.warn("Could not get encryption key:", keyErr);
      }
    } catch (err) {
      console.error("MetaMask connection failed:", err);
      setError("Failed to connect wallet.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/auth/register", {
        name, email, password, walletAddress, encryptionPublicKey: encPubKey,
      });
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Left branding panel */}
      <div style={styles.brandPanel}>
        <div>
          <h1 style={styles.brandTitle}>FortiDocs</h1>
          <p style={styles.brandSub}>
            Create your secure account and start sharing
            documents with blockchain verification.
          </p>
          <div style={styles.steps}>
            <div style={styles.step}>
              <span style={styles.stepNum}>1</span>
              <span>Create your account</span>
            </div>
            <div style={styles.step}>
              <span style={styles.stepNum}>2</span>
              <span>Connect your wallet</span>
            </div>
            <div style={styles.step}>
              <span style={styles.stepNum}>3</span>
              <span>Start sharing securely</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div style={styles.formPanel}>
        <div style={styles.card}>
          <h2 style={styles.heading}>Create Account</h2>
          <p style={styles.subheading}>Get started with FortiDocs</p>

          {error && <div style={styles.errorBox}>{error}</div>}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Full Name</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>

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

            <div style={styles.row2}>
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
              <div style={styles.field}>
                <label style={styles.label}>Confirm</label>
                <input
                  className="input"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleConnectWallet}
              style={styles.walletBtn}
            >
              {walletAddress
                ? `🔗 ${walletAddress.substring(0, 6)}...${walletAddress.slice(-4)}`
                : "🦊 Connect MetaMask Wallet"}
            </button>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={styles.submitBtn}
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <p style={styles.footer}>
            Already have an account?{" "}
            <Link to="/login" style={styles.link}>Sign in</Link>
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
    marginBottom: 36,
  },
  steps: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  step: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    fontSize: 15,
  },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "rgba(37, 99, 235, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 14,
    flexShrink: 0,
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
    maxWidth: 440,
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
    flex: 1,
  },
  row2: {
    display: "flex",
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
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

export default Register;
