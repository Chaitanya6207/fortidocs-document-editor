import { useEffect, useState } from "react";
import api from "../utils/api";

export default function Sent() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSent();
  }, []);

  async function fetchSent() {
    setLoading(true);
    try {
      const res = await api.get("/api/share/sent");
      setFiles(res.data || []);
    } catch (err) {
      console.error("fetchSent error", err);
      alert("Failed to load sent files");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Sent Files</h2>

      {loading && <div>Loading...</div>}
      {!loading && files.length === 0 && (
        <div>No files sent yet.</div>
      )}

      {!loading && files.length > 0 && (
        <table style={styles.table}>
          <thead>
            <tr>
              <th align="left">File</th>
              <th align="left">Receiver</th>
              <th align="left">Date</th>
              <th align="left">IPFS</th>
            </tr>
          </thead>
          <tbody>
            {files.map((f) => {
              const cid = f.fileId?.cid;
              const gatewayUrl = cid
                ? `https://gateway.pinata.cloud/ipfs/${cid}`
                : "#";

              return (
                <tr key={f._id}>
                  <td>{f.fileId?.filename || "Unknown"}</td>
                  <td>{f.recipientEmail}</td>
                  <td>
                    {f.createdAt
                      ? new Date(f.createdAt).toLocaleString()
                      : "-"}
                  </td>
                  <td>
                    {cid ? (
                      <a
                        href={gatewayUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open
                      </a>
                    ) : (
                      "N/A"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

const styles = {
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: 12,
  },
};
