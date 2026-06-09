import { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Library from "./screens/Library/Library";
import Reader from "./screens/Reader/Reader";
import Profile from "./screens/Profile/Profile";
import Settings from "./screens/Settings/Settings";

export default function App() {
  const navigate = useNavigate();

  // Navigation déclenchée par un clic sur le rappel (message du service worker, §10.7.3).
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "inkling-navigate" && typeof e.data.path === "string") {
        navigate(e.data.path);
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [navigate]);

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
