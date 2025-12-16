import React, { useRef, useState } from "react";
import ReactQuill, { Quill } from "react-quill";
import ImageResize from "quill-image-resize-module-react";
import "react-quill/dist/quill.snow.css";
import api from "../utils/api";
import htmlDocx from "html-docx-js/dist/html-docx";
import { saveAs } from "file-saver";
import { useNavigate } from "react-router-dom";

Quill.register("modules/imageResize", ImageResize);

export default function Editor() {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("Untitled Document");
  const quillRef = useRef(null);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  async function saveDocument() {
    const blob = htmlDocx.asBlob(`<h1>${title}</h1>${content}`);
    const form = new FormData();
    form.append("file", blob, `${title}.docx`);
    await api.post("/api/doc/save", form);
    alert("Document saved");
  }

  function downloadDoc() {
    const blob = htmlDocx.asBlob(`<h1>${title}</h1>${content}`);
    saveAs(blob, `${title}.docx`);
  }

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ align: [] }],
      ["link", "image"],
      ["clean"],
    ],
    imageResize: {
      modules: ["Resize", "DisplaySize", "Toolbar"],
    },
  };

  return (
    <div style={styles.page}>
      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <strong>{user?.email}</strong>
          <div style={styles.wallet}>
            {user?.walletAddress
              ? `Wallet: ${user.walletAddress.slice(0, 8)}...`
              : "No wallet"}
          </div>
        </div>
        <button onClick={logout} style={styles.logoutBtn}>Logout</button>
      </div>

      {/* TITLE */}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={styles.title}
      />

      {/* EDITOR */}
      <ReactQuill
        ref={quillRef}
        value={content}
        onChange={setContent}
        modules={modules}
        style={styles.editor}
      />

      {/* ACTIONS */}
      <div style={styles.actions}>
        <button onClick={saveDocument}>Save</button>
        <button onClick={downloadDoc}>Download</button>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: 20, fontFamily: "Segoe UI, sans-serif" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    background: "#0f172a",
    color: "#fff",
    padding: 12,
    borderRadius: 6,
    marginBottom: 15,
  },
  wallet: { fontSize: 12, opacity: 0.8 },
  logoutBtn: {
    background: "#ef4444",
    border: "none",
    color: "#fff",
    padding: "6px 12px",
    cursor: "pointer",
    borderRadius: 4,
  },
  title: {
    width: "100%",
    fontSize: 22,
    padding: 10,
    marginBottom: 10,
  },
  editor: {
    height: "65vh",
    background: "#fff",
    borderRadius: 6,
  },
  actions: {
    marginTop: 10,
    display: "flex",
    gap: 10,
  },
};
