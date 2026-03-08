import React, { useRef, useState } from "react";
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
  decryptAES,
  getEncryptionPublicKey,
  encryptForWallet,
  decryptWithWallet,
} from "../utils/crypto";

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
      // Ensure we have a wallet connected for encryption
      const wallet = user?.walletAddress;
      if (!wallet || !window.ethereum) {
        showStatus("Connect your wallet to save encrypted documents");
        return;
      }

      // Ensure we have an AES key
      let currentKey = aesKey;
      if (!currentKey) {
        currentKey = generateAESKey();
        setAesKey(currentKey);
      }

      showStatus("Encrypting & saving to IPFS…");

      // 1. Encrypt content with AES key
      const encryptedContent = encryptAES(content, currentKey);

      // 2. Get owner's encryption public key
      let ownerPubKey = user?.encryptionPublicKey;
      if (!ownerPubKey) {
        ownerPubKey = await getEncryptionPublicKey(wallet);
        // Store it for future use
        await api.post("/api/keys/public", { encryptionPublicKey: ownerPubKey });
        const updatedUser = { ...user, encryptionPublicKey: ownerPubKey };
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }

      // 3. Encrypt AES key with owner's wallet public key
      const wrappedKey = encryptForWallet(ownerPubKey, currentKey);

      // 4. Send encrypted content + encrypted key to backend
      const res = await api.post("/api/doc/save", {
        content: encryptedContent,
        filename: name,
        target: "cloud",
        encryptedKey: JSON.stringify(wrappedKey),
      });

      showStatus(`🔒 Encrypted & saved "${name}"! CID: ${res.data.cid?.substring(0, 12)}…`);
    } catch (err) {
      console.error("Save error:", err);
      if (err.code === 4001) {
        showStatus("Encryption cancelled by user");
      } else {
        showStatus("Cloud save failed");
      }
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

    const wallet = user?.walletAddress;
    if (!wallet || !window.ethereum) {
      showStatus("Connect your wallet to share encrypted documents");
      return;
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

    // 2. Get owner's encryption public key & wrap AES key for owner
    let ownerPubKey = user?.encryptionPublicKey;
    if (!ownerPubKey) {
      ownerPubKey = await getEncryptionPublicKey(wallet);
      await api.post("/api/keys/public", { encryptionPublicKey: ownerPubKey });
      const updatedUser = { ...user, encryptionPublicKey: ownerPubKey };
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }
    const ownerWrappedKey = encryptForWallet(ownerPubKey, currentKey);

    // 3. Save encrypted document to IPFS
    const saveRes = await api.post("/api/doc/save", {
      content: encryptedContent,
      filename: name,
      target: "cloud",
      encryptedKey: JSON.stringify(ownerWrappedKey),
    });
    const file = saveRes.data;

    // 4. Get receiver's encryption public key
    let receiverKeyRes;
    try {
      receiverKeyRes = await api.get(`/api/keys/public/${encodeURIComponent(recipientEmail.toLowerCase())}`);
    } catch (keyErr) {
      showStatus(keyErr.response?.data?.error || "Recipient not found or wallet not connected");
      return;
    }

    const receiverPubKey = receiverKeyRes.data.encryptionPublicKey;

    // 5. Encrypt AES key with receiver's wallet public key
    const receiverWrappedKey = encryptForWallet(receiverPubKey, currentKey);

    // 6. Share with encrypted key for receiver
    await api.post("/api/share", {
      fileId: file._id,
      recipientEmail: recipientEmail.toLowerCase(),
      encryptedKey: JSON.stringify(receiverWrappedKey),
    });

    showStatus(`🔒 Encrypted & shared with ${recipientEmail}`);
  } catch (err) {
    console.error("Share error:", err.response?.data || err);
    if (err.code === 4001) {
      showStatus("Encryption cancelled by user");
    } else {
      showStatus("Share failed");
    }
  }
};




  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  /* ================= RENDER ================= */

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#e5e7eb" }}>
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
            style={{
              ...styles.editorWrap,
              width:
                viewSettings.viewMode === "web" ? "100%" :
                pageSettings.orientation === "landscape"
                  ? pageSettings.height
                  : pageSettings.width,
              minHeight:
                viewSettings.viewMode === "web" ? "auto" :
                pageSettings.orientation === "landscape"
                  ? pageSettings.width
                  : pageSettings.height,
              background: pageSettings.pageColor,
              border: pageSettings.pageBorder,
              transform: `scale(${viewSettings.zoom / 100})`,
              transformOrigin: "top center",
              columnCount: pageSettings.columns,
              columnGap: pageSettings.columns > 1 ? "24px" : "0",
              ...(viewSettings.gridlines
                ? {
                    backgroundImage:
                      "linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }
                : {}),
              ...(viewSettings.viewMode === "focus"
                ? {
                    maxWidth: 700,
                    boxShadow: "none",
                    border: "none",
                  }
                : {}),
            }}
          >
            <ReactQuill
              ref={quillRef}
              value={content}
              onChange={setContent}
              modules={{ toolbar: false, imageResize: {} }}
              style={{
                background: "transparent",
                padding: pageSettings.margin,
                minHeight: "100%",
              }}
            />
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
};
