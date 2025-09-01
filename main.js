import { initFirebase } from "./net/firebase.js";
import { initGameState } from "./state/gameState.js";
import { setState } from "./state/stateManager.js";
import { attachControls } from "./ui/controls.js";
import { renderLobby } from "./ui/lobby.js";
import { renderGame } from "./ui/game.js";
import { renderOverlay } from "./ui/overlay.js";

const { uid, roomRef, stateRef, inputsRef, isHost } = initFirebase();
window.uid = uid;

// Wire menu dropdown minimal behavior
document.getElementById("btnMenu").onclick = () => {
  document.getElementById("menuDropdown").classList.toggle("hidden");
};
document.getElementById("ddHome").onclick = () => setState("lobby");
document.getElementById("ddCopyCode").onclick = async () => {
  const code = localStorage.getItem("roomCode") || "—";
  try { await navigator.clipboard.writeText(code); } catch {}
};

// Init game state + listeners
initGameState({ uid, roomRef, stateRef, inputsRef, isHost });

// Attach controls (bid/dudo/calza)
attachControls({ uid, inputsRef });

// Initial render
setState("lobby");
renderLobby();
