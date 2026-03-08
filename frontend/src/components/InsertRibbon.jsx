import React, { useState } from "react";

export default function InsertRibbon({ editor }) {
  const [showSymbols, setShowSymbols] = useState(false);
  const [showShapes, setShowShapes] = useState(false);

  if (!editor) return null;

  const getRange = () => editor.getSelection(true);

  /* ---------- IMAGE ---------- */
  const insertImageUrl = () => {
    const url = prompt("Enter image URL:");
    if (!url) return;
    editor.insertEmbed(getRange().index, "image", url);
  };

  const insertImageFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        editor.insertEmbed(getRange().index, "image", ev.target.result);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  /* ---------- TABLE ---------- */
  const insertTable = () => {
    const rows = prompt("Number of rows?", "3");
    const cols = prompt("Number of columns?", "3");
    if (!rows || !cols) return;
    const r = parseInt(rows), c = parseInt(cols);
    if (isNaN(r) || isNaN(c) || r < 1 || c < 1) return;

    let html = `<table border="1" style="border-collapse:collapse;width:100%;margin:12px 0;">`;
    // Header row
    html += "<thead><tr>";
    for (let j = 0; j < c; j++) {
      html += `<th style="padding:10px 14px;background:#f1f5f9;border:1px solid #cbd5e1;font-weight:600;text-align:left;">Header ${j + 1}</th>`;
    }
    html += "</tr></thead><tbody>";
    // Data rows
    for (let i = 0; i < r - 1; i++) {
      html += "<tr>";
      for (let j = 0; j < c; j++) {
        html += `<td style="padding:8px 14px;border:1px solid #cbd5e1;">Cell</td>`;
      }
      html += "</tr>";
    }
    html += "</tbody></table><br/>";
    editor.clipboard.dangerouslyPasteHTML(getRange().index, html);
  };

  /* ---------- LINK ---------- */
  const insertLink = () => {
    const url = prompt("Enter URL:", "https://");
    if (!url) return;
    const text = prompt("Link text:", url);
    if (!text) return;
    const range = getRange();
    editor.insertText(range.index, text, "link", url);
  };

  /* ---------- HORIZONTAL RULE ---------- */
  const insertHR = () => {
    editor.clipboard.dangerouslyPasteHTML(
      getRange().index,
      '<hr style="border:none;border-top:2px solid #e2e8f0;margin:16px 0;"/>'
    );
  };

  /* ---------- TEXT BOX ---------- */
  const insertTextBox = () => {
    editor.insertEmbed(getRange().index, "textBox", "Type here...");
  };

  /* ---------- BLOCKQUOTE ---------- */
  const insertBlockquote = () => {
    editor.clipboard.dangerouslyPasteHTML(
      getRange().index,
      '<blockquote style="border-left:4px solid #2563eb;padding:10px 16px;margin:12px 0;background:#f8fafc;color:#475569;font-style:italic;">Type your quote here...</blockquote><br/>'
    );
  };

  /* ---------- CODE BLOCK ---------- */
  const insertCodeBlock = () => {
    editor.clipboard.dangerouslyPasteHTML(
      getRange().index,
      '<pre style="background:#1e293b;color:#e2e8f0;padding:16px;border-radius:8px;font-family:monospace;font-size:13px;margin:12px 0;overflow-x:auto;">// Your code here\nconsole.log("Hello World");</pre><br/>'
    );
  };

  /* ---------- DATE/TIME ---------- */
  const insertDateTime = () => {
    const now = new Date();
    const options = [
      now.toLocaleDateString(),
      now.toLocaleString(),
      now.toISOString().split("T")[0],
      now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
    ];
    const choice = prompt(
      `Choose a format:\n1. ${options[0]}\n2. ${options[1]}\n3. ${options[2]}\n4. ${options[3]}`,
      "1"
    );
    const idx = parseInt(choice) - 1;
    if (idx >= 0 && idx < options.length) {
      editor.insertText(getRange().index, options[idx]);
    }
  };

  /* ---------- PAGE BREAK ---------- */
  const insertPageBreak = () => {
    editor.clipboard.dangerouslyPasteHTML(
      getRange().index,
      '<hr style="page-break-after:always;border:none;border-top:2px dashed #94a3b8;margin:24px 0;"/>'
    );
  };

  /* ---------- SYMBOLS ---------- */
  const symbols = [
    "©", "®", "™", "°", "±", "÷", "×", "µ",
    "¶", "§", "†", "‡", "€", "£", "¥", "¢",
    "∞", "≈", "≠", "≤", "≥", "∑", "∏", "√",
    "α", "β", "γ", "δ", "π", "Ω", "λ", "θ",
    "→", "←", "↑", "↓", "↔", "⇒", "⇐", "★",
    "♠", "♣", "♥", "♦", "✓", "✗", "☎", "✉",
  ];

  const insertSymbol = (sym) => {
    editor.insertText(getRange().index, sym);
    setShowSymbols(false);
  };

  /* ---------- SHAPES ---------- */
  const shapes = [
    { label: "Rectangle", html: '<div style="width:120px;height:80px;border:2px solid #334155;background:#f1f5f9;display:inline-block;margin:8px;"></div>' },
    { label: "Circle", html: '<div style="width:80px;height:80px;border:2px solid #334155;background:#f1f5f9;border-radius:50%;display:inline-block;margin:8px;"></div>' },
    { label: "Rounded", html: '<div style="width:120px;height:80px;border:2px solid #334155;background:#f1f5f9;border-radius:16px;display:inline-block;margin:8px;"></div>' },
    { label: "Diamond", html: '<div style="width:60px;height:60px;border:2px solid #334155;background:#f1f5f9;transform:rotate(45deg);display:inline-block;margin:16px;"></div>' },
  ];

  const insertShape = (shape) => {
    editor.clipboard.dangerouslyPasteHTML(getRange().index, shape.html + "<br/>");
    setShowShapes(false);
  };

  /* ---------- CALLOUT BOX ---------- */
  const insertCallout = () => {
    const types = {
      info: { bg: "#eff6ff", border: "#2563eb", icon: "ℹ️", title: "Info" },
      warning: { bg: "#fffbeb", border: "#f59e0b", icon: "⚠️", title: "Warning" },
      success: { bg: "#f0fdf4", border: "#22c55e", icon: "✅", title: "Success" },
      error: { bg: "#fef2f2", border: "#ef4444", icon: "❌", title: "Error" },
    };
    const choice = prompt("Callout type: info, warning, success, error", "info");
    const t = types[choice] || types.info;
    editor.clipboard.dangerouslyPasteHTML(
      getRange().index,
      `<div style="border-left:4px solid ${t.border};background:${t.bg};padding:12px 16px;margin:12px 0;border-radius:0 8px 8px 0;">${t.icon} <strong>${t.title}:</strong> Type your message here...</div><br/>`
    );
  };

  /* ---------- ITEMS ---------- */
  const groups = [
    {
      title: "Tables",
      items: [
        { label: "Table", icon: "📊", fn: insertTable },
      ],
    },
    {
      title: "Illustrations",
      items: [
        { label: "Picture URL", icon: "🌐", fn: insertImageUrl },
        { label: "Picture File", icon: "🖼", fn: insertImageFile },
        {
          label: "Shapes",
          icon: "⬡",
          fn: () => { setShowShapes(!showShapes); setShowSymbols(false); },
          dropdown: true,
        },
      ],
    },
    {
      title: "Links",
      items: [
        { label: "Hyperlink", icon: "🔗", fn: insertLink },
      ],
    },
    {
      title: "Text",
      items: [
        { label: "Text Box", icon: "⬛", fn: insertTextBox },
        { label: "Blockquote", icon: "❝", fn: insertBlockquote },
        { label: "Code Block", icon: "💻", fn: insertCodeBlock },
        { label: "Callout", icon: "📌", fn: insertCallout },
      ],
    },
    {
      title: "Symbols",
      items: [
        { label: "Horizontal Line", icon: "—", fn: insertHR },
        { label: "Page Break", icon: "📃", fn: insertPageBreak },
        { label: "Date & Time", icon: "📅", fn: insertDateTime },
        {
          label: "Symbol",
          icon: "Ω",
          fn: () => { setShowSymbols(!showSymbols); setShowShapes(false); },
          dropdown: true,
        },
      ],
    },
  ];

  return (
    <div style={styles.ribbon}>
      {groups.map((g, gi) => (
        <React.Fragment key={g.title}>
          {gi > 0 && <div style={styles.sep} />}
          <div style={styles.group}>
            <div style={styles.groupContent}>
              {g.items.map((item) => (
                <div key={item.label} style={styles.btnWrap}>
                  <button onClick={item.fn} style={styles.btn} title={item.label}>
                    <span style={styles.btnIcon}>{item.icon}</span>
                    <span>{item.label}</span>
                    {item.dropdown && <span style={styles.arrow}>▾</span>}
                  </button>
                </div>
              ))}
            </div>
            <div style={styles.label}>{g.title}</div>
          </div>
        </React.Fragment>
      ))}

      {/* Shapes Dropdown */}
      {showShapes && (
        <div style={{ ...styles.dropdown, left: 300 }}>
          <div style={styles.dropTitle}>Shapes</div>
          <div style={styles.shapeGrid}>
            {shapes.map((s) => (
              <button
                key={s.label}
                style={styles.shapeBtn}
                onClick={() => insertShape(s)}
                title={s.label}
              >
                <div dangerouslySetInnerHTML={{ __html: s.html.replace(/width:\d+px/g, "width:36px").replace(/height:\d+px/g, "height:36px") }} />
                <span style={styles.shapeName}>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Symbols Dropdown */}
      {showSymbols && (
        <div style={{ ...styles.dropdown, right: 12 }}>
          <div style={styles.dropTitle}>Special Characters</div>
          <div style={styles.symbolGrid}>
            {symbols.map((s) => (
              <button
                key={s}
                style={styles.symbolBtn}
                onClick={() => insertSymbol(s)}
                title={s}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
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
  groupContent: {
    display: "flex",
    gap: 4,
    alignItems: "center",
    flexWrap: "wrap",
  },
  sep: {
    width: 1,
    background: "#e2e8f0",
    margin: "4px 0",
    flexShrink: 0,
  },
  label: {
    fontSize: 10,
    textAlign: "center",
    color: "#94a3b8",
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  btnWrap: {
    position: "relative",
  },
  btn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    background: "#fff",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 500,
    color: "#334155",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
  },
  btnIcon: { fontSize: 14 },
  arrow: { fontSize: 10, color: "#94a3b8", marginLeft: 2 },
  dropdown: {
    position: "absolute",
    top: 78,
    zIndex: 100,
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    boxShadow: "0 12px 32px rgba(0,0,0,0.14)",
    padding: 12,
  },
  dropTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: "#334155",
    marginBottom: 8,
    paddingBottom: 6,
    borderBottom: "1px solid #e2e8f0",
  },
  symbolGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(8, 1fr)",
    gap: 3,
    maxWidth: 280,
  },
  symbolBtn: {
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #e2e8f0",
    borderRadius: 4,
    background: "#fff",
    cursor: "pointer",
    fontSize: 15,
    transition: "all 0.12s ease",
  },
  shapeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 8,
    minWidth: 200,
  },
  shapeBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    padding: 8,
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    background: "#fff",
    cursor: "pointer",
    transition: "all 0.12s ease",
  },
  shapeName: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: 500,
  },
};
