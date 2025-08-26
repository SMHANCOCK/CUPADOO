
/* turn.js — Host-authoritative turn engine (v2)
   - Single reducer controlled by the host.
   - Everyone pushes intents to inputsRef; host reduces and writes state.
   - Phases: 'bidding' | 'reveal' | 'gameover'
*/
(function(){
  const Turns = {};
  window.Turns = Turns;

  // ---- Utilities ----
  function now(){ try { return Date.now(); } catch(e){ return new Date().getTime(); } }
  function clone(x){ return JSON.parse(JSON.stringify(x)); }

  function ensureDefaults(s){
    if(!s || typeof s!=='object') s = {};
    if(!Array.isArray(s.players)) s.players = [];
    if(typeof s.round !== 'number') s.round = 1;
    if(!s.turn) s.turn = { i:0, id: (s.players[0] && s.players[0].id) || null };
    if(!s.starter) s.starter = { i: s.turn.i, id: s.turn.id };
    if(typeof s.phase !== 'string') s.phase = 'bidding';
    if(s.bid === undefined) s.bid = null;
    if(s.reveal === undefined) s.reveal = null;
    if(s.message === undefined) s.message = '';
    if(s.updatedAt === undefined) s.updatedAt = now();
    return s;
  }

  function aliveAt(s, i){ const p=s.players[i]; return !!(p && p.alive!==false && (Array.isArray(p.dice)? p.dice.length : p.dice>0)); }
  function nextAlive(s, i){
    if(!s.players.length) return 0;
    let j = i;
    for(let k=0;k<s.players.length;k++){
      j = (j+1) % s.players.length;
      if(aliveAt(s, j)) return j;
    }
    return i;
  }
  function setTurn(s, i){ const p = s.players[i]; s.turn = { i, id: p ? p.id : null }; }

  function rollDiceArray(count){
    const out=[]; for(let i=0;i<count;i++){ out.push(1+Math.floor(Math.random()*6)); } return out;
  }
  function rollAll(s){
    for(let i=0;i<s.players.length;i++){
      const p = s.players[i]; if(!p) continue;
      const n = Array.isArray(p.dice) ? p.dice.length : (typeof p.dice==='number'? p.dice : 5);
      if(p.alive===false || n<=0){ p.dice=[]; p.alive=false; continue; }
      p.dice = rollDiceArray(n);
      p.alive = p.dice.length>0;
    }
  }

  function isValidRaise(prev, nbid, palifico){
    if(!nbid || typeof nbid.qty!=='number' || typeof nbid.face!=='number') return false;
    if(nbid.face<1 || nbid.face>6 || nbid.qty<1) return false;
    if(!prev) return true;
    if(palifico){
      return nbid.face===prev.face && nbid.qty>prev.qty;
    }else{
      return nbid.qty>prev.qty || (nbid.qty===prev.qty && nbid.face>prev.face);
    }
  }

  function countMatches(s, face){
    let total=0;
    for(const p of s.players){
      if(!p || !Array.isArray(p.dice)) continue;
      for(const d of p.dice){
        if(d===face || d===1) total++;
      }
    }
    return total;
  }

  function resolveReveal(s){
    // assume s.bid exists
    if(!s.bid){ s.phase='bidding'; s.reveal=null; return; }
    const face = s.bid.face;
    const total = countMatches(s, face);
    const callerIdx = s.turn.i; // the one who called dudo/calza right before phase switch
    // Find last bidder (previous alive from caller)
    const lastBidderIdx = (function(){
      let i = callerIdx;
      for(let k=0;k<s.players.length;k++){
        i = (i-1+s.players.length)%s.players.length;
        if(aliveAt(s, i)) return i;
      }
      return callerIdx;
    })();

    // Decide winner/loser for dudo vs calza
    let loserIdx = lastBidderIdx;
    if(s.reveal && s.reveal.type==='dudo'){
      // dudo: if total >= bid.qty, caller loses, else bidder loses
      loserIdx = (total >= s.bid.qty) ? callerIdx : lastBidderIdx;
    } else if(s.reveal && s.reveal.type==='calza'){
      // exact: if total === bid.qty, everyone else loses 1 die; else caller loses
      if(total === s.bid.qty){
        for(let i=0;i<s.players.length;i++){
          if(i===callerIdx) continue;
          const p = s.players[i]; if(!p||!p.dice||!p.dice.length) continue;
          p.dice.pop();
          if(p.dice.length===0){ p.alive=false; }
        }
        // next starter = caller
        s.starter = { i: callerIdx, id: s.players[callerIdx]?.id || null };
        // clean and continue
        s.bid=null; s.reveal=null; s.phase='bidding';
        rollAll(s);
        setTurn(s, s.starter.i);
        s.updatedAt = now();
        return;
      }else{
        loserIdx = callerIdx;
      }
    }

    // Apply loser loses one die
    const loser = s.players[loserIdx];
    if(loser && Array.isArray(loser.dice) && loser.dice.length>0){
      loser.dice.pop();
      if(loser.dice.length===0){ loser.alive=false; }
    }

    // Check game over
    const aliveCount = s.players.filter(p=>p && p.alive!==false && Array.isArray(p.dice) && p.dice.length>0).length;
    if(aliveCount<=1){
      s.phase='gameover';
      s.reveal=null;
      s.updatedAt = now();
      return;
    }

    // Next round: starter = next alive from loser
    const starterI = nextAlive(s, loserIdx);
    s.starter = { i: starterI, id: s.players[starterI]?.id || null };
    s.bid=null; s.reveal=null; s.phase='bidding';
    rollAll(s);
    setTurn(s, s.starter.i);
    s.updatedAt = now();
  }

  function advanceTurn(s){
    const ni = nextAlive(s, s.turn.i);
    setTurn(s, ni);
  }

  // ---- Reducer ----
  function reduce(prev, input){
    const s = ensureDefaults(clone(prev));
    if(s.phase==='gameover') return s;

    switch(input.type){
      case 'bid':{
        if(s.phase!=='bidding') return s;
        if(input.by !== s.turn.id){
          // If first bid of round and turn is empty/mismatched, allow and set turn to bidder
          if(!s.bid && (!s.turn || !s.turn.id)){
            const idx = s.players.findIndex(p=>p && p.id===input.by);
            if(idx>=0) setTurn(s, idx);
            else return s;
          } else {
            return s;
          }
        }
        const nbid = { qty: Number(input.qty||input.payload?.qty), face: Number(input.face||input.payload?.face), by: input.by };
        if(!isValidRaise(s.bid, nbid, !!s.palifico)) return s;
        s.bid = nbid;
        advanceTurn(s);
        s.updatedAt = now();
        return s;
      }
      case 'dudo':{
        if(s.phase!=='bidding' || input.by !== s.turn.id) return s;
        s.phase='reveal'; s.reveal={ type:'dudo', at: now() };
        s.updatedAt = now();
        return s;
      }
      case 'calza':{
        if(s.phase!=='bidding' || input.by !== s.turn.id) return s;
        if(s.palifico) return s; // optional rule example
        s.phase='reveal'; s.reveal={ type:'calza', at: now() };
        s.updatedAt = now();
        return s;
      }
      case 'continueReveal':{
        if(s.phase!=='reveal') return s;
        resolveReveal(s);
        return s;
      }
      default:
        return s;
    }
  }


  // ---- Leaderboard: increment winner's wins when gameover ----
  function getWinner(s){
    try{
      const alive = (s.players||[]).filter(p=>p && p.alive!==false && Array.isArray(p.dice) && p.dice.length>0);
      if(alive.length===1) return alive[0];
      // fallback: highest dice count
      let best=null;
      for(const p of (s.players||[])){
        if(!p || !Array.isArray(p.dice)) continue;
        if(!best || p.dice.length > best.dice.length) best = p;
      }
      return best;
    }catch(e){ return null; }
  }
  function recordWinOnGameover(prev, next){
    try{
      if(!window || !window.firebase) return;
      if(!(prev&&prev.phase) || !(next&&next.phase)) return;
      if(prev.phase!=='gameover' && next.phase==='gameover'){
        const w = getWinner(next);
        if(!w || !w.id) return;
        const ref = firebase.database().ref('leaderboard/'+w.id);
        ref.transaction(cur => {
          if(!cur) return { name: w.name || 'Player', wins: 1 };
          const name = w.name || cur.name || 'Player';
          const wins = (cur.wins||0) + 1;
          return { name, wins };
        });
      }
    }catch(e){ console.warn('[recordWinOnGameover]', e); }
  }

  // ---- Host engine ----
  Turns.init = function initTurnEngine(){
    try{
      if(!window || !window.firebase) return;
      if(typeof isHost === 'undefined') return;
      if(!window.stateRef || !window.inputsRef) return;

      // host ensures defaults
      if(isHost){
        stateRef.once('value').then(snap=>{
          const cur = snap.val() || {};
          const s = ensureDefaults(cur);
          // set starter/turn if missing
          if(!s.turn || !s.turn.id){
            const i = s.starter?.i ?? 0;
            setTurn(s, i);
          }
          s.updatedAt = now();
          stateRef.update(s);
        });

        // process intents in arrival order
        inputsRef.limitToLast(1).on('child_added', snap=>{
          const ev = snap.val() || {};
          stateRef.once('value').then(ss=>{
            const cur = ss.val() || {};
            const next = reduce(cur, ev);
            // write only if changed (cheap check)
            try {
              if(JSON.stringify(next)!==JSON.stringify(cur)){
                recordWinOnGameover(cur, next);
                recordWinOnGameover(cur, next);
                stateRef.update(next);
              }
            } catch(e){
              recordWinOnGameover(cur, next);
                stateRef.update(next);
            }
          });
        });
      }
    }catch(e){ console.warn('[Turns.init error]', e); }
  };

})();
