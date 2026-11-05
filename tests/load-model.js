// Loads the browser scripts (utils.js + model.js) into an isolated VM context
// so the tournament logic can be tested in Node without Electron or a DOM.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadModel() {
  const store = new Map();
  const context = {
    console,
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key)
    }
  };
  vm.createContext(context);
  const root = path.join(__dirname, "..", "js");
  for (const file of ["utils.js", "model.js"]) {
    // Top-level `let`/`const` stay script-scoped in a VM, so expose what tests need.
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  }
  return context;
}

function makeTournament(model, { sport = "football", format = "knockout", teams = 8, groupsCount, qualifyPerGroup } = {}) {
  return model.createTournamentSkeleton({
    name: "Test Cup",
    sport,
    format,
    groupsCount,
    qualifyPerGroup,
    teamNames: Array.from({ length: teams }, (_, i) => `Team ${i + 1}`)
  });
}

module.exports = { loadModel, makeTournament };
