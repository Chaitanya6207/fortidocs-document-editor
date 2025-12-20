export default function HomeRibbon({ editor }) {
  if (!editor) return null;

  const format = (key, value = true) => editor.format(key, value);

  return (
    <div style={styles.ribbon}>
      {/* Clipboard */}
      <div style={styles.group}>
        <button style={styles.bigBtn}>📋 Paste</button>
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
          />
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

        <div style={styles.label}>Paragraph</div>
      </div>

      {/* Styles */}
      <div style={styles.group}>
        <button onClick={() => format("header", false)}>Normal</button>
        <button onClick={() => format("header", 1)}>Heading 1</button>
        <button onClick={() => format("header", 2)}>Heading 2</button>
        <div style={styles.label}>Styles</div>
      </div>
    </div>
  );
}

/* 🔧 FIXED STYLES */
const styles = {
  ribbon: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: "6px 10px",
    background: "#f1f5f9",
    borderBottom: "1px solid #cbd5e1",
    height: 110,              // 🔴 FIXED HEIGHT
  },
  group: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    height: "100%",           // 🔴 MATCH RIBBON HEIGHT
    padding: "0 10px",
    borderRight: "1px solid #e5e7eb",
  },
  row: {
    display: "flex",
    gap: 4,
  },
  bigBtn: {
    height: 50,
    fontSize: 14,
  },
  label: {
    fontSize: 11,
    textAlign: "center",
    color: "#475569",
    marginTop: 4,
  },
};
