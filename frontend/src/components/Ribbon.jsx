export default function Ribbon({ activeTab, setActiveTab }) {
  const tabs = [
    { key: "File", icon: "📁" },
    { key: "Home", icon: "🏠" },
    { key: "Insert", icon: "➕" },
    { key: "Layout", icon: "📐" },
    { key: "View", icon: "👁" },
    { key: "Sent", icon: "📤" },
    { key: "Inbox", icon: "📥" },
    { key: "My Files", icon: "🗂" },
  ];

  return (
    <div style={styles.wrapper}>
      {tabs.map(({ key, icon }) => {
        const isActive = activeTab === key;
        return (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              ...styles.tab,
              ...(isActive ? styles.tabActive : {}),
            }}
          >
            <span style={styles.tabIcon}>{icon}</span>
            {key}
          </button>
        );
      })}
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    gap: 2,
    padding: "0 12px",
    background: "#fff",
    borderBottom: "1px solid #e2e8f0",
  },
  tab: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "10px 14px",
    fontSize: 13,
    fontWeight: 500,
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    gap: 6,
    borderBottom: "2px solid transparent",
    transition: "all 0.15s ease",
  },
  tabActive: {
    color: "#2563eb",
    fontWeight: 600,
    borderBottom: "2px solid #2563eb",
    background: "#eff6ff",
  },
  tabIcon: {
    fontSize: 14,
  },
};
