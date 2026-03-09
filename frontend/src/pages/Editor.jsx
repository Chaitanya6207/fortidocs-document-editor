import React, { useRef, useState, useEffect, useCallback } from "react";
import ReactQuill, { Quill } from "react-quill";
import ImageResize from "quill-image-resize-module-react";
import "react-quill/dist/quill.snow.css";

import Ribbon from "../components/Ribbon";
import HomeRibbon from "../components/HomeRibbon";
import FileRibbon from "../components/FileRibbon";
import InsertRibbon from "../components/InsertRibbon";
import LayoutRibbon from "../components/LayoutRibbon";
import ViewRibbon from "../components/ViewRibbon";

import Sent from "./Sent";
import Inbox from "./Inbox";
import MyFiles from "./MyFiles";

import { useNavigate } from "react-router-dom";
import htmlDocx from "html-docx-js/dist/html-docx";
import { saveAs } from "file-saver";

import api from "../utils/api";
import {
  generateAESKey,
  encryptAES,
} from "../utils/crypto";

/* ---------- REGISTER MODULES ---------- */

// ImageResize module requires window.Quill with Parchment accessible
window.Quill = Quill;

const Parchment = Quill.import("parchment");

try {
  Quill.register("modules/imageResize", ImageResize);
} catch (e) {
  console.warn("ImageResize module failed to register:", e);
}

/* ---------- CUSTOM ATTRIBUTORS (font, size, lineheight) ---------- */

const FontStyle = new Parchment.Attributor.Style("font", "font-family", {
  scope: Parchment.Scope.INLINE,
});
Quill.register(FontStyle, true);

const SizeStyle = new Parchment.Attributor.Style("size", "font-size", {
  scope: Parchment.Scope.INLINE,
});
Quill.register(SizeStyle, true);

const LineHeightStyle = new Parchment.Attributor.Style("lineheight", "line-height", {
  scope: Parchment.Scope.BLOCK,
});
Quill.register(LineHeightStyle, true);

/* ---------- CUSTOM BLOTS ---------- */

const BlockEmbed = Quill.import("blots/block/embed");

/* Text Box */
class TextBoxBlot extends BlockEmbed {
  static create(value) {
    const node = super.create();
    node.innerText = value || "Type here...";
    return node;
  }
  static value(node) {
    return node.innerText;
  }
}
TextBoxBlot.blotName = "textBox";
TextBoxBlot.tagName = "DIV";
TextBoxBlot.className = "ql-text-box";
Quill.register(TextBoxBlot);

/* Divider (Horizontal Rule) */
class DividerBlot extends BlockEmbed {
  static create() {
    const node = super.create();
    return node;
  }
}
DividerBlot.blotName = "divider";
DividerBlot.tagName = "HR";
DividerBlot.className = "ql-divider";
Quill.register(DividerBlot);

/* Page Break */
class PageBreakBlot extends BlockEmbed {
  static create() {
    const node = super.create();
    node.setAttribute("contenteditable", "false");
    return node;
  }
}
PageBreakBlot.blotName = "pageBreak";
PageBreakBlot.tagName = "DIV";
PageBreakBlot.className = "ql-page-break";
Quill.register(PageBreakBlot);

/* Table Embed — cells are editable */
class TableEmbed extends BlockEmbed {
  static create(value) {
    const node = super.create();
    node.setAttribute("contenteditable", "false");
    node.innerHTML = value;

    // Make every cell editable
    node.querySelectorAll("td, th").forEach((cell) => {
      cell.setAttribute("contenteditable", "true");
    });

    // Stop keyboard events from reaching Quill when editing inside cells.
    // This prevents Quill from treating Backspace/Delete as "delete the embed".
    const stopKeyboard = (e) => {
      if (e.target.closest && e.target.closest("td, th")) {
        e.stopPropagation();
      }
    };
    [
      "keydown", "keyup", "keypress",
      "input", "beforeinput",
      "paste", "copy", "cut",
      "compositionstart", "compositionend", "compositionupdate",
    ].forEach((evt) => node.addEventListener(evt, stopKeyboard));

    // For mouse events, only stop propagation on the node — not the cells —
    // so Quill can't re-focus itself, but native cell focus still works.
    const stopMouse = (e) => {
      e.stopPropagation();
    };
    ["mousedown", "mouseup", "click"].forEach((evt) =>
      node.addEventListener(evt, stopMouse)
    );

    return node;
  }
  static value(node) {
    return node.innerHTML;
  }
}
TableEmbed.blotName = "tableEmbed";
TableEmbed.tagName = "DIV";
TableEmbed.className = "ql-table-embed";
Quill.register(TableEmbed);

/* Shape Embed */
class ShapeEmbed extends BlockEmbed {
  static create(value) {
    const node = super.create();
    node.setAttribute("contenteditable", "false");
    node.innerHTML = value;
    return node;
  }
  static value(node) {
    return node.innerHTML;
  }
}
ShapeEmbed.blotName = "shapeEmbed";
ShapeEmbed.tagName = "DIV";
ShapeEmbed.className = "ql-shape-embed";
Quill.register(ShapeEmbed);

/* Callout Embed */
class CalloutEmbed extends BlockEmbed {
  static create(value) {
    const node = super.create();
    node.setAttribute("contenteditable", "false");
    node.innerHTML = value;
    return node;
  }
  static value(node) {
    return node.innerHTML;
  }
}
CalloutEmbed.blotName = "calloutEmbed";
CalloutEmbed.tagName = "DIV";
CalloutEmbed.className = "ql-callout-embed";
Quill.register(CalloutEmbed);

/* ================= EDITOR ================= */

export default function Editor() {
  const quillRef = useRef(null);
  const [content, setContent] = useState("");
  const [activeTab, setActiveTab] = useState("Home");
  const [status, setStatus] = useState("");
  const [docName, setDocName] = useState("");
  const [aesKey, setAesKey] = useState(""); // current doc's AES key (in memory only)

  /* ---------- LAYOUT & VIEW SETTINGS ---------- */
  const [pageSettings, setPageSettings] = useState({
    margin: "40px",
    orientation: "portrait",
    size: "A4",
    width: "210mm",
    height: "297mm",
    columns: 1,
    pageColor: "#ffffff",
    pageBorder: "none",
  });
  const [viewSettings, setViewSettings] = useState({
    zoom: 100,
    viewMode: "print",
    ruler: false,
    gridlines: false,
    darkMode: false,
  });

  /* ---------- PAGE COUNT TRACKING ---------- */
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const pageHeightRef = useRef(0);

  // Measure page height in px from the CSS mm value
  const measurePageHeightPx = useCallback(() => {
    const mm = parseFloat(
      pageSettings.orientation === "landscape"
        ? pageSettings.width
        : pageSettings.height
    ) || 297;
    const el = document.createElement("div");
    el.style.height = `${mm}mm`;
    el.style.position = "absolute";
    el.style.visibility = "hidden";
    document.body.appendChild(el);
    const px = el.getBoundingClientRect().height;
    document.body.removeChild(el);
    return px;
  }, [pageSettings.orientation, pageSettings.width, pageSettings.height]);

  // Track content height → total pages
  useEffect(() => {
    const editorEl = quillRef.current?.getEditor()?.root;
    if (!editorEl) return;

    const update = () => {
      const ph = measurePageHeightPx();
      pageHeightRef.current = ph;
      if (ph > 0) {
        setTotalPages(Math.max(1, Math.ceil(editorEl.scrollHeight / ph)));
      }
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(editorEl);
    return () => observer.disconnect();
  }, [measurePageHeightPx, content]);

  // Track cursor position → current page
  const updateCurrentPage = useCallback(() => {
    const ed = quillRef.current?.getEditor();
    if (!ed || !pageHeightRef.current) return;
    const sel = ed.getSelection();
    if (!sel) return;
    const bounds = ed.getBounds(sel.index);
    setCurrentPage(Math.floor(bounds.top / pageHeightRef.current) + 1);
  }, []);

  // Listen for selection/typing changes to update current page
  useEffect(() => {
    const ed = quillRef.current?.getEditor();
    if (!ed) return;
    ed.on("selection-change", updateCurrentPage);
    ed.on("text-change", updateCurrentPage);
    return () => {
      ed.off("selection-change", updateCurrentPage);
      ed.off("text-change", updateCurrentPage);
    };
  }, [updateCurrentPage]);

  const navigate = useNavigate();

  const askForName = (defaultName = "") => {
    const name = prompt("Enter a name for your document:", defaultName);
    if (name && name.trim()) {
      setDocName(name.trim());
      return name.trim();
    }
    return null;
  };

  const user = JSON.parse(localStorage.getItem("user"));
  const editor = quillRef.current?.getEditor();

  const showStatus = (msg, duration = 3000) => {
    setStatus(msg);
    setTimeout(() => setStatus(""), duration);
  };

  /* ---------- FILE ACTIONS ---------- */

  const newDoc = () => {
    if (window.confirm("Create new document? Unsaved changes will be lost.")) {
      setContent("");
      setDocName("");
      setAesKey(generateAESKey()); // fresh AES key for new document
      showStatus("New document created with encryption key");
    }
  };

  const openDoc = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".html,.htm,.txt";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        setContent(ev.target.result);
        const nameWithoutExt = file.name.replace(/\.[^.]+$/, "");
        setDocName(nameWithoutExt);
        setAesKey(generateAESKey()); // new AES key for opened local files
        showStatus(`Opened: ${file.name}`);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const saveDoc = async () => {
    if (!content || content === "<p><br></p>") {
      showStatus("Nothing to save — document is empty");
      return;
    }

    let name = docName;
    if (!name) {
      name = askForName();
      if (!name) {
        showStatus("Save cancelled — no filename provided");
        return;
      }
    }

    try {
      // Ensure we have an AES key
      let currentKey = aesKey;
      if (!currentKey) {
        currentKey = generateAESKey();
        setAesKey(currentKey);
      }

      showStatus("Encrypting & saving to IPFS…");

      // 1. Encrypt content with AES key
      const encryptedContent = encryptAES(content, currentKey);

      // 2. Send encrypted content + raw AES key to backend
      //    Backend will encrypt the AES key server-side for session-based decryption
      const res = await api.post("/api/doc/save", {
        content: encryptedContent,
        filename: name,
        target: "cloud",
        aesKey: currentKey,
      });

      showStatus(`🔒 Encrypted & saved "${name}"! CID: ${res.data.cid?.substring(0, 12)}…`);
    } catch (err) {
      console.error("Save error:", err);
      showStatus(err.response?.data?.error || "Cloud save failed");
    }
  };

  const saveLocalDoc = () => {
    if (!content || content === "<p><br></p>") {
      showStatus("Nothing to save — document is empty");
      return;
    }

    let name = docName;
    if (!name) {
      name = askForName(docName || "document");
      if (!name) {
        showStatus("Save cancelled — no filename provided");
        return;
      }
    }

    // Download as HTML file
    const blob = new Blob([content], { type: "text/html" });
    saveAs(blob, `${name}.html`);
    showStatus(`Saved "${name}.html" to Downloads`);

    // Log the local save in the background
    api.post("/api/doc/log", {
      action: "SAVED_LOCAL",
      details: `Downloaded "${name}.html" locally`,
    }).catch(() => {});
  };

  const saveAsDoc = () => {
    const name = askForName(docName || "document");
    if (!name) {
      showStatus("Save As cancelled — no filename provided");
      return;
    }
    const blob = htmlDocx.asBlob(content);
    saveAs(blob, `${name}.docx`);
  };

  const exportDoc = () => {
    const name = docName || "exported-document";
    const blob = htmlDocx.asBlob(content);
    saveAs(blob, `${name}.docx`);
  };

  const printDoc = () => window.print();

const shareDoc = async () => {
  const recipientEmail = prompt("Enter receiver email");
  if (!recipientEmail) return;

  const permChoice = prompt("Permission — type VIEW or EDIT:", "VIEW");
  if (!permChoice) return;
  const permission = permChoice.trim().toUpperCase() === "EDIT" ? "EDIT" : "VIEW";

  if (!content || content === "<p><br></p>") {
    showStatus("Cannot share an empty document");
    return;
  }

  try {
    let name = docName;
    if (!name) {
      name = askForName();
      if (!name) {
        showStatus("Share cancelled — no filename provided");
        return;
      }
    }

    showStatus("Encrypting, saving & sharing…");

    // Ensure AES key exists
    let currentKey = aesKey;
    if (!currentKey) {
      currentKey = generateAESKey();
      setAesKey(currentKey);
    }

    // 1. Encrypt content with AES key
    const encryptedContent = encryptAES(content, currentKey);

    // 2. Save encrypted document to IPFS (server stores server-encrypted AES key)
    const saveRes = await api.post("/api/doc/save", {
      content: encryptedContent,
      filename: name,
      target: "cloud",
      aesKey: currentKey,
    });
    const file = saveRes.data;

    // 3. Share — server stores a server-encrypted key for the recipient
    await api.post("/api/share", {
      fileId: file._id,
      recipientEmail: recipientEmail.toLowerCase(),
      aesKey: currentKey,
      permission,
    });

    showStatus(`🔒 Encrypted & shared with ${recipientEmail} [${permission}]`);
  } catch (err) {
    console.error("Share error:", err.response?.data || err);
    showStatus(err.response?.data?.error || "Share failed");
  }
};




  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  /* ================= RENDER ================= */

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#e5e7eb" }}>
      <style>{`
        .ql-text-box {
          border: 2px solid #334155;
          padding: 12px 16px;
          min-width: 120px;
          min-height: 40px;
          display: inline-block;
          background: #fff;
          border-radius: 4px;
          margin: 8px 0;
          cursor: text;
        }
        .ql-divider {
          border: none;
          border-top: 2px solid #e2e8f0;
          margin: 16px 0;
        }
        .ql-page-break {
          border: none;
          height: 40px;
          margin: 0;
          display: block;
          position: relative;
          background: #e5e7eb;
          page-break-after: always;
        }
        .ql-page-break::before {
          content: '--- Page Break ---';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 10px;
          color: #94a3b8;
          letter-spacing: 2px;
          text-transform: uppercase;
          pointer-events: none;
        }
        .ql-page-break::after {
          content: '';
          position: absolute;
          left: 10%;
          right: 10%;
          top: 50%;
          border-top: 2px dashed #94a3b8;
          pointer-events: none;
        }
        .page-boundary-marker {
          position: absolute;
          left: 0;
          right: 0;
          height: 28px;
          background: #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 5;
          box-shadow: inset 0 4px 6px -4px rgba(0,0,0,0.1), inset 0 -4px 6px -4px rgba(0,0,0,0.1);
        }
        .page-boundary-marker span {
          font-size: 9px;
          color: #94a3b8;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
          background: #e5e7eb;
          padding: 0 12px;
        }
        .ql-table-embed {
          margin: 12px 0;
          line-height: normal;
        }
        .ql-table-embed table {
          border-collapse: collapse;
          width: 100%;
        }
        .ql-table-embed th,
        .ql-table-embed td {
          padding: 10px 14px;
          border: 1px solid #cbd5e1;
          cursor: text;
          outline: none;
          min-width: 60px;
        }
        .ql-table-embed th {
          background: #f1f5f9;
          font-weight: 600;
          text-align: left;
        }
        .ql-table-embed td:focus,
        .ql-table-embed th:focus {
          background: #eff6ff;
          box-shadow: inset 0 0 0 2px #2563eb;
        }
        .ql-table-embed tr:hover td {
          background: #f8fafc;
        }
        .ql-shape-embed {
          margin: 8px 0;
          display: inline-block;
        }
        .ql-callout-embed {
          margin: 12px 0;
        }
      `}</style>
      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>FortiDocs</span>
          <span style={styles.headerDivider}>|</span>
          <span style={styles.userName}>{docName || "Untitled Document"}</span>
        </div>
        {status && (
          <div style={styles.statusBadge}>{status}</div>
        )}
        <div style={styles.headerRight}>
          <span style={styles.userBadge}>👤 {user?.name || user?.email || "User"}</span>
          <button onClick={logout} className="btn btn-danger btn-sm">
            Logout
          </button>
        </div>
      </div>

      {/* TOP TABS */}
      <Ribbon activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* FILE TAB */}
      {activeTab === "File" && (
        <FileRibbon
          onNew={newDoc}
          onOpen={openDoc}
          onSaveCloud={saveDoc}
          onSaveLocal={saveLocalDoc}
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

      {/* LAYOUT TAB */}
      {activeTab === "Layout" && (
        <LayoutRibbon
          editor={editor}
          pageSettings={pageSettings}
          setPageSettings={setPageSettings}
        />
      )}

      {/* VIEW TAB */}
      {activeTab === "View" && (
        <ViewRibbon
          editor={editor}
          viewSettings={viewSettings}
          setViewSettings={setViewSettings}
        />
      )}

      {/* SENT DASHBOARD */}
      {activeTab === "Sent" && <Sent />}

      {/* INBOX DASHBOARD */}
      {activeTab === "Inbox" && <Inbox />}

      {/* MY FILES */}
      {activeTab === "My Files" && <MyFiles />}

      {/* DOCUMENT EDITOR (ONLY WHEN EDITING) */}
      {["File", "Home", "Insert", "Layout", "View"].includes(activeTab) && (
        <div
          style={{
            ...styles.pageWrap,
            ...(viewSettings.darkMode
              ? { background: "#1e293b" }
              : {}),
          }}
        >
          {/* Ruler */}
          {viewSettings.ruler && (
            <div style={styles.ruler}>
              {Array.from({ length: 21 }, (_, i) => (
                <div key={i} style={styles.rulerTick}>
                  <span style={styles.rulerNum}>{i}</span>
                </div>
              ))}
            </div>
          )}

          <div
            style={(() => {
              const pageH = viewSettings.viewMode === "web" ? null
                : pageSettings.orientation === "landscape"
                  ? pageSettings.width : pageSettings.height;

              // Build background layers: page-break line + optional gridlines
              let bgImages = [];
              let bgSizes = [];
              if (pageH && viewSettings.viewMode !== "web") {
                bgImages.push(
                  `repeating-linear-gradient(to bottom, transparent 0, transparent calc(${pageH} - 1px), #cbd5e1 calc(${pageH} - 1px), #cbd5e1 ${pageH})`
                );
                bgSizes.push(`100% ${pageH}`);
              }
              if (viewSettings.gridlines) {
                bgImages.push(
                  "linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)",
                  "linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)"
                );
                bgSizes.push("20px 20px", "20px 20px");
              }

              return {
                ...styles.editorWrap,
                position: "relative",
                width:
                  viewSettings.viewMode === "web" ? "100%" :
                  pageSettings.orientation === "landscape"
                    ? pageSettings.height
                    : pageSettings.width,
                minHeight: pageH || "auto",
                backgroundColor: pageSettings.pageColor,
                ...(bgImages.length
                  ? { backgroundImage: bgImages.join(", "), backgroundSize: bgSizes.join(", ") }
                  : {}),
                border: pageSettings.pageBorder,
                transform: `scale(${viewSettings.zoom / 100})`,
                transformOrigin: "top center",
                columnCount: pageSettings.columns,
                columnGap: pageSettings.columns > 1 ? "24px" : "0",
                ...(viewSettings.viewMode === "focus"
                  ? { maxWidth: 700, boxShadow: "none", border: "none" }
                  : {}),
              };
            })()}
          >
            <ReactQuill
              ref={quillRef}
              value={content}
              onChange={setContent}
              modules={{ toolbar: false, imageResize: { parchment: Parchment } }}
              style={{
                background: "transparent",
                padding: pageSettings.margin,
                minHeight: "100%",
              }}
            />
            {/* Page boundary markers */}
            {viewSettings.viewMode !== "web" && totalPages > 1 && (() => {
              const pageH = pageSettings.orientation === "landscape"
                ? pageSettings.width : pageSettings.height;
              return Array.from({ length: totalPages - 1 }, (_, i) => (
                <div
                  key={i}
                  className="page-boundary-marker"
                  style={{ top: `calc(${(i + 1)} * ${pageH})` }}
                >
                  <span>Page {i + 2}</span>
                </div>
              ));
            })()}
          </div>

          {/* Page status bar */}
          <div style={styles.pageStatusBar}>
            <span>Page {currentPage} of {totalPages}</span>
            {status && <span style={styles.statusMsg}>{status}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  header: {
    background: "linear-gradient(90deg, #0f172a, #1e293b)",
    color: "#fff",
    padding: "10px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    background: "linear-gradient(135deg, #60a5fa, #a78bfa)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  headerDivider: {
    color: "#475569",
    fontSize: 18,
  },
  userName: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: 500,
  },
  statusBadge: {
    background: "rgba(37, 99, 235, 0.15)",
    color: "#93c5fd",
    padding: "5px 14px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  userBadge: {
    background: "rgba(255, 255, 255, 0.1)",
    color: "#cbd5e1",
    padding: "5px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
  },
  pageWrap: {
    flex: 1,
    padding: 24,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    overflowY: "auto",
    transition: "background 0.3s ease",
  },
  editorWrap: {
    background: "#fff",
    boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
    borderRadius: 4,
    transition: "all 0.3s ease",
  },
  ruler: {
    display: "flex",
    justifyContent: "space-between",
    width: "210mm",
    padding: "0 40px",
    marginBottom: 4,
    height: 20,
    background: "#f1f5f9",
    borderRadius: "4px 4px 0 0",
    border: "1px solid #e2e8f0",
    borderBottom: "none",
    overflow: "hidden",
  },
  rulerTick: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    position: "relative",
  },
  rulerNum: {
    fontSize: 8,
    color: "#94a3b8",
    fontWeight: 500,
  },
  pageStatusBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: "6px 16px",
    marginTop: 8,
    fontSize: 11,
    color: "#64748b",
    fontWeight: 500,
    background: "#f1f5f9",
    borderRadius: 4,
    border: "1px solid #e2e8f0",
    userSelect: "none",
  },
  statusMsg: {
    color: "#2563eb",
    fontWeight: 600,
  },
};
