export default function Ribbon({ activeTab, setActiveTab }) {
  const tabs = ["File", "Home", "Insert", "Layout", "View"];

  return (
    <div style={styles.wrapper}>
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          style={{
            ...styles.tab,
            borderBottom:
              activeTab === tab ? "2px solid #2563eb" : "2px solid transparent",
            fontWeight: activeTab === tab ? "600" : "400",
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    gap: 20,
    padding: "6px 14px",
    background: "#ffffff",
    borderBottom: "1px solid #cbd5e1",
  },
  tab: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "6px 4px",
    fontSize: 14,
  },
};
