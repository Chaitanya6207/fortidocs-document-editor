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
};

export default function Received() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedFile, setExpandedFile] = useState(null);
  const [logs, setLogs] = useState({});
  const [logsLoading, setLogsLoading] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    loadReceivedFiles();
  }, []);

  async function loadReceivedFiles() {
    try {
      const res = await api.get("/api/share/received");
      setFiles(res.data || []);
    } catch (error) {
      console.error("Error loading received files:", error);
    } finally {
      setLoading(false);
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
    <div style={styles.page}>
      <div style={styles.header}>
        <button onClick={() => navigate("/editor")} className="btn btn-ghost">
          ← Back to Editor
        </button>
        <h2 style={styles.heading}>📥 Received Files</h2>
        <span style={styles.count}>
          {files.length} file{files.length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading && (
        <div style={styles.center}><div className="spinner" /></div>
      )}

      {!loading && files.length === 0 && (
        <div className="empty-state">
          <div className="icon">📭</div>
          <p>No files shared with you yet</p>
        </div>
      )}

      {!loading && files.length > 0 && (
        <div className="card" style={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>File</th>
                <th>Sender</th>
                <th>Version</th>
                <th>Received</th>
                <th>Permission</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {files.map((item) => {
                const file = item?.fileId;
                const cid = file?.cid;
                const filename = file?.filename || "Unknown file";
                const senderName = item?.ownerId?.name || item?.ownerId?.email || "-";
                const hasCid = cid && cid !== "undefined";
                const encKey = item?.encryptedKey || "";

                return (
                  <tr key={item._id}>
                    <td style={styles.fileCell}>
                      <span style={styles.fileIcon}>📄</span>
                      {filename}
                    </td>
                    <td>{senderName}</td>
                    <td>
                      <span style={{ color: "#60a5fa", fontWeight: 600, fontSize: 12 }}>
                        v{file?.currentVersion || 1}
                      </span>
                    </td>
                    <td>
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleString()
                        : "-"}
                    </td>
                    <td>
                      <span className={`badge badge-${(item.permission || "view").toLowerCase()}`}>
                        {item.permission || "VIEW"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {hasCid ? (
                        <div style={styles.actions}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              let url = `/viewer?fileId=${file._id}&filename=${encodeURIComponent(filename)}&cid=${encodeURIComponent(cid)}&permission=VIEW`;
                              if (encKey) url += `&encryptedKey=${encodeURIComponent(encKey)}`;
                              navigate(url);
                            }}
                          >
                            👁 View
                          </button>
                          {(item.permission || "VIEW") === "EDIT" && (
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => {
                                navigate(`/editor?sharedFileId=${file._id}&filename=${encodeURIComponent(filename)}`);
                              }}
                            >
                              ✏️ Edit
                            </button>
                          )}
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => toggleLogs(file._id)}
                            style={expandedFile === file._id ? { background: "#eff6ff", borderColor: "#2563eb", color: "#2563eb" } : {}}
                          >
                            📋 {expandedFile === file._id ? "Hide" : "Logs"}
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() =>
                              navigator.clipboard.writeText(
                                `https://gateway.pinata.cloud/ipfs/${cid}`
                              )
                            }
                          >
                            Copy Link
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "#dc2626", fontSize: 12 }}>CID missing</span>
                      )}
                    </td>
                  </tr>
                  {/* EXPANDABLE ACTIVITY LOGS */}
                  {expandedFile === file?._id && (
                    <tr>
                      <td colSpan="6" style={{ padding: 0, background: "#fafbfc" }}>
                        <div style={styles.logsPanel}>
                          <div style={styles.logsPanelHeader}>
                            <span style={styles.logsPanelTitle}>📋 Activity Log — {filename}</span>
                            <span style={styles.logCount}>
                              {logsLoading[file._id] ? "Loading..." : `${(logs[file._id] || []).length} entries`}
                            </span>
                          </div>
                          {logsLoading[file._id] ? (
                            <div style={{ padding: 20, textAlign: "center" }}><div className="spinner" style={{ width: 20, height: 20 }} /></div>
                          ) : (logs[file._id] || []).length === 0 ? (
                            <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No activity logged yet</div>
                          ) : (
                            <div style={styles.timeline}>
                              {(logs[file._id] || []).map((log, i) => {
                                const a = ACTION_LABELS[log.action] || { label: log.action, color: "#64748b", bg: "#f8fafc", icon: "📌" };
                                return (
                                  <div key={log._id || i} style={styles.timelineItem}>
                                    {i < (logs[file._id] || []).length - 1 && <div style={styles.timelineLine} />}
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
  page: {
    minHeight: "100vh",
    background: "#f1f5f9",
    padding: 32,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },
  heading: {
    fontSize: 22,
    fontWeight: 700,
    color: "#0f172a",
    margin: 0,
    flex: 1,
  },
  count: {
    fontSize: 13,
    color: "#64748b",
    background: "#fff",
    padding: "4px 14px",
    borderRadius: 20,
    border: "1px solid #e2e8f0",
  },
  center: {
    display: "flex",
    justifyContent: "center",
    padding: 60,
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