import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

const ACTION_LABELS = {
  CREATED: { label: "Created", color: "#2563eb", bg: "#eff6ff", icon: "📄" },
  SAVED_CLOUD: { label: "Saved to Cloud", color: "#7c3aed", bg: "#f5f3ff", icon: "☁️" },
  SHARED: { label: "Shared", color: "#059669", bg: "#f0fdf4", icon: "🔗" },
  OPENED: { label: "Opened", color: "#6366f1", bg: "#eef2ff", icon: "📂" },
  VIEWED: { label: "Viewed", color: "#0ea5e9", bg: "#f0f9ff", icon: "👁" },
  DELETED: { label: "Deleted", color: "#dc2626", bg: "#fef2f2", icon: "🗑️" },
  EDITED: { label: "Edited", color: "#f59e0b", bg: "#fffbeb", icon: "✏️" },
  VERSIONED: { label: "New Version", color: "#8b5cf6", bg: "#f5f3ff", icon: "📜" },
  SAVED_LOCAL: { label: "Saved Locally", color: "#10b981", bg: "#ecfdf5", icon: "💾" },
  EXPORTED: { label: "Exported", color: "#f97316", bg: "#fff7ed", icon: "📤" },
  PRINTED: { label: "Printed", color: "#64748b", bg: "#f8fafc", icon: "🖨️" },
  DOWNLOADED: { label: "Downloaded", color: "#0891b2", bg: "#ecfeff", icon: "⬇️" },
};

export default function Sent() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedFile, setExpandedFile] = useState(null);
  const [logs, setLogs] = useState({});
  const [logsLoading, setLogsLoading] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchSent();
  }, []);

  async function fetchSent() {
    try {
      const res = await api.get("/api/share/sent");
      setFiles(res.data || []);
    } catch (err) {
      console.error("fetchSent error", err);
    } finally {
      setLoading(false);
    }
  }

  async function revokeShare(id) {
    if (!window.confirm("Revoke this share? The recipient will lose access.")) return;
    try {
      await api.delete(`/api/share/${id}`);
      setFiles((prev) => prev.filter((f) => f._id !== id));
    } catch (err) {
      console.error("Revoke failed:", err);
      alert("Failed to revoke share");
    }
  }

  const toggleLogs = async (fileId) => {
    if (expandedFile === fileId) {
      setExpandedFile(null);
      return;
    }
    setExpandedFile(fileId);
    if (!logs[fileId]) {
      setLogsLoading((p) => ({ ...p, [fileId]: true }));
      try {
        const res = await api.get(`/api/logs/file/${fileId}`);
        setLogs((p) => ({ ...p, [fileId]: res.data }));
      } catch (err) {
        console.error("Failed to load logs:", err);
        setLogs((p) => ({ ...p, [fileId]: [] }));
      } finally {
        setLogsLoading((p) => ({ ...p, [fileId]: false }));
      }
    }
  };

  const timeAgo = (d) => {
    const secs = Math.floor((Date.now() - new Date(d)) / 1000);
    if (secs < 60) return "just now";
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    if (secs < 604800) return `${Math.floor(secs / 86400)}d ago`;
    return new Date(d).toLocaleString();
  };

  return (
    <div style={styles.container} className="fade-in">
      <div style={styles.titleRow}>
        <h2 style={styles.title}>📤 Sent Files</h2>
        <span style={styles.count}>{files.length} file{files.length !== 1 ? "s" : ""}</span>
      </div>

      {loading && (
        <div style={styles.center}><div className="spinner" /></div>
      )}

      {!loading && files.length === 0 && (
        <div className="empty-state">
          <div className="icon">📭</div>
          <p>No files sent yet</p>
        </div>
      )}

      {!loading && files.length > 0 && (
        <div className="card" style={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>File</th>
                <th>Receiver</th>
                <th>Permission</th>
                <th>Shared On</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => {
                const cid = f.fileId?.cid;
                const filename = f.fileId?.filename || "Unknown";
                const hasCid = cid && cid !== "undefined";
                const fileMongoId = f.fileId?._id;
                const perm = f.permission || "VIEW";

                return (
                  <React.Fragment key={f._id}>
                  <tr>
                    <td style={styles.fileCell}>
                      <span style={styles.fileIcon}>📄</span>
                      {filename}
                    </td>
                    <td>{f.recipientEmail}</td>
                    <td>
                      <span className={`badge badge-${perm.toLowerCase()}`}>
                        {perm}
                      </span>
                    </td>
                    <td>
                      {f.createdAt
                        ? new Date(f.createdAt).toLocaleString()
                        : "-"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={styles.actions}>
                        {hasCid ? (
                          <>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => {
                                let url = `/viewer?fileId=${fileMongoId}&filename=${encodeURIComponent(filename)}&cid=${encodeURIComponent(cid)}&permission=VIEW`;
                                navigate(url);
                              }}
                            >
                              👁 View
                            </button>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => {
                                navigate(`/editor?sharedFileId=${fileMongoId}&filename=${encodeURIComponent(filename)}`);
                              }}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => toggleLogs(fileMongoId)}
                              style={expandedFile === fileMongoId ? { background: "#eff6ff", borderColor: "#2563eb", color: "#2563eb" } : {}}
                            >
                              📋 {expandedFile === fileMongoId ? "Hide" : "Logs"}
                            </button>
                          </>
                        ) : (
                          <span style={{ color: "#dc2626", fontSize: 12 }}>N/A</span>
                        )}
                        <button
                          className="btn btn-sm"
                          style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}
                          onClick={() => revokeShare(f._id)}
                        >
                          Revoke
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* EXPANDABLE ACTIVITY LOGS */}
                  {expandedFile === fileMongoId && (
                    <tr>
                      <td colSpan="5" style={{ padding: 0, background: "#fafbfc" }}>
                        <div style={styles.logsPanel}>
                          <div style={styles.logsPanelHeader}>
                            <span style={styles.logsPanelTitle}>📋 Activity Log — {filename}</span>
                            <span style={styles.logCount}>
                              {logsLoading[fileMongoId] ? "Loading..." : `${(logs[fileMongoId] || []).length} entries`}
                            </span>
                          </div>
                          {logsLoading[fileMongoId] ? (
                            <div style={{ padding: 20, textAlign: "center" }}><div className="spinner" style={{ width: 20, height: 20 }} /></div>
                          ) : (logs[fileMongoId] || []).length === 0 ? (
                            <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No activity logged yet</div>
                          ) : (
                            <div style={styles.timeline}>
                              {(logs[fileMongoId] || []).map((log, i) => {
                                const a = ACTION_LABELS[log.action] || { label: log.action, color: "#64748b", bg: "#f8fafc", icon: "📌" };
                                return (
                                  <div key={log._id || i} style={styles.timelineItem}>
                                    {i < (logs[fileMongoId] || []).length - 1 && <div style={styles.timelineLine} />}
                                    <div style={{ ...styles.timelineDot, background: a.color }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: a.bg, color: a.color }}>
                                          {a.icon} {a.label}
                                        </span>
                                        <span style={{ fontSize: 11, color: "#94a3b8" }}>{timeAgo(log.createdAt)}</span>
                                      </div>
                                      {log.details && <div style={{ fontSize: 12, color: "#475569", marginTop: 3, lineHeight: 1.4 }}>{log.details}</div>}
                                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, fontStyle: "italic" }}>
                                        by {log.userId?.name || log.userId?.email || "Unknown"}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: "20px 24px" },
  titleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: "#0f172a",
    margin: 0,
  },
  count: {
    fontSize: 13,
    color: "#64748b",
    background: "#f1f5f9",
    padding: "4px 12px",
    borderRadius: 20,
  },
  center: {
    display: "flex",
    justifyContent: "center",
    padding: 40,
  },
  tableWrap: {
    overflow: "hidden",
  },
  fileCell: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 500,
  },
  fileIcon: {
    fontSize: 18,
  },
  actions: {
    display: "flex",
    gap: 6,
    justifyContent: "flex-end",
  },
  logsPanel: {
    borderTop: "1px solid #e2e8f0",
  },
  logsPanelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 18px",
    borderBottom: "1px solid #f1f5f9",
  },
  logsPanelTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#334155",
  },
  logCount: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: 500,
  },
  timeline: {
    padding: "12px 18px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 0,
  },
  timelineItem: {
    display: "flex",
    gap: 12,
    position: "relative",
    paddingBottom: 16,
  },
  timelineLine: {
    position: "absolute",
    left: 5,
    top: 14,
    bottom: 0,
    width: 2,
    background: "#e2e8f0",
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: "50%",
    flexShrink: 0,
    marginTop: 3,
    zIndex: 1,
  },
};
