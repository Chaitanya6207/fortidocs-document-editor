import { useEffect, useState } from "react";
import api from "../utils/api";

export default function Inbox() {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    api.get("/api/share/received")
      .then((res) => setFiles(res.data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div style={styles.container}>
      <h2>Inbox</h2>

      <table style={styles.table}>
        <thead>
          <tr>
            <th>File</th>
            <th>Sender</th>
            <th>Date</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {files.map((f) => (
            <tr key={f._id}>
              <td>{f.filename}</td>
              <td>{f.senderEmail}</td>
              <td>{new Date(f.createdAt).toLocaleString()}</td>
              <td>
                <a
                  href={`https://gateway.pinata.cloud/ipfs/${f.cid}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  container: { padding: 20 },
  table: { width: "100%", borderCollapse: "collapse" },
};
