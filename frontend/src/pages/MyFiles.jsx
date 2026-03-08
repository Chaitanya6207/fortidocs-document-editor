import React, { useEffect, useState } from "react";
import api from "../utils/api";

const ACTION_LABELS = {
  CREATED: { label: "Created", color: "#2563eb", bg: "#eff6ff", icon: "📄" },
  SAVED_CLOUD: { label: "Saved to Cloud", color: "#7c3aed", bg: "#f5f3ff", icon: "☁️" },
  SAVED_LOCAL: { label: "Saved Locally", color: "#0891b2", bg: "#ecfeff", icon: "💾" },
  SHARED: { label: "Shared", color: "#059669", bg: "#f0fdf4", icon: "🔗" },
  OPENED: { label: "Opened", color: "#6366f1", bg: "#eef2ff", icon: "📂" },
  EXPORTED: { label: "Exported", color: "#d97706", bg: "#fffbeb", icon: "📤" },
  PRINTED: { label: "Printed", color: "#64748b", bg: "#f8fafc", icon: "🖨️" },
  VIEWED: { label: "Viewed", color: "#0ea5e9", bg: "#f0f9ff", icon: "👁" },
  DOWNLOADED: { label: "Downloaded", color: "#ea580c", bg: "#fff7ed", icon: "⬇️" },
  DELETED: { label: "Deleted", color: "#dc2626", bg: "#fef2f2", icon: "🗑️" },
};

export default function MyFiles() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedFile, setExpandedFile] = useState(null);
  const [logs, setLogs] = useState({});
  const [logsLoading, setLogsLoading] = useState({});

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/files/my");
      setFiles(res.data);
    } catch (err) {
      console.error("Failed to load files:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleLogs = async (fileId) => {
    if (expandedFile === fileId) {
      setExpandedFile(null);
      return;
    }
    setExpandedFile(fileId);

    // Load logs if not cached
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

  const openInViewer = (fileId, cid, filename) => {
    let url = `/viewer?fileId=${fileId}&filename=${encodeURIComponent(filename)}`;
    if (cid) url += `&cid=${cid}`;
    window.open(url, "_blank");
  };

  const deleteFile = async (fileId, filename) => {
    if (!window.confirm(`Delete "${filename}"?\nThis will also remove all shares and activity logs for this file.`)) return;
    try {
      const res = await api.delete(`/api/files/${fileId}`);
      console.log("Delete response:", res.data);
      setFiles((prev) => prev.filter((f) => f._id !== fileId));
      if (expandedFile === fileId) setExpandedFile(null);
    } catch (err) {
      console.error("Delete failed:", err.response?.data || err.message);
      alert(err.response?.data?.error || "Failed to delete file");
    }
  };

  const formatDate = (d) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const timeAgo = (d) => {
    const secs = Math.floor((Date.now() - new Date(d)) / 1000);
    if (secs < 60) return "just now";
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    if (secs < 604800) return `${Math.floor(secs / 86400)}d ago`;
    return formatDate(d);
  };

  if (loading) {
    return (
      <div style={styles.centered}>
        <div className="spinner" />
        <p style={{ color: "#64748b", marginTop: 12 }}>Loading your files...</p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div style={styles.centered}>
        <div style={{ fontSize: 48 }}>🗂️</div>
        <h3 style={{ color: "#334155", margin: "12px 0 4px" }}>No files yet</h3>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>
          Documents you save to cloud will appear here
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={{ fontSize: 22 }}>🗂️</span>
          <h2 style={styles.title}>My Files</h2>
          <span style={styles.badge}>{files.length}</span>
        </div>
        <button style={styles.refreshBtn} onClick={loadFiles} title="Refresh">
          🔄 Refresh
        </button>
      </div>

      {/* FILE LIST */}
      <div style={styles.fileList}>
        {files.map((file) => {
          const isExpanded = expandedFile === file._id;
          const fileLogs = logs[file._id] || [];
          const isLogsLoading = logsLoading[file._id];

          return (
            <div key={file._id} style={styles.fileCard}>
              {/* FILE ROW */}
              <div style={styles.fileRow}>
                <div style={styles.fileIcon}>
                  {file.mimeType?.includes("image") ? "🖼" : "📄"}
                </div>
                <div style={styles.fileInfo}>
                  <div style={styles.fileName}>{file.filename}</div>
                  <div style={styles.fileMeta}>
                    <span>Created {formatDate(file.createdAt)}</span>
                    {file.size && (
                      <>
                        <span style={styles.dot}>•</span>
                        <span>{(file.size / 1024).toFixed(1)} KB</span>
                      </>
                    )}
                    {file.cid && (
                      <>
                        <span style={styles.dot}>•</span>
                        <span style={styles.cidLabel}>
                          CID: {file.cid.substring(0, 10)}…
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div style={styles.fileActions}>
                  {file.cid && (
                    <button
                      style={styles.actionBtn}
                      onClick={() => openInViewer(file._id, file.cid, file.filename)}
                      title="Open in Viewer"
                    >
                      👁 View
                    </button>
                  )}
                  <button
                    style={{
                      ...styles.actionBtn,
                      ...(isExpanded ? styles.actionBtnActive : {}),
                    }}
                    onClick={() => toggleLogs(file._id)}
                    title="View Activity Logs"
                  >
                    📋 {isExpanded ? "Hide Logs" : "Logs"}
                  </button>
                  <button
                    style={styles.deleteBtn}
                    onClick={() => deleteFile(file._id, file.filename)}
                    title="Delete File"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>

              {/* ACTIVITY LOGS PANEL */}
              {isExpanded && (
                <div style={styles.logsPanel}>
                  <div style={styles.logsPanelHeader}>
                    <span style={styles.logsPanelTitle}>📋 Activity Log</span>
                    <span style={styles.logCount}>
                      {isLogsLoading ? "Loading..." : `${fileLogs.length} entries`}
                    </span>
                  </div>

                  {isLogsLoading ? (
                    <div style={styles.logsLoading}>
                      <div className="spinner" style={{ width: 20, height: 20 }} />
                    </div>
                  ) : fileLogs.length === 0 ? (
                    <div style={styles.noLogs}>No activity logged yet</div>
                  ) : (
                    <div style={styles.timeline}>
                      {fileLogs.map((log, i) => {
                        const a = ACTION_LABELS[log.action] || {
                          label: log.action,
                          color: "#64748b",
                          bg: "#f8fafc",
                          icon: "📌",
                        };
                        return (
                          <div key={log._id || i} style={styles.timelineItem}>
                            {/* Timeline line */}
                            {i < fileLogs.length - 1 && (
                              <div style={styles.timelineLine} />
                            )}

                            {/* Dot */}
                            <div
                              style={{
                                ...styles.timelineDot,
                                background: a.color,
                              }}
                            />

                            {/* Content */}
                            <div style={styles.timelineContent}>
                              <div style={styles.timelineTop}>
                                <span
                                  style={{
                                    ...styles.actionBadge,
                                    background: a.bg,
                                    color: a.color,
                                  }}
                                >
                                  {a.icon} {a.label}
                                </span>
                                <span style={styles.timeAgo}>
                                  {timeAgo(log.createdAt)}
                                </span>
                              </div>
                              {log.details && (
                                <div style={styles.logDetails}>{log.details}</div>
                              )}
                              <div style={styles.logUser}>
                                by {log.userId?.name || log.userId?.email || "You"}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  container: {
    flex: 1,
    padding: "20px 24px",
    overflowY: "auto",
    background: "#f1f5f9",
  },
  centered: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: "#0f172a",
    margin: 0,
  },
  badge: {
    background: "#2563eb",
    color: "#fff",
    padding: "2px 10px",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
  },
  refreshBtn: {
    padding: "8px 16px",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    background: "#fff",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    color: "#334155",
    transition: "all 0.15s ease",
  },
  fileList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  fileCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    overflow: "hidden",
    transition: "box-shadow 0.2s ease",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  fileRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "14px 18px",
  },
  fileIcon: {
    fontSize: 28,
    width: 44,
    height: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f1f5f9",
    borderRadius: 10,
    flexShrink: 0,
  },
  fileInfo: {
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    fontSize: 14,
    fontWeight: 600,
    color: "#0f172a",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  fileMeta: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 3,
    flexWrap: "wrap",
  },
  dot: {
    color: "#cbd5e1",
  },
  cidLabel: {
    fontFamily: "monospace",
    fontSize: 11,
    color: "#64748b",
  },
  fileActions: {
    display: "flex",
    gap: 6,
    flexShrink: 0,
  },
  actionBtn: {
    padding: "6px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    background: "#fff",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 500,
    color: "#334155",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
  },
  actionBtnActive: {
    background: "#eff6ff",
    borderColor: "#2563eb",
    color: "#2563eb",
  },
  deleteBtn: {
    padding: "6px 12px",
    border: "1px solid #fecaca",
    borderRadius: 6,
    background: "#fef2f2",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 500,
    color: "#dc2626",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
  },
  /* --- LOGS PANEL --- */
  logsPanel: {
    borderTop: "1px solid #e2e8f0",
    background: "#fafbfc",
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
  logsLoading: {
    padding: 20,
    display: "flex",
    justifyContent: "center",
  },
  noLogs: {
    padding: "20px 18px",
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 13,
  },
  /* --- TIMELINE --- */
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
  timelineContent: {
    flex: 1,
    minWidth: 0,
  },
  timelineTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  actionBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: 6,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  },
  timeAgo: {
    fontSize: 11,
    color: "#94a3b8",
    whiteSpace: "nowrap",
  },
  logDetails: {
    fontSize: 12,
    color: "#475569",
    marginTop: 3,
    lineHeight: 1.4,
  },
  logUser: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
    fontStyle: "italic",
  },
};
