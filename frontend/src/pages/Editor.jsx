import React, { useRef, useState } from "react";
import ReactQuill, { Quill } from "react-quill";
import ImageResize from "quill-image-resize-module-react";
import "react-quill/dist/quill.snow.css";
import Ribbon from "../components/Ribbon";
import { useNavigate } from "react-router-dom";

Quill.register("modules/imageResize", ImageResize);

export default function Editor() {
  const quillRef = useRef(null);
  const [content, setContent] = useState("");
  const [activeTab, setActiveTab] = useState("Home");
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  function onAction(action, value) {
    const editor = quillRef.current.getEditor();
    const range = editor.getSelection(true);

    if (action === "image") {
      const url = prompt("Image URL");
      if (url) editor.insertEmbed(range.index, "image", url);
      return;
    }
    if (action === "link") {
      const url = prompt("Link URL");
      if (url) editor.format("link", url);
      return;
    }
    editor.format(action, value ?? true);
  }

  return (
    <div style={{ height: "100vh", background: "#e5e7eb" }}>
      <div style={styles.header}>
        <div>
          <strong>{user?.email}</strong>
          <div style={styles.wallet}>
            {user?.walletAddress
              ? `Wallet: ${user.walletAddress.slice(0, 10)}...`
              : "No wallet"}
          </div>
        </div>
        <button onClick={logout} style={styles.logout}>Logout</button>
      </div>

      <Ribbon
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onAction={onAction}
      />

      <div style={styles.pageWrap}>
        <ReactQuill
          ref={quillRef}
          value={content}
          onChange={setContent}
          modules={{ toolbar: false, imageResize: {} }}
          style={styles.editor}
        />
      </div>
    </div>
  );
}

const styles = {
  header: {
    background: "#0f172a",
    color: "#fff",
    padding: 10,
    display: "flex",
    justifyContent: "space-between",
  },
  wallet: { fontSize: 12, opacity: 0.8 },
  logout: {
    background: "#ef4444",
    border: "none",
    color: "#fff",
    padding: "6px 12px",
    borderRadius: 4,
    cursor: "pointer",
  },
  pageWrap: {
    padding: 20,
    display: "flex",
    justifyContent: "center",
  },
  editor: {
    background: "#fff",
    width: "210mm",
    minHeight: "297mm",
    padding: 40,
    boxShadow: "0 0 10px rgba(0,0,0,.15)",
  },
};
