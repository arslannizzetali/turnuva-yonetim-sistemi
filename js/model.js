/* ============================= VERİ MODELİ ============================= */
let DB = loadDB();

function getTournament(id){ return DB.tournaments.find(t=>t.id===id); }

function createTournamentSkeleton(data){
  return {
    id: uid(),
    name: data.name,
    sport: data.sport,           // 'football' | 'volleyball'
    format: data.format,         // 'groups' | 'knockout'
    groupsCount: data.groupsCount || null,
    qualifyPerGroup: data.qualifyPerGroup || null,
    createdAt: new Date().toISOString(),
    stage: 'draw',               // draw -> groups -> knockout -> completed
    simulateDraw: true,
    teams: data.teamNames.map(n => ({ id: uid(), name: n, disqualified:false })),
    groups: [],
    groupMatches: [],
    knockout: { rounds: [] },
    champion: null,
    drawDone: false
  };
}

/* --- Puanlama kuralları --- */
function volleyballPoints(setsWinner, setsLoser){
  if(setsLoser <= 1) return { w:3, l:0 };
  return { w:2, l:1 };
}

/* --- Round robin (tek devreli, çember yöntemi) --- */
function roundRobinPairs(teamIds){
  let teams = teamIds.slice();
  if(teams.length % 2 !== 0) teams.push(null);
  const n = teams.length;
  const rounds = n - 1;
  const half = n/2;
  const pairs = [];
  let arr = teams.slice();
  for(let r=0;r<rounds;r++){
    for(let i=0;i<half;i++){
      const a = arr[i], b = arr[n-1-i];
      if(a!=null && b!=null) pairs.push([a,b]);
    }
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop());
    arr = [fixed, ...rest];
  }
  return pairs;
}

/* --- Takım adına göre bul --- */
function teamById(t, id){ return t.teams.find(x=>x.id===id); }
function teamName(t, id){
  if(!id) return 'BAY';
  const team = teamById(t, id);
  return team ? team.name : '?';
}
function teamTagHtml(t, id){
  if(!id) return '<span class="team">BAY</span>';
  const team = teamById(t, id);
  if(!team) return '?';
  return escapeHtml(team.name) + (team.disqualified ? '<span class="dq-tag">DİSKALİFİYE</span>' : '');
}

/* ============================= KURA / GRUP OLUŞTURMA ============================= */
function assignGroups(t){
  const activeTeams = shuffle(t.teams.map(x=>x.id));
  const gCount = t.groupsCount;
  const groups = [];
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for(let i=0;i<gCount;i++) groups.push({ id: uid(), name: 'Grup '+letters[i], teamIds: [] });
  activeTeams.forEach((id, idx) => { groups[idx % gCount].teamIds.push(id); });
  t.groups = groups;
  t.groupMatches = [];
  groups.forEach(g => {
    const pairs = roundRobinPairs(g.teamIds);
    pairs.forEach(([a,b]) => {
      t.groupMatches.push({
        id: uid(), stage:'group', groupId: g.id,
        teamA:a, teamB:b, played:false, walkover:false,
        score:null, detail:null, winner:null, date:null
      });
    });
  });
  t.stage = 'groups';
  t.drawDone = true;
}

function roundLabelByCount(count){
  if(count===1) return 'BÜYÜK FİNAL';
  if(count===2) return 'YARI FİNAL';
  if(count===4) return 'ÇEYREK FİNAL';
  if(count===8) return 'SON 16';
  if(count===16) return 'SON 32';
  return count+'. TUR EŞLEŞMELERİ';
}

function buildKnockout(t, qualifierIds, leaderIds){
  leaderIds = leaderIds || [];
  const rounds = [];

  if(qualifierIds.length === 3){
    // ÖZEL 3 TAKIM KURALI
    const shuffled = shuffle(qualifierIds);
    const byeTeam = shuffled[0];
    const semiA = shuffled[1], semiB = shuffled[2];
    const finalMatch = {
      id: uid(), stage:'knockout', roundIndex:1, roundLabel:'BÜYÜK FİNAL',
      teamA: byeTeam, teamB: null, played:false, walkover:false, score:null, detail:null,
      winner:null, nextMatchId:null, nextSlot:null, isBye:false, byeAdvanced:true, date:null
    };
    const semiMatch = {
      id: uid(), stage:'knockout', roundIndex:0, roundLabel:'YARI FİNAL',
      teamA: semiA, teamB: semiB, played:false, walkover:false, score:null, detail:null,
      winner:null, nextMatchId: finalMatch.id, nextSlot:'teamB', isBye:false, date:null
    };
    rounds.push([semiMatch]);
    rounds.push([finalMatch]);
    t.knockout = { rounds, special3: true };
    t.stage = 'knockout';
    return;
  }

  const n = qualifierIds.length;
  if(n < 1){ t.knockout = { rounds: [] }; t.stage='knockout'; return; }
  if(n === 1){
    t.champion = qualifierIds[0];
    t.stage = 'completed';
    t.knockout = { rounds: [] };
    return;
  }

  let size = 1; while(size < n) size *= 2;
  const byeCount = size - n;

  let order = shuffle(qualifierIds.slice());
  order.sort((a,b) => (leaderIds.includes(b)?1:0) - (leaderIds.includes(a)?1:0));
  const byeTeams = order.slice(0, byeCount);
  const playTeams = shuffle(order.slice(byeCount));

  let round0 = [];
  byeTeams.forEach(id => round0.push({ teamA:id, teamB:null, isBye:true }));
  for(let i=0;i<playTeams.length;i+=2){
    round0.push({ teamA: playTeams[i], teamB: playTeams[i+1], isBye:false });
  }
  round0 = shuffle(round0);

  const totalRounds = Math.log2(size);
  const roundsMatches = [];
  let prevRound = null;
  for(let r=0;r<totalRounds;r++){
    const matchCountThisRound = size / Math.pow(2, r+1);
    const roundArr = [];
    for(let i=0;i<matchCountThisRound;i++){
      let m;
      if(r===0){
        const src = round0[i];
        m = {
          id: uid(), stage:'knockout', roundIndex:r, roundLabel: roundLabelByCount(matchCountThisRound),
          teamA: src.teamA, teamB: src.teamB, played:false, walkover: !!src.isBye,
          score:null, detail:null, winner: src.isBye ? src.teamA : null,
          isBye: !!src.isBye, nextMatchId:null, nextSlot:null, date:null
        };
        if(src.isBye) m.played = true;
      } else {
        m = {
          id: uid(), stage:'knockout', roundIndex:r, roundLabel: roundLabelByCount(matchCountThisRound),
          teamA:null, teamB:null, played:false, walkover:false, score:null, detail:null,
          winner:null, isBye:false, nextMatchId:null, nextSlot:null, date:null
        };
      }
      roundArr.push(m);
    }
    if(prevRound){
      prevRound.forEach((pm, idx) => {
        const nextMatch = roundArr[Math.floor(idx/2)];
        pm.nextMatchId = nextMatch.id;
        pm.nextSlot = (idx % 2 === 0) ? 'teamA' : 'teamB';
      });
    }
    roundsMatches.push(roundArr);
    prevRound = roundArr;
  }

  // Bye'ları ilk tura yansıt
  roundsMatches[0].forEach(m => {
    if(m.isBye && m.nextMatchId){
      const next = findKnockoutMatch(t, m.nextMatchId, roundsMatches);
      if(next) next[m.nextSlot] = m.teamA;
    }
  });

  t.knockout = { rounds: roundsMatches, special3:false };
  t.stage = 'knockout';
}

function findKnockoutMatch(t, id, roundsOverride){
  const rounds = roundsOverride || (t.knockout && t.knockout.rounds) || [];
  for(const r of rounds) for(const m of r) if(m.id === id) return m;
  return null;
}

/* ============================= STANDİNGS (PUAN DURUMU) ============================= */
function computeStandings(t, group){
  const table = {};
  group.teamIds.forEach(id => {
    table[id] = { id, P:0, W:0, D:0, L:0, GF:0, GA:0, PTS:0 };
  });
  const matches = t.groupMatches.filter(m => m.groupId === group.id);
  matches.forEach(m => {
    if(!m.played || !m.score) return;
    const rowA = table[m.teamA], rowB = table[m.teamB];
    if(!rowA || !rowB) return;
    rowA.P++; rowB.P++;
    if(t.sport === 'football'){
      const a = m.score.a, b = m.score.b;
      rowA.GF += a; rowA.GA += b; rowB.GF += b; rowB.GA += a;
      if(a > b){ rowA.W++; rowB.L++; rowA.PTS += 3; }
      else if(a < b){ rowB.W++; rowA.L++; rowB.PTS += 3; }
      else { rowA.D++; rowB.D++; rowA.PTS += 1; rowB.PTS += 1; }
    } else {
      const a = m.score.setsA, b = m.score.setsB;
      rowA.GF += a; rowA.GA += b; rowB.GF += b; rowB.GA += a;
      if(a > b){ const pts = volleyballPoints(a,b); rowA.W++; rowB.L++; rowA.PTS += pts.w; rowB.PTS += pts.l; }
      else { const pts = volleyballPoints(b,a); rowB.W++; rowA.L++; rowB.PTS += pts.w; rowA.PTS += pts.l; }
    }
  });
  const rows = Object.values(table);
  rows.sort((x,y) => {
    if(y.PTS !== x.PTS) return y.PTS - x.PTS;
    const dx = x.GF - x.GA, dy = y.GF - y.GA;
    if(dy !== dx) return dy - dx;
    if(y.GF !== x.GF) return y.GF - x.GF;
    return teamName(t,x.id).localeCompare(teamName(t,y.id));
  });
  return rows;
}

function allGroupMatchesPlayed(t){
  return t.groupMatches.length > 0 && t.groupMatches.every(m => m.played);
}

function playedMatchCount(t){
  let c = t.groupMatches.filter(m=>m.played).length;
  (t.knockout.rounds||[]).forEach(r => r.forEach(m => { if(m.played && !m.isBye) c++; }));
  return c;
}

/* ============================= HÜKMEN MAĞLUBİYET / DİSKALİFİYE ============================= */
function disqualifyTeam(t, teamId){
  const team = teamById(t, teamId);
  if(!team) return;
  team.disqualified = true;

  // Oynanmamış GRUP maçları -> rakip lehine hükmen skor
  t.groupMatches.forEach(m => {
    if(m.played) return;
    if(m.teamA !== teamId && m.teamB !== teamId) return;
    const oppIsA = m.teamB === teamId;
    m.played = true; m.walkover = true; m.detail = null;
    if(t.sport === 'football'){
      m.score = oppIsA ? { a:3, b:0 } : { a:0, b:3 };
    } else {
      m.score = oppIsA ? { setsA:3, setsB:0 } : { setsA:0, setsB:3 };
    }
    m.winner = oppIsA ? m.teamA : m.teamB;
  });

  // Oynanmamış ELEME maçları -> rakip maç yapmadan bir üst tura geçer
  (t.knockout.rounds || []).forEach(round => {
    round.forEach(m => {
      if(m.played) return;
      if(m.teamA !== teamId && m.teamB !== teamId) return;
      const oppId = m.teamA === teamId ? m.teamB : m.teamA;
      if(!oppId){ return; } // rakip henüz belli değilse dokunma
      m.played = true; m.walkover = true; m.score = null; m.detail = null;
      m.winner = oppId;
      propagateWinner(t, m);
    });
  });
}

function propagateWinner(t, match){
  if(!match.nextMatchId || !match.winner) return;
  const next = findKnockoutMatch(t, match.nextMatchId);
  if(!next) return;
  const oldVal = next[match.nextSlot];
  if(oldVal && oldVal !== match.winner && next.played){
    clearDownstream(t, next.id, oldVal);
  }
  next[match.nextSlot] = match.winner;
  maybeAutoResolveWalkover(t, next);
}

/* Bir maçın taraflarından biri zaten diskalifiye edilmişse (rakibi sonradan
   belli olduğunda) otomatik hükmen sonuçlandırır ve zinciri ilerletir. */
function maybeAutoResolveWalkover(t, match){
  if(match.played || !match.teamA || !match.teamB) return;
  const a = teamById(t, match.teamA), b = teamById(t, match.teamB);
  const aDQ = a && a.disqualified, bDQ = b && b.disqualified;
  if(aDQ === bDQ) return; // ikisi de diskalifiye ya da ikisi de değilse dokunma
  match.played = true; match.walkover = true; match.score = null; match.detail = null;
  match.winner = aDQ ? match.teamB : match.teamA;
  propagateWinner(t, match);
}

function clearDownstream(t, matchId, teamId){
  const m = findKnockoutMatch(t, matchId);
  if(!m) return;
  let changed = false;
  if(m.teamA === teamId){ m.teamA = null; changed = true; }
  if(m.teamB === teamId){ m.teamB = null; changed = true; }
  if(changed && m.played){
    const prevWinner = m.winner;
    m.played=false; m.winner=null; m.score=null; m.detail=null; m.walkover=false;
    if(m.nextMatchId && prevWinner) clearDownstream(t, m.nextMatchId, prevWinner);
  }
}

function checkChampion(t){
  const rounds = t.knockout.rounds;
  if(!rounds.length) return;
  const finalRound = rounds[rounds.length-1];
  const finalMatch = finalRound[0];
  if(finalMatch && finalMatch.played && finalMatch.winner){
    t.champion = finalMatch.winner;
    t.stage = 'completed';
  }
}
