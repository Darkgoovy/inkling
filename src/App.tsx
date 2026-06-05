import { Routes, Route, Navigate } from "react-router-dom";
import Library from "./screens/Library/Library";
import Reader from "./screens/Reader/Reader";
import Profile from "./screens/Profile/Profile";
import Settings from "./screens/Settings/Settings";

export default function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Library />} />
        <Route path="/read/:bookId" element={<Reader />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
