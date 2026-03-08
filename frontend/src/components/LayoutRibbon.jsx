import React, { useState } from "react";

export default function LayoutRibbon({ editor, pageSettings, setPageSettings }) {
  const [showMargins, setShowMargins] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [showPageColor, setShowPageColor] = useState(false);

  if (!editor) return null;

  const updateSetting = (key, value) => {
    setPageSettings((prev) => ({ ...prev, [key]: value }));
  };

  /* ---------- MARGINS PRESETS ---------- */
  const marginPresets = [
    { label: "Normal", value: "40px", desc: "1 inch all sides" },
    { label: "Narrow", value: "16px", desc: "0.5 inch all sides" },
    { label: "Moderate", value: "30px", desc: "0.75 inch all sides" },
    { label: "Wide", value: "60px", desc: "1.5 inch all sides" },
  ];

  /* ---------- ORIENTATION ---------- */
  const orientations = [
    { label: "Portrait", value: "portrait", icon: "📄" },
    { label: "Landscape", value: "landscape", icon: "🖼" },
  ];

  /* ---------- PAGE SIZES ---------- */
  const pageSizes = [
    { label: "Letter", width: "8.5in", height: "11in" },
    { label: "A4", width: "210mm", height: "297mm" },
    { label: "Legal", width: "8.5in", height: "14in" },
    { label: "A3", width: "297mm", height: "420mm" },
    { label: "A5", width: "148mm", height: "210mm" },
  ];

  /* ---------- COLUMNS ---------- */
  const columnOptions = [
    { label: "One", value: 1, icon: "▌" },
    { label: "Two", value: 2, icon: "▌▌" },
    { label: "Three", value: 3, icon: "▌▌▌" },
  ];

  /* ---------- PAGE COLORS ---------- */
  const pageColors = [
    { label: "White", value: "#ffffff" },
    { label: "Cream", value: "#fffdd0" },
    { label: "Light Blue", value: "#e8f4fd" },
    { label: "Light Green", value: "#e8f5e9" },
    { label: "Light Gray", value: "#f5f5f5" },
    { label: "Sepia", value: "#f4ecd8" },
  ];

  /* ---------- PAGE BORDERS ---------- */
  const borderOptions = [
    { label: "None", value: "none" },
    { label: "Thin", value: "1px solid #000" },
    { label: "Medium", value: "2px solid #333" },
    { label: "Thick", value: "3px solid #000" },
    { label: "Double", value: "3px double #000" },
    { label: "Dashed", value: "2px dashed #555" },
  ];

  const insertPageBreak = () => {
    const range = editor.getSelection(true) || { index: editor.getLength() - 1, length: 0 };
    editor.insertEmbed(range.index, "pageBreak", true, "user");
    editor.setSelection(range.index + 1);
  };

  return (
    <div style={styles.ribbon}>
      {/* --- PAGE SETUP GROUP --- */}
      <div style={styles.group}>
        <div style={styles.groupTitle}>Page Setup</div>
        <div style={styles.groupContent}>
          {/* Margins */}
          <div style={styles.dropdownWrap}>
            <button
              style={styles.toolBtn}
              onClick={() => { setShowMargins(!showMargins); setShowColumns(false); setShowPageColor(false); }}
            >
              <span style={styles.icon}>📏</span>
              <span>Margins</span>
              <span style={styles.arrow}>▾</span>
            </button>
            {showMargins && (
              <div style={styles.dropdown}>
                {marginPresets.map((m) => (
                  <button
                    key={m.label}
                    style={{
                      ...styles.dropItem,
                      ...(pageSettings.margin === m.value ? styles.dropItemActive : {}),
                    }}
                    onClick={() => { updateSetting("margin", m.value); setShowMargins(false); }}
                  >
                    <span style={styles.dropLabel}>{m.label}</span>
                    <span style={styles.dropDesc}>{m.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Orientation */}
          <div style={styles.btnGroup}>
            {orientations.map((o) => (
              <button
                key={o.value}
                style={{
                  ...styles.toggleBtn,
                  ...(pageSettings.orientation === o.value ? styles.toggleActive : {}),
                }}
                onClick={() => updateSetting("orientation", o.value)}
                title={o.label}
              >
                <span>{o.icon}</span>
                <span style={styles.smallLabel}>{o.label}</span>
              </button>
            ))}
          </div>

          {/* Size */}
          <select
            style={styles.select}
            value={pageSettings.size || "A4"}
            onChange={(e) => {
              const s = pageSizes.find((p) => p.label === e.target.value);
              if (s) {
                updateSetting("size", s.label);
                updateSetting("width", s.width);
                updateSetting("height", s.height);
              }
            }}
          >
            {pageSizes.map((s) => (
              <option key={s.label} value={s.label}>
                {s.label} ({s.width} × {s.height})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.sep} />

      {/* --- COLUMNS GROUP --- */}
      <div style={styles.group}>
        <div style={styles.groupTitle}>Columns</div>
        <div style={styles.groupContent}>
          <div style={styles.dropdownWrap}>
            <button
              style={styles.toolBtn}
              onClick={() => { setShowColumns(!showColumns); setShowMargins(false); setShowPageColor(false); }}
            >
              <span style={styles.icon}>▥</span>
              <span>Columns</span>
              <span style={styles.arrow}>▾</span>
            </button>
            {showColumns && (
              <div style={styles.dropdown}>
                {columnOptions.map((c) => (
                  <button
                    key={c.value}
                    style={{
                      ...styles.dropItem,
                      ...(pageSettings.columns === c.value ? styles.dropItemActive : {}),
                    }}
                    onClick={() => { updateSetting("columns", c.value); setShowColumns(false); }}
                  >
                    <span style={styles.dropIcon}>{c.icon}</span>
                    <span style={styles.dropLabel}>{c.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={styles.sep} />

      {/* --- PAGE BACKGROUND GROUP --- */}
      <div style={styles.group}>
        <div style={styles.groupTitle}>Page Background</div>
        <div style={styles.groupContent}>
          {/* Page Color */}
          <div style={styles.dropdownWrap}>
            <button
              style={styles.toolBtn}
              onClick={() => { setShowPageColor(!showPageColor); setShowMargins(false); setShowColumns(false); }}
            >
              <span style={styles.icon}>🎨</span>
              <span>Page Color</span>
              <span style={styles.arrow}>▾</span>
            </button>
            {showPageColor && (
              <div style={{ ...styles.dropdown, minWidth: 200 }}>
                <div style={styles.colorGrid}>
                  {pageColors.map((c) => (
                    <button
                      key={c.value}
                      title={c.label}
                      style={{
                        ...styles.colorSwatch,
                        background: c.value,
                        ...(pageSettings.pageColor === c.value
                          ? { boxShadow: "0 0 0 2px #2563eb", transform: "scale(1.15)" }
                          : {}),
                      }}
                      onClick={() => { updateSetting("pageColor", c.value); setShowPageColor(false); }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Page Border */}
          <select
            style={styles.select}
            value={pageSettings.pageBorder || "none"}
            onChange={(e) => updateSetting("pageBorder", e.target.value)}
          >
            {borderOptions.map((b) => (
              <option key={b.label} value={b.value}>
                Border: {b.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.sep} />

      {/* --- PAGE BREAK --- */}
      <div style={styles.group}>
        <div style={styles.groupTitle}>Breaks</div>
        <div style={styles.groupContent}>
          <button style={styles.toolBtn} onClick={insertPageBreak}>
            <span style={styles.icon}>📃</span>
            <span>Page Break</span>
          </button>
        </div>
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
  },
  group: {
    display: "flex",
    flexDirection: "column",
    padding: "4px 12px",
    gap: 4,
    position: "relative",
  },
  groupTitle: {
    fontSize: 10,
    textAlign: "center",
    color: "#94a3b8",
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginTop: "auto",
  },
  groupContent: {
    display: "flex",
    gap: 6,
    alignItems: "center",
    flexWrap: "wrap",
  },
  sep: {
    width: 1,
    background: "#e2e8f0",
    margin: "4px 0",
    flexShrink: 0,
  },
  toolBtn: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "6px 12px",
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
  icon: { fontSize: 14 },
  arrow: { fontSize: 10, color: "#94a3b8", marginLeft: 2 },
  smallLabel: { fontSize: 11 },
  select: {
    padding: "6px 8px",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    fontSize: 12,
    background: "#fff",
    color: "#334155",
    cursor: "pointer",
  },
  btnGroup: {
    display: "flex",
    gap: 2,
  },
  toggleBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    padding: "5px 10px",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    background: "#fff",
    cursor: "pointer",
    fontSize: 14,
    transition: "all 0.15s ease",
  },
  toggleActive: {
    background: "#eff6ff",
    borderColor: "#2563eb",
    color: "#2563eb",
  },
  dropdownWrap: {
    position: "relative",
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    zIndex: 100,
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    minWidth: 180,
    marginTop: 4,
    padding: "4px 0",
  },
  dropItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "8px 14px",
    border: "none",
    background: "none",
    cursor: "pointer",
    fontSize: 13,
    color: "#334155",
    textAlign: "left",
    transition: "background 0.12s ease",
  },
  dropItemActive: {
    background: "#eff6ff",
    color: "#2563eb",
    fontWeight: 600,
  },
  dropIcon: { fontSize: 14, fontFamily: "monospace" },
  dropLabel: { fontWeight: 500 },
  dropDesc: { fontSize: 11, color: "#94a3b8" },
  colorGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 6,
    padding: 10,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    border: "1px solid #d1d5db",
    borderRadius: 6,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
};
