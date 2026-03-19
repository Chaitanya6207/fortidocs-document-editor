import React, { useState } from "react";

export default function ViewRibbon({ viewSettings, setViewSettings, editor, totalPages }) {
  if (!editor) return null;

  const update = (key, value) => setViewSettings((prev) => ({ ...prev, [key]: value }));

  /* ---------- ZOOM ---------- */
  const zoomLevels = [50, 75, 100, 125, 150, 200];

  const zoomIn = () => {
    const currentIdx = zoomLevels.indexOf(viewSettings.zoom);
    if (currentIdx < zoomLevels.length - 1) {
      update("zoom", zoomLevels[currentIdx + 1]);
    }
  };

  const zoomOut = () => {
    const currentIdx = zoomLevels.indexOf(viewSettings.zoom);
    if (currentIdx > 0) {
      update("zoom", zoomLevels[currentIdx - 1]);
    }
  };

  /* ---------- WORD COUNT ---------- */
  const getStats = () => {
    const text = editor.getText().trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = text.length;
    const lines = text ? text.split(/\n/).length : 0;
    // Use the real totalPages from Editor if provided, else fallback to estimation
    const pages = totalPages || Math.max(1, Math.ceil(words / 250));
    return { words, chars, lines, pages };
  };

  const stats = getStats();

  /* ---------- VIEW MODES ---------- */
  const viewModes = [
    { label: "Print Layout", value: "print", icon: "📄", desc: "Edit with page layout" },
    { label: "Web Layout", value: "web", icon: "🌐", desc: "Edit without page borders" },
    { label: "Read Mode", value: "read", icon: "📖", desc: "Full screen reading" },
    { label: "Focus Mode", value: "focus", icon: "🎯", desc: "Distraction-free writing" },
  ];

  /* ---------- RULERS & GUIDES ---------- */
  const toggleOptions = [
    { label: "Ruler", key: "ruler", icon: "📏" },
    { label: "Gridlines", key: "gridlines", icon: "▦" },
    { label: "Dark Mode", key: "darkMode", icon: "🌙" },
  ];

  return (
    <div style={styles.ribbon}>
      {/* --- VIEWS GROUP --- */}
      <div style={styles.group}>
        <div style={styles.groupTitle}>Views</div>
        <div style={styles.groupContent}>
          {viewModes.map((v) => (
            <button
              key={v.value}
              style={{
                ...styles.viewBtn,
                ...(viewSettings.viewMode === v.value ? styles.viewBtnActive : {}),
              }}
              onClick={() => update("viewMode", v.value)}
              title={v.desc}
            >
              <span style={styles.viewIcon}>{v.icon}</span>
              <span>{v.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={styles.sep} />

      {/* --- ZOOM GROUP --- */}
      <div style={styles.group}>
        <div style={styles.groupTitle}>Zoom</div>
        <div style={styles.groupContent}>
          <button style={styles.zoomBtn} onClick={zoomOut} title="Zoom Out">
            −
          </button>
          <div style={styles.zoomDisplay}>{viewSettings.zoom}%</div>
          <button style={styles.zoomBtn} onClick={zoomIn} title="Zoom In">
            +
          </button>
          <select
            style={styles.select}
            value={viewSettings.zoom}
            onChange={(e) => update("zoom", Number(e.target.value))}
          >
            {zoomLevels.map((z) => (
              <option key={z} value={z}>
                {z}%
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.sep} />

      {/* --- SHOW/HIDE GROUP --- */}
      <div style={styles.group}>
        <div style={styles.groupTitle}>Show</div>
        <div style={styles.groupContent}>
          {toggleOptions.map((t) => (
            <label key={t.key} style={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={viewSettings[t.key] || false}
                onChange={() => update(t.key, !viewSettings[t.key])}
                style={styles.checkbox}
              />
              <span style={styles.toggleIcon}>{t.icon}</span>
              <span>{t.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div style={styles.sep} />

      {/* --- DOCUMENT STATS GROUP --- */}
      <div style={styles.group}>
        <div style={styles.groupTitle}>Document Info</div>
        <div style={styles.statsGrid}>
          <div style={styles.stat}>
            <span style={styles.statValue}>{stats.words}</span>
            <span style={styles.statLabel}>Words</span>
          </div>
          <div style={styles.stat}>
            <span style={styles.statValue}>{stats.chars}</span>
            <span style={styles.statLabel}>Chars</span>
          </div>
          <div style={styles.stat}>
            <span style={styles.statValue}>{stats.lines}</span>
            <span style={styles.statLabel}>Lines</span>
          </div>
          <div style={styles.stat}>
            <span style={styles.statValue}>{stats.pages}</span>
            <span style={styles.statLabel}>Pages</span>
          </div>
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
  viewBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    padding: "6px 10px",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    background: "#fff",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 500,
    color: "#64748b",
    transition: "all 0.15s ease",
    minWidth: 64,
  },
  viewBtnActive: {
    background: "#eff6ff",
    borderColor: "#2563eb",
    color: "#2563eb",
    fontWeight: 600,
  },
  viewIcon: { fontSize: 18 },
  zoomBtn: {
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    background: "#fff",
    cursor: "pointer",
    fontSize: 18,
    fontWeight: 600,
    color: "#334155",
    transition: "all 0.15s ease",
  },
  zoomDisplay: {
    fontSize: 14,
    fontWeight: 700,
    color: "#1e293b",
    minWidth: 42,
    textAlign: "center",
  },
  select: {
    padding: "4px 6px",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    fontSize: 12,
    background: "#fff",
    color: "#334155",
    cursor: "pointer",
  },
  toggleLabel: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "5px 10px",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    background: "#fff",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 500,
    color: "#334155",
    transition: "all 0.15s ease",
  },
  checkbox: {
    accentColor: "#2563eb",
  },
  toggleIcon: { fontSize: 13 },
  statsGrid: {
    display: "flex",
    gap: 8,
  },
  stat: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "4px 10px",
    background: "#f1f5f9",
    borderRadius: 6,
    minWidth: 48,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 700,
    color: "#1e293b",
  },
  statLabel: {
    fontSize: 9,
    color: "#94a3b8",
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
};
