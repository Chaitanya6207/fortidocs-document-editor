import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

export default function Inbox() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/api/share/received")
      .then((res) => setFiles(res.data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

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

                return (
                  <tr key={f._id}>
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
