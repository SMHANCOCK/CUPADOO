import { renderLobby } from "../ui/lobby.js";
import { renderGame } from "../ui/game.js";
import { renderOverlay } from "../ui/overlay.js";

export function setState(view){
  document.querySelectorAll(".card,.overlay").forEach(el=>el.classList.add("hidden"));
  if(view==="lobby")  renderLobby();
  if(view==="game")   renderGame();
  if(view==="gameover") renderOverlay();
}
