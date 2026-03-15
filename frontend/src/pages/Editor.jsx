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

  /* ---------- HEADER & FOOTER SETTINGS ---------- */
  const [headerFooter, setHeaderFooter] = useState({
    enabled: false,
    headerLeft: "",
    headerCenter: "",
    headerRight: "",
    footerLeft: "",
    footerCenter: "",
    footerRight: "",
    showPageNumbers: false,
    pageNumberPosition: "footer-center", // footer-center, footer-right, header-right
    differentFirstPage: false,
    firstPageHeaderCenter: "",
    firstPageFooterCenter: "",
  });

  /* ---------- SHARED FILE EDITING ---------- */
  const [searchParams] = useSearchParams();
  const sharedFileId = searchParams.get("sharedFileId");
  const sharedFilename = searchParams.get("filename");
  const [isSharedEdit, setIsSharedEdit] = useState(false);
  const [sharedFileLoading, setSharedFileLoading] = useState(false);
  const sharedEditRef = useRef(false);
  const sharedFileIdRef = useRef(sharedFileId);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versionHistory, setVersionHistory] = useState(null);
  const [changeSummary, setChangeSummary] = useState(null);
  const [showChangeSummary, setShowChangeSummary] = useState(false);

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
  const [activePage, setActivePage] = useState(0); // 0-indexed: which page card holds the real editor
  const pageHeightRef = useRef(0);
  const contentHeightRef = useRef(0); // usable content height per page
  const HF_ZONE_HEIGHT = 32; // px - height for each header/footer strip
  const PAGE_GAP = 40; // px - physical gap between paginated cards

  // Parse margin string (e.g. "40px") to px number
  const getMarginPx = useCallback(() => {
    const val = parseFloat(pageSettings.margin) || 40;
    return val;
  }, [pageSettings.margin]);

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

  // Calculate the usable content area per page
  const calcContentHeightPerPage = useCallback(() => {
    const pageH = measurePageHeightPx();
    const marginPx = getMarginPx();
    let contentH = pageH - marginPx * 2;
    if (headerFooter.enabled) {
      contentH -= HF_ZONE_HEIGHT * 2;
    }
    return Math.max(contentH, 100);
  }, [measurePageHeightPx, getMarginPx, headerFooter.enabled]);

  // Measure content height → total pages
  useEffect(() => {
    const editorEl = quillRef.current?.getEditor()?.root;
    if (!editorEl) return;

    const update = () => {
      const ph = measurePageHeightPx();
      const ch = calcContentHeightPerPage();
      pageHeightRef.current = ph;
      contentHeightRef.current = ch;
      if (ch <= 0) return;
      
      // Because we put padding on the wrapper, editor.scrollHeight is EXACTLY the true text height.
      const scrollH = editorEl.scrollHeight;
      const pages = Math.max(1, Math.ceil(scrollH / ch));
      setTotalPages(pages);
    };

    let timer;
    const debouncedUpdate = () => {
      clearTimeout(timer);
      timer = setTimeout(update, 80);
    };

    debouncedUpdate();
    const observer = new ResizeObserver(debouncedUpdate);
    observer.observe(editorEl);
    
    // ResizeObserver doesn't always fire when scrollHeight grows inside a sized container.
    // So we also explicitly listen to Quill text-change to trigger recalculation.
    const quill = quillRef.current?.getEditor();
    if (quill) {
      quill.on('text-change', debouncedUpdate);
    }

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      if (quill) {
        quill.off('text-change', debouncedUpdate);
      }
    };
  }, [measurePageHeightPx, calcContentHeightPerPage, content]);

  // Track cursor position → current page + active page auto-switch
  const updateCurrentPage = useCallback(() => {
    const ed = quillRef.current?.getEditor();
    if (!ed || !contentHeightRef.current) return;
    const sel = ed.getSelection();
    if (!sel) return;
    const bounds = ed.getBounds(sel.index);
    const page0 = Math.floor(bounds.top / contentHeightRef.current); // 0-indexed
    setCurrentPage(page0 + 1);
    setActivePage((prev) => {
      const clamped = Math.max(0, Math.min(page0, (totalPages || 1) - 1));
      return clamped !== prev ? clamped : prev;
    });
  }, [totalPages]);

  useEffect(() => {
    const ed = quillRef.current?.getEditor();
    if (!ed) return;
    ed.on('selection-change', updateCurrentPage);
    ed.on('text-change', updateCurrentPage);
    return () => {
      ed.off('selection-change', updateCurrentPage);
      ed.off('text-change', updateCurrentPage);
    };
  }, [updateCurrentPage]);

  // Clamp activePage if totalPages shrinks
  useEffect(() => {
    setActivePage((prev) => Math.min(prev, Math.max(0, totalPages - 1)));
  }, [totalPages]);

  // Resolve header/footer text for a given page
  const resolveHFForPage = useCallback((pageNum) => {
    const isFirst = pageNum === 1;
    const useDiff = headerFooter.differentFirstPage && isFirst;
    let hL = useDiff ? '' : headerFooter.headerLeft;
    let hC = useDiff ? (headerFooter.firstPageHeaderCenter || '') : headerFooter.headerCenter;
    let hR = useDiff ? '' : headerFooter.headerRight;
    let fL = useDiff ? '' : headerFooter.footerLeft;
    let fC = useDiff ? (headerFooter.firstPageFooterCenter || '') : headerFooter.footerCenter;
    let fR = useDiff ? '' : headerFooter.footerRight;
    if (headerFooter.showPageNumbers) {
      const pn = `Page ${pageNum}`;
      switch (headerFooter.pageNumberPosition) {
        case 'footer-center': fC = fC || pn; break;
        case 'footer-right':  fR = fR || pn; break;
        case 'header-right':  hR = hR || pn; break;
        default:              fC = fC || pn;
      }
    }
    return { hL, hC, hR, fL, fC, fR };
  }, [headerFooter]);

  // Switch to a page card and position cursor there
  const switchToPage = useCallback((pageIndex) => {
    setActivePage(pageIndex);
    setCurrentPage(pageIndex + 1);
    // After React re-render, focus Quill at the start of that page's content
    setTimeout(() => {
      const ed = quillRef.current?.getEditor();
      if (!ed || !contentHeightRef.current) return;
      const targetY = pageIndex * contentHeightRef.current + 10;
      // Find the Quill index at approximately that Y position
      const idx = ed.getSelection()?.index;
      if (idx == null) {
        // Try to set cursor to the area visible on this page
        const approxIndex = Math.floor((targetY / (ed.root.scrollHeight || 1)) * ed.getLength());
        ed.setSelection(Math.min(approxIndex, ed.getLength() - 1), 0, 'silent');
      }
      ed.focus();
    }, 50);
  }, []);

  /* ---------- SCROLL TO PAGE ---------- */
  const scrollToPage = useCallback((pageNum) => {
    const wrapEl = pageWrapRef.current;
    if (!wrapEl || !pageHeightRef.current) return;
    const fullPageH = pageHeightRef.current;
    const targetTop = (pageNum - 1) * (fullPageH + PAGE_GAP) * (viewSettings.zoom / 100);
    wrapEl.scrollTo({ top: targetTop, behavior: 'smooth' });
    setCurrentPage(pageNum);
    setActivePage(pageNum - 1);
  }, [viewSettings.zoom]);

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
        const { html, filename, permission, currentVersion } = res.data;
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
        setStatus(`Editing shared file: "${filename || sharedFilename}" (v${currentVersion || 1})`);
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

    // --- SHARED FILE EDIT SAVE (creates new version) ---
    const isShared = sharedEditRef.current;
    const fileId = sharedFileIdRef.current;
    if (isShared && fileId) {
      try {
        showStatus("Creating new version of shared document…");
        const res = await api.post(`/api/doc/edit/${fileId}`, { content });
        const { version, cid, accessList, changeSummary: cs } = res.data;
        showStatus(`✅ Version ${version} created! CID: ${cid?.substring(0, 12)}…`);

        // Show change summary modal so user can review and optionally share
        if (cs) {
          setChangeSummary({ ...cs, version, cid, filename: res.data.filename || docName });
          setShowChangeSummary(true);
        }
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

  const loadVersionHistory = async () => {
    const fileId = sharedFileIdRef.current;
    if (!fileId) return;
    try {
      const res = await api.get(`/api/doc/versions/${fileId}`);
      setVersionHistory(res.data);
      setShowVersionHistory(true);
    } catch (err) {
      console.error("Failed to load version history:", err);
      showStatus("Failed to load version history");
    }
  };

  // Auto-load version history when modal is opened
  useEffect(() => {
    if (showVersionHistory && sharedFileIdRef.current) {
      loadVersionHistory();
    }
  }, [showVersionHistory]);

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
    // --- SHARING A RECEIVED/SHARED FILE (re-share) ---
    const isShared = sharedEditRef.current;
    const existingFileId = sharedFileIdRef.current;
    if (isShared && existingFileId) {
      showStatus("Sharing document…");
      await api.post("/api/share", {
        fileId: existingFileId,
        recipientEmail: recipientEmail.toLowerCase(),
        permission,
      });
      showStatus(`🔗 Shared with ${recipientEmail} [${permission}]`);
      return;
    }

    // --- SHARING A NEW/OWN FILE ---
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
        /* ---- Page cards & Floating Editor ---- */
        .doc-page-card, .floating-editor-viewport {
          position: relative;
          box-sizing: border-box;
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .doc-page-card .ql-container, .floating-editor-viewport .ql-container {
          border: none !important;
          font-size: inherit;
        }
        .doc-page-card .ql-editor, .floating-editor-viewport .ql-editor {
          overflow: visible !important;
          height: auto !important;
          padding: 0 !important;
        }
        /* Viewport that clips content to exactly one page's worth */
        .page-content-viewport {
          overflow: hidden;
          position: relative;
          flex-shrink: 0;
        }
        /* Mirror (non-active) page content */
        .page-mirror-content {
          cursor: pointer;
        }
        .page-mirror-content .ql-editor {
          padding: 0 !important;
        }
        /* Header/footer strips */
        .page-hf-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 10px;
          color: #64748b;
          box-sizing: border-box;
          flex-shrink: 0;
          pointer-events: none;
          user-select: none;
        }
        /* Gap between page cards */
        .page-card-gap {
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          user-select: none;
        }
        @media print {
          .doc-page-card {
            break-after: page;
            page-break-after: always;
            box-shadow: none !important;
          }
          .page-card-gap {
            display: none;
          }
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
          {isSharedEdit && sharedFileId && (
            <button
              onClick={() => setShowVersionHistory(true)}
              className="btn btn-ghost btn-sm"
              style={{ fontWeight: 600 }}
            >
              📜 Version History
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
      {activeTab === "Insert" && (
        <InsertRibbon
          editor={editor}
          headerFooter={headerFooter}
          setHeaderFooter={setHeaderFooter}
        />
      )}

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
            id="quill-scroll-container"
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

          {/* ---- SINGLE FLOATING EDITOR & PAGE CARDS ---- */}
          {(() => {
            const pageW = viewSettings.viewMode === "web" ? "100%"
              : pageSettings.orientation === "landscape"
                ? pageSettings.height : pageSettings.width;
            const pageH = measurePageHeightPx();
            const marginPx = getMarginPx();
            const hfEnabled = headerFooter.enabled && viewSettings.viewMode !== "web";
            const hfZone = hfEnabled ? HF_ZONE_HEIGHT : 0;
            const contentH = contentHeightRef.current || calcContentHeightPerPage();

            let gridBg = {};
            if (viewSettings.gridlines) {
              gridBg = {
                backgroundImage: [
                  "linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)",
                  "linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)",
                ].join(", "),
                backgroundSize: "20px 20px",
              };
            }

            return (
              <div 
                style={{ 
                  transform: `scale(${viewSettings.zoom / 100})`, 
                  transformOrigin: "top center",
                  width: pageW,
                  position: "relative",
                  minHeight: pageH * totalPages + PAGE_GAP * (totalPages - 1),
                }}
              >
                {/* 1. RENDER PAGE BACKGROUNDS & MIRRORS */}
                {Array.from({ length: Math.max(1, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  const isActive = i === activePage;
                  const contentOffset = i * contentH;
                  const hf = hfEnabled ? resolveHFForPage(pageNum) : null;
                  const hasHeader = hf && (hf.hL || hf.hC || hf.hR);
                  const hasFooter = hf && (hf.fL || hf.fC || hf.fR);

                  return (
                    <React.Fragment key={`page-bg-${pageNum}`}>
                      {i > 0 && viewSettings.viewMode !== "web" && (
                        <div className="page-card-gap" style={{
                          height: PAGE_GAP,
                          background: viewSettings.darkMode ? '#1e293b' : 'transparent',
                        }}>
                          <span style={{
                            fontSize: 9, color: '#94a3b8', fontWeight: 600,
                            letterSpacing: 1, textTransform: 'uppercase',
                            background: '#d1d5db', padding: '2px 16px', borderRadius: 10,
                          }}>Page {pageNum}</span>
                        </div>
                      )}
                      <div
                        className="doc-page-card"
                        style={{
                          width: "100%",
                          height: viewSettings.viewMode === "web" ? 'auto' : pageH,
                          backgroundColor: pageSettings.pageColor,
                          border: pageSettings.pageBorder,
                          boxShadow: viewSettings.viewMode === "focus" ? "none" : "0 2px 16px rgba(0,0,0,0.08)",
                          ...gridBg,
                        }}
                      >
                        <div style={{ height: marginPx, flexShrink: 0 }} />
                        
                        {hasHeader && (
                          <div className="page-hf-strip" style={{
                            height: hfZone, padding: `0 ${marginPx}px`,
                            borderBottom: '1px solid #e2e8f0',
                          }}>
                            <span>{hf.hL}</span><span>{hf.hC}</span><span>{hf.hR}</span>
                          </div>
                        )}
                        
                        {/* Page Mirror Viewport */}
                        <div
                          className="page-content-viewport"
                          style={{
                            height: contentH,
                            padding: `0 ${marginPx}px`,
                            visibility: isActive ? "hidden" : "visible",
                          }}
                          onClick={() => { if (!isActive) switchToPage(i); }}
                        >
                          <div
                            className="page-mirror-content"
                            style={{ marginTop: -contentOffset }}
                          >
                            <div className="ql-snow" style={{ background: 'transparent' }}>
                              <div
                                className="ql-editor"
                                dangerouslySetInnerHTML={{ __html: content }}
                              />
                            </div>
                          </div>
                        </div>

                        {hasFooter && (
                          <div className="page-hf-strip" style={{
                            height: hfZone, padding: `0 ${marginPx}px`,
                            borderTop: '1px solid #e2e8f0',
                          }}>
                            <span>{hf.fL}</span><span>{hf.fC}</span><span>{hf.fR}</span>
                          </div>
                        )}
                        
                        <div style={{ height: marginPx, flexShrink: 0 }} />
                      </div>
                    </React.Fragment>
                  );
                })}

                {/* 2. SINGLE FLOATING EDITOR (Overlays Active Page) */}
                <div 
                  className="floating-editor-viewport"
                  style={{
                    position: "absolute",
                    top: activePage * (pageH + PAGE_GAP) + marginPx + hfZone, // Physical jump coordinates
                    left: 0,
                    right: 0,
                    height: contentH,
                    padding: `0 ${marginPx}px`,
                    overflow: "hidden", // Clips editor visually to active page boundaries
                    zIndex: 10,
                    boxSizing: "border-box",
                  }}
                  onClick={() => {
                    const editor = quillRef.current?.getEditor();
                    if (editor && !editor.hasFocus()) editor.focus();
                  }}
                >
                  <div style={{ marginTop: -activePage * contentH }}>
                    <ReactQuill
                      ref={quillRef}
                      value={content}
                      onChange={setContent}
                      scrollingContainer="#quill-scroll-container"
                      modules={{ toolbar: false, imageResize: { parchment: Parchment } }}
                      style={{ background: 'transparent' }}
                    />
                  </div>
                </div>

              </div>
            );
          })()}

          {/* Page status bar */}
          <div style={styles.pageStatusBar}>
            <span>Page {currentPage} of {totalPages}</span>
            {status && <span style={styles.statusMsg}>{status}</span>}
          </div>
          </div>
        </div>
      )}

      {/* VERSION HISTORY MODAL */}
      {showVersionHistory && (
        <div style={versionModalStyles.overlay} onClick={() => setShowVersionHistory(false)}>
          <div style={versionModalStyles.modal} onClick={e => e.stopPropagation()}>
            <div style={versionModalStyles.header}>
              <h3 style={{ margin: 0, fontSize: 16 }}>📜 Version History</h3>
              <button onClick={() => setShowVersionHistory(false)} style={versionModalStyles.closeBtn}>✕</button>
            </div>
            {versionHistory ? (
              <div style={versionModalStyles.body}>
                <div style={{ marginBottom: 12, fontSize: 13, color: "#94a3b8" }}>
                  <strong>{versionHistory.filename}</strong> — {versionHistory.versions?.length || 0} version(s)
                  <br />
                  Access List: {(versionHistory.accessList || []).join(", ") || "—"}
                </div>
                <div style={versionModalStyles.versionList}>
                  {(versionHistory.versions || []).map(v => (
                    <div key={v.version} style={versionModalStyles.versionCard}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 700, color: "#60a5fa" }}>
                          Version {v.version}
                          {v.version === versionHistory.currentVersion && (
                            <span style={{ color: "#4ade80", marginLeft: 8, fontSize: 11 }}>(current)</span>
                          )}
                        </span>
                        <span style={{ fontSize: 11, color: "#64748b" }}>
                          {v.createdAt ? new Date(v.createdAt).toLocaleString() : ""}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 4 }}>
                        Editor: {v.editor?.name || v.editor?.email || "Unknown"}
                        {v.editor?.wallet && <span style={{ color: "#94a3b8" }}> ({v.editor.wallet.substring(0, 8)}…)</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                        CID: {v.cid?.substring(0, 20)}…
                        {v.previousCid && <span> | Prev: {v.previousCid.substring(0, 12)}…</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                        {v.encrypted && <span style={{ color: "#fbbf24" }}>🔒 Encrypted</span>}
                        {v.blockchainTxHash && (
                          <span style={{ color: "#4ade80", marginLeft: 8 }}>
                            ⛓ On-chain: {v.blockchainTxHash.substring(0, 12)}…
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                        Authorized: {(v.authorizedUsers || []).join(", ")}
                      </div>
                      {v.fileHash && (
                        <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>
                          Hash: {v.fileHash.substring(0, 24)}…
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>Loading…</div>
            )}
          </div>
        </div>
      )}

      {/* CHANGE SUMMARY MODAL */}
      {showChangeSummary && changeSummary && (
        <div style={versionModalStyles.overlay} onClick={() => setShowChangeSummary(false)}>
          <div style={{ ...versionModalStyles.modal, width: 480 }} onClick={e => e.stopPropagation()}>
            <div style={versionModalStyles.header}>
              <h3 style={{ margin: 0, fontSize: 16 }}>📊 Changes Saved — Version {changeSummary.version}</h3>
              <button onClick={() => setShowChangeSummary(false)} style={versionModalStyles.closeBtn}>✕</button>
            </div>
            <div style={versionModalStyles.body}>
              <div style={{ marginBottom: 14, fontSize: 13, color: "#cbd5e1" }}>
                Your edits to <strong style={{ color: "#60a5fa" }}>{changeSummary.filename || docName}</strong> have been saved as a new version on IPFS.
              </div>

              {/* Change stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                <div style={csStatCard}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#4ade80" }}>+{changeSummary.addedWords}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>Words Added</div>
                </div>
                <div style={csStatCard}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#f87171" }}>-{changeSummary.removedWords}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>Words Removed</div>
                </div>
                <div style={csStatCard}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "#fbbf24" }}>{changeSummary.changePercent}%</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>Content Changed</div>
                </div>
                <div style={csStatCard}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "#60a5fa" }}>{changeSummary.newWordCount}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>Total Words</div>
                </div>
              </div>

              {/* Detail line */}
              <div style={{ background: "#0f172a", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#94a3b8", border: "1px solid #334155" }}>
                {changeSummary.summary}
              </div>

              {/* CID info */}
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 16 }}>
                New CID: <span style={{ color: "#60a5fa" }}>{changeSummary.cid?.substring(0, 24)}…</span>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  onClick={() => setShowChangeSummary(false)}
                  style={{ background: "#334155", color: "#e2e8f0", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, cursor: "pointer" }}
                >
                  Close
                </button>
                <button
                  onClick={async () => {
                    setShowChangeSummary(false);
                    const email = prompt("Share this version with (enter email):");
                    if (!email) return;
                    const perm = prompt("Permission — type VIEW or EDIT:", "VIEW");
                    if (!perm) return;
                    const permission = perm.trim().toUpperCase() === "EDIT" ? "EDIT" : "VIEW";
                    try {
                      showStatus("Sharing document…");
                      await api.post("/api/share", {
                        fileId: sharedFileIdRef.current,
                        recipientEmail: email.toLowerCase(),
                        permission,
                      });
                      showStatus(`🔗 Shared v${changeSummary.version} with ${email} [${permission}]`);
                    } catch (err) {
                      showStatus(err.response?.data?.error || "Share failed");
                    }
                  }}
                  style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, cursor: "pointer", fontWeight: 600 }}
                >
                  🔗 Share This Version
                </button>
              </div>
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

const csStatCard = {
  background: "#0f172a",
  borderRadius: 8,
  padding: "12px 14px",
  textAlign: "center",
  border: "1px solid #334155",
};

const versionModalStyles = {
  overlay: {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10000,
  },
  modal: {
    background: "#1e293b",
    borderRadius: 12,
    width: 520,
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
    border: "1px solid #334155",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 20px",
    borderBottom: "1px solid #334155",
    color: "#f1f5f9",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    fontSize: 18,
    cursor: "pointer",
  },
  body: {
    padding: "16px 20px",
    overflowY: "auto",
    flex: 1,
  },
  versionList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  versionCard: {
    background: "#0f172a",
    borderRadius: 8,
    padding: "12px 14px",
    border: "1px solid #334155",
  },
};
