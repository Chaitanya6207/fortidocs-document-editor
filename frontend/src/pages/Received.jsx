import React, { useEffect, useState } from "react";
import api from "../utils/api";

export default function Received() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReceived();
  }, []);

  async function fetchReceived() {
    setLoading(true);
    try {
      const res = await api.get("/api/share/received");
      setItems(res.data || []);
    } catch (err) {
      console.error("fetchReceived error", err);
      alert(err.response?.data?.error || "Failed to load received files");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Files Shared With Me</h2>

      {loading && <div>Loading...</div>}
      {!loading && items.length === 0 && (
        <div>No files shared with you yet.</div>
      )}

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {items.map((item) => {
          const cid = item.fileId?.cid;
          const filename = item.fileId?.filename;
          const gatewayUrl = cid
            ? `https://gateway.pinata.cloud/ipfs/${cid}`
            : "#";

          return (
            <div
              key={item._id}
              style={{
                padding: 12,
                border: "1px solid #eee",
                borderRadius: 8,
              }}
            >
              <div style={{ fontWeight: 600 }}>{filename || "Unknown file"}</div>

              <div style={{ fontSize: 13, color: "#555" }}>
                Shared At:{" "}
                {item.createdAt
                  ? new Date(item.createdAt).toLocaleString()
                  : "-"}
              </div>

              <div style={{ marginTop: 8 }}>
                {cid ? (
                  <>
                    <a
                      href={gatewayUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open on IPFS
                    </a>
                    <button
                      style={{ marginLeft: 8 }}
                      onClick={() =>
                        navigator.clipboard.writeText(gatewayUrl)
                      }
                    >
                      Copy Link
                    </button>
                  </>
                ) : (
                  <span style={{ color: "red" }}>CID missing</span>
                )}
              </div>

              <div style={{ marginTop: 8, fontSize: 13 }}>
                Permission: {item.permission || "VIEW"}
                {item.blockchainTxHash ? (
                  <> • Tx: {item.blockchainTxHash}</>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
