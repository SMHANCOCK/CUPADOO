(function(){ if(typeof window!=='undefined' && typeof window.snap!=='function'){ window.snap=function(){ /* noop until real snap loads */ }; }})();
(()=>{
// ===== Utils + UI helpers =====
const $=s=>document.querySelector(s),el=(t,c,x)=>{const e=document.createElement(t); if(c)e.className=c; if(x!=null)e.textContent=x; return e;},rnd=n=>1+Math.floor(Math.random()*n),roll=n=>Array.from({length:n},()=>rnd(6)),sleep=ms=>new Promise(r=>setTimeout(r,ms));
function toast(m,ms=1600){const t=$('#toaster'); t.textContent=m; t.classList.remove('hidden'); setTimeout(()=>t.classList.add('hidden'), ms);}
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
const DEFAULT_COLORS=['#ff0000','#ff7f00','#ffe100','#7c3aed','#16a34a','#2563eb','#ec4899','#111111','#ffffff'];
const CFG_KEY='perudoCfg_mp_v1';
function loadCfg(){try{return JSON.parse(localStorage.getItem(CFG_KEY)||'{}');}catch{return{};}}
function saveCfg(cfg){localStorage.setItem(CFG_KEY, JSON.stringify(cfg));}
function randomCode(len=5){ const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s=''; for(let i=0;i<len;i++) s+=chars[Math.floor(Math.random()*chars.length)]; return s; }
function cupEl(color){ const c=el('div','cup'); c.style.setProperty('--cup', color); return c; }
function dieSmall(face,cls=''){const d=el('div','die small '+cls,String(face)); return d;}
function dieReveal(face,is){const d=el('div','die reveal'+(is?' match':''),String(face)); return d;}
function onesWildForFace(face,g){ return !g.palifico && face!==1; }

// ===== Firebase setup =====
const firebaseConfig = {
  apiKey: "AIzaSyA1iB1gMq2UubLhlUDvDdnQPOZ1l5utGW8",
  authDomain: "cupadoo-80273.firebaseapp.com",
  projectId: "cupadoo-80273",
  storageBucket: "cupadoo-80273.firebasestorage.app",
  messagingSenderId: "827895807709",
  appId: "1:827895807709:web:806035be2f119d3993e534",
  measurementId: "G-8MHF4LZ9JR",
  databaseURL: "https://cupadoo-80273-default-rtdb.europe-west1.firebasedatabase.app/"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ===== Identity & room refs =====
const uid = (localStorage.getItem('uid') || (()=>{ const id='u'+Math.random().toString(36).slice(2,9); localStorage.setItem('uid',id); return id; })());
let roomCode=null, isHost=false;
let roomRef=null, playersRef=null, stateRef=null, inputsRef=null;

// ===== Game state (mirrors the RTDB /state) =====
const state={ players:[], youId:uid, turnIndex:0, round:1, hands:{}, bid:null, palifico:false, palificoFace:null, roundStarterIndex:0, gameOver:false, message:'' };

// ==== Debug snapshots ====
window.snap = (tag='') => {
  try {
    const s = window.state || {};
    const ps = s.players || [];
    const cur = ps[s.turnIndex];
    console.log(`[SNAP ${tag}]`, {
      round: s.round,
      turnIndex: s.turnIndex,
      cur: cur ? { id: cur.id, name: cur.name, dice: cur.dice } : null,
      myUid: window.uid,
      myTurn: (cur && cur.id === window.uid) && !s.reveal && !s.gameOver,
      bid: s.bid,
      palifico: s.palifico,
      reveal: !!s.reveal,
      gameOver: !!s.gameOver
    });
  } catch(e) { console.warn('snap failed', e); }
};



// ==== Debug snapshots ====
window.snap = (tag='') => {
  try {
    const s = window.state || {};
    const ps = s.players || [];
    const cur = ps[s.turnIndex];
    console.log(`[SNAP ${tag}]`, {
      round: s.round,
      turnIndex: s.turnIndex,
      cur: cur ? { id: cur.id, name: cur.name, dice: cur.dice } : null,
      myUid: window.uid,
      myTurn: (cur && cur.id === window.uid) && !s.reveal && !s.gameOver,
      bid: s.bid,
      palifico: s.palifico,
      reveal: !!s.reveal,
      gameOver: !!s.gameOver
    });
  } catch(e) { console.warn('snap failed', e); }
};


// ===== Rendering =====
function renderSeats(){
  const box=$('#seats'); if(!box) return;
  const table=$('#tableBoard'); const rect=table.getBoundingClientRect(); if(rect.width===0||rect.height===0){ return; }
  box.innerHTML='';
  const w=rect.width,h=rect.height,cx=w/2,cy=h/2,r=Math.min(w,h)/2-28;
  const seated=state.players.filter(p=>p.dice>0); const n=seated.length||1;
  seated.forEach((p,idx)=>{
    const ang=(-Math.PI/2)+(idx/n)*(Math.PI*2);
    const x=cx+r*Math.cos(ang), y=cy+r*Math.sin(ang);
    const seat=el('div','seat'+(state.players.indexOf(p)===state.turnIndex?' turn':'')); seat.style.left=x+'px'; seat.style.top=y+'px';
    const inner=el('div','seat-inner');
    inner.appendChild(cupEl(p.cup));
    const name=el('div','name', p.name+(p.id===uid?' (You)':'')); inner.appendChild(name);
    const lc=p.lastChoice;
    if(lc&&lc.type==='bid'){ inner.appendChild(el('span','last-text',`${lc.qty} × ${lc.face}'s`)); inner.appendChild(dieSmall(lc.face)); }
    else if(lc&&lc.type==='dudo'){ inner.appendChild(el('div','dudo-badge','DUDO')); }
    else if(lc&&lc.type==='calza'){ inner.appendChild(el('div','dudo-badge','CALZA')); }
    else inner.appendChild(el('span','last-text','—'));
    seat.appendChild(inner); box.appendChild(seat);
  });
}
function renderSeatsDeferred(){ requestAnimationFrame(renderSeats); }
function renderPlayersList(){
  const box=$('#playersList'); box.innerHTML='';
  state.players.forEach((p,idx)=>{
    const row=el('div','player'+(p.id===uid?' you':'')+(idx===state.turnIndex?' turn':''));
    const left=el('div','player-left'); left.appendChild(cupEl(p.cup));
    const nb=el('div'); nb.appendChild(el('div','', p.name+(p.id===uid?' (You)':'')));
    nb.appendChild(el('div','muted', p.dice>0 ? (p.dice+' dice') : '0 dice'));
    left.appendChild(nb);
    const right=el('div','player-right'); const lc=p.lastChoice;
    if(lc&&lc.type==='bid'){ right.appendChild(el('span','tag',`${lc.qty} × ${lc.face}'s`)); right.appendChild(dieSmall(lc.face)); }
    else if(lc&&lc.type==='dudo'){ right.appendChild(el('div','dudo-badge','DUDO')); }
    else if(lc&&lc.type==='calza'){ right.appendChild(el('div','dudo-badge','CALZA')); }
    else right.appendChild(el('span','tag','—'));
    if(p.dice<=0){ right.appendChild(el('span','skull','💀')); }
    right.appendChild(el('span','pill', p.id===uid?'You':'P'+(idx+1)));
    row.append(left,right); box.appendChild(row);
  });
}
function renderYourDice(){ const box=$('#yourDice'); box.innerHTML=''; (state.hands[uid]||[]).forEach(v=> box.appendChild(el('div','die', String(v)))); }
function renderBid(){
  if(!state.bid){ $('#bidText').textContent='No bid yet'; $('#bidBy').textContent=''; return; }
  $('#bidText').textContent=`${state.bid.qty} × ${state.bid.face}'s${state.palifico?' • PALIFICO':''}${state.bid.face===1?' • ACES':''}`;
  const by=state.players.find(p=>p.id===state.bid.by);
  $('#bidBy').textContent=`by ${by?by.name:'Unknown'}`;
  setFirstBidControls();
}
function renderStatus(){
  $('#roundPill').textContent=`Round ${state.round}`;
  const turn=state.players[state.turnIndex];
  $('#turnPill').textContent= turn? `${turn.name}'s turn` : '—';
  $('#totalPill').textContent=`Total: ${totalDiceAlive(state)} dice`;
  $('#roomPill').textContent= roomCode ? `Room: ${roomCode}` : 'Room: —';
  $('#statusPill').textContent= state.message || '';
}
function renderControls(){
  const controls = document.getElementById('controls'); if(controls) controls.classList.remove('hidden');
  enforceControls();
}
function render(){ renderSeatsDeferred(); renderPlayersList(); renderYourDice(); renderBid(); renderStatus(); renderControls(); }

// ===== Game helpers adapted to shared state =====
function alivePlayers(g=state){ return g.players.filter(p=>p.dice>0); }
function totalDiceAlive(g=state){ return g.players.reduce((s,p)=>s+(p.dice>0?p.dice:0),0); }
function nextAliveFrom(idx,g=state){ const n=g.players.length; for(let st=1;st<=n;st++){const i=(idx+st)%n; if(g.players[i].dice>0) return i;} return idx; }
function isValidRaise(qty,face,g=state){
  const numAlive = alivePlayers(g).length;
  if(!g.bid){
    if(g.palifico){
      if(numAlive>2){
        if(g.palificoFace==null) return false;
        return face===g.palificoFace && qty>=1;
      }else{
        return qty>=1 && face>=1 && face<=6;
      }
    }else{
      if(face===1) return false;
      return qty>=1 && face>=2 && face<=6;
    }
  }
  const b=g.bid;
  if(g.palifico){
    const locked=g.palificoFace ?? b.face;
    if(g.palificoFace==null) g.palificoFace=b.face;
    if(face!==locked) return false;
    return qty>b.qty;
  } else {
    if(b.face===face){ return qty>b.qty; }
    else if(face===1 && b.face!==1){ return qty>=Math.ceil(b.qty/2); }
    else if(b.face===1 && face!==1){ return qty>=(b.qty*2+1); }
    else { return (qty>b.qty) || (qty===b.qty && face>b.face); }
  }
}
function setFirstBidControls(){
  const faceInput=$('#face'), faceLabel=$('#faceLabel'); const numAlive=alivePlayers().length;
  if(!state.bid){
    if(state.palifico){
      if(numAlive>2 && state.palificoFace!=null){
        faceInput.min=faceInput.max=state.palificoFace; faceInput.value=state.palificoFace; faceInput.disabled=true; faceLabel.textContent=`Face (locked: ${state.palificoFace})`;
      }else{ faceInput.min=1; faceInput.max=6; faceInput.disabled=false; faceLabel.textContent='Face (1–6)'; }
    }else{ faceInput.min=2; faceInput.max=6; faceInput.disabled=false; if(parseInt(faceInput.value,10)<2) faceInput.value=2; faceLabel.textContent='Face (2–6)'; }
  }else{
    if(state.palifico && state.palificoFace!=null){
      faceInput.min=faceInput.max=state.palificoFace; faceInput.value=state.palificoFace; faceInput.disabled=true; faceLabel.textContent=`Face (locked: ${state.palificoFace})`;
    }else{ faceInput.min=1; faceInput.max=6; faceInput.disabled=false; faceLabel.textContent='Face (1–6)'; }
  }
}

// ===== Host-authoritative game logic =====
function startRoundHost(startTurnIndex=null){
  snap('startRoundHost:before');
  /*__RESET_LASTCHOICE__*/
  if(Array.isArray(state.players)){
    state.players = state.players.map(p=> ({...p, lastChoice:null}));
  }
  // v17: round-safe init (do NOT touch roster)
  // Reset only per-round fields
  state.bid = null;
  state.message = null;
  state.palifico = false;
  state.palificoFace = null;
  state.reveal = null;

  state.bid=null;
  if(startTurnIndex!=null) state.turnIndex=startTurnIndex;
  state.roundStarterIndex=state.turnIndex;
  state.palifico=(state.players[state.roundStarterIndex]?.dice===1);
  state.palificoFace=null;
  // Clear last round choices so UI shows 'No bid yet'
  state.players = state.players.map(p=> ({...p, lastChoice: null}));
  // roll hands
  state.hands={};
  for(const p of state.players) state.hands[p.id]=p.dice>0?roll(p.dice):[];
  if(state.palifico){
    const numAlive=alivePlayers().length;
    if(numAlive>2){
      const starter=state.players[state.roundStarterIndex];
      const dieVal=(state.hands[starter.id]||[])[0]||1;
      state.palificoFace=dieVal;
      state.message=`Palifico: everyone bids ${dieVal} • 1s not wild • no Calza`;
    } else {
      state.message=`Palifico (heads-up): first bid chooses face • 1s not wild • no Calza`;
    }
  }else{
    state.message='';
  }
  state.reveal=null;
  syncState();
  snap('startRoundHost:after');
}
function makeBidHost(byId, qty, face){
  if(!isValidRaise(qty,face)){ toast('Invalid bid'); return; }
  if(state.palifico && state.palificoFace==null) state.palificoFace=face;
  state.bid={qty,face,by:byId};
  state.message='';
  setLastChoice(byId,{type:'bid', qty, face});
  const curIndex=state.players.findIndex(p=>p.id===byId);
  state.turnIndex=nextAliveFrom(curIndex);
  syncState();
  snap('startRoundHost:after');
}
function setLastChoice(forId,choice){
  state.players=state.players.map(p=> (p.id===forId? {...p, lastChoice: choice } : p));
}
function countMatches(face,g=state){
  const ow=onesWildForFace(face,g);
  let t=0;
  for(const hand of Object.values(g.hands)) for(const d of hand) if(d===face || (ow&&d===1)) t++;
  return t;
}
async function handleDudoHost(callerId){
  if(!state.bid) return;
  state.reveal={ type:'dudo', face:state.bid.face, total: countMatches(state.bid.face), title:'🔍 Dudo Reveal' };
  syncState(); // everyone shows overlay
}
async function handleCalzaHost(callerId){
  if(state.palifico || !state.bid) return;
  state.reveal={ type:'calza', face:state.bid.face, total: countMatches(state.bid.face), title:'🎯 Calza (Exact)' };
  syncState();
  snap('startRoundHost:after');
}
function finishRevealAndResolveHost(callerId){
  const type=state.reveal?.type; if(!type) return;
  const total=state.reveal.total;
  if(type==='dudo'){
    const bidder=state.players.find(p=>p.id===state.bid.by);
    const caller=state.players.find(p=>p.id===callerId);
    let loser=caller, reason='';
    if(total>=state.bid.qty){ loser=caller; reason=`Dudo failed: ${total} ≥ ${state.bid.qty}.`; }
    else { loser=bidder; reason=`Dudo success: ${total} < ${state.bid.qty}.`; }
    endOfRoundHost(loser, reason);
  } else if(type==='calza'){
    const caller=state.players.find(p=>p.id===callerId);
    if(total===state.bid.qty){
      caller.dice=Math.min(8, caller.dice+1);
      const idx=state.players.indexOf(caller);
      state.round+=1; state.reveal=null; state.message=`Calza correct! Exactly ${total}. ${caller.name} gains a die.`;
      startRoundHost(idx);
    } else {
      state.message=`Calza wrong: ${total} (needed exactly ${state.bid.qty}). ${caller.name} loses a die.`;
      endOfRoundHost(caller, state.message);
    }
  }
}
function endOfRoundHost(loser, reason){
  snap('endOfRoundHost:before');
  // v17: snapshot roster before any changes
  try{ window.__lastPlayersSnapshot = JSON.parse(JSON.stringify(state.players||[])); }catch(e){}

  if(loser) loser.dice=Math.max(0, loser.dice-1);
  state.reveal=null;
  const alive=alivePlayers();
  if(alive.length<=1){
    const winner=alive[0]||null;
    const msg=`${winner?.name||'Nobody'} wins!`;
    state.gameOver=true; state.message=msg; syncState();
    return;
  }
  const loserIdx=state.players.indexOf(loser);
  const startIdx=loser.dice>0 ? loserIdx : nextAliveFrom(loserIdx);
  state.round+=1; state.message=reason;
  startRoundHost(startIdx);
  snap('endOfRoundHost:after');
}


// ===== Turn helper (menu-safe) =====
function isMyTurn(){
  try{
    const cur = state && state.players && state.players[state.turnIndex];
    const ok = !!(cur && cur.id === uid);
    return ok && !state.reveal && !state.gameOver;
  }catch(e){ return false; }
}

// ===== RTDB sync =====
function syncState(){ try{ if(stateRef) stateRef.set(state); }catch(e){ console.error('syncState failed', e); } }
function syncAll(){
  // v17: full write when dice actually change
  if(!Array.isArray(state.players)||!state.players.length){
    if(Array.isArray(window.__lastPlayersSnapshot)&&window.__lastPlayersSnapshot.length){
      state.players = JSON.parse(JSON.stringify(window.__lastPlayersSnapshot));
    }
  } else {
    try{ window.__lastPlayersSnapshot = JSON.parse(JSON.stringify(state.players)); }catch(e){}
  }
  if(stateRef) stateRef.set(state);
}
function syncPartial(patch){
  // v17: small safe updates (never touch players array)
  const patchSafe = Object.assign({}, patch||{});
  if('players' in patchSafe) delete patchSafe.players;
  if(stateRef) stateRef.update(patchSafe);
}
function processInput(a){
  // Validate whose turn
  const curId=state.players[state.turnIndex]?.id;
  if(a.by!==curId && !(a.type==='continueReveal' && isHost)) return; // ignore out-of-turn (or allow host to continue)
  if(a.type==='bid'){ makeBidHost(a.by, a.qty, a.face); }
  if(a.type==='dudo'){ setLastChoice(a.by,{type:'dudo'}); handleDudoHost(a.by); syncState(); }
  if(a.type==='calza'){ setLastChoice(a.by,{type:'calza'}); handleCalzaHost(a.by); syncState(); }
  if(a.type==='continueReveal'){ finishRevealAndResolveHost(a.by); syncState(); }
}


// ===== Start button reliability helpers (menu-safe) =====
let __lobbyCount = 0;
function updateStartEnabled(){
  try{
    const btn = document.getElementById('btnStart');
    if(!btn) return;
    btn.disabled = !(isHost && __lobbyCount>=2 && __lobbyCount<=6);
  }catch(e){}
}

// ===== Presence & lobby =====
const lobby = { players: new Map() };
function renderLobbyPlayers(list){
  const box=$('#lobbyPlayers'); box.innerHTML='';
  list.forEach(p=>{
    const row=el('div','player'+(p.id===uid?' you':''));
    const left=el('div','player-left'); left.appendChild(cupEl(p.cup||'#ff0000'));
    const nb=el('div'); nb.appendChild(el('div','', p.name+(p.id===uid?' (You)':'')));
    nb.appendChild(el('div','muted', p.connected?'online':'offline'));
    left.appendChild(nb);
    const right=el('div','player-right'); right.appendChild(el('span','pill', p.id===state.hostId?'Host':'Player'));
    row.append(left,right); box.appendChild(row);
  });
}
function enterLobbyUI(code){
  $('#lobbyInfo').classList.remove('hidden');
  $('#displayRoom').textContent=code;
  $('#btnStart').disabled=true;
}
function leaveLobbyUI(){
  $('#lobbyInfo').classList.add('hidden');
  $('#displayRoom').textContent='—';
}
function goToLobby(){ $('#screen-lobby').classList.remove('hidden'); $('#screen-game').classList.add('hidden'); }
function goToGame(){ $('#screen-lobby').classList.add('hidden'); $('#screen-game').classList.remove('hidden'); renderSeatsDeferred(); }


function attachRoomListeners(){
  // Keep host status synced from DB
  if(roomRef){
    roomRef.on('value', snap=>{
      const room = snap.val()||{};
      isHost = (room.hostId===uid);
      updateStartEnabled();
    });
  }
  playersRef.on('value', snap=>{
    const vals=snap.val()||{};
    const arr=Object.values(vals).map(v=>({...v})).sort((a,b)=> (a.joinTs||0)-(b.joinTs||0));
    renderLobbyPlayers(arr);
    __lobbyCount = arr.filter(p=>p.connected!==false).length || arr.length;
    updateStartEnabled();
  });
  // Host consumes inputs
  /*LEGACY_HOST_INPUTS*/
if(!(window.Turns && typeof window.Turns.init==='function')){
inputsRef.on('child_added', s=>{
    if(!isHost) return;
    const a=s.val();
}
/*END_LEGACY_HOST_INPUTS*/ processInput(a);
    s.ref.remove();
  });
  // State updates -> render game
  stateRef.on('value', snap=>{
    const g=snap.val();
    if(!g) return;
    Object.assign(state, g);
    if(g.status==='playing' || g.players?.length){
      goToGame();
      render();
      if(g.reveal){ showRevealOverlay(g.reveal); } else { hideRevealOverlay(); }
      if(g.gameOver){ showGameOver(g.message||'Game over'); }
    }
  });
}

function detachRoomListeners(){
  if(playersRef){ playersRef.off(); }
  if(inputsRef){ inputsRef.off(); }
  if(stateRef){ stateRef.off(); }
}

async function createRoom(){
  const code=randomCode();
  roomCode=code; isHost=true;
  roomRef=db.ref('rooms/'+code);
  playersRef=roomRef.child('players');
  inputsRef=roomRef.child('inputs');
  stateRef=roomRef.child('state');
  await roomRef.set({ createdAt: firebase.database.ServerValue.TIMESTAMP, status:'lobby', hostId:uid });
  await joinSelf();
  enterLobbyUI(code);
  attachRoomListeners();
  toast('Room created');
}
async function joinRoom(code){
  code=(code||'').toUpperCase().trim();
  if(!code){ toast('Enter a room code'); return; }
  roomCode=code; isHost=false;
  roomRef=db.ref('rooms/'+code);
  const snap=await roomRef.get();
  if(!snap.exists()){ toast('Room not found'); return; }
  playersRef=roomRef.child('players'); inputsRef=roomRef.child('inputs'); stateRef=roomRef.child('state');
  enterLobbyUI(code);
  await joinSelf();
  attachRoomListeners();
  toast('Joined room');
}
async function joinSelf(){
  const cfg=loadCfg();
  const name = ($('#youName').value||cfg.youName||'You').slice(0,24);
  const cup = cfg.youCup || DEFAULT_COLORS[0];
  saveCfg({ ...cfg, youName:name, youCup: cup });
  const myRef = playersRef.child(uid);
  await myRef.set({ id:uid, name, cup, connected:true, joinTs: firebase.database.ServerValue.TIMESTAMP });
  myRef.onDisconnect().remove();
}
async function leaveRoom(){
  try{ await playersRef.child(uid).remove(); }catch{}
  detachRoomListeners();
  roomRef=null; playersRef=null; stateRef=null; inputsRef=null;
  roomCode=null; isHost=false; leaveLobbyUI(); goToLobby();
  toast('Left room');
}

// ===== Start game (host) =====

async function hostStart(){
  try{
    const startBtn = document.getElementById('btnStart');
    if(startBtn && startBtn.disabled){ toast('Waiting for another player (need 2–6) or not host'); return; }

    if(!roomRef){ toast('No room. Create or join first.'); return; }
    const roomSnap = await roomRef.get();
    const room = roomSnap.val()||{};
    if(room.hostId!==uid){ toast('Only the host can start the game'); return; }

    const snap=await playersRef.get();
    const vals=snap.val()||{};
    let arr=Object.values(vals).map(v=>({id:v.id, name:v.name, cup:v.cup, dice:5}));
    if(arr.length<2){ toast('Need at least 2 players'); return; }

    arr=shuffle(arr);
    state.players=arr; state.round=1; state.gameOver=false; state.message=''; state.status='playing';
    state.hostId=uid;
    const aliveIdx = state.players.map((p,i)=> p.dice>0 ? i : -1).filter(i=>i>=0);
    const startIdx = aliveIdx[Math.floor(Math.random()*aliveIdx.length)] ?? 0;
    startRoundHost(startIdx);
    syncState();
    toast('Game started');
  }catch(e){
    console.error('[hostStart error]', e);
    toast('Start failed: '+(e.message||e));
  }
}


// ===== Reveal overlay behaviour =====
function buildRevealGrid(face){
  const ow=onesWildForFace(face,state);
  const grid=$('#revealGrid'); grid.innerHTML='';
  for(const p of state.players){
    const row=el('div','reveal-row'); row.appendChild(cupEl(p.cup));
    row.appendChild(el('div','reveal-name', p.name+(p.id===uid?' (You)':'')));
    const strip=el('div','reveal-dice');
    (state.hands[p.id]||[]).forEach(v=>{ const is=(v===face || (ow && v===1)); strip.appendChild(dieReveal(v,is)); });
    row.appendChild(strip); grid.appendChild(row);
  }
}
async function showRevealOverlay(rev){
  if(!rev) return;
  $('#revealTitle').textContent=rev.title || '🔍 Reveal';
  const ow=onesWildForFace(rev.face,state);
  $('#revealSubtitle').textContent=`Counting dice for face ${rev.face}${ow? ' (1s are wild)…' : ' (1s do not count)…'}`;
  buildRevealGrid(rev.face); $('#revealOverlay').classList.remove('hidden');
  const total=rev.total||0;
  const line=$('#countLine'); line.textContent='Matches: 0'; let cur=0;
  while(cur<total){ await sleep(120); cur++; line.textContent=`Matches: ${cur}`; }
  // Host continues; others wait
  const btn=$('#btnRevealOk');
  btn.disabled=!isHost;
  btn.textContent = isHost ? 'Continue' : 'Waiting for host…';
}
function hideRevealOverlay(){ $('#revealOverlay').classList.add('hidden'); }

// ===== Game over overlay =====

function launchConfetti(){
  try{
    const host = document.getElementById('confettiHost');
    if(!host) return;
    host.innerHTML='';
    const colors = (window.state?.players||[]).map(p=>p.cup).filter(Boolean);
    const palette = colors.length ? colors : ['#ff5252','#ffd60a','#22c55e','#2563eb','#ec4899','#111111','#ffffff'];
    let running = true;
    // clear old interval if any
    if(window.__confettiTimer){ clearInterval(window.__confettiTimer); }
    window.__confettiTimer = setInterval(()=>{
      if(!running) return;
      const d = document.createElement('div');
      d.className='confetti';
      d.style.left = (Math.random()*100)+'%';
      d.style.setProperty('--x', (Math.random()*160-80)+'px');
      d.style.setProperty('--rot', (Math.random()*540)+'deg');
      d.style.background = palette[Math.floor(Math.random()*palette.length)];
      d.style.animation = 'confettiFall '+(2.5+Math.random()*1.5)+'s ease-out forwards';
      const hostNow = document.getElementById('confettiHost');
      if(hostNow) hostNow.appendChild(d);
    }, 120);
  }catch(e){ /* ignore */ }
}
function showGameOver(text){
  $('#overlayTitle').textContent='Game over';
  $('#overlayText').textContent=text||'—';
  $('#overlay').classList.remove('hidden');
  launchConfetti();
}
function hideOverlay(){
  $('#overlay').classList.add('hidden');
  if(window.__confettiTimer){ clearInterval(window.__confettiTimer); window.__confettiTimer=null; }
}
function showGameOver(text){
  $('#overlayTitle').textContent='Game over';
  $('#overlayText').textContent=text||'—';
  $('#overlay').classList.remove('hidden');
  launchConfetti();
}
function hideOverlay(){ $('#overlay').classList.add('hidden'); }

// ===== UI events =====
document.getElementById('btnHost').addEventListener('click', ()=> createRoom());
document.getElementById('btnJoin').addEventListener('click', ()=> joinRoom($('#roomCode').value));
document.getElementById('btnLeave').addEventListener('click', ()=> leaveRoom());
document.getElementById('btnStart').addEventListener('click', ()=> hostStart());
document.getElementById('btnRematch').addEventListener('click', ()=>{ hideOverlay(); if(isHost){ hostStart(); } });
document.getElementById('btnMenuFromOverlay').addEventListener('click', ()=>{ hideOverlay(); goToLobby(); });

document.getElementById('btnBid').addEventListener('click', ()=>{
  const q = parseInt($('#qty').value,10) || 1;
  const f = Math.max(1, Math.min(6, parseInt($('#face').value,10) || 1));
  const cur = state.players && state.players[state.turnIndex];
  const myTurnLocal = !!(cur && cur.id === uid) && !state.reveal && !state.gameOver;
  if(!myTurnLocal){ toast(`If it's not your turn, the host will ignore this action.`); }
  if(isHost){ makeBidHost(uid, q, f); } else { inputsRef.push({type:'bid', qty:q, face:f, by:uid, ts: firebase.database.ServerValue.TIMESTAMP}); }
});

document.getElementById('btnDudo').addEventListener('click', ()=>{
  const cur = state.players && state.players[state.turnIndex];
  const myTurnLocal = !!(cur && cur.id === uid) && !state.reveal && !state.gameOver;
  if(!myTurnLocal){ toast(`If it's not your turn, the host will ignore this action.`); }
  if(isHost){ setLastChoice(uid,{type:'dudo'}); handleDudoHost(uid); syncState(); } else { inputsRef.push({type:'dudo', by:uid, ts: firebase.database.ServerValue.TIMESTAMP}); }
});

document.getElementById('btnCalza').addEventListener('click', ()=>{
  const cur = state.players && state.players[state.turnIndex];
  const myTurnLocal = !!(cur && cur.id === uid) && !state.reveal && !state.gameOver;
  if(!myTurnLocal){ toast(`If it's not your turn, the host will ignore this action.`); }
  if(isHost){ setLastChoice(uid,{type:'calza'}); handleCalzaHost(uid); syncState(); } else { inputsRef.push({type:'calza', by:uid, ts: firebase.database.ServerValue.TIMESTAMP}); }
});

document.getElementById('btnRevealOk').addEventListener('click', ()=>{
  if(isHost){ inputsRef.push({type:'continueReveal', by:uid, ts: firebase.database.ServerValue.TIMESTAMP}); }
});

const table = document.getElementById('tableBoard');
if('ResizeObserver' in window){ new ResizeObserver(()=> renderSeatsDeferred()).observe(table); } else { window.addEventListener('resize', renderSeatsDeferred); }

// Menu dropdown
const btnMenu = document.getElementById('btnMenu');
const dd = document.getElementById('menuDropdown');
function closeDD(){ dd.classList.add('hidden'); }
btnMenu.addEventListener('click', (e)=>{ e.stopPropagation(); dd.classList.toggle('hidden'); });
document.addEventListener('click', ()=> closeDD());
document.getElementById('ddHome').addEventListener('click', ()=>{ closeDD(); goToLobby(); });
document.getElementById('ddCopyCode').addEventListener('click', async ()=>{
  closeDD(); if(!roomCode){ toast('No room yet'); return; }
  try{ await navigator.clipboard.writeText(roomCode); toast('Room code copied'); }catch{ toast('Room: '+roomCode); }
});

// Color picker (persist choice)
function renderColorPicker(){
  const cfg=loadCfg();
  const box = document.getElementById('colorPicker'); box.innerHTML='';
  const chosen = cfg.youCup || DEFAULT_COLORS[0];
  DEFAULT_COLORS.forEach(col=>{
    const sw = document.createElement('div');
    sw.className='swatch'; sw.dataset.color=col; sw.style.background=col;
    if(col.toLowerCase()===chosen.toLowerCase()) sw.classList.add('selected');
    const tick=document.createElement('div'); tick.className='tick'; tick.textContent='✓'; sw.appendChild(tick);
    sw.addEventListener('click', ()=>{
      document.querySelectorAll('.swatch').forEach(s=>s.classList.remove('selected'));
      sw.classList.add('selected');
      const cfg=loadCfg(); saveCfg({...cfg, youCup: col});
      toast('Cup colour saved');
    });
    box.appendChild(sw);
  });
}
renderColorPicker();
// Restore saved name
const cfg=loadCfg(); if(cfg.youName) $('#youName').value = cfg.youName;

// Toast helper for first-time hint
toast('Create or join a room to begin');

})();


// ===== [SPLIT] NEXT SCRIPT BLOCK =====


(function(){
  let lastGood=null;
  function clone(o){ try{return JSON.parse(JSON.stringify(o));}catch(e){return null;} }
  function valid(s){
    return s && Array.isArray(s.players) && s.players.length && typeof s.turnIndex==='number' && s.players[s.turnIndex];
  }
  function firstAlive(s){ for(let i=0;i<(s.players||[]).length;i++){ if(s.players[i]&&s.players[i].dice>0) return i; } return 0; }
  function nextAliveFrom(i,s){ const n=s.players.length; for(let k=1;k<=n;k++){ const j=(i+k)%n; if(s.players[j]&&s.players[j].dice>0) return j; } return (i+1)%n; }
  function reseed(){
    const s=window.state||{};
    if(!Array.isArray(s.players)||!s.players.length){
      const snap = (window.__lastPlayersSnapshot && window.__lastPlayersSnapshot.length && window.__lastPlayersSnapshot) || null;
      if(snap){ s.players = clone(snap); }
    }
    if(Array.isArray(s.players)&&s.players.length){
      if(typeof s.turnIndex!=='number' || !s.players[s.turnIndex] || s.players[s.turnIndex].dice<=0){
        if(s.bid){
          const i=s.players.findIndex(p=>p.id===s.bid.by);
          if(i>=0) s.turnIndex=nextAliveFrom(i,s);
        }
        if(typeof s.turnIndex!=='number' || !s.players[s.turnIndex]) s.turnIndex=firstAlive(s);
      }
    }
    if(typeof window.render==='function'){ try{ window.render(); }catch(e){} }
    if(typeof window.renderControls==='function'){ try{ window.renderControls(); }catch(e){} }
  }
  // Save last good state
  setInterval(function(){
    if(valid(window.state)){ lastGood=clone(window.state); window.__lastPlayersSnapshot = clone(window.state.players); }
  }, 400);
  // After any remote update, validate & heal
  const attach=setInterval(function(){
    if(window.stateRef && stateRef.on){ try{ stateRef.on('value', function(){ setTimeout(function(){ if(!valid(window.state) && lastGood){ window.state=clone(lastGood); reseed(); } },0); }); clearInterval(attach);}catch(e){} }
  }, 400);
})();

try{ console.log('[Turns] active?', !!(window.Turns && typeof window.Turns.init==='function')); }catch(e){}

try{ console.log('[Boot] Turns detected?', !!(window.Turns && typeof window.Turns.init==='function')); }catch(e){}

try{ console.log('[ENGINE MODE:]', (window.Turns?'v2':'legacy'), 'isHost=', !!window.isHost); }catch(e){}

// Detach legacy listeners if engine v2 is present (host only)
try{
  if (window.Turns && typeof window.Turns.init==='function' && window.isHost && window.inputsRef && typeof inputsRef.off==='function'){
    inputsRef.off('child_added');
  }
}catch(e){}
