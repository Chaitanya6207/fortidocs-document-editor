import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Editor from './pages/Editor';
import Received from './pages/Received';
import Viewer from './pages/Viewer';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/editor" element={<Editor />} />
      <Route path="/received" element={<Received />} />
      <Route path="/viewer" element={<Viewer />} />
    </Routes>
  );
}

export default App;
