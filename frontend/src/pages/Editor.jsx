import React, { useRef, useState } from "react";
import ReactQuill, { Quill } from "react-quill";
import ImageResize from "quill-image-resize-module-react";
import "react-quill/dist/quill.snow.css";
import Ribbon from "../components/Ribbon";
import FileMenu from "../components/FileMenu";
import { useNavigate } from "react-router-dom";
import htmlDocx from "html-docx-js/dist/html-docx";
import { saveAs } from "file-saver";

Quill.register("modules/imageResize", ImageResize);

export default function Editor() {
  const quillRef = useRef(null);
  const [content, setContent] = useState("");
  const [activeTab, setActiveTab] = useState("Home");
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  /* ---------------- FILE ACTIONS ---------------- */

  const newDoc = () => {
    if (window.confirm("Create new document? Unsaved changes will be lost.")) {
      setContent("");
    }
  };

  const openDoc = () => {
    alert("Open existing document feature (next step)");
  };

  const saveDoc = () => {
    alert("Document saved (connects to backend/IPFS next)");
  };

  const saveAsDoc = () => {
    const blob = htmlDocx.asBlob(content);
    saveAs(blob, "document.docx");
  };

  const printDoc = () => {
    window.print();
  };

  const exportDoc = () => {
    const blob = htmlDocx.asBlob(content);
    saveAs(blob, "exported-document.docx");
  };

  const shareDoc = () => {
    navigate("/received");
  };

  const closeEditor = () => {
    navigate("/editor");
  };

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  /* ---------------- RIBBON ACTIONS ---------------- */

  function onAction(action, value) {
    const editor = quillRef.current.getEditor();
    const range = editor.getSelection(true);

    if (action === "image") {
      const url = prompt("Image URL");
      if (url) editor.insertEmbed(range.index, "image", url);
      return;
    }

    editor.format(action, value ?? true);
  }

  return (
    <div style={{ height: "100vh", background: "#e5e7eb" }}>
      {/* HEADER */}
      <div style={styles.header}>
        <div>{user?.email}</div>
        <button onClick={logout}>Logout</button>
      </div>

      {/* FILE TAB VIEW */}
      {activeTab === "File" && (
        <FileMenu
          onNew={newDoc}
          onOpen={openDoc}
          onShare={shareDoc}
          onSave={saveDoc}
          onSaveAs={saveAsDoc}
          onPrint={printDoc}
          onExport={exportDoc}
          onClose={closeEditor}
        />
      )}

      {/* RIBBON */}
      <Ribbon
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onAction={onAction}
      />

      {/* EDITOR */}
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
