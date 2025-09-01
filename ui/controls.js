import { toast } from "./utils.js";
import { ACTIONS } from "../config.js";

export function attachControls({ uid, inputsRef }){
  const bid = document.getElementById("btnBid");
  const dudo = document.getElementById("btnDudo");
  const calza = document.getElementById("btnCalza");

  if(bid) bid.onclick = () => {
    if(!isMyTurn()) return toast("⏳ Not your turn, cheeky!");
    const qty  = +document.getElementById("qty").value;
    const face = +document.getElementById("face").value;
    inputsRef.push({ type:ACTIONS.BID, qty, face, by: uid });
    toast("🎲 Bid made!");
  };

  if(dudo) dudo.onclick = () => {
    if(!isMyTurn()) return toast("⏳ Not your turn, cheeky!");
    inputsRef.push({ type:ACTIONS.DUDO, by: uid });
    toast("💥 DUDO!");
  };

  if(calza) calza.onclick = () => {
    if(!isMyTurn()) return toast("⏳ Not your turn, cheeky!");
    inputsRef.push({ type:ACTIONS.CALZA, by: uid });
    toast("🎯 CALZA!");
  };
}

function isMyTurn(){
  const s = window.state || {};
  const players = s.players || [];
  const turn = players[s.turn?.i || 0];
  return !!(turn && turn.id===window.uid && s.phase!=='gameover' && !s.reveal);
}
