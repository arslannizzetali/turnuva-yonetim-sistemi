/* ============================= JSON DIŞA/İÇE AKTAR ============================= */
function downloadJSON(obj, filename){
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 4000);
}

function exportTournament(t){
  downloadJSON(t, (t.name.replace(/[^a-zA-Z0-9ığüşöçİĞÜŞÖÇ_ -]/g,'') || 'turnuva') + '.json');
}
function exportAll(){
  downloadJSON(DB, 'turnuva_yedek_' + new Date().toISOString().slice(0,10) + '.json');
}

function importTournamentFile(file){
  const reader = new FileReader();
  reader.onload = e => {
    try{
      const parsed = JSON.parse(e.target.result);
      if(!parsed.id || !parsed.teams) throw new Error('invalid');
      parsed.id = uid(); // çakışmayı önle
      DB.tournaments.push(parsed);
      saveDB();
      render();
      toast('Turnuva içe aktarıldı', 'ok');
    }catch(err){ toast('Geçersiz JSON dosyası', 'err'); }
  };
  reader.readAsText(file);
}
function importAllFile(file){
  const reader = new FileReader();
  reader.onload = e => {
    try{
      const parsed = JSON.parse(e.target.result);
      if(!parsed.tournaments) throw new Error('invalid');
      DB = parsed;
      saveDB();
      render();
      toast('Yedek yüklendi', 'ok');
    }catch(err){ toast('Geçersiz yedek dosyası', 'err'); }
  };
  reader.readAsText(file);
}

/* ============================= OLAY DELEGASYONU ============================= */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if(!el) return;
  const action = el.dataset.action;

  switch(action){
    case 'new-tournament':
      ui.wizard = { step:1, sport:null, format:null, name:'', teamsRaw:'', groupsCount:3, qualifyPerGroup:2 };
      ui.view = 'wizard'; render(); break;

    case 'wizard-cancel':
      ui.view = 'dashboard'; render(); break;

    case 'wizard-select-sport':
      ui.wizard.sport = el.dataset.sport; render(); break;

    case 'wizard-select-format':
      ui.wizard.format = el.dataset.format; render(); break;

    case 'wizard-next':
      if(ui.wizard.step < 3) ui.wizard.step++;
      render(); break;

    case 'wizard-back':
      if(ui.wizard.step > 1) ui.wizard.step--;
      render(); break;

    case 'wizard-finish': {
      const w = ui.wizard;
      const names = w.teamsRaw.split('\n').map(s=>s.trim()).filter(Boolean);
      const minTeams = w.format === 'groups' ? Math.max(3, w.groupsCount) : 2;
      if(!w.name.trim()){ toast('Turnuva adı girin', 'err'); return; }
      if(names.length < minTeams){ toast('En az '+minTeams+' takım gerekli', 'err'); return; }
      if(w.format === 'groups' && names.length < w.groupsCount){ toast('Takım sayısı grup sayısından az olamaz', 'err'); return; }
      const t = createTournamentSkeleton({
        name: w.name.trim(), sport: w.sport, format: w.format, teamNames: names,
        groupsCount: w.format==='groups' ? w.groupsCount : null,
        qualifyPerGroup: w.format==='groups' ? w.qualifyPerGroup : null
      });
      DB.tournaments.push(t);
      saveDB();
      ui.currentId = t.id;
      ui.view = 'tournament';
      render();
      toast('Turnuva oluşturuldu', 'ok');
      break;
    }

    case 'open-tournament':
      ui.currentId = el.dataset.id; ui.view = 'tournament'; ui.teamsEditRows = []; render(); break;

    case 'delete-tournament':
      askConfirm('Turnuvayı Sil', 'Bu turnuva kalıcı olarak silinecek. Emin misiniz?', () => {
        DB.tournaments = DB.tournaments.filter(t=>t.id !== el.dataset.id);
        saveDB(); render();
        toast('Turnuva silindi', 'ok');
      });
      render(); break;

    case 'go-dashboard':
      ui.view = 'dashboard'; ui.currentId = null; render(); break;

    case 'export-all': exportAll(); break;
    case 'trigger-import-all': document.getElementById('fileImportAll').click(); break;
    case 'export-tournament': exportTournament(getTournament(ui.currentId)); break;

    case 'print-tournament': window.print(); break;

    case 'open-mod-panel': ui.modOpen = true; render(); break;
    case 'close-mod-panel': ui.modOpen = false; removeModOverlay(); render(); break;

    case 'disqualify-team': {
      const teamId = el.dataset.teamId;
      const t = getTournament(ui.currentId);
      const team = teamById(t, teamId);
      askConfirm('Takımı Diskalifiye Et', `"${team.name}" takımı diskalifiye edilecek ve tüm kalan maçları hükmen kaybedecek. Emin misiniz?`, () => {
        disqualifyTeam(t, teamId);
        checkChampion(t);
        saveDB();
        removeModOverlay(); ui.modOpen = false;
        render();
        if(t.stage === 'completed') celebrateChampion();
        toast('Takım diskalifiye edildi', 'ok');
      });
      render(); break;
    }

    case 'open-teams-edit':
      ui.teamsEditRows = getTournament(ui.currentId).teams.map(x=>({id:x.id, name:x.name}));
      ui.teamsEditOpen = true; render(); break;
    case 'close-teams-edit': ui.teamsEditOpen = false; removeTeamsOverlay(); render(); break;
    case 'add-team-row': ui.teamsEditRows.push({ id: uid(), name:'' }); removeTeamsOverlay(); renderTeamsEditOverlay(); break;
    case 'remove-team-row': ui.teamsEditRows.splice(parseInt(el.dataset.idx),1); removeTeamsOverlay(); renderTeamsEditOverlay(); break;
    case 'save-teams-edit': {
      const t = getTournament(ui.currentId);
      const names = ui.teamsEditRows.map(r=>r.name.trim()).filter(Boolean);
      const minTeams = t.format === 'groups' ? Math.max(3, t.groupsCount) : 2;
      if(names.length < minTeams){ toast('En az '+minTeams+' takım gerekli', 'err'); return; }
      askConfirm('Kurayı Sıfırla', 'Takım listesi değişecek ve kura/fikstür sıfırdan yeniden çekilecek. Emin misiniz?', () => {
        t.teams = names.map(n => ({ id: uid(), name:n, disqualified:false }));
        t.groups = []; t.groupMatches = []; t.knockout = { rounds:[] }; t.champion = null; t.stage = 'draw'; t.drawDone = false;
        saveDB();
        ui.teamsEditOpen = false; removeTeamsOverlay();
        render();
        toast('Takımlar güncellendi, yeni kura bekleniyor', 'ok');
      });
      render(); break;
    }

    case 'open-stats': ui.statsOpen = true; render(); break;
    case 'close-stats': ui.statsOpen = false; removeStatsOverlay(); render(); break;

    case 'start-draw': {
      const t = getTournament(ui.currentId);
      startDraw(t);
      break;
    }

    case 'finish-groups': finishGroups(getTournament(ui.currentId)); break;

    case 'open-score': {
      ui.scoreModal = { matchId: el.dataset.matchId, stage: el.dataset.stage, detailOpen:false, substage:'normal' };
      render(); break;
    }
    case 'close-score-modal': ui.scoreModal = null; removeScoreOverlay(); render(); break;
    case 'save-score': saveScore(); break;

    case 'edit-match-date': {
      ui.dateModal = { matchId: el.dataset.matchId, stage: el.dataset.stage };
      render(); break;
    }
    case 'close-date-modal': ui.dateModal = null; removeDateOverlay(); render(); break;
    case 'save-match-date': {
      const t = getTournament(ui.currentId);
      const m = findMatchAny(t, ui.dateModal.matchId, ui.dateModal.stage);
      const val = document.getElementById('match-date-input').value;
      m.date = val ? new Date(val).toISOString() : null;
      saveDB();
      ui.dateModal = null; removeDateOverlay();
      render();
      toast('Maç tarihi kaydedildi', 'ok');
      break;
    }
    case 'clear-match-date': {
      const t = getTournament(ui.currentId);
      const m = findMatchAny(t, ui.dateModal.matchId, ui.dateModal.stage);
      m.date = null;
      saveDB();
      ui.dateModal = null; removeDateOverlay();
      render();
      toast('Maç tarihi kaldırıldı', 'ok');
      break;
    }
    case 'add-goal': addGoalRow(); break;
    case 'remove-goal': removeGoalRow(parseInt(el.dataset.idx)); break;
    case 'add-card': addCardRow(); break;
    case 'remove-card': removeCardRow(parseInt(el.dataset.idx)); break;

    case 'confirm-yes': {
      const fn = pendingConfirm; pendingConfirm = null;
      ui.confirmModal = null; removeConfirmOverlay();
      if(fn) fn();
      break;
    }
    case 'confirm-no':
      pendingConfirm = null; ui.confirmModal = null; removeConfirmOverlay(); render(); break;
  }
});

document.getElementById('fileImportAll').addEventListener('change', function(){
  if(this.files[0]) importAllFile(this.files[0]);
  this.value = '';
});
document.getElementById('fileImportTournament').addEventListener('change', function(){
  if(this.files[0]) importTournamentFile(this.files[0]);
  this.value = '';
});

/* ============================= BAŞLANGIÇ ============================= */
render();
