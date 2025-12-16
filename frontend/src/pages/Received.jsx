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
      console.error('fetchReceived error', err);
      alert(err.response?.data?.error || 'Failed to load received files');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Files Shared With Me</h2>

      {loading && <div>Loading...</div>}

      {!loading && items.length === 0 && <div>No files shared with you yet.</div>}

      <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
        {items.map(item => (
          <div key={item.accessId} style={{ padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
            <div style={{ fontWeight: 600 }}>{item.file.filename}</div>
            <div style={{ fontSize: 13, color: '#555' }}>
              Shared At: {new Date(item.sharedAt).toLocaleString()}
            </div>
            <div style={{ marginTop: 8 }}>
              <a href={item.file.gatewayUrl} target="_blank" rel="noreferrer">Open on IPFS Gateway</a>
              <button style={{ marginLeft: 8 }} onClick={() => navigator.clipboard.writeText(item.file.gatewayUrl)}>Copy Link</button>
            </div>
            <div style={{ marginTop: 8, fontSize: 13 }}>
              Permission: {item.permission} {item.blockchainTxHash ? (<> • Tx: {item.blockchainTxHash}</>) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
