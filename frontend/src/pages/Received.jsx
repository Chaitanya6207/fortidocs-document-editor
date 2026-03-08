import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

export default function Received() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
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

                return (
                  <tr key={item._id}>
                    <td style={styles.fileCell}>
                      <span style={styles.fileIcon}>📄</span>
                      {filename}
                    </td>
                    <td>{senderName}</td>
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
                            onClick={() =>
                              navigate(
                                `/viewer?cid=${encodeURIComponent(cid)}&filename=${encodeURIComponent(filename)}`
                              )
                            }
                          >
                            Open
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
};