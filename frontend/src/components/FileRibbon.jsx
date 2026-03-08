export default function FileRibbon({
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onPrint,
  onExport,
  onShare,
}) {
  const actions = [
    { label: "New", icon: "📄", fn: onNew },
    { label: "Open", icon: "📂", fn: onOpen },
    { label: "Save", icon: "💾", fn: onSave, primary: true },
    { label: "Save As", icon: "📥", fn: onSaveAs },
    { label: "Print", icon: "🖨️", fn: onPrint },
    { label: "Export", icon: "📤", fn: onExport },
    { label: "Share", icon: "🔗", fn: onShare, accent: true },
  ];

  return (
    <div style={styles.ribbon}>
      {actions.map((a) => (
        <button
          key={a.label}
          onClick={a.fn}
          style={{
            ...styles.btn,
            ...(a.primary ? styles.primary : {}),
            ...(a.accent ? styles.accent : {}),
          }}
        >
          <span style={styles.icon}>{a.icon}</span>
          {a.label}
        </button>
      ))}
    </div>
  );
}

const styles = {
  ribbon: {
    display: "flex",
    gap: 6,
    padding: "8px 14px",
    background: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
    flexWrap: "wrap",
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
    fontSize: 13,
    fontWeight: 500,
    color: "#334155",
    transition: "all 0.15s ease",
  },
  primary: {
    background: "#2563eb",
    color: "#fff",
    borderColor: "#2563eb",
  },
  accent: {
    background: "linear-gradient(135deg, #059669, #10b981)",
    color: "#fff",
    borderColor: "#059669",
  },
  icon: {
    fontSize: 15,
  },
};
