import React, { useState } from "react";

export default function HomeRibbon({ editor }) {
  const [showHighlight, setShowHighlight] = useState(false);
  const [showFontColor, setShowFontColor] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");

  if (!editor) return null;

  const fmt = (key, value = true) => editor.format(key, value);
  const getFmt = (key) => {
    const range = editor.getSelection();
    if (!range) return undefined;
    return editor.getFormat(range)[key];
  };

  /* ---------- Clipboard ---------- */
  const cut = () => {
    const range = editor.getSelection();
    if (!range || range.length === 0) return;
    const text = editor.getText(range.index, range.length);
    navigator.clipboard.writeText(text);
    editor.deleteText(range.index, range.length);
  };

  const copy = () => {
    const range = editor.getSelection();
    if (!range || range.length === 0) return;
    const text = editor.getText(range.index, range.length);
    navigator.clipboard.writeText(text);
  };

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const range = editor.getSelection(true);
      editor.insertText(range.index, text);
    } catch {
      alert("Paste not allowed by browser");
    }
  };

  const clearFormat = () => {
    const range = editor.getSelection();
    if (range) editor.removeFormat(range.index, range.length);
  };

  /* ---------- Find & Replace ---------- */
  const findNext = () => {
    if (!findText) return;
    const fullText = editor.getText();
    const idx = fullText.indexOf(findText);
    if (idx >= 0) {
      editor.setSelection(idx, findText.length);
    } else {
      alert("Text not found");
    }
  };

  const replaceOne = () => {
    if (!findText) return;
    const range = editor.getSelection();
    if (range && range.length > 0) {
      editor.deleteText(range.index, range.length);
      editor.insertText(range.index, replaceText);
    }
    findNext();
  };

  const replaceAll = () => {
    if (!findText) return;
    const fullText = editor.getText();
    let count = 0;
    let idx = fullText.indexOf(findText);
    while (idx >= 0) {
      editor.deleteText(idx, findText.length);
      editor.insertText(idx, replaceText);
      count++;
      const newText = editor.getText();
      idx = newText.indexOf(findText, idx + replaceText.length);
    }
    if (count > 0) alert(`Replaced ${count} occurrence(s)`);
    else alert("Text not found");
  };

  /* ---------- Data ---------- */
  const fonts = [
    { label: "Default", value: "" },
    { label: "Serif", value: "serif" },
    { label: "Sans Serif", value: "sans-serif" },
    { label: "Monospace", value: "monospace" },
    { label: "Georgia", value: "Georgia" },
    { label: "Courier New", value: "Courier New" },
    { label: "Times New Roman", value: "Times New Roman" },
    { label: "Arial", value: "Arial" },
    { label: "Verdana", value: "Verdana" },
    { label: "Trebuchet MS", value: "Trebuchet MS" },
  ];

  const sizes = [
    { label: "8", value: "8px" },
    { label: "10", value: "small" },
    { label: "12", value: "" },
    { label: "14", value: "14px" },
    { label: "16", value: "large" },
    { label: "18", value: "18px" },
    { label: "20", value: "huge" },
    { label: "24", value: "24px" },
    { label: "32", value: "32px" },
  ];

  const highlightColors = [
    "#FFFF00", "#00FF00", "#00FFFF", "#FF00FF",
    "#FF0000", "#0000FF", "#FFA500", "#FFD700",
    "#ADFF2F", "#87CEEB", "#DDA0DD", "#F0E68C",
  ];

  const lineSpacings = [
    { label: "1.0", value: "1" },
    { label: "1.15", value: "1.15" },
    { label: "1.5", value: "1.5" },
    { label: "2.0", value: "2" },
    { label: "2.5", value: "2.5" },
    { label: "3.0", value: "3" },
  ];

  return (
    <div style={styles.ribbon}>
      {/* ===== CLIPBOARD ===== */}
      <div style={styles.group}>
        <div style={styles.row}>
          <button style={styles.toolBtn} onClick={paste} title="Paste (Ctrl+V)">📋 Paste</button>
        </div>
        <div style={styles.row}>
          <button style={styles.smBtn} onClick={cut} title="Cut (Ctrl+X)">✂️</button>
          <button style={styles.smBtn} onClick={copy} title="Copy (Ctrl+C)">📄</button>
          <button style={styles.smBtn} onClick={clearFormat} title="Clear Formatting">🧹</button>
        </div>
        <div style={styles.label}>Clipboard</div>
      </div>

      <div style={styles.sep} />

      {/* ===== FONT ===== */}
      <div style={styles.group}>
        <div style={styles.row}>
          <select style={{ ...styles.select, minWidth: 120 }} onChange={(e) => fmt("font", e.target.value)}>
            {fonts.map((f) => (
              <option key={f.label} value={f.value} style={{ fontFamily: f.value || "inherit" }}>
                {f.label}
              </option>
            ))}
          </select>
          <select style={styles.select} onChange={(e) => fmt("size", e.target.value)}>
            {sizes.map((s) => (
              <option key={s.label} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div style={styles.row}>
          <button style={styles.fmtBtn} onClick={() => fmt("bold")} title="Bold (Ctrl+B)"><b>B</b></button>
          <button style={styles.fmtBtn} onClick={() => fmt("italic")} title="Italic (Ctrl+I)"><i>I</i></button>
          <button style={styles.fmtBtn} onClick={() => fmt("underline")} title="Underline (Ctrl+U)"><u>U</u></button>
          <button style={styles.fmtBtn} onClick={() => fmt("strike")} title="Strikethrough"><s>S</s></button>
          <button style={{...styles.fmtBtn, fontSize: 11}} onClick={() => fmt("script", "sub")} title="Subscript">X₂</button>
          <button style={{...styles.fmtBtn, fontSize: 11}} onClick={() => fmt("script", "super")} title="Superscript">X²</button>

          {/* Font Color */}
          <div style={styles.dropWrap}>
            <button
              style={styles.fmtBtn}
              onClick={() => { setShowFontColor(!showFontColor); setShowHighlight(false); }}
              title="Font Color"
            >
              <span style={{ borderBottom: "3px solid #e74c3c" }}>A</span>
            </button>
            {showFontColor && (
              <div style={styles.colorDrop}>
                <input
                  type="color"
                  onChange={(e) => { fmt("color", e.target.value); setShowFontColor(false); }}
                  style={{ width: 100, height: 36, border: "none", cursor: "pointer", borderRadius: 4 }}
                />
              </div>
            )}
          </div>

          {/* Highlight */}
          <div style={styles.dropWrap}>
            <button
              style={{ ...styles.fmtBtn, background: "#FFFF0044" }}
              onClick={() => { setShowHighlight(!showHighlight); setShowFontColor(false); }}
              title="Text Highlight"
            >
              🖍
            </button>
            {showHighlight && (
              <div style={styles.colorDrop}>
                <div style={styles.colorGrid}>
                  {highlightColors.map((c) => (
                    <button
                      key={c}
                      style={{ ...styles.colorSwatch, background: c }}
                      onClick={() => { fmt("background", c); setShowHighlight(false); }}
                      title={c}
                    />
                  ))}
                </div>
                <button
                  style={{ marginTop: 6, width: "100%", padding: "4px 0", border: "1px solid #e2e8f0", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 11, color: "#ef4444", fontWeight: 500 }}
                  onClick={() => { fmt("background", false); setShowHighlight(false); }}
                >
                  ✖ No Highlight
                </button>
              </div>
            )}
          </div>

          <button style={styles.fmtBtn} onClick={clearFormat} title="Clear Formatting">✖</button>
        </div>
        <div style={styles.label}>Font</div>
      </div>

      <div style={styles.sep} />

      {/* ===== PARAGRAPH ===== */}
      <div style={styles.group}>
        <div style={styles.row}>
          <button style={styles.fmtBtn} onClick={() => fmt("align", "")} title="Align Left">⬅</button>
          <button style={styles.fmtBtn} onClick={() => fmt("align", "center")} title="Center">⬍</button>
          <button style={styles.fmtBtn} onClick={() => fmt("align", "right")} title="Right">➡</button>
          <button style={styles.fmtBtn} onClick={() => fmt("align", "justify")} title="Justify">☰</button>
        </div>
        <div style={styles.row}>
          <button style={styles.fmtBtn} onClick={() => fmt("list", "ordered")} title="Numbered List">1.</button>
          <button style={styles.fmtBtn} onClick={() => fmt("list", "bullet")} title="Bullet List">•</button>
          <button style={styles.fmtBtn} onClick={() => editor.format("indent", "+1")} title="Increase Indent">⇥</button>
          <button style={styles.fmtBtn} onClick={() => editor.format("indent", "-1")} title="Decrease Indent">⇤</button>

          <select
            style={{ ...styles.select, minWidth: 50 }}
            title="Line Spacing"
            onChange={(e) => editor.format("lineheight", e.target.value)}
          >
            {lineSpacings.map((ls) => (
              <option key={ls.value} value={ls.value}>↕ {ls.label}</option>
            ))}
          </select>

          <button
            style={styles.fmtBtn}
            onClick={() => fmt("direction", getFmt("direction") === "rtl" ? "" : "rtl")}
            title="Right-to-Left"
          >
            ⇄
          </button>
        </div>
        <div style={styles.label}>Paragraph</div>
      </div>

      <div style={styles.sep} />

      {/* ===== STYLES ===== */}
      <div style={styles.group}>
        <div style={styles.row}>
          <button style={styles.styleBtn} onClick={() => fmt("header", false)}>Normal</button>
          <button style={{ ...styles.styleBtn, fontWeight: 800, fontSize: 16 }} onClick={() => fmt("header", 1)}>H1</button>
          <button style={{ ...styles.styleBtn, fontWeight: 700, fontSize: 14 }} onClick={() => fmt("header", 2)}>H2</button>
          <button style={{ ...styles.styleBtn, fontWeight: 600, fontSize: 13 }} onClick={() => fmt("header", 3)}>H3</button>
        </div>
        <div style={styles.row}>
          <button style={{ ...styles.styleBtn, fontWeight: 500, fontSize: 12 }} onClick={() => fmt("header", 4)}>H4</button>
          <button style={{ ...styles.styleBtn, fontWeight: 500, fontSize: 11 }} onClick={() => fmt("header", 5)}>H5</button>
          <button style={{ ...styles.styleBtn, fontStyle: "italic", color: "#64748b" }} onClick={() => fmt("blockquote", true)}>Quote</button>
          <button style={{ ...styles.styleBtn, fontFamily: "monospace", fontSize: 11 }} onClick={() => fmt("code-block", true)}>Code</button>
        </div>
        <div style={styles.label}>Styles</div>
      </div>

      <div style={styles.sep} />

      {/* ===== FIND & REPLACE ===== */}
      <div style={{ ...styles.group, position: "relative" }}>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <button
            style={{
              ...styles.toolBtn,
              ...(showFindReplace ? { background: "#eff6ff", borderColor: "#2563eb" } : {}),
            }}
            onClick={() => setShowFindReplace(!showFindReplace)}
            title="Find & Replace (Ctrl+H)"
          >
            🔍 Find &amp; Replace
          </button>
        </div>
        <div style={styles.label}>Editing</div>

        {showFindReplace && (
          <div style={styles.findPanel}>
            <div style={styles.findRow}>
              <input
                style={styles.findInput}
                placeholder="Find..."
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && findNext()}
              />
              <button style={styles.findBtn} onClick={findNext}>Find</button>
            </div>
            <div style={styles.findRow}>
              <input
                style={styles.findInput}
                placeholder="Replace with..."
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
              />
              <button style={styles.findBtn} onClick={replaceOne}>One</button>
              <button style={styles.findBtn} onClick={replaceAll}>All</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const styles = {
  ribbon: {
    display: "flex",
    alignItems: "stretch",
    gap: 0,
    padding: "6px 12px",
    background: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
    minHeight: 80,
    overflowX: "auto",
    position: "relative",
  },
  group: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "4px 12px",
    gap: 4,
  },
  sep: {
    width: 1,
    background: "#e2e8f0",
    margin: "4px 0",
    flexShrink: 0,
  },
  row: {
    display: "flex",
    gap: 3,
    alignItems: "center",
  },
  toolBtn: {
    padding: "6px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    background: "#fff",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    transition: "background 0.15s ease",
    display: "flex",
    alignItems: "center",
    gap: 5,
    color: "#334155",
  },
  smBtn: {
    width: 32,
    height: 26,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #e2e8f0",
    borderRadius: 4,
    background: "#fff",
    cursor: "pointer",
    fontSize: 13,
    transition: "background 0.15s ease",
  },
  fmtBtn: {
    width: 30,
    height: 28,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #e2e8f0",
    borderRadius: 4,
    background: "#fff",
    cursor: "pointer",
    fontSize: 13,
    transition: "background 0.15s ease",
  },
  styleBtn: {
    padding: "4px 10px",
    border: "1px solid #e2e8f0",
    borderRadius: 4,
    background: "#fff",
    cursor: "pointer",
    fontSize: 12,
    transition: "background 0.15s ease",
    color: "#334155",
  },
  select: {
    padding: "4px 6px",
    border: "1px solid #e2e8f0",
    borderRadius: 4,
    fontSize: 12,
    background: "#fff",
    color: "#334155",
    cursor: "pointer",
  },
  label: {
    fontSize: 10,
    textAlign: "center",
    color: "#94a3b8",
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  dropWrap: {
    position: "relative",
  },
  colorDrop: {
    position: "absolute",
    top: "100%",
    left: 0,
    zIndex: 100,
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    padding: 8,
    marginTop: 4,
  },
  colorGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 4,
  },
  colorSwatch: {
    width: 24,
    height: 24,
    border: "1px solid #d1d5db",
    borderRadius: 4,
    cursor: "pointer",
    transition: "transform 0.1s ease",
  },
  findPanel: {
    position: "absolute",
    top: "100%",
    right: 0,
    zIndex: 100,
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    padding: 12,
    marginTop: 4,
    minWidth: 300,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  findRow: {
    display: "flex",
    gap: 6,
    alignItems: "center",
  },
  findInput: {
    flex: 1,
    padding: "6px 10px",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    fontSize: 13,
    outline: "none",
  },
  findBtn: {
    padding: "6px 12px",
    border: "1px solid #2563eb",
    borderRadius: 6,
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 500,
  },
};
