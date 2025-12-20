import React, { useRef, useState } from "react";
import ReactQuill, { Quill } from "react-quill";
import ImageResize from "quill-image-resize-module-react";
import "react-quill/dist/quill.snow.css";
import Ribbon from "../components/Ribbon";
import HomeRibbon from "../components/HomeRibbon";
import FileRibbon from "../components/FileRibbon";
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

  const editor = quillRef.current?.getEditor();

  /* ---------- FILE ACTIONS ---------- */

  const newDoc = () => {
    if (window.confirm("Create new document? Unsaved changes will be lost.")) {
      setContent("");
    }
  };

  const openDoc = () => {
    alert("Open document – coming next");
  };

  const saveDoc = () => {
    alert("Save to backend/IPFS – coming next");
  };

  const saveAsDoc = () => {
    const blob = htmlDocx.asBlob(content);
    saveAs(blob, "document.docx");
  };

  const printDoc = () => window.print();

  const exportDoc = () => {
    const blob = htmlDocx.asBlob(content);
    saveAs(blob, "exported-document.docx");
  };

  const shareDoc = () => navigate("/received");

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  /* ---------- RENDER ---------- */

  return (
    <div style={{ height: "100vh", background: "#e5e7eb" }}>
      {/* HEADER */}
      <div style={styles.header}>
        <div>{user?.email}</div>
        <button onClick={logout}>Logout</button>
      </div>

      {/* TOP TABS */}
      <Ribbon activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* FILE TAB (HORIZONTAL) */}
      {activeTab === "File" && (
        <FileRibbon
          onNew={newDoc}
          onOpen={openDoc}
          onSave={saveDoc}
          onSaveAs={saveAsDoc}
          onPrint={printDoc}
          onExport={exportDoc}
          onShare={shareDoc}
        />
      )}

      {/* HOME TAB (WORD-LIKE) */}
      {activeTab === "Home" && <HomeRibbon editor={editor} />}

      {/* EDITOR PAGE */}
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
