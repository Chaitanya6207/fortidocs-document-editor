// backend/server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/auth");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes); // existing
app.use("/api/files", require("./routes/files"));
app.use("/api/share", require("./routes/share"));
app.use('/api/share', require('./routes/received')); 
app.use("/api/doc", require("./routes/doc"));
// 🔴 THIS LINE IS REQUIRED
const shareRoutes = require("./routes/share");
app.use("/api/share", shareRoutes);

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");

    app.use("/api/auth", authRoutes);

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
