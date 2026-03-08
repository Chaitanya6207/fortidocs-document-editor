import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "react-quill/dist/quill.snow.css";
import { decryptAES, decryptWithWallet } from "../utils/crypto";

export default function Viewer() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const cid = params.get("cid");
  const filename = params.get("filename") || "Shared Document";
  const encryptedKeyParam = params.get("encryptedKey"); // JSON string of wallet-encrypted AES key

  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [decrypting, setDecrypting] = useState(false);
  const [isEncrypted, setIsEncrypted] = useState(false);

  useEffect(() => {
    if (!cid) {
      setError("No CID provided.");
      setLoading(false);
      return;
    }

    const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;

    fetch(gatewayUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`IPFS fetch failed (${res.status})`);
        return res.json();
      })
      .then(async (data) => {
        // --- ENCRYPTED DOCUMENT ---
        if (data.type === "encrypted-document" && data.encryptedContent) {
          setIsEncrypted(true);

          if (!encryptedKeyParam) {
            setError("This document is encrypted but no decryption key was provided.");
            return;
          }

          if (!window.ethereum) {
            setError("MetaMask is required to decrypt this document.");
            return;
          }

          setDecrypting(true);
          try {
            // Get current wallet address
            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            const account = accounts[0];

            // Parse the encrypted AES key
            // encryptedKeyParam is already decoded by URLSearchParams.get()
            let encryptedKeyObj;
            try {
              encryptedKeyObj = JSON.parse(encryptedKeyParam);
            } catch (parseErr) {
              console.error("Failed to parse encryptedKey:", parseErr);
              setError("Invalid encryption key format.");
              return;
            }

            // Decrypt AES key using wallet
            const aesKey = await decryptWithWallet(encryptedKeyObj, account);

            if (!aesKey) {
              setError("Wallet decryption returned empty key.");
              return;
            }

            // Decrypt content with AES key
            const plaintext = decryptAES(data.encryptedContent, aesKey);
            if (!plaintext) {
              setError("Decryption failed — wrong key or corrupted data.");
              return;
            }
            setHtml(plaintext);
          } catch (decErr) {
            console.error("Decryption error:", decErr);
            if (decErr.code === 4001) {
              setError("Decryption was cancelled by user.");
            } else if (decErr.code === -32601 || decErr.message?.includes("not found")) {
              setError("Your wallet does not support eth_decrypt. Try using MetaMask.");
            } else {
              setError(`Failed to decrypt: ${decErr.message || "Make sure you're using the correct wallet."}`);
            }
          } finally {
            setDecrypting(false);
          }
          return;
        }

        // --- UNENCRYPTED DOCUMENT (backward compatible) ---
        if (data.content) {
          setHtml(data.content);
        } else if (typeof data === "string") {
          setHtml(data);
        } else {
          setHtml(`<pre>${JSON.stringify(data, null, 2)}</pre>`);
        }
      })
      .catch((err) => {
        console.error("Viewer fetch error:", err);
        setError("Failed to load document from IPFS.");
      })
      .finally(() => setLoading(false));
  }, [cid, encryptedKeyParam]);

  return (
    <div style={styles.wrapper}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <button onClick={() => navigate(-1)} className="btn btn-ghost" style={styles.backBtn}>
          ← Back
        </button>

        <div style={styles.titleArea}>
          <span style={styles.fileIcon}>📄</span>
          <div>
            <div style={styles.filename}>
              {isEncrypted && "🔐 "}{filename}
            </div>
            <div style={styles.cidLabel}>
              CID: {cid ? `${cid.substring(0, 16)}…` : "N/A"}
              {isEncrypted && " • Encrypted"}
            </div>
          </div>
        </div>

        <div style={styles.topActions}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() =>
              navigator.clipboard.writeText(`https://gateway.pinata.cloud/ipfs/${cid}`)
            }
          >
            Copy Link
          </button>
          {!isEncrypted && (
            <a
              href={`https://gateway.pinata.cloud/ipfs/${cid}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost btn-sm"
            >
              View Raw
            </a>
          )}
        </div>
      </div>

      {/* Content area */}
      {(loading || decrypting) && (
        <div style={styles.center}>
          <div className="spinner" />
          <p style={{ marginTop: 12, color: "#64748b" }}>
            {decrypting ? "🔐 Decrypting with your wallet…" : "Fetching from IPFS…"}
          </p>
        </div>
      )}

      {error && (
        <div style={styles.center}>
          <div style={styles.errorBox}>
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {!loading && !decrypting && !error && (
        <div style={styles.pageWrap}>
          <div className="ql-snow" style={styles.page}>
            <div
              className="ql-editor"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    background: "#e5e7eb",
  },
  topBar: {
    background: "linear-gradient(90deg, #0f172a, #1e293b)",
    color: "#fff",
    padding: "12px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  },
  backBtn: {
    color: "#cbd5e1",
    borderColor: "#334155",
  },
  titleArea: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  fileIcon: {
    fontSize: 28,
  },
  filename: {
    fontWeight: 600,
    fontSize: 15,
  },
  cidLabel: {
    fontSize: 11,
    color: "#64748b",
    fontFamily: "monospace",
  },
  topActions: {
    display: "flex",
    gap: 8,
  },
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 60,
  },
  errorBox: {
    background: "#fef2f2",
    color: "#dc2626",
    padding: "14px 20px",
    borderRadius: 8,
    border: "1px solid #fecaca",
    fontSize: 14,
  },
  pageWrap: {
    padding: 30,
    display: "flex",
    justifyContent: "center",
  },
  page: {
    background: "#fff",
    width: "210mm",
    minHeight: "297mm",
    padding: 40,
    boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
    borderRadius: 4,
  },
};
