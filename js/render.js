/* ============================= UI DURUMU ============================= */
let ui = {
  view: 'dashboard',      // dashboard | wizard | tournament
  currentId: null,
  wizard: { step:1, sport:null, format:null, name:'', teamsRaw:'', groupsCount:3, qualifyPerGroup:2 },
  modOpen: false,
  teamsEditOpen: false,
  teamsEditRows: [],
  statsOpen: false,
  scoreModal: null,       // { matchId, stage, groupId }
  dateModal: null,        // { matchId, stage }
  confirmModal: null,
  drawAnim: null,         // { running, log:[] }
};

function brandBlock(){
  return `
    <div class="brand">
      <img src="${LOGO_ICON_DATA}" class="brand-logo" alt="İzzet Arslan">
      <div class="brand-text">
        <div class="brand-name">İzzet Arslan</div>
        <div class="brand-role">Yazılım Mühendisi</div>
      </div>
    </div>
    <div class="topbar-divider"></div>`;
}

function fmtMatchDate(iso){
  if(!iso) return null;
  const d = new Date(iso);
  if(isNaN(d.getTime())) return null;
  return d.toLocaleDateString('tr-TR', { day:'2-digit', month:'2-digit', year:'numeric' }) + ' ' +
         d.toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit' });
}

function render(){
  const app = document.getElementById('app');
  if(ui.view === 'dashboard') app.innerHTML = renderDashboard();
  else if(ui.view === 'wizard') app.innerHTML = renderWizard();
  else if(ui.view === 'tournament') app.innerHTML = renderTournament();

  if(ui.scoreModal) renderScoreModalOverlay();
  if(ui.dateModal) renderDateModalOverlay();
  if(ui.modOpen) renderModPanelOverlay();
  if(ui.teamsEditOpen) renderTeamsEditOverlay();
  if(ui.statsOpen) renderStatsOverlay();
  if(ui.confirmModal) renderConfirmOverlay();
}

/* ============================= DASHBOARD ============================= */
function renderDashboard(){
  const list = DB.tournaments.slice().sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
  const stageLabels = { draw:'Kura Bekliyor', groups:'Grup Aşaması', knockout:'Eleme Aşaması', completed:'Tamamlandı' };

  let cardsHtml = '';
  if(list.length === 0){
    cardsHtml = `<div class="empty-state"><div class="icon">🏆</div><div style="font-weight:700;color:var(--navy);font-size:16px;">Henüz turnuva oluşturulmadı</div><div>Başlamak için "Yeni Turnuva Oluştur" butonuna tıklayın.</div></div>`;
  } else {
    cardsHtml = '<div class="dash-grid">' + list.map(t => `
      <div class="t-card">
        <span class="sport-badge ${t.sport==='football'?'badge-football':'badge-volleyball'}">${t.sport==='football'?'⚽ FUTBOL':'🏐 VOLEYBOL'}</span>
        <h3>${escapeHtml(t.name)}</h3>
        <div class="meta">
          <div>📅 ${fmtDate(t.createdAt)}</div>
          <div>👥 ${t.teams.length} Takım &middot; ${t.format==='groups' ? 'Grup + Eleme':'Doğrudan Eleme'}</div>
        </div>
        <span class="stage-pill">${stageLabels[t.stage] || t.stage}</span>
        <div class="row-actions">
          <button class="btn-primary btn-sm" data-action="open-tournament" data-id="${t.id}">Aç</button>
          <button class="btn-danger btn-sm" data-action="delete-tournament" data-id="${t.id}">Sil</button>
        </div>
      </div>
    `).join('') + '</div>';
  }

  return `
    <div class="topbar no-print">
      <div class="topbar-left">
        ${brandBlock()}
        <h1>🏆 Turnuva Yönetim Sistemi</h1>
      </div>
      <div class="topbar-actions">
        <button data-action="export-all">⭳ Tümünü Yedekle</button>
        <button data-action="trigger-import-all">⭱ Yedek Yükle</button>
        <button class="hot" data-action="new-tournament">+ Yeni Turnuva Oluştur</button>
      </div>
    </div>
    <div class="container">
      <div class="page-title">Kayıtlı Turnuvalar</div>
      <div class="page-desc">Futbol ve voleybol turnuvalarınızı buradan yönetin. Tüm veriler bu bilgisayarda, çevrimdışı olarak saklanır.</div>
      ${cardsHtml}
    </div>
  `;
}

/* ============================= WIZARD ============================= */
function renderWizard(){
  const w = ui.wizard;
  const stepCls = i => i < w.step ? 'step done' : (i === w.step ? 'step active' : 'step');

  let body = '';
  if(w.step === 1){
    body = `
      <div class="option-grid">
        <div class="option-card ${w.sport==='football'?'selected':''}" data-action="wizard-select-sport" data-sport="football">
          <div class="emoji">⚽</div><h4>Futbol</h4><p>Gol bazlı puanlama, 3-1-0</p>
        </div>
        <div class="option-card ${w.sport==='volleyball'?'selected':''}" data-action="wizard-select-sport" data-sport="volleyball">
          <div class="emoji">🏐</div><h4>Voleybol</h4><p>Set bazlı puanlama, 3/2/1/0</p>
        </div>
      </div>`;
  } else if(w.step === 2){
    body = `
      <div class="option-grid">
        <div class="option-card ${w.format==='groups'?'selected':''}" data-action="wizard-select-format" data-format="groups">
          <div class="emoji">📊</div><h4>Grup Aşamalı + Elemeli</h4><p>Önce gruplar, sonra eleme ağacı</p>
        </div>
        <div class="option-card ${w.format==='knockout'?'selected':''}" data-action="wizard-select-format" data-format="knockout">
          <div class="emoji">🗂️</div><h4>Doğrudan Tek Maç Elemeli</h4><p>Knockout - direkt eleme ağacı</p>
        </div>
      </div>`;
  } else if(w.step === 3){
    const teamCount = w.teamsRaw.split('\n').map(s=>s.trim()).filter(Boolean).length;
    body = `
      <div class="field">
        <label>Turnuva Adı</label>
        <input type="text" id="w-name" value="${escapeHtml(w.name)}" placeholder="Örn: 2026 Bahar Kupası" oninput="ui.wizard.name=this.value">
      </div>
      <div class="field">
        <label>Takım İsimleri (her satıra bir takım)</label>
        <textarea id="w-teams" rows="8" placeholder="Takım 1&#10;Takım 2&#10;Takım 3&#10;..." oninput="ui.wizard.teamsRaw=this.value; document.getElementById('w-team-count').textContent=this.value.split(String.fromCharCode(10)).map(s=>s.trim()).filter(Boolean).length;">${escapeHtml(w.teamsRaw)}</textarea>
        <div class="hint"><b id="w-team-count">${teamCount}</b> takım algılandı</div>
      </div>
      ${w.format==='groups' ? `
      <div class="two-col">
        <div class="field">
          <label>Grup Sayısı</label>
          <input type="number" min="2" max="16" id="w-groups" value="${w.groupsCount}" oninput="ui.wizard.groupsCount=parseInt(this.value)||2">
        </div>
        <div class="field">
          <label>Gruptan Çıkacak Takım Sayısı</label>
          <input type="number" min="1" max="8" id="w-qualify" value="${w.qualifyPerGroup}" oninput="ui.wizard.qualifyPerGroup=parseInt(this.value)||1">
        </div>
      </div>` : ''}
    `;
  }

  const canNext = (w.step===1 && w.sport) || (w.step===2 && w.format) || w.step===3;

  return `
  <div class="topbar no-print">
    <div class="topbar-left">
      ${brandBlock()}
      <h1>🏆 Yeni Turnuva Sihirbazı</h1>
    </div>
    <div class="topbar-actions"><button data-action="wizard-cancel">✕ Vazgeç</button></div>
  </div>
  <div class="container">
    <div class="wizard-shell card pad">
      <div class="wizard-steps">
        <div class="${stepCls(1)}">1. BRANŞ</div>
        <div class="${stepCls(2)}">2. FORMAT</div>
        <div class="${stepCls(3)}">3. YAPILANDIRMA</div>
      </div>
      ${body}
      <div class="wizard-footer">
        <button class="btn-ghost" data-action="wizard-back" ${w.step===1?'disabled':''}>← Geri</button>
        ${w.step < 3
          ? `<button class="btn-primary" data-action="wizard-next" ${canNext?'':'disabled'}>İleri →</button>`
          : `<button class="btn-green" data-action="wizard-finish">✓ Turnuvayı Oluştur</button>`
        }
      </div>
    </div>
  </div>`;
}

/* ============================= TURNUVA ANA GÖRÜNÜM ============================= */
function renderTournament(){
  const t = getTournament(ui.currentId);
  if(!t){ ui.view='dashboard'; return renderDashboard(); }

  const visibleStages = t.format === 'groups' ? ['draw','groups','knockout','completed'] : ['draw','knockout','completed'];
  const stageLabels = { draw:'① Kura', groups:'② Gruplar', knockout: t.format==='groups' ? '③ Eleme' : '② Eleme', completed: t.format==='groups' ? '④ Şampiyon' : '③ Şampiyon' };
  const curIdx = visibleStages.indexOf(t.stage);
  const tabsHtml = visibleStages.map((s,i) => {
    let cls = 'tab';
    if(i < curIdx) cls += ' completed';
    if(s === t.stage) cls += ' current';
    return `<span class="${cls}">${stageLabels[s]}</span>`;
  }).join('');

  const playedCount = playedMatchCount(t);
  const teamsLocked = playedCount > 0;

  let body = '';
  if(t.stage === 'draw') body = renderDrawScreen(t);
  else if(t.stage === 'groups') body = renderGroupsScreen(t);
  else if(t.stage === 'knockout') body = renderKnockoutScreen(t);
  else if(t.stage === 'completed') body = renderCompletedScreen(t);

  return `
    <div class="topbar no-print">
      <div class="topbar-left">
        ${brandBlock()}
        <div>
          <h1>${t.sport==='football'?'⚽':'🏐'} ${escapeHtml(t.name)}</h1>
          <div class="sub">${t.sport==='football'?'Futbol':'Voleybol'} &middot; ${t.format==='groups'?'Grup Aşamalı + Elemeli':'Doğrudan Eleme'}</div>
        </div>
      </div>
      <div class="topbar-actions">
        <button data-action="go-dashboard">← Panele Dön</button>
        ${!teamsLocked ? `<button data-action="open-teams-edit">👥 Takımları Düzenle</button>` : ''}
        <button data-action="open-mod-panel">🛡️ Moderatör Paneli</button>
        <button data-action="open-stats">📈 İstatistikler</button>
        <button data-action="export-tournament">⭳ JSON Dışa Aktar</button>
        <button data-action="print-tournament">🖨️ Yazdır / PDF</button>
      </div>
    </div>
    <div class="container">
      <div class="stage-tabs no-print">${tabsHtml}</div>
      ${body}
    </div>
  `;
}

/* --- Kura ekranı --- */
function renderDrawScreen(t){
  if(ui.drawAnim && ui.drawAnim.running){
    return `
      <div class="draw-shell card pad">
        <div class="page-title" style="text-align:center;">Kura Çekiliyor...</div>
        <div class="draw-pot spin">${t.sport==='football'?'⚽':'🏐'}</div>
        <div class="draw-log">${ui.drawAnim.log.map(l=>`<div>${l}</div>`).join('')}</div>
      </div>
    `;
  }

  return `
    <div class="draw-shell card pad">
      <div class="page-title" style="text-align:center;">Kura Çekimi</div>
      <div class="page-desc" style="text-align:center;">
        ${t.teams.length} takım kayıtlı. ${t.format==='groups' ? t.groupsCount+' gruba ayrılacak.' : 'Doğrudan eleme ağacı oluşturulacak.'}
      </div>
      <div class="draw-pot">${t.sport==='football'?'⚽':'🏐'}</div>
      <label class="check-row">
        <input type="checkbox" id="sim-toggle" ${t.simulateDraw?'checked':''} onchange="getTournament('${t.id}').simulateDraw=this.checked;">
        Kura Çekiliş Simülasyonunu Göster
      </label>
      <button class="btn-green" style="padding:12px 28px;font-size:14.5px;" data-action="start-draw" data-id="${t.id}">🎬 Kurayı Başlat</button>
    </div>
  `;
}

function startDraw(t){
  const simulate = t.simulateDraw;
  const isGroups = t.format === 'groups';

  const finalize = () => {
    if(isGroups) assignGroups(t);
    else buildKnockout(t, t.teams.map(x=>x.id), []);
    saveDB();
    ui.drawAnim = null;
    render();
    toast('Kura tamamlandı!', 'ok');
  };

  if(!simulate){
    finalize();
    return;
  }

  const drawOrder = shuffle(t.teams.map(x=>x.id));
  ui.drawAnim = { running:true, log:[] };
  render();

  let i = 0;
  const step = () => {
    if(i >= drawOrder.length){
      ui.drawAnim.log.push('✔ Tüm takımlar yerleştirildi.');
      render();
      setTimeout(finalize, 700);
      return;
    }
    playClick();
    const name = teamName(t, drawOrder[i]);
    if(isGroups){
      const gLetter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[i % t.groupsCount];
      ui.drawAnim.log.push(`🎱 <b>${escapeHtml(name)}</b> → Grup ${gLetter}`);
    } else {
      ui.drawAnim.log.push(`🎱 <b>${escapeHtml(name)}</b> torbadan çekildi`);
    }
    i++;
    render();
    const logEl = document.querySelector('.draw-log');
    if(logEl) logEl.scrollTop = logEl.scrollHeight;
    setTimeout(step, 550);
  };
  setTimeout(step, 500);
}

/* --- Gruplar ekranı --- */
function renderGroupsScreen(t){
  const allPlayed = allGroupMatchesPlayed(t);
  const groupsHtml = t.groups.map(g => {
    const standings = computeStandings(t, g);
    const qCount = t.qualifyPerGroup;
    const rowsHtml = standings.map((row, idx) => `
      <tr class="${idx < qCount ? 'qualify':''}">
        <td class="name-col">${idx+1}. ${teamTagHtml(t, row.id)}</td>
        <td>${row.P}</td><td>${row.W}</td>${t.sport==='football'?`<td>${row.D}</td>`:''}<td>${row.L}</td>
        <td>${row.GF}</td><td>${row.GA}</td><td>${row.GF-row.GA}</td><td><b>${row.PTS}</b></td>
      </tr>
    `).join('');

    const matches = t.groupMatches.filter(m => m.groupId === g.id);
    const fixturesHtml = matches.map(m => renderMatchCardHtml(t, m, 'group')).join('');

    return `
      <div class="card pad">
        <div class="group-title">${g.name}</div>
        <div style="overflow-x:auto;">
        <table class="standings">
          <thead><tr>
            <th class="name-col">Takım</th><th>O</th><th>G</th>${t.sport==='football'?'<th>B</th>':''}<th>M</th>
            <th>${t.sport==='football'?'A':'S+'}</th><th>${t.sport==='football'?'Y':'S-'}</th><th>AV</th><th>P</th>
          </tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        </div>
        <div class="fixtures">${fixturesHtml}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="groups-grid">${groupsHtml}</div>
    <div style="text-align:center;margin-top:24px;" class="no-print">
      <button class="btn-green" style="padding:12px 30px;font-size:14.5px;" ${allPlayed?'':'disabled'} data-action="finish-groups" data-id="${t.id}">
        ${allPlayed ? '🏁 Grup Aşamasını Bitir ve Eleme Turuna Geç' : '⏳ Tüm grup maçları oynanmadan eleme aşamasına geçilemez'}
      </button>
    </div>
  `;
}

function finishGroups(t){
  const qualifiers = [];
  const leaders = [];
  t.groups.forEach(g => {
    const standings = computeStandings(t, g);
    standings.slice(0, t.qualifyPerGroup).forEach((row, idx) => {
      qualifiers.push(row.id);
      if(idx === 0) leaders.push(row.id);
    });
  });
  buildKnockout(t, qualifiers, leaders);
  saveDB();
  render();
  toast('Eleme aşaması oluşturuldu!', 'ok');
}

/* --- Eleme ekranı --- */
function renderKnockoutScreen(t){
  const rounds = t.knockout.rounds || [];
  const roundsHtml = rounds.map(round => {
    const label = round[0] ? round[0].roundLabel : '';
    const matchesHtml = round.map(m => {
      const aName = m.teamA ? teamTagHtml(t, m.teamA) : '<span style="color:var(--text-dim);">Belirlenecek</span>';
      const bName = m.teamB ? teamTagHtml(t, m.teamB) : (m.isBye ? 'BAY' : '<span style="color:var(--text-dim);">Belirlenecek</span>');
      const canClick = m.teamA && m.teamB && !m.walkover;
      const scoreStr = matchScoreString(t, m);
      return `
        <div class="bracket-match ${(!m.teamA || !m.teamB) ? 'tbd' : ''}" ${canClick ? `data-action="open-score" data-match-id="${m.id}" data-stage="knockout"` : ''}>
          <div class="b-team ${m.winner===m.teamA && m.teamA ? 'win':''}"><span class="nm">${aName}</span>${m.played && m.teamA ? `<span class="b-score">${scoreStr.a}</span>`:''}</div>
          <hr>
          <div class="b-team ${m.winner===m.teamB && m.teamB ? 'win':''}"><span class="nm">${bName}</span>${m.played && m.teamB ? `<span class="b-score">${scoreStr.b}</span>`:''}</div>
          ${m.walkover ? `<div class="bay-note">${!m.teamB || !m.teamA ? 'BAY GEÇTİ' : 'HÜKMEN'}</div>` : (m.isBye ? '<div class="bay-note">BAY GEÇTİ</div>' : renderDateControl(m, 'knockout'))}
        </div>
      `;
    }).join('');
    return `<div class="bracket-round"><div class="round-title">${label}</div>${matchesHtml}</div>`;
  }).join('');

  return `<div class="card pad"><div class="bracket-wrap">${roundsHtml}</div></div>`;
}

/* --- Şampiyon ekranı --- */
function renderCompletedScreen(t){
  const champTeam = teamById(t, t.champion);
  const bracketHtml = (t.knockout.rounds||[]).length ? renderKnockoutScreen(t) : '';
  return `
    <div class="card champion-screen">
      <div class="trophy">🏆</div>
      <h2>ŞAMPİYON</h2>
      <h1>${champTeam ? escapeHtml(champTeam.name) : '-'}</h1>
      <div style="color:var(--text-dim);font-size:13px;">${escapeHtml(t.name)} turnuvası tamamlandı.</div>
    </div>
    <div style="margin-top:20px;">${bracketHtml}</div>
  `;
}

/* --- Maç tarihi kontrolü (isteğe bağlı, kullanıcı isterse ekler) --- */
function renderDateControl(m, stage){
  const label = fmtMatchDate(m.date);
  return `
    <div class="match-date-row">
      ${label ? `<span class="date-chip">📅 ${label}</span>` : ''}
      <span class="date-edit-link" data-action="edit-match-date" data-match-id="${m.id}" data-stage="${stage}">${label ? 'Tarihi Düzenle' : '📅 Tarih Ekle'}</span>
    </div>
  `;
}

/* --- Maç kartı (grup listesi) --- */
function renderMatchCardHtml(t, m, stage){
  const scoreStr = matchScoreString(t, m);
  const locked = !(m.teamA && m.teamB) || m.walkover;
  const cls = 'match-card ' + (m.played ? 'played ' : '') + (locked ? 'locked' : '');
  return `
    <div class="${cls}">
      <div class="match-main" ${locked ? '' : `data-action="open-score" data-match-id="${m.id}" data-stage="${stage}"`}>
        <div class="team ${m.winner===m.teamA?'winner':''}">${teamTagHtml(t, m.teamA)}</div>
        <div class="vs">vs</div>
        <div class="team ${m.winner===m.teamB?'winner':''}" style="text-align:right;">${teamTagHtml(t, m.teamB)}</div>
        <div class="score-box ${m.played?'':'pending'}">
          ${m.played ? (scoreStr.a+' - '+scoreStr.b) : 'Skor Gir'}
          ${m.walkover ? '<div class="walkover-tag">HÜKMEN</div>' : ''}
        </div>
      </div>
      ${m.walkover ? '' : renderDateControl(m, stage)}
    </div>
  `;
}

/* ============================= TARİH MODALI ============================= */
function renderDateModalOverlay(){
  const t = getTournament(ui.currentId);
  const { matchId, stage } = ui.dateModal;
  const m = findMatchAny(t, matchId, stage);
  if(!m){ ui.dateModal=null; return; }

  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'date-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:400px;">
      <div class="modal-head"><h3>📅 Maç Tarihi</h3><button class="close-x" data-action="close-date-modal">✕</button></div>
      <div class="modal-body">
        <div class="score-teams" style="margin-bottom:14px;">
          <div class="tname">${escapeHtml(teamName(t,m.teamA))} <span style="color:var(--text-dim);font-weight:400;">vs</span> ${escapeHtml(teamName(t,m.teamB))}</div>
        </div>
        <div class="field">
          <label>Tarih ve Saat</label>
          <input type="datetime-local" id="match-date-input" value="${m.date ? m.date.slice(0,16) : ''}">
        </div>
      </div>
      <div class="modal-foot">
        ${m.date ? `<button class="btn-ghost" data-action="clear-match-date">Tarihi Kaldır</button>` : ''}
        <button class="btn-ghost" data-action="close-date-modal">İptal</button>
        <button class="btn-green" data-action="save-match-date">✓ Kaydet</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}
function removeDateOverlay(){ const el = document.getElementById('date-overlay'); if(el) el.remove(); }

function matchScoreString(t, m){
  if(!m.played || !m.score) return { a:'-', b:'-' };
  if(t.sport === 'football'){
    let a = m.score.a, b = m.score.b;
    if(m.score.etA != null){ a += m.score.etA; b += m.score.etB; }
    let extra = '';
    if(m.score.penA != null) extra = ` <span style="font-size:10px;">(Pen ${m.score.penA}-${m.score.penB})</span>`;
    return { a: a+extra, b: b };
  } else {
    return { a: m.score.setsA, b: m.score.setsB };
  }
}

/* ============================= SKOR MODALI ============================= */
function findMatchAny(t, matchId, stage){
  if(stage === 'group') return t.groupMatches.find(m=>m.id===matchId);
  return findKnockoutMatch(t, matchId);
}

function renderScoreModalOverlay(){
  const t = getTournament(ui.currentId);
  const { matchId, stage } = ui.scoreModal;
  const m = findMatchAny(t, matchId, stage);
  if(!m){ ui.scoreModal=null; return; }

  const isFootball = t.sport === 'football';
  const isKnockout = stage === 'knockout';
  const showDetail = !!ui.scoreModal.detailOpen;
  const substage = ui.scoreModal.substage || 'normal'; // normal|et|pens (football knockout)

  let scoreFields = '';
  if(isFootball){
    if(substage === 'normal'){
      scoreFields = `
        <div class="score-input-row">
          <input type="number" min="0" id="s-a" value="${m.score ? m.score.a : ''}">
          <span class="score-sep">-</span>
          <input type="number" min="0" id="s-b" value="${m.score ? m.score.b : ''}">
        </div>`;
    } else if(substage === 'et'){
      scoreFields = `
        <div class="small-note" style="text-align:center;">Normal süre: ${ui.scoreModal.tempA} - ${ui.scoreModal.tempB} (berabere)</div>
        <div class="score-stage-label">Uzatmalarda Atılan Goller</div>
        <div class="score-input-row">
          <input type="number" min="0" id="s-eta" value="0">
          <span class="score-sep">-</span>
          <input type="number" min="0" id="s-etb" value="0">
        </div>`;
    } else if(substage === 'pens'){
      scoreFields = `
        <div class="small-note" style="text-align:center;">Uzatmalar da berabere bitti.</div>
        <div class="score-stage-label">Penaltı Atışları</div>
        <div class="score-input-row">
          <input type="number" min="0" id="s-pena" value="0">
          <span class="score-sep">-</span>
          <input type="number" min="0" id="s-penb" value="0">
        </div>`;
    }
  } else {
    scoreFields = `
      <div class="small-note" style="text-align:center;">Set skorunu giriniz (örn: 3-1). Bir taraf mutlaka 3 set kazanmalıdır.</div>
      <div class="score-input-row">
        <input type="number" min="0" max="3" id="s-setsa" value="${m.score ? m.score.setsA : ''}">
        <span class="score-sep">-</span>
        <input type="number" min="0" max="3" id="s-setsb" value="${m.score ? m.score.setsB : ''}">
      </div>`;
  }

  let detailHtml = '';
  if(isFootball && substage==='normal'){
    const detail = m.detail || { goals:[], cards:[] };
    detailHtml = `
      <div class="toggle-row">
        <input type="checkbox" id="detail-toggle" ${showDetail?'checked':''} onchange="ui.scoreModal.detailOpen=this.checked; render();">
        <label for="detail-toggle">Gol ve Kart Detayı Ekle</label>
      </div>
      ${showDetail ? `
      <div class="detail-block">
        <h5>⚽ Gol Atanlar</h5>
        <div id="goal-list">${(detail.goals||[]).map((g,i)=>`<div class="detail-list-item"><span>${g.team==='A'?escapeHtml(teamName(t,m.teamA)):escapeHtml(teamName(t,m.teamB))} — ${escapeHtml(g.player)}${g.minute?" ("+g.minute+"')":''}</span><span class="x" data-action="remove-goal" data-idx="${i}">✕</span></div>`).join('')}</div>
        <div class="detail-row">
          <select id="goal-team"><option value="A">${escapeHtml(teamName(t,m.teamA))}</option><option value="B">${escapeHtml(teamName(t,m.teamB))}</option></select>
          <input type="text" id="goal-player" placeholder="Oyuncu adı">
          <input type="number" id="goal-minute" placeholder="Dk">
          <button class="btn-sm btn-outline" data-action="add-goal">+ Ekle</button>
        </div>
        <h5 style="margin-top:14px;">🟨🟥 Kartlar</h5>
        <div id="card-list">${(detail.cards||[]).map((c,i)=>`<div class="detail-list-item"><span>${c.team==='A'?escapeHtml(teamName(t,m.teamA)):escapeHtml(teamName(t,m.teamB))} — ${escapeHtml(c.player)} (${c.type==='yellow'?'Sarı':'Kırmızı'})</span><span class="x" data-action="remove-card" data-idx="${i}">✕</span></div>`).join('')}</div>
        <div class="detail-row">
          <select id="card-team"><option value="A">${escapeHtml(teamName(t,m.teamA))}</option><option value="B">${escapeHtml(teamName(t,m.teamB))}</option></select>
          <input type="text" id="card-player" placeholder="Oyuncu adı">
          <select id="card-type"><option value="yellow">Sarı Kart</option><option value="red">Kırmızı Kart</option></select>
          <button class="btn-sm btn-outline" data-action="add-card">+ Ekle</button>
        </div>
      </div>` : ''}
    `;
  } else if(!isFootball){
    const detail = m.detail || { cards:[] };
    detailHtml = `
      <div class="toggle-row">
        <input type="checkbox" id="detail-toggle" ${showDetail?'checked':''} onchange="ui.scoreModal.detailOpen=this.checked; render();">
        <label for="detail-toggle">Kart Detayı Ekle</label>
      </div>
      ${showDetail ? `
      <div class="detail-block">
        <h5>🟨🟥 Kartlar</h5>
        <div id="card-list">${(detail.cards||[]).map((c,i)=>`<div class="detail-list-item"><span>${c.team==='A'?escapeHtml(teamName(t,m.teamA)):escapeHtml(teamName(t,m.teamB))} — ${escapeHtml(c.player)} (${c.type==='yellow'?'Sarı':'Kırmızı'})</span><span class="x" data-action="remove-card" data-idx="${i}">✕</span></div>`).join('')}</div>
        <div class="detail-row">
          <select id="card-team"><option value="A">${escapeHtml(teamName(t,m.teamA))}</option><option value="B">${escapeHtml(teamName(t,m.teamB))}</option></select>
          <input type="text" id="card-player" placeholder="Oyuncu adı">
          <select id="card-type"><option value="yellow">Sarı Kart</option><option value="red">Kırmızı Kart</option></select>
          <button class="btn-sm btn-outline" data-action="add-card">+ Ekle</button>
        </div>
      </div>` : ''}
    `;
  }

  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'score-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-head"><h3>Maç Skoru</h3><button class="close-x" data-action="close-score-modal">✕</button></div>
      <div class="modal-body">
        <div class="score-teams">
          <div class="tname">${escapeHtml(teamName(t,m.teamA))}</div>
          <div style="color:var(--text-dim);font-weight:700;">VS</div>
          <div class="tname">${escapeHtml(teamName(t,m.teamB))}</div>
        </div>
        ${scoreFields}
        ${detailHtml}
      </div>
      <div class="modal-foot">
        <button class="btn-ghost" data-action="close-score-modal">İptal</button>
        <button class="btn-green" data-action="save-score">✓ Kaydet</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function removeScoreOverlay(){
  const el = document.getElementById('score-overlay');
  if(el) el.remove();
}

function saveScore(){
  const t = getTournament(ui.currentId);
  const { matchId, stage } = ui.scoreModal;
  const m = findMatchAny(t, matchId, stage);
  const isFootball = t.sport === 'football';
  const isKnockout = stage === 'knockout';
  const substage = ui.scoreModal.substage || 'normal';

  if(isFootball){
    if(substage === 'normal'){
      const a = parseInt(document.getElementById('s-a').value);
      const b = parseInt(document.getElementById('s-b').value);
      if(isNaN(a) || isNaN(b) || a<0 || b<0){ toast('Lütfen geçerli bir skor girin', 'err'); return; }
      if(isKnockout && a === b){
        ui.scoreModal.tempA = a; ui.scoreModal.tempB = b; ui.scoreModal.substage = 'et';
        removeScoreOverlay(); renderScoreModalOverlay();
        return;
      }
      finalizeFootball(t, m, a, b, null, null, null, null);
    } else if(substage === 'et'){
      const eta = parseInt(document.getElementById('s-eta').value)||0;
      const etb = parseInt(document.getElementById('s-etb').value)||0;
      const totalA = ui.scoreModal.tempA + eta, totalB = ui.scoreModal.tempB + etb;
      if(totalA === totalB){
        ui.scoreModal.etA = eta; ui.scoreModal.etB = etb; ui.scoreModal.substage = 'pens';
        removeScoreOverlay(); renderScoreModalOverlay();
        return;
      }
      finalizeFootball(t, m, ui.scoreModal.tempA, ui.scoreModal.tempB, eta, etb, null, null);
    } else if(substage === 'pens'){
      const pa = parseInt(document.getElementById('s-pena').value);
      const pb = parseInt(document.getElementById('s-penb').value);
      if(isNaN(pa) || isNaN(pb) || pa === pb){ toast('Penaltılarda beraberlik olamaz', 'err'); return; }
      finalizeFootball(t, m, ui.scoreModal.tempA, ui.scoreModal.tempB, ui.scoreModal.etA||0, ui.scoreModal.etB||0, pa, pb);
    }
  } else {
    const sa = parseInt(document.getElementById('s-setsa').value);
    const sb = parseInt(document.getElementById('s-setsb').value);
    if(isNaN(sa) || isNaN(sb) || Math.max(sa,sb) !== 3 || sa === sb || Math.min(sa,sb) > 2){
      toast('Geçersiz set skoru. Bir taraf 3, diğeri 0-2 olmalı.', 'err'); return;
    }
    finalizeVolleyball(t, m, sa, sb);
  }
}

function finalizeFootball(t, m, a, b, etA, etB, penA, penB){
  const oldWinner = m.winner;
  const detail = m.detail || { goals:[], cards:[] };
  m.score = { a, b, etA: etA, etB: etB, penA: penA, penB: penB };
  m.played = true;
  m.detail = (detail.goals.length || detail.cards.length) ? detail : null;

  let totalA = a + (etA||0), totalB = b + (etB||0);
  let winner;
  if(totalA !== totalB) winner = totalA > totalB ? m.teamA : m.teamB;
  else winner = penA > penB ? m.teamA : m.teamB;
  m.winner = winner;

  if(m.stage === 'knockout'){
    if(oldWinner && oldWinner !== winner && m.nextMatchId) clearDownstream(t, m.nextMatchId, oldWinner);
    propagateWinner(t, m);
    checkChampion(t);
  }
  finishSaveFlow(t);
}

function finalizeVolleyball(t, m, setsA, setsB){
  const oldWinner = m.winner;
  const detail = m.detail || { cards:[] };
  m.score = { setsA, setsB };
  m.played = true;
  m.detail = (detail.cards && detail.cards.length) ? detail : null;
  const winner = setsA > setsB ? m.teamA : m.teamB;
  m.winner = winner;

  if(m.stage === 'knockout'){
    if(oldWinner && oldWinner !== winner && m.nextMatchId) clearDownstream(t, m.nextMatchId, oldWinner);
    propagateWinner(t, m);
    checkChampion(t);
  }
  finishSaveFlow(t);
}

function finishSaveFlow(t){
  saveDB();
  ui.scoreModal = null;
  removeScoreOverlay();
  render();
  if(t.stage === 'completed'){
    celebrateChampion();
  } else {
    toast('Skor kaydedildi', 'ok');
  }
}

function addGoalRow(){
  const t = getTournament(ui.currentId);
  const m = findMatchAny(t, ui.scoreModal.matchId, ui.scoreModal.stage);
  const team = document.getElementById('goal-team').value;
  const player = document.getElementById('goal-player').value.trim();
  const minute = document.getElementById('goal-minute').value;
  if(!player){ toast('Oyuncu adı girin', 'err'); return; }
  if(!m.detail) m.detail = { goals:[], cards:[] };
  if(!m.detail.goals) m.detail.goals = [];
  m.detail.goals.push({ team, player, minute: minute || null });
  removeScoreOverlay(); renderScoreModalOverlay();
}
function removeGoalRow(idx){
  const t = getTournament(ui.currentId);
  const m = findMatchAny(t, ui.scoreModal.matchId, ui.scoreModal.stage);
  m.detail.goals.splice(idx,1);
  removeScoreOverlay(); renderScoreModalOverlay();
}
function addCardRow(){
  const t = getTournament(ui.currentId);
  const m = findMatchAny(t, ui.scoreModal.matchId, ui.scoreModal.stage);
  const team = document.getElementById('card-team').value;
  const player = document.getElementById('card-player').value.trim();
  const type = document.getElementById('card-type').value;
  if(!player){ toast('Oyuncu adı girin', 'err'); return; }
  if(!m.detail) m.detail = { goals:[], cards:[] };
  if(!m.detail.cards) m.detail.cards = [];
  m.detail.cards.push({ team, player, type });
  removeScoreOverlay(); renderScoreModalOverlay();
}
function removeCardRow(idx){
  const t = getTournament(ui.currentId);
  const m = findMatchAny(t, ui.scoreModal.matchId, ui.scoreModal.stage);
  m.detail.cards.splice(idx,1);
  removeScoreOverlay(); renderScoreModalOverlay();
}

/* ============================= MODERATÖR PANELİ ============================= */
function renderModPanelOverlay(){
  const t = getTournament(ui.currentId);
  const rowsHtml = t.teams.map(team => `
    <div class="mod-team-row">
      <span class="nm">${escapeHtml(team.name)} ${team.disqualified ? '<span class="dq-tag">DİSKALİFİYE</span>' : ''}</span>
      ${!team.disqualified ? `<button class="btn-danger btn-sm" data-action="disqualify-team" data-team-id="${team.id}">Diskalifiye Et</button>` : `<span style="font-size:11.5px;color:var(--text-dim);">İşlem yapılamaz</span>`}
    </div>
  `).join('');

  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'mod-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-head"><h3>🛡️ Moderatör Paneli</h3><button class="close-x" data-action="close-mod-panel">✕</button></div>
      <div class="modal-body">
        <div class="small-note" style="margin-bottom:10px;">Diskalifiye edilen takımın oynanmış maçları korunur; oynanmamış tüm maçları rakip lehine hükmen sonuçlanır.</div>
        ${rowsHtml}
      </div>
      <div class="modal-foot"><button class="btn-ghost" data-action="close-mod-panel">Kapat</button></div>
    </div>
  `;
  document.body.appendChild(overlay);
}
function removeModOverlay(){ const el = document.getElementById('mod-overlay'); if(el) el.remove(); }

/* ============================= TAKIMLARI DÜZENLE ============================= */
function renderTeamsEditOverlay(){
  const t = getTournament(ui.currentId);
  if(!ui.teamsEditRows.length){
    ui.teamsEditRows = t.teams.map(x => ({ id:x.id, name:x.name }));
  }
  const rowsHtml = ui.teamsEditRows.map((r,i) => `
    <div class="team-edit-row">
      <input type="text" value="${escapeHtml(r.name)}" oninput="ui.teamsEditRows[${i}].name=this.value">
      <span class="x" data-action="remove-team-row" data-idx="${i}">✕</span>
    </div>
  `).join('');

  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'teams-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-head"><h3>👥 Takımları Düzenle</h3><button class="close-x" data-action="close-teams-edit">✕</button></div>
      <div class="modal-body">
        <div id="team-rows">${rowsHtml}</div>
        <button class="btn-outline btn-sm" data-action="add-team-row">+ Takım Ekle</button>
        <div class="small-note">Kaydettiğinizde kura/fikstür sıfırdan yeniden çekilecektir. Henüz hiç maç oynanmadığı için bu işlem güvenlidir.</div>
      </div>
      <div class="modal-foot">
        <button class="btn-ghost" data-action="close-teams-edit">İptal</button>
        <button class="btn-green" data-action="save-teams-edit">✓ Kaydet ve Kurayı Sıfırla</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}
function removeTeamsOverlay(){ const el = document.getElementById('teams-overlay'); if(el) el.remove(); }

/* ============================= İSTATİSTİKLER ============================= */
function renderStatsOverlay(){
  const t = getTournament(ui.currentId);
  const allMatches = [...t.groupMatches, ...(t.knockout.rounds||[]).flat()];

  const goalMap = {};
  const cardMap = {};
  allMatches.forEach(m => {
    if(!m.detail) return;
    (m.detail.goals||[]).forEach(g => {
      const key = g.player + '|' + (g.team==='A'?m.teamA:m.teamB);
      if(!goalMap[key]) goalMap[key] = { player:g.player, teamId: g.team==='A'?m.teamA:m.teamB, count:0 };
      goalMap[key].count++;
    });
    (m.detail.cards||[]).forEach(c => {
      const key = c.player + '|' + (c.team==='A'?m.teamA:m.teamB);
      if(!cardMap[key]) cardMap[key] = { player:c.player, teamId: c.team==='A'?m.teamA:m.teamB, yellow:0, red:0 };
      if(c.type==='yellow') cardMap[key].yellow++; else cardMap[key].red++;
    });
  });

  const goalRows = Object.values(goalMap).sort((a,b)=>b.count-a.count);
  const cardRows = Object.values(cardMap).sort((a,b)=>(b.yellow+b.red)-(a.yellow+a.red));

  const goalTableHtml = t.sport === 'football' ? `
    <table class="stat-table">
      <thead><tr><th>Oyuncu</th><th>Takım</th><th>Gol</th></tr></thead>
      <tbody>${goalRows.length ? goalRows.map(r=>`<tr><td>${escapeHtml(r.player)}</td><td>${escapeHtml(teamName(t,r.teamId))}</td><td><b>${r.count}</b></td></tr>`).join('') : '<tr><td colspan="3" style="text-align:center;color:var(--text-dim);">Henüz gol kaydı yok</td></tr>'}</tbody>
    </table>` : '';

  const cardTableHtml = `
    <table class="stat-table">
      <thead><tr><th>Oyuncu</th><th>Takım</th><th>🟨</th><th>🟥</th></tr></thead>
      <tbody>${cardRows.length ? cardRows.map(r=>`<tr><td>${escapeHtml(r.player)}</td><td>${escapeHtml(teamName(t,r.teamId))}</td><td>${r.yellow}</td><td>${r.red}</td></tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--text-dim);">Henüz kart kaydı yok</td></tr>'}</tbody>
    </table>`;

  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'stats-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:720px;">
      <div class="modal-head"><h3>📈 İstatistikler</h3><button class="close-x" data-action="close-stats">✕</button></div>
      <div class="modal-body">
        <div class="stats-grid" style="grid-template-columns:${t.sport==='football'?'1fr 1fr':'1fr'};">
          ${t.sport==='football' ? `<div><h5 style="color:var(--navy);">⚽ Gol Krallığı</h5>${goalTableHtml}</div>` : ''}
          <div><h5 style="color:var(--navy);">🟨🟥 Kart Ceza Tablosu</h5>${cardTableHtml}</div>
        </div>
      </div>
      <div class="modal-foot"><button class="btn-ghost" data-action="close-stats">Kapat</button></div>
    </div>
  `;
  document.body.appendChild(overlay);
}
function removeStatsOverlay(){ const el = document.getElementById('stats-overlay'); if(el) el.remove(); }

/* ============================= ONAY MODALI ============================= */
function renderConfirmOverlay(){
  const { title, message } = ui.confirmModal;
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:420px;">
      <div class="modal-head"><h3>${escapeHtml(title)}</h3></div>
      <div class="modal-body">${escapeHtml(message)}</div>
      <div class="modal-foot">
        <button class="btn-ghost" data-action="confirm-no">Vazgeç</button>
        <button class="btn-danger" data-action="confirm-yes">Onayla</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}
function removeConfirmOverlay(){ const el = document.getElementById('confirm-overlay'); if(el) el.remove(); }

/* ============================= KONFETİ ============================= */
function celebrateChampion(){
  playFanfare();
  const layer = document.getElementById('confetti-layer');
  const colors = ['#16a34a','#0b1f4d','#1c3f8f','#d97706','#dc2626','#b8860b'];
  for(let i=0;i<160;i++){
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.left = Math.random()*100 + 'vw';
    el.style.background = colors[Math.floor(Math.random()*colors.length)];
    el.style.animationDuration = (2.2 + Math.random()*2) + 's';
    el.style.animationDelay = (Math.random()*0.8) + 's';
    el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    layer.appendChild(el);
    setTimeout(()=>el.remove(), 5200);
  }
}
