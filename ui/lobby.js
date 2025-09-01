import { setState } from "../state/stateManager.js";
import { startCleanGameFromLobby } from "../state/gameState.js";
import { toast } from "./utils.js";

export function renderLobby(){
  const scr = document.getElementById("screen-lobby");
  scr.classList.remove("hidden");

  const youName  = document.getElementById("youName");
  const roomCode = document.getElementById("roomCode");
  const btnHost  = document.getElementById("btnHost");
  const btnJoin  = document.getElementById("btnJoin");
  const btnStart = document.getElementById("btnStart");
  const displayRoom = document.getElementById("displayRoom");
  const lobbyPlayers = document.getElementById("lobbyPlayers");
  const lobbyInfo = document.getElementById("lobbyInfo");

  // Load saved name/color/room
  youName.value = localStorage.getItem("youName") || "You";
  roomCode.value = localStorage.getItem("roomCode") || "";
  renderPlayersLobby(lobbyPlayers, []); // placeholder

  btnHost.onclick = () => {
    const code = roomCode.value.trim() || randomCode(5);
    localStorage.setItem("youName", youName.value.trim() || "You");
    localStorage.setItem("roomCode", code);
    displayRoom.textContent = code;
    lobbyInfo.classList.remove("hidden");
    btnStart.disabled = false; // host can start
    toast("🛠️ Room created!");
  };

  btnJoin.onclick = () => {
    const code = roomCode.value.trim();
    if(!code){ toast("🔑 Enter a room code!"); return; }
    localStorage.setItem("youName", youName.value.trim() || "You");
    localStorage.setItem("roomCode", code);
    displayRoom.textContent = code;
    lobbyInfo.classList.remove("hidden");
    btnStart.disabled = true; // only host can start
    toast("🔗 Joined room!");
  };

  btnStart.onclick = () => {
    // Build players list just with the local player for now (host); others will sync in via Firebase in your expanded flow
    const players = [
      { id: window.uid, name: (localStorage.getItem("youName")||"You"), cup: "#16a34a" }
      // NOTE: In your full game you’d read lobby players from RTDB; here we keep it simple/host-only bootstrap.
    ];
    startCleanGameFromLobby(players);
  };
}

function renderPlayersLobby(el, players){
  el.innerHTML = "";
  players.forEach(p=>{
    const row = document.createElement("div");
    row.className = "player";
    row.textContent = `${p.name} (${p.id.slice(0,4)})`;
    el.appendChild(row);
  });
}

function randomCode(len=5){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s=''; for(let i=0;i<len;i++) s+=chars[Math.floor(Math.random()*chars.length)];
  return s;
}
