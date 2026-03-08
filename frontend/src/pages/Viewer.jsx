import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import "react-quill/dist/quill.snow.css";
import api from "../utils/api";

/**
 * Viewer — session-based decryption (no MetaMask popup).
 *
 * URL params:
 *   fileId   — MongoDB _id of the File document (preferred, uses server-side decrypt)
 *   cid      — (optional fallback) IPFS CID  
 *   filename — display name
 */
export default function Viewer() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const fileId = params.get("fileId");
  const cid = params.get("cid");
  const filename = params.get("filename") || "Shared Document";

  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [displayCid, setDisplayCid] = useState(cid || "");

  useEffect(() => {
    let cancelled = false;

    const loadDocument = async () => {
      try {
        // ──────────── SESSION-BASED DECRYPT (preferred) ────────────
        if (fileId) {
          console.log("[Viewer] Loading via session-based decrypt, fileId:", fileId);
          const res = await api.get(`/api/doc/view/${fileId}`);
          if (cancelled) return;

          const { html: docHtml, cid: docCid, encrypted } = res.data;
          setHtml(docHtml);
          setIsEncrypted(!!encrypted);
          if (docCid) setDisplayCid(docCid);
          return;
        }

        // ──────────── FALLBACK: direct IPFS fetch (unencrypted only) ────
        if (!cid) {
          setError("No file ID or CID provided.");
          return;
        }

        console.log("[Viewer] Fetching CID:", cid);
        let data;
        try {
          const res = await api.get(`/api/doc/ipfs/${cid}`);
          data = res.data;
        } catch (fetchErr) {
          const directRes = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
          if (!directRes.ok) throw new Error(`IPFS fetch failed (${directRes.status})`);
          data = await directRes.json();
        }

        if (cancelled) return;

        if (data.type === "encrypted-document") {
          setError("This document is encrypted. Please open it from My Files or Inbox so the session can decrypt it.");
          return;
        }

        if (data.content) {
          setHtml(data.content);
        } else if (typeof data === "string") {
          setHtml(data);
        } else {
          setHtml(`<pre>${JSON.stringify(data, null, 2)}</pre>`);
        }
      } catch (err) {
        console.error("[Viewer] Load error:", err);
        if (!cancelled) {
          const msg = err.response?.data?.error || "Failed to load document.";
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadDocument();
    return () => { cancelled = true; };
  }, [fileId, cid]);

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
              {displayCid ? `CID: ${displayCid.substring(0, 16)}…` : ""}
              {isEncrypted && " • Encrypted (session-decrypted)"}
            </div>
          </div>
        </div>

        <div style={styles.topActions}>
          {displayCid && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() =>
                navigator.clipboard.writeText(`https://gateway.pinata.cloud/ipfs/${displayCid}`)
              }
            >
              Copy Link
            </button>
          )}
          {!isEncrypted && displayCid && (
            <a
              href={`https://gateway.pinata.cloud/ipfs/${displayCid}`}
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
      {loading && (
        <div style={styles.center}>
          <div className="spinner" />
          <p style={{ marginTop: 12, color: "#64748b" }}>
            Loading document…
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

      {!loading && !error && (
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
