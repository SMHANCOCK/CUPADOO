export function renderGame(state){
  document.getElementById("screen-game").classList.remove("hidden");
  const s = window.state || {};
  const players = s.players || [];

  document.getElementById("roundPill").textContent = `Round ${s.round||1}`;
  const turn = players[s.turn?.i || 0];
  document.getElementById("turnPill").textContent = turn ? `${turn.name}'s turn` : "—";
  document.getElementById("statusPill").textContent = s.message || "";
  document.getElementById("totalPill").textContent = `Total: ${players.reduce((a,p)=>a+(Array.isArray(p.dice)?p.dice.length:0),0)} dice`;

  // Render your dice (local player only)
  const my = players.find(p=>p.id===window.uid);
  const yourDice = document.getElementById("yourDice"); yourDice.innerHTML="";
  (my?.dice||[]).forEach(v=>{
    const d=document.createElement("div");
    d.className="die";
    d.textContent=String(v);
    yourDice.appendChild(d);
  });

  // Players list
  const list = document.getElementById("playersList"); list.innerHTML="";
  players.forEach((p,idx)=>{
    const row=document.createElement("div"); row.className="player"+(p.id===window.uid?' you':'')+(idx===s.turn?.i?' turn':'');
    row.innerHTML = `<div>${p.name}</div><div>${Array.isArray(p.dice)?p.dice.length:0} dice</div>`;
    list.appendChild(row);
  });

  // Enable/disable controls
  const myTurn = turn && turn.id===window.uid && !s.reveal && s.phase!=='gameover';
  document.getElementById("controls").classList.toggle("hidden", !myTurn);
}
