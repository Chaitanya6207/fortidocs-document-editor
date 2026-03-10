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

import { useNavigate, useSearchParams } from "react-router-dom";
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
  const pageWrapRef = useRef(null);
  const [content, setContent] = useState("");
  const [activeTab, setActiveTab] = useState("Home");
  const [status, setStatus] = useState("");
  const [docName, setDocName] = useState("");
  const [aesKey, setAesKey] = useState(""); // current doc's AES key (in memory only)
  const [showPagePanel, setShowPagePanel] = useState(true);

  /* ---------- SHARED FILE EDITING ---------- */
  const [searchParams] = useSearchParams();
  const sharedFileId = searchParams.get("sharedFileId");
  const sharedFilename = searchParams.get("filename");
  const [isSharedEdit, setIsSharedEdit] = useState(false);
  const [sharedFileLoading, setSharedFileLoading] = useState(false);
  const sharedEditRef = useRef(false);
  const sharedFileIdRef = useRef(sharedFileId);

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

  /* ---------- SCROLL TO PAGE ---------- */
  const scrollToPage = useCallback((pageNum) => {
    const wrapEl = pageWrapRef.current;
    if (!wrapEl || !pageHeightRef.current) return;
    const gapPerPage = 48;
    const targetTop = (pageNum - 1) * (pageHeightRef.current + gapPerPage);
    wrapEl.scrollTo({ top: targetTop, behavior: "smooth" });
  }, []);

  const navigate = useNavigate();

  /* ---------- LOAD SHARED FILE FOR EDITING ---------- */
  useEffect(() => {
    if (!sharedFileId) return;
    let cancelled = false;
    setSharedFileLoading(true);
    setStatus("Loading shared document…");

    api.get(`/api/doc/view/${sharedFileId}`)
      .then((res) => {
        if (cancelled) return;
        const { html, filename, permission } = res.data;
        if (permission !== "EDIT") {
          setStatus("You only have VIEW permission for this file");
          setSharedFileLoading(false);
          return;
        }
        setContent(html);
        setDocName(filename ? filename.replace(/\.[^.]+$/, "") : (sharedFilename || "Shared Document"));
        setIsSharedEdit(true);
        sharedEditRef.current = true;
        sharedFileIdRef.current = sharedFileId;
        setStatus(`Editing shared file: "${filename || sharedFilename}"`);
        setTimeout(() => setStatus(""), 3000);
      })
      .catch((err) => {
        console.error("Failed to load shared file:", err);
        if (!cancelled) setStatus(err.response?.data?.error || "Failed to load shared document");
      })
      .finally(() => {
        if (!cancelled) setSharedFileLoading(false);
      });

    return () => { cancelled = true; };
  }, [sharedFileId, sharedFilename]);

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

    // --- SHARED FILE EDIT SAVE ---
    const isShared = sharedEditRef.current;
    const fileId = sharedFileIdRef.current;
    if (isShared && fileId) {
      try {
        showStatus("Saving edits to shared document…");
        const res = await api.post(`/api/doc/edit/${fileId}`, { content });
        showStatus(`✅ Edits saved! CID: ${res.data.cid?.substring(0, 12)}…`);
      } catch (err) {
        console.error("Shared edit save error:", err);
        showStatus(err.response?.data?.error || "Failed to save edits");
      }
      return;
    }

    // --- NORMAL SAVE ---
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
        /* Auto page overflow styling */
        .ql-editor {
          overflow-wrap: break-word;
          word-wrap: break-word;
        }
        @media print {
          .ql-page-break {
            page-break-after: always;
            break-after: page;
          }
          .ql-editor {
            overflow: visible !important;
          }
        }
        .page-boundary-marker {
          position: absolute;
          left: -24px;
          right: -24px;
          height: 48px;
          background: #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 10;
        }
        .page-boundary-marker::before {
          content: '';
          position: absolute;
          top: 0;
          left: 24px;
          right: 24px;
          height: 8px;
          background: linear-gradient(to bottom, rgba(0,0,0,0.08), transparent);
        }
        .page-boundary-marker::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 24px;
          right: 24px;
          height: 8px;
          background: linear-gradient(to top, rgba(0,0,0,0.08), transparent);
        }
        .page-boundary-marker span {
          font-size: 9px;
          color: #94a3b8;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
          background: #d1d5db;
          padding: 2px 16px;
          border-radius: 10px;
          z-index: 1;
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
          {isSharedEdit && (
            <span style={{
              background: "rgba(34, 197, 94, 0.2)",
              color: "#4ade80",
              padding: "3px 10px",
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 600,
              marginLeft: 8,
            }}>
              ✏️ Editing Shared File
            </span>
          )}
        </div>
        {status && (
          <div style={styles.statusBadge}>{status}</div>
        )}
        <div style={styles.headerRight}>
          {isSharedEdit && (
            <button
              onClick={saveDoc}
              className="btn btn-success btn-sm"
              style={{ fontWeight: 600 }}
            >
              💾 Save to Cloud
            </button>
          )}
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

      {/* SHARED FILE LOADING STATE */}
      {sharedFileLoading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 12 }}>
          <div className="spinner" />
          <p style={{ color: "#64748b", fontSize: 14 }}>Loading shared document…</p>
        </div>
      )}

      {/* DOCUMENT EDITOR (ONLY WHEN EDITING) */}
      {!sharedFileLoading && ["File", "Home", "Insert", "Layout", "View"].includes(activeTab) && (
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Page Thumbnail Panel */}
          {showPagePanel && (
            <div style={styles.pagePanel}>
              <div style={styles.pagePanelHeader}>
                <span style={styles.pagePanelTitle}>Pages</span>
                <button
                  style={styles.pagePanelClose}
                  onClick={() => setShowPagePanel(false)}
                  title="Close panel"
                >
                  ✕
                </button>
              </div>
              <div style={styles.pagePanelList}>
                {Array.from({ length: totalPages }, (_, i) => {
                  const pageNum = i + 1;
                  const isActive = currentPage === pageNum;
                  return (
                    <button
                      key={pageNum}
                      style={{
                        ...styles.pageThumbnail,
                        ...(isActive ? styles.pageThumbnailActive : {}),
                      }}
                      onClick={() => scrollToPage(pageNum)}
                      title={`Go to page ${pageNum}`}
                    >
                      <div style={styles.pageThumbnailInner}>
                        <div
                          className="ql-snow"
                          style={styles.pageThumbnailContent}
                        >
                          <div
                            className="ql-editor"
                            style={{
                              fontSize: "1.6px",
                              lineHeight: "1.4",
                              padding: "3px",
                              overflow: "hidden",
                              pointerEvents: "none",
                              maxHeight: "100%",
                            }}
                            dangerouslySetInnerHTML={{
                              __html: (() => {
                                if (!content) return "";
                                const div = document.createElement("div");
                                div.innerHTML = content;
                                const allNodes = div.querySelectorAll("*");
                                // Rough split: each page ~ equal portion of content
                                const totalChars = div.textContent.length || 1;
                                const charsPerPage = Math.ceil(totalChars / totalPages);
                                const startChar = (pageNum - 1) * charsPerPage;
                                const endChar = pageNum * charsPerPage;
                                // Simple: return full HTML for page 1 thumbnail, sliced for others
                                if (totalPages === 1) return content;
                                // Extract approximate slice for this page
                                let charCount = 0;
                                let result = "";
                                for (const child of div.childNodes) {
                                  const nodeText = child.textContent || "";
                                  const nodeEnd = charCount + nodeText.length;
                                  if (nodeEnd > startChar && charCount < endChar) {
                                    result += child.outerHTML || child.textContent;
                                  }
                                  charCount = nodeEnd;
                                  if (charCount >= endChar) break;
                                }
                                return result;
                              })(),
                            }}
                          />
                        </div>
                      </div>
                      <span style={{
                        ...styles.pageThumbnailLabel,
                        ...(isActive ? { color: "#2563eb", fontWeight: 700 } : {}),
                      }}>
                        {pageNum}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Toggle panel button when hidden */}
          {!showPagePanel && (
            <button
              style={styles.pagePanelToggle}
              onClick={() => setShowPagePanel(true)}
              title="Show page panel"
            >
              📄
            </button>
          )}

          <div
            ref={pageWrapRef}
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
                paddingBottom: totalPages > 1 ? `${(totalPages - 1) * 48}px` : 0,
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
            {/* Page boundary markers with visual gap */}
            {viewSettings.viewMode !== "web" && totalPages > 1 && (() => {
              const pageH = pageSettings.orientation === "landscape"
                ? pageSettings.width : pageSettings.height;
              return Array.from({ length: totalPages - 1 }, (_, i) => (
                <div
                  key={i}
                  className="page-boundary-marker"
                  style={{ top: `calc(${(i + 1)} * ${pageH} + ${i * 48}px)` }}
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
  /* Page Thumbnail Panel */
  pagePanel: {
    width: 140,
    minWidth: 140,
    background: "#f8fafc",
    borderRight: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  pagePanelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 10px",
    borderBottom: "1px solid #e2e8f0",
    background: "#fff",
  },
  pagePanelTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  pagePanelClose: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#94a3b8",
    fontSize: 12,
    padding: "2px 4px",
    borderRadius: 4,
    lineHeight: 1,
  },
  pagePanelList: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    alignItems: "center",
  },
  pageThumbnail: {
    width: 110,
    cursor: "pointer",
    background: "none",
    border: "2px solid transparent",
    borderRadius: 6,
    padding: 3,
    transition: "all 0.15s ease",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  pageThumbnailActive: {
    borderColor: "#2563eb",
    background: "#eff6ff",
  },
  pageThumbnailInner: {
    width: "100%",
    aspectRatio: "210 / 297",
    background: "#fff",
    borderRadius: 3,
    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
    overflow: "hidden",
    position: "relative",
  },
  pageThumbnailContent: {
    width: "100%",
    height: "100%",
    overflow: "hidden",
    pointerEvents: "none",
  },
  pageThumbnailLabel: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: 500,
  },
  pagePanelToggle: {
    width: 32,
    minWidth: 32,
    background: "#f8fafc",
    border: "none",
    borderRight: "1px solid #e2e8f0",
    cursor: "pointer",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingTop: 12,
    fontSize: 16,
  },
  editorWrap: {
    background: "#fff",
    boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
    borderRadius: 4,
    transition: "all 0.3s ease",
    overflow: "hidden",
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
