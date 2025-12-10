import React, { useState } from "react";
import { Link } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Login with:", { email, password });
    alert("Login clicked (backend coming later)");
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>FortiDocs Login</h2>
        <form onSubmit={handleSubmit} style={styles.form}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
            />
          </label>

          <button type="submit" style={styles.button}>
            Login
          </button>
        </form>

        <p style={{ marginTop: "10px" }}>
          Don’t have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f4f4f4",
  },
  card: {
    background: "#fff",
    padding: "24px",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    minWidth: "320px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  input: {
    width: "100%",
    padding: "8px",
    marginTop: "4px",
  },
  button: {
    marginTop: "8px",
    padding: "10px",
    border: "none",
    background: "#2563eb",
    color: "white",
    borderRadius: "4px",
    cursor: "pointer",
  },
};

export default Login;
