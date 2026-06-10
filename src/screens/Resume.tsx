import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../state/GameContext";

/**
 * Cible du clic sur le rappel (§10.7.3). Résout EN LOCAL, au moment du clic,
 * le dernier livre réellement consulté → évite tout chemin périmé côté serveur.
 */
export default function Resume() {
  const navigate = useNavigate();
  const { state } = useGame();

  useEffect(() => {
    if (state.lastBookId) navigate(`/read/${state.lastBookId}`, { replace: true });
    else navigate("/", { replace: true });
  }, [state.lastBookId, navigate]);

  return null;
}
