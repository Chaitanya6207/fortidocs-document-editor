// frontend/src/pages/Received.jsx
import React, { useEffect, useState } from 'react';
import api from '../utils/api';

export default function Received() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchReceived(); }, []);

  async function fetchReceived() {
    setLoading(true);
    try {
      const res = await api.get('/api/share/received');
      setItems(res.data || []);
    } catch (err) {
      console.error('Failed to fetch received shares', err);
      alert(err.response?.data?.error || 'Failed to load received files');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Files Shared With Me</h2>
      {loading ? <div>Loading...</div> : null}
      {items.length === 0 && !loading ? <div>No files shared with you yet.</div> : null}
      <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
        {items.map(item => (
          <div key={item.accessId} style={{ padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
            <div><strong>{item.file.filename}</strong></div>
            <div style={{ fontSize: 13, color: '#555' }}>
              Shared by: {item.ownerId} • {new Date(item.sharedAt).toLocaleString()}
            </div>
            <div style={{ marginTop: 8 }}>
              <a href={item.file.gatewayUrl} target="_blank" rel="noreferrer">Open on IPFS Gateway</a>
              <button style={{ marginLeft: 8 }} onClick={() => navigator.clipboard.writeText(item.file.gatewayUrl)}>
                Copy Link
              </button>
            </div>
            <div style={{ marginTop: 8, fontSize: 13 }}>
              Permission: {item.permission} {item.blockchainTxHash ? (<> • Tx: <a href="#">{item.blockchainTxHash}</a></>) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
