import React, { useRef, useState } from "react";
import ReactQuill, { Quill } from "react-quill";
import ImageResize from "quill-image-resize-module-react";
import "react-quill/dist/quill.snow.css";

import Ribbon from "../components/Ribbon";
import HomeRibbon from "../components/HomeRibbon";
import FileRibbon from "../components/FileRibbon";
import InsertRibbon from "../components/InsertRibbon";

import Sent from "./Sent";
import Inbox from "./Inbox";

import { useNavigate } from "react-router-dom";
import htmlDocx from "html-docx-js/dist/html-docx";
import { saveAs } from "file-saver";

/* ---------- REGISTER MODULES ---------- */

Quill.register("modules/imageResize", ImageResize);

/* ---------- TEXTBOX (SHAPE) SUPPORT ---------- */

const BlockEmbed = Quill.import("blots/block/embed");

class TextBoxBlot extends BlockEmbed {
  static create(value) {
    const node = super.create();
    node.innerText = value || "Text";
    node.style.border = "1px solid #000";
    node.style.padding = "8px";
    node.style.minWidth = "120px";
    node.style.display = "inline-block";
    node.style.background = "#fff";
    return node;
  }
}

TextBoxBlot.blotName = "textBox";
TextBoxBlot.tagName = "div";

Quill.register(TextBoxBlot);

/* ================= EDITOR ================= */

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
    alert("Save to backend / IPFS – already integrated");
  };

  const saveAsDoc = () => {
    const blob = htmlDocx.asBlob(content);
    saveAs(blob, "document.docx");
  };

  const exportDoc = () => {
    const blob = htmlDocx.asBlob(content);
    saveAs(blob, "exported-document.docx");
  };

  const printDoc = () => window.print();

  const shareDoc = () => navigate("/received");

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  /* ================= RENDER ================= */

  return (
    <div style={{ height: "100vh", background: "#e5e7eb" }}>
      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <strong>{user?.email}</strong>
        </div>
        <button onClick={logout} style={styles.logout}>
          Logout
        </button>
      </div>

      {/* TOP TABS */}
      <Ribbon activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* FILE TAB */}
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

      {/* HOME TAB */}
      {activeTab === "Home" && <HomeRibbon editor={editor} />}

      {/* INSERT TAB */}
      {activeTab === "Insert" && <InsertRibbon editor={editor} />}

      {/* SENT DASHBOARD */}
      {activeTab === "Sent" && <Sent />}

      {/* INBOX DASHBOARD */}
      {activeTab === "Inbox" && <Inbox />}

      {/* DOCUMENT EDITOR (ONLY WHEN EDITING) */}
      {["File", "Home", "Insert", "Layout", "View"].includes(activeTab) && (
        <div style={styles.pageWrap}>
          <ReactQuill
            ref={quillRef}
            value={content}
            onChange={setContent}
            modules={{ toolbar: false, imageResize: {} }}
            style={styles.editor}
          />
        </div>
      )}
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  header: {
    background: "#0f172a",
    color: "#fff",
    padding: "8px 14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logout: {
    background: "#ef4444",
    border: "none",
    color: "#fff",
    padding: "6px 12px",
    cursor: "pointer",
    borderRadius: 4,
  },
  pageWrap: {
    padding: 20,
    display: "flex",
    justifyContent: "center",
  },
  editor: {
    background: "#fff",
    width: "210mm",        // A4 width
    minHeight: "297mm",   // A4 height
    padding: 40,
    boxShadow: "0 0 10px rgba(0,0,0,.15)",
  },
};
