import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import api from "../utils/api";

/**
 * Viewer — supports VIEW (read-only) and EDIT (editable with save) modes.
 *
 * URL params:
 *   fileId     — MongoDB _id of the File document (preferred)
 *   cid        — (optional fallback) IPFS CID
 *   filename   — display name
 *   permission — VIEW or EDIT
 */
export default function Viewer() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const quillRef = useRef(null);

  const fileId = params.get("fileId");
  const cid = params.get("cid");
  const filename = params.get("filename") || "Shared Document";
  const urlPermission = params.get("permission") || "VIEW";

  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("");
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [displayCid, setDisplayCid] = useState(cid || "");
  const [permission, setPermission] = useState(urlPermission);
  const [dirty, setDirty] = useState(false);

  const canEdit = permission === "EDIT";

  // Track edits via ref to avoid controlled-component re-render loop
  const currentContent = useRef("");

  const handleEditorChange = useCallback((value) => {
    currentContent.current = value;
    setDirty(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadDocument = async () => {
      try {
        if (fileId) {
          const res = await api.get(`/api/doc/view/${fileId}`);
          if (cancelled) return;

          const { html: docHtml, cid: docCid, encrypted, permission: serverPerm } = res.data;
          setHtml(docHtml);
          currentContent.current = docHtml;
          setIsEncrypted(!!encrypted);
          if (docCid) setDisplayCid(docCid);
          if (serverPerm) setPermission(serverPerm);
          return;
        }

        if (!cid) {
          setError("No file ID or CID provided.");
          return;
        }

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

        const content = data.content || (typeof data === "string" ? data : `<pre>${JSON.stringify(data, null, 2)}</pre>`);
        setHtml(content);
        currentContent.current = content;
      } catch (err) {
        console.error("[Viewer] Load error:", err);
        if (!cancelled) {
          setError(err.response?.data?.error || "Failed to load document.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadDocument();
    return () => { cancelled = true; };
  }, [fileId, cid]);

  const saveEdits = async () => {
    if (!fileId || !canEdit) return;
    try {
      setSaving(true);
      setStatus("Creating new version…");
      const res = await api.post(`/api/doc/edit/${fileId}`, { content: currentContent.current });
      setDisplayCid(res.data.cid || displayCid);
      setHtml(currentContent.current);
      setDirty(false);
      const ver = res.data.version ? ` (v${res.data.version})` : "";
      setStatus(`✅ New version created${ver}!`);
      setTimeout(() => setStatus(""), 3000);
    } catch (err) {
      console.error("Save edit error:", err);
      setStatus(err.response?.data?.error || "Failed to save edits");
      setTimeout(() => setStatus(""), 4000);
    } finally {
      setSaving(false);
    }
  };

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
              <span style={{
                ...styles.permBadge,
                background: canEdit ? "#dcfce7" : "#dbeafe",
                color: canEdit ? "#16a34a" : "#2563eb",
              }}>
                {canEdit ? "✏️ EDIT" : "👁 VIEW"}
              </span>
            </div>
            <div style={styles.cidLabel}>
              {displayCid ? `CID: ${displayCid.substring(0, 16)}…` : ""}
              {isEncrypted && " • Encrypted (session-decrypted)"}
            </div>
          </div>
        </div>

        <div style={styles.topActions}>
          {status && <span style={styles.statusBadge}>{status}</span>}
          {canEdit && (
            <button
              className="btn btn-success btn-sm"
              onClick={saveEdits}
              disabled={saving || !dirty}
              style={{ opacity: dirty ? 1 : 0.5 }}
            >
              {saving ? "Saving…" : "💾 Save"}
            </button>
          )}
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
        </div>
      </div>

      {/* Content area */}
      {loading && (
        <div style={styles.center}>
          <div className="spinner" />
          <p style={{ marginTop: 12, color: "#64748b" }}>Loading document…</p>
        </div>
      )}

      {error && (
        <div style={styles.center}>
          <div style={styles.errorBox}>
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {!loading && !error && !canEdit && (
        <div style={styles.pageWrap}>
          <div className="ql-snow" style={styles.page}>
            <div
              className="ql-editor"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </div>
      )}

      {!loading && !error && canEdit && (
        <div style={styles.pageWrap}>
          <div style={styles.page}>
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={html}
              onChange={handleEditorChange}
              modules={editorModules}
              style={{ minHeight: "100%", background: "transparent" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const editorModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ align: [] }],
    ["link", "image"],
    ["clean"],
  ],
};

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
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  cidLabel: {
    fontSize: 11,
    color: "#64748b",
    fontFamily: "monospace",
  },
  permBadge: {
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 12,
    letterSpacing: "0.04em",
  },
  topActions: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  statusBadge: {
    background: "rgba(37, 99, 235, 0.15)",
    color: "#93c5fd",
    padding: "5px 14px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
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
