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
