export default function InsertRibbon({ editor }) {
  if (!editor) return null;

  /* ---------- INSERT IMAGE ---------- */
  const insertImage = () => {
    const url = prompt("Enter image URL");
    if (!url) return;
    const range = editor.getSelection(true);
    editor.insertEmbed(range.index, "image", url);
  };

  /* ---------- INSERT TEXTBOX ---------- */
  const insertTextBox = () => {
    const range = editor.getSelection(true);
    editor.insertEmbed(range.index, "textBox", "Text");
  };

  /* ---------- INSERT TABLE ---------- */
  const insertTable = () => {
    const rows = prompt("Number of rows?", 2);
    const cols = prompt("Number of columns?", 2);
    if (!rows || !cols) return;

    let table = "<table border='1' style='border-collapse:collapse;width:100%'>";
    for (let r = 0; r < rows; r++) {
      table += "<tr>";
      for (let c = 0; c < cols; c++) {
        table += "<td style='padding:8px'>Cell</td>";
      }
      table += "</tr>";
    }
    table += "</table><br/>";

    const range = editor.getSelection(true);
    editor.clipboard.dangerouslyPasteHTML(range.index, table);
  };

  return (
    <div style={styles.ribbon}>
      <button onClick={insertImage}>🖼 Picture</button>
      <button onClick={insertTable}>📊 Table</button>
      <button onClick={insertTextBox}>⬛ Text Box</button>
    </div>
  );
}

const styles = {
  ribbon: {
    display: "flex",
    gap: 10,
    padding: 10,
    background: "#f1f5f9",
    borderBottom: "1px solid #cbd5e1",
  },
};
