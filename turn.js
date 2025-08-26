// turn.js
export const Turns = {
  init(players) {
    return {
      players: players.map(p => ({
        ...p,
        dice: p.dice || 5,
        lastChoice: null
      })),
      turn: { i: 0, palifico: false, face: null },
      phase: 'bidding',
      round: 1,
      bid: null,
      reveal: null,
      message: ''
    };
  },

  isValidRaise(state, qty, face) {
    const g = state;
    const numAlive = g.players.filter(p => p.dice > 0).length;

    if (!g.bid) {
      if (g.turn.palifico) {
        if (numAlive > 2) {
          if (g.turn.face == null) return false;
          return face === g.turn.face && qty >= 1;
        } else {
          return qty >= 1 && face >= 1 && face <= 6;
        }
      } else {
        if (face === 1) return false;
        return qty >= 1 && face >= 2 && face <= 6;
      }
    }

    const b = g.bid;
    if (g.turn.palifico) {
      const locked = g.turn.face ?? b.face;
      if (g.turn.face == null) g.turn.face = b.face;
      if (face !== locked) return false;
      return qty > b.qty;
    } else {
      if (b.face === face) return qty > b.qty;
      else if (face === 1 && b.face !== 1) return qty >= Math.ceil(b.qty / 2);
      else if (b.face === 1 && face !== 1) return qty >= (b.qty * 2 + 1);
      else return (qty > b.qty) || (qty === b.qty && face > b.face);
    }
  },

  reduce(state, action) {
    const s = { ...state, players: state.players.map(p => ({ ...p })) };

    if (s.phase === 'gameover') return s;
    const cur = s.players[s.turn.i];
    if (!cur) return s;

    if (action.type === 'bid' && s.phase === 'bidding') {
      if (!this.isValidRaise(s, action.qty, action.face)) return s;
      s.bid = { qty: action.qty, face: action.face, by: action.by };
      cur.lastChoice = { type: 'bid', qty: action.qty, face: action.face };
      s.turn.i = this.nextAliveFrom(s.turn.i, s);
      return s;
    }

    if (action.type === 'dudo' && s.phase === 'bidding') {
      cur.lastChoice = { type: 'dudo' };
      s.phase = 'reveal';
      s.reveal = { type: 'dudo', face: s.bid.face };
      return s;
    }

    if (action.type === 'calza' && s.phase === 'bidding' && !s.turn.palifico) {
      cur.lastChoice = { type: 'calza' };
      s.phase = 'reveal';
      s.reveal = { type: 'calza', face: s.bid.face };
      return s;
    }

    if (action.type === 'continueReveal' && s.phase === 'reveal') {
      s.round += 1;
      s.phase = 'bidding';
      s.bid = null;
      s.reveal = null;
      s.players.forEach(p => (p.lastChoice = null));
      return s;
    }

    return s;
  },

  nextAliveFrom(i, s) {
    const n = s.players.length;
    for (let k = 1; k <= n; k++) {
      const j = (i + k) % n;
      if (s.players[j] && s.players[j].dice > 0) return j;
    }
    return i;
  },

  countMatches(face, g) {
    const onesWild = !g.turn.palifico && face !== 1;
    let t = 0;
    for (const p of g.players) {
      if (!p.diceValues) continue;
      for (const d of p.diceValues) {
        if (d === face || (onesWild && d === 1)) t++;
      }
    }
    return t;
  }
};
