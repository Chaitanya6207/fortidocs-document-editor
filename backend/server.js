// backend/server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/doc", require("./routes/doc"));
app.use("/api/files", require("./routes/files"));
app.use("/api/share", require("./routes/share"));
app.use("/api/logs", require("./routes/logs"));
app.use("/api/keys", require("./routes/keys"));

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");

    app.get("/", (req, res) => res.send("FortiDocs backend running"));

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
