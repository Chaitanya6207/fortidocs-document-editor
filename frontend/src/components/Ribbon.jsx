import React from "react";

export default function Ribbon({ activeTab, setActiveTab, onAction }) {
  const tabs = ["File", "Home", "Insert", "Layout", "View"];

  return (
    <div style={styles.wrapper}>
      <div style={styles.tabs}>
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              ...styles.tab,
              borderBottom: activeTab === t ? "2px solid #2563eb" : "none",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={styles.tools}>
        {activeTab === "Home" && (
          <>
            <button onClick={() => onAction("bold")}>B</button>
            <button onClick={() => onAction("italic")}>I</button>
            <button onClick={() => onAction("underline")}>U</button>
            <button onClick={() => onAction("align", "left")}>Left</button>
            <button onClick={() => onAction("align", "center")}>Center</button>
            <button onClick={() => onAction("align", "right")}>Right</button>
            <button onClick={() => onAction("list", "ordered")}>OL</button>
            <button onClick={() => onAction("list", "bullet")}>UL</button>
          </>
        )}

        {activeTab === "Insert" && (
          <>
            <button onClick={() => onAction("image")}>Image</button>
            <button onClick={() => onAction("link")}>Link</button>
          </>
        )}

        {activeTab === "Layout" && (
          <>
            <button onClick={() => onAction("indent", "+1")}>Indent +</button>
            <button onClick={() => onAction("indent", "-1")}>Indent −</button>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  wrapper: { background: "#f8fafc", borderBottom: "1px solid #d1d5db" },
  tabs: { display: "flex", gap: 12, padding: "6px 10px" },
  tab: { background: "none", border: "none", cursor: "pointer", fontWeight: 500 },
  tools: { padding: "8px 10px", display: "flex", gap: 8 },
};
