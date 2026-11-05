const test = require("node:test");
const assert = require("node:assert/strict");
const { loadModel, makeTournament } = require("./load-model");

const model = loadModel();

// Values created inside the VM have a different Array/Object prototype.
const plain = (value) => JSON.parse(JSON.stringify(value));

function allPairsUnique(pairs) {
  const seen = new Set();
  for (const [a, b] of pairs) {
    const key = [a, b].sort().join("|");
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

test("round robin: every team meets every other team exactly once", () => {
  for (const n of [2, 3, 4, 5, 6, 7]) {
    const ids = Array.from({ length: n }, (_, i) => `t${i}`);
    const pairs = model.roundRobinPairs(ids);
    assert.equal(pairs.length, (n * (n - 1)) / 2, `n=${n}`);
    assert.ok(allPairsUnique(pairs), `n=${n}`);
    assert.ok(pairs.every(([a, b]) => a !== null && b !== null && a !== b));
  }
});

test("groups: teams are split evenly and fixtures are generated per group", () => {
  const t = makeTournament(model, { format: "groups", teams: 10, groupsCount: 3, qualifyPerGroup: 2 });
  model.assignGroups(t);
  const sizes = t.groups.map((g) => g.teamIds.length).sort();
  assert.deepEqual(plain(sizes), [3, 3, 4]);
  assert.equal(t.groupMatches.length, 3 + 3 + 6);
  assert.equal(t.stage, "groups");
});

test("knockout: non power-of-two field gets byes so round 2 is full", () => {
  const t = makeTournament(model, { teams: 6 });
  model.buildKnockout(
    t,
    t.teams.map((x) => x.id),
  );
  const [first, second, final] = t.knockout.rounds;
  assert.equal(first.length, 4);
  assert.equal(first.filter((m) => m.isBye).length, 2);
  assert.ok(first.filter((m) => m.isBye).every((m) => m.played && m.winner === m.teamA));
  assert.equal(second.length, 2);
  assert.equal(final.length, 1);
  assert.equal(final[0].roundLabel, "BÜYÜK FİNAL");
  // Bye winners are already placed in round 2.
  const placed = second.flatMap((m) => [m.teamA, m.teamB]).filter(Boolean);
  assert.equal(placed.length, 2);
});

test("knockout: group leaders get the byes", () => {
  const t = makeTournament(model, { teams: 5 });
  const ids = t.teams.map((x) => x.id);
  const leaders = ids.slice(0, 3);
  model.buildKnockout(t, ids, leaders);
  const byeTeams = t.knockout.rounds[0].filter((m) => m.isBye).map((m) => m.teamA);
  assert.equal(byeTeams.length, 3);
  assert.ok(byeTeams.every((id) => leaders.includes(id)));
});

test("knockout: special three-team rule gives one bye straight to the final", () => {
  const t = makeTournament(model, { teams: 3 });
  model.buildKnockout(
    t,
    t.teams.map((x) => x.id),
  );
  assert.equal(t.knockout.special3, true);
  const [[semi], [final]] = t.knockout.rounds;
  assert.equal(semi.nextMatchId, final.id);
  assert.ok(final.teamA);
  assert.equal(final.teamB, null);
});

test("knockout: a single qualifier is champion immediately", () => {
  const t = makeTournament(model, { teams: 1 });
  model.buildKnockout(t, [t.teams[0].id]);
  assert.equal(t.champion, t.teams[0].id);
  assert.equal(t.stage, "completed");
});

function groupOf(model, teams, sport) {
  const t = makeTournament(model, { sport, format: "groups", teams, groupsCount: 1, qualifyPerGroup: 2 });
  model.assignGroups(t);
  return t;
}

function play(t, a, b, score) {
  const m = t.groupMatches.find((x) => (x.teamA === a && x.teamB === b) || (x.teamA === b && x.teamB === a));
  const flipped = m.teamA === b;
  m.played = true;
  if (t.sport === "football") m.score = flipped ? { a: score[1], b: score[0] } : { a: score[0], b: score[1] };
  else m.score = flipped ? { setsA: score[1], setsB: score[0] } : { setsA: score[0], setsB: score[1] };
}

test("football standings: 3/1/0 points, then goal difference, then goals scored", () => {
  const t = groupOf(model, 3, "football");
  const [a, b, c] = t.teams.map((x) => x.id);
  play(t, a, b, [1, 1]);
  play(t, a, c, [3, 0]);
  play(t, b, c, [4, 2]);
  const rows = model.computeStandings(t, t.groups[0]);
  assert.deepEqual(plain(rows.map((r) => r.id)), [a, b, c]);
  assert.deepEqual(plain(rows.map((r) => r.PTS)), [4, 4, 0]);
  // a and b are level on points; a wins on goal difference (+3 vs +2).
});

test("volleyball standings: 3-0/3-1 win = 3 pts, 3-2 win = 2-1 split", () => {
  assert.deepEqual(plain(model.volleyballPoints(3, 0)), { w: 3, l: 0 });
  assert.deepEqual(plain(model.volleyballPoints(3, 1)), { w: 3, l: 0 });
  assert.deepEqual(plain(model.volleyballPoints(3, 2)), { w: 2, l: 1 });

  const t = groupOf(model, 2, "volleyball");
  const [a, b] = t.teams.map((x) => x.id);
  play(t, a, b, [3, 2]);
  const rows = model.computeStandings(t, t.groups[0]);
  assert.deepEqual(plain(rows.map((r) => [r.id, r.PTS])), [
    [a, 2],
    [b, 1],
  ]);
});

test("disqualification: played matches stay, unplayed ones become 3-0 walkovers", () => {
  const t = groupOf(model, 3, "football");
  const [a, b, c] = t.teams.map((x) => x.id);
  play(t, a, b, [2, 0]);
  model.disqualifyTeam(t, a);
  const ab = t.groupMatches.find((m) => [m.teamA, m.teamB].includes(a) && [m.teamA, m.teamB].includes(b));
  const ac = t.groupMatches.find((m) => [m.teamA, m.teamB].includes(a) && [m.teamA, m.teamB].includes(c));
  assert.equal(ab.walkover, false);
  assert.equal(ac.walkover, true);
  assert.equal(ac.winner, c);
  assert.deepEqual(plain(ac.score), ac.teamA === c ? { a: 3, b: 0 } : { a: 0, b: 3 });
});

test("disqualification in knockout advances the opponent to the next round", () => {
  const t = makeTournament(model, { teams: 4 });
  model.buildKnockout(
    t,
    t.teams.map((x) => x.id),
  );
  const semi = t.knockout.rounds[0][0];
  const loser = semi.teamA;
  model.disqualifyTeam(t, loser);
  assert.equal(semi.winner, semi.teamB);
  const final = t.knockout.rounds[1][0];
  assert.equal(final[semi.nextSlot], semi.teamB);
});
