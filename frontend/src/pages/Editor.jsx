import React, { useEffect, useRef, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import api from "../utils/api";
import htmlDocx from "html-docx-js/dist/html-docx";
import { saveAs } from "file-saver";

export default function Editor() {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("Untitled Document");
  const [saving, setSaving] = useState(false);
  const quillRef = useRef(null);

  async function saveDocument() {
    setSaving(true);
    try {
      const blob = htmlDocx.asBlob(
        `<h1>${title}</h1>${content}`
      );
      const form = new FormData();
      form.append("file", blob, `${title}.docx`);

      await api.post("/api/doc/save", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Document saved successfully");
    } catch (err) {
      alert("Save failed");
    }
    setSaving(false);
  }

  function downloadDocument() {
    const blob = htmlDocx.asBlob(
      `<h1>${title}</h1>${content}`
    );
    saveAs(blob, `${title}.docx`);
  }

  return (
    <div style={{ padding: 20 }}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ fontSize: 20, padding: 8, width: "100%" }}
      />

      <ReactQuill
        ref={quillRef}
        value={content}
        onChange={setContent}
        style={{ height: "70vh", marginTop: 10 }}
        modules={{
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ["bold", "italic", "underline"],
            [{ color: [] }, { background: [] }],
            [{ align: [] }],
            [{ list: "ordered" }, { list: "bullet" }],
            ["link", "image"],
            ["clean"],
          ],
        }}
      />

      <div style={{ marginTop: 15 }}>
        <button onClick={saveDocument} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
        <button onClick={downloadDocument} style={{ marginLeft: 10 }}>
          Download
        </button>
      </div>
    </div>
  );
}
