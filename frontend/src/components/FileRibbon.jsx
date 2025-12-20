export default function FileRibbon({
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onPrint,
  onExport,
  onShare,
}) {
  return (
    <div style={styles.ribbon}>
      <button onClick={onNew}>New</button>
      <button onClick={onOpen}>Open</button>
      <button onClick={onSave}>Save</button>
      <button onClick={onSaveAs}>Save As</button>
      <button onClick={onPrint}>Print</button>
      <button onClick={onExport}>Export</button>
      <button onClick={onShare}>Share</button>
    </div>
  );
}

const styles = {
  ribbon: {
    display: "flex",
    gap: 10,
    padding: 10,
    background: "#f8fafc",
    borderBottom: "1px solid #cbd5e1",
  },
};
