export default function HomeRibbon({ editor }) {
  if (!editor) return null;

  /* ---------- BASIC FORMAT ---------- */
  const format = (key, value = true) => editor.format(key, value);

  /* ---------- CLIPBOARD ---------- */
  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const range = editor.getSelection(true);
      editor.insertText(range.index, text);
    } catch {
      alert("Paste not allowed by browser");
    }
  };

  /* ---------- CLEAR FORMAT ---------- */
  const clearFormat = () => {
    const range = editor.getSelection();
    if (range) {
      editor.removeFormat(range.index, range.length);
    }
  };

  /* ---------- INDENT ---------- */
  const indent = (value) => editor.format("indent", value);

  return (
    <div style={styles.ribbon}>
      {/* Clipboard */}
      <div style={styles.group}>
        <button style={styles.bigBtn} onClick={paste}>
          📋 Paste
        </button>
        <div style={styles.label}>Clipboard</div>
      </div>

      {/* Font */}
      <div style={styles.group}>
        <div style={styles.row}>
          <select onChange={(e) => format("font", e.target.value)}>
            <option value="">Font</option>
            <option value="serif">Serif</option>
            <option value="monospace">Mono</option>
          </select>

          <select onChange={(e) => format("size", e.target.value)}>
            <option value="">12</option>
            <option value="small">10</option>
            <option value="large">16</option>
            <option value="huge">20</option>
          </select>
        </div>

        <div style={styles.row}>
          <button onClick={() => format("bold")}>B</button>
          <button onClick={() => format("italic")}>I</button>
          <button onClick={() => format("underline")}>U</button>
          <input
            type="color"
            onChange={(e) => format("color", e.target.value)}
            title="Text color"
            style={styles.color}
          />
          <button onClick={clearFormat}>✖</button>
        </div>

        <div style={styles.label}>Font</div>
      </div>

      {/* Paragraph */}
      <div style={styles.group}>
        <div style={styles.row}>
          <button onClick={() => format("align", "")}>⬅</button>
          <button onClick={() => format("align", "center")}>⬍</button>
          <button onClick={() => format("align", "right")}>➡</button>
        </div>

        <div style={styles.row}>
          <button onClick={() => format("list", "ordered")}>1.</button>
          <button onClick={() => format("list", "bullet")}>•</button>
        </div>

        <div style={styles.row}>
          <button onClick={() => indent("+1")}>➜</button>
          <button onClick={() => indent("-1")}>⬅</button>
        </div>

        <div style={styles.label}>Paragraph</div>
      </div>

      {/* Styles */}
      <div style={styles.group}>
        <div style={styles.row}>
          <button onClick={() => format("header", false)}>Normal</button>
          <button onClick={() => format("header", 1)}>H1</button>
          <button onClick={() => format("header", 2)}>H2</button>
        </div>
        <div style={styles.label}>Styles</div>
      </div>
    </div>
  );
}

/* ---------- STYLES ---------- */
const styles = {
  ribbon: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "6px 10px",
    background: "#f1f5f9",
    borderBottom: "1px solid #cbd5e1",
    height: 90,
    overflowX: "auto",
  },
  group: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    height: "100%",
    padding: "0 10px",
    borderRight: "1px solid #e5e7eb",
    minWidth: 130,
  },
  row: {
    display: "flex",
    gap: 4,
    alignItems: "center",
  },
  bigBtn: {
    height: 36,
    fontSize: 14,
  },
  color: {
    width: 28,
    height: 28,
    padding: 0,
    border: "none",
    cursor: "pointer",
  },
  label: {
    fontSize: 11,
    textAlign: "center",
    color: "#475569",
  },
};
