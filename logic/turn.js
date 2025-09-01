import { ACTIONS, PHASES } from "../config.js";

// Pure rules utilities
const rand = n => 1 + Math.floor(Math.random()*n);

export function ensureDefaults(s){
  s ||= {};
  s.players = Array.isArray(s.players) ? s.players : [];
  s.round   = typeof s.round==='number' ? s.round : 1;
  if(!s.turn)  s.turn  = { i:0, id: s.players[0]?.id || null };
  if(!s.phase) s.phase = PHASES.BIDDING;
  if(s.bid === undefined) s.bid = null;
  if(s.reveal === undefined) s.reveal = null;
  if(!s.message) s.message = '';
  return s;
}

export function rollAllDice(s){
  for(const p of s.players){
    if(!p) continue;
    const n = Math.max(0, p.dice || 5);
    p.dice = Array.from({length:n}, () => rand(6));
    p.alive = p.dice.length>0;
  }
}

export function isAlive(p){ return p && p.alive!==false && Array.isArray(p.dice) && p.dice.length>0; }

export function nextAliveIndex(s, i){
  if(!s.players.length) return 0;
  let j = i;
  for(let k=0;k<s.players.length;k++){
    j = (j+1) % s.players.length;
    if(isAlive(s.players[j])) return j;
  }
  return i;
}

export function setTurn(s, i){
  const p = s.players[i];
  s.turn = { i, id: p ? p.id : null };
}

export function initNewGameState(players){
  const s = ensureDefaults({});
  s.players = players.map((p,i)=>({ id:p.id, name:p.name, cup:p.cup||'#16a34a', dice:5, alive:true, lastChoice:null }));
  s.round = 1;
  s.phase = PHASES.BIDDING;
  s.bid   = null;
  s.reveal = null;
  s.message = '';
  rollAllDice(s);
  setTurn(s, 0);
  return s;
}

export function validateBid(prev, nbid){
  if(!nbid || typeof nbid.qty!=='number' || typeof nbid.face!=='number') return false;
  if(nbid.face<1 || nbid.face>6 || nbid.qty<1) return false;
  if(!prev) return true;
  if(nbid.qty > prev.qty) return true;
  if(nbid.qty === prev.qty && nbid.face > prev.face) return true;
  return false;
}

export function isValidIntent(s, intent){
  if(!intent || !intent.type) return false;
  if(intent.by !== s.turn.id) return false;
  if(intent.type===ACTIONS.BID){
    if(!validateBid(s.bid, intent)) return false;
  }
  if(intent.type===ACTIONS.DUDO || intent.type===ACTIONS.CALZA) {
    if(!s.bid) return false; // can't challenge without a bid
  }
  return true;
}
