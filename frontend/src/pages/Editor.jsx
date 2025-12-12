// frontend/src/pages/Editor.jsx
import React, { useEffect, useState } from 'react';
import api from '../utils/api';

export default function Editor() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const fetchMyFiles = async () => {
    try {
      const res = await api.get('/api/files/my');
      setFiles(res.data);
    } catch (err) {
      console.error('fetch files', err);
    }
  };

  useEffect(() => { fetchMyFiles(); }, []);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) { alert('Choose a file'); return; }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', selectedFile);
      // optionally include ownerWallet if desired:
      const owner = JSON.parse(localStorage.getItem('user') || '{}');
      if (owner?.walletAddress) form.append('ownerWallet', owner.walletAddress);

      const res = await api.post('/api/files/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('Uploaded: ' + res.data.cid);
      setSelectedFile(null);
      fetchMyFiles();
    } catch (err) {
      console.error('upload', err);
      alert(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleShare = async (fileId) => {
    if (!recipientEmail) { alert('Enter recipient email'); return; }
    setSharing(true);
    try {
      const res = await api.post('/api/share', { fileId, recipientEmail });
      alert('Shared successfully');
      setRecipientEmail('');
      fetchMyFiles();
    } catch (err) {
      console.error('share', err);
      alert(err.response?.data?.error || 'Share failed');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>File Transfer — Upload & Share</h2>

      <div style={{ marginBottom: 20 }}>
        <input type="file" onChange={handleFileChange} />
        <button onClick={handleUpload} disabled={uploading || !selectedFile}>
          {uploading ? 'Uploading...' : 'Upload & Pin to IPFS'}
        </button>
      </div>

      <h3>Your files</h3>
      <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Filename</th><th>CID</th><th>Action</th><th>Share</th>
          </tr>
        </thead>
        <tbody>
          {files.map(f => (
            <tr key={f._id}>
              <td>{f.filename}</td>
              <td>
                <a target="_blank" rel="noreferrer" href={`https://gateway.pinata.cloud/ipfs/${f.cid}`}>{f.cid}</a>
              </td>
              <td>
                <button onClick={() => navigator.clipboard.writeText(`https://gateway.pinata.cloud/ipfs/${f.cid}`)}>Copy Link</button>
              </td>
              <td>
                <input placeholder="recipient email" value={recipientEmail} onChange={(e)=>setRecipientEmail(e.target.value)} />
                <button onClick={()=>handleShare(f._id)} disabled={sharing}>{sharing ? 'Sharing...' : 'Share'}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
