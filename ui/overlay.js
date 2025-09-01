import { setState } from "../state/stateManager.js";

export function renderOverlay(){
  const ov = document.getElementById("overlay");
  ov.classList.remove("hidden");
  document.getElementById("btnMenuFromOverlay").onclick = () => setState("lobby");
  document.getElementById("btnRematch").onclick = () => setState("game"); // wire to your rematch flow later
}
