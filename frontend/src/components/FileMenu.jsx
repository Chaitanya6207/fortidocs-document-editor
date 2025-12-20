import React from "react";

export default function FileMenu({
  onNew,
  onOpen,
  onShare,
  onSave,
  onSaveAs,
  onPrint,
  onExport,
  onClose,
}) {
  return (
    <div style={styles.menu}>
      <div style={styles.item} onClick={onNew}>📄 New</div>
      <div style={styles.item} onClick={onOpen}>📂 Open</div>
      <div style={styles.item} onClick={onShare}>🔗 Share</div>

      <hr />

      <div style={styles.item} onClick={onSave}>💾 Save</div>
      <div style={styles.item} onClick={onSaveAs}>💾 Save As</div>
      <div style={styles.item} onClick={onPrint}>🖨 Print</div>
      <div style={styles.item} onClick={onExport}>⬇ Export</div>

      <hr />

      <div style={{ ...styles.item, color: "red" }} onClick={onClose}>
        ❌ Close
      </div>
    </div>
  );
}

const styles = {
  menu: {
    width: 220,
    background: "#f8fafc",
    borderRight: "1px solid #d1d5db",
    padding: 10,
    height: "100%",
  },
  item: {
    padding: "10px 12px",
    cursor: "pointer",
    borderRadius: 4,
  },
};
