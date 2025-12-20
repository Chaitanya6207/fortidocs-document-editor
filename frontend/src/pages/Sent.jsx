import { useEffect, useState } from "react";
import api from "../utils/api";

export default function Sent() {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    api.get("/api/share/sent").then((res) => setFiles(res.data));
  }, []);

  return (
    <div style={styles.container}>
      <h2>Sent Files</h2>

      <table style={styles.table}>
        <thead>
          <tr>
            <th>File</th>
            <th>Receiver</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {files.map((f) => (
            <tr key={f._id}>
              <td>{f.filename}</td>
              <td>{f.receiverEmail}</td>
              <td>{new Date(f.createdAt).toLocaleString()}</td>
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
