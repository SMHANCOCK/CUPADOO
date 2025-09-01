import { ACTIONS, PHASES } from "../config.js";
import { ensureDefaults, isValidIntent, initNewGameState, nextAliveIndex, setTurn, rollAllDice } from "../logic/turn.js";
import { setState } from "./stateManager.js";
import { toast } from "../ui/utils.js";

let state = {};
let refs  = {};
let host  = false;
let myId  = null;

export function initGameState({ uid, roomRef, stateRef, inputsRef, isHost }){
  myId = uid; host = isHost; refs = { roomRef, stateRef, inputsRef };

  // Sync from Firebase
  stateRef.on("value", snap => {
    state = ensureDefaults(snap.val() || {});
    window.state = state;
    document.getElementById("roomPill").textContent = "Room: " + (localStorage.getItem('roomCode') || '—');
  });

  // Host-only reducer: process intents
  inputsRef.on("child_added", snap => {
    const intent = snap.val();
    if(!host) return; // only host reduces
    const s = ensureDefaults(state);

    // Guard turn + semantics
    if(!isValidIntent(s, intent)) return;

    if(intent.type===ACTIONS.BID){
      s.bid = { qty:intent.qty, face:intent.face, by:intent.by };
      s.players[s.turn.i].lastChoice = { type:ACTIONS.BID, qty:intent.qty, face:intent.face };
      setTurn(s, nextAliveIndex(s, s.turn.i));
      s.message = `🎲 ${getName(s, intent.by)} bids ${intent.qty} × ${intent.face}'s`;
    }
    else if(intent.type===ACTIONS.DUDO){
      // Minimal dudo resolution: previous bidder vs caller
      s.message = `💥 ${getName(s, intent.by)} shouts DUDO!`;
      endRoundAndRotate(s); // keep simple; you can plug full logic later
    }
    else if(intent.type===ACTIONS.CALZA){
      s.message = `🎯 ${getName(s, intent.by)} calls CALZA!`;
      endRoundAndRotate(s);
    }

    state = s;
    refs.stateRef.set(s);
  });
}

function getName(s, id){ return s.players.find(p=>p.id===id)?.name || 'Player'; }

// Simplified round end → next starter and reroll
function endRoundAndRotate(s){
  const nextStarter = nextAliveIndex(s, s.turn.i);
  s.round = (s.round||1) + 1;
  s.bid = null; s.reveal = null; s.phase = PHASES.BIDDING;
  rollAllDice(s);
  setTurn(s, nextStarter);
}

export function startCleanGameFromLobby(players){
  // players: [{id,name,cup}]
  const fresh = initNewGameState(players);
  state = fresh;
  refs.stateRef.set(fresh);
  setState("game");
  toast("🚀 New game, shake ’em up!");
}
