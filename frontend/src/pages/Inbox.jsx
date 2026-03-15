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

export default function Inbox() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedFile, setExpandedFile] = useState(null);
  const [logs, setLogs] = useState({});
  const [logsLoading, setLogsLoading] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/api/share/received")
      .then((res) => setFiles(res.data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const toggleLogs = async (fileId) => {
    if (expandedFile === fileId) { setExpandedFile(null); return; }
    setExpandedFile(fileId);
    if (!logs[fileId]) {
      setLogsLoading((p) => ({ ...p, [fileId]: true }));
      try {
        const res = await api.get(`/api/logs/file/${fileId}`);
        setLogs((p) => ({ ...p, [fileId]: res.data }));
      } catch (err) {
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
    return new Date(d).toLocaleString();
  };

  return (
    <div style={styles.container} className="fade-in">
      <div style={styles.titleRow}>
        <h2 style={styles.title}>📥 Inbox</h2>
        <span style={styles.count}>{files.length} file{files.length !== 1 ? "s" : ""}</span>
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
                <th>Received</th>
                <th>Permission</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => {
                const cid = f?.fileId?.cid;
                const filename = f?.fileId?.filename || "Unknown file";
                const senderName = f?.ownerId?.name || f?.ownerId?.email || "-";
                const hasCid = cid && cid !== "undefined";
                const fileMongoId = f?.fileId?._id;
                const permission = f?.permission || "VIEW";

                return (
                  <React.Fragment key={f._id}>
                  <tr>
                    <td style={styles.fileCell}>
                      <span style={styles.fileIcon}>📄</span>
                      {filename}
                    </td>
                    <td>{senderName}</td>
                    <td>{new Date(f.createdAt).toLocaleString()}</td>
                    <td>
                      <span className={`badge badge-${(f.permission || "view").toLowerCase()}`}>
                        {f.permission || "VIEW"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {hasCid ? (
                        <div style={styles.actions}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              let url = `/viewer?fileId=${fileMongoId}&filename=${encodeURIComponent(filename)}&cid=${encodeURIComponent(cid)}&permission=VIEW`;
                              navigate(url);
                            }}
                          >
                            👁 View
                          </button>
                          {permission === "EDIT" && (
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => {
                                navigate(`/editor?sharedFileId=${fileMongoId}&filename=${encodeURIComponent(filename)}`);
                              }}
                            >
                              ✏️ Edit
                            </button>
                          )}
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => toggleLogs(fileMongoId)}
                            style={expandedFile === fileMongoId ? { background: "#eff6ff", color: "#2563eb" } : {}}
                          >
                            📋 {expandedFile === fileMongoId ? "Hide" : "Logs"}
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                `https://gateway.pinata.cloud/ipfs/${cid}`
                              );
                            }}
                          >
                            Copy Link
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "#dc2626", fontSize: 12 }}>CID missing</span>
                      )}
                    </td>
                  </tr>
                  {expandedFile === fileMongoId && (
                    <tr>
                      <td colSpan="5" style={{ padding: 0, background: "#fafbfc" }}>
                        <div style={{ borderTop: "1px solid #e2e8f0", padding: "12px 18px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>📋 Activity Log</span>
                            <span style={{ fontSize: 11, color: "#94a3b8" }}>
                              {logsLoading[fileMongoId] ? "Loading..." : `${(logs[fileMongoId] || []).length} entries`}
                            </span>
                          </div>
                          {logsLoading[fileMongoId] ? (
                            <div style={{ textAlign: "center", padding: 12 }}><div className="spinner" style={{ width: 20, height: 20 }} /></div>
                          ) : (logs[fileMongoId] || []).length === 0 ? (
                            <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No activity logged yet</div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              {(logs[fileMongoId] || []).map((log, i) => {
                                const a = ACTION_LABELS[log.action] || { label: log.action, color: "#64748b", bg: "#f8fafc", icon: "📌" };
                                return (
                                  <div key={log._id || i} style={{ display: "flex", gap: 12, position: "relative", paddingBottom: 14 }}>
                                    {i < (logs[fileMongoId] || []).length - 1 && <div style={{ position: "absolute", left: 5, top: 14, bottom: 0, width: 2, background: "#e2e8f0" }} />}
                                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: a.color, flexShrink: 0, marginTop: 3, zIndex: 1 }} />
                                    <div style={{ flex: 1 }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: a.bg, color: a.color }}>
                                          {a.icon} {a.label}
                                        </span>
                                        <span style={{ fontSize: 11, color: "#94a3b8" }}>{timeAgo(log.createdAt)}</span>
                                      </div>
                                      {log.details && <div style={{ fontSize: 12, color: "#475569", marginTop: 3 }}>{log.details}</div>}
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
};
