/* ============================= YARDIMCI FONKSİYONLAR ============================= */
const STORE_KEY = 'tys_db_v2';

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,9); }

function loadDB(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(!raw) return { tournaments: [] };
    const parsed = JSON.parse(raw);
    if(!parsed.tournaments) return { tournaments: [] };
    return parsed;
  }catch(e){ return { tournaments: [] }; }
}
function saveDB(){ localStorage.setItem(STORE_KEY, JSON.stringify(DB)); }

function fmtDate(iso){
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', { day:'2-digit', month:'2-digit', year:'numeric' }) + ' ' +
         d.toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit' });
}

function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

function toast(msg, type){
  const wrap = document.getElementById('toast-wrap');
  const el = document.createElement('div');
  el.className = 'toast' + (type ? ' '+type : '');
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transition='.3s'; setTimeout(()=>el.remove(),300); }, 2600);
}

function escapeHtml(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* Genel onay modalı */
let pendingConfirm = null;
function askConfirm(title, message, onYes){
  pendingConfirm = onYes;
  ui.confirmModal = { title, message };
  render();
}

/* ============================= SES (Web Audio) ============================= */
let audioCtx = null;
function playClick(freq){
  try{
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq || (620 + Math.random()*260);
    gain.gain.setValueAtTime(0.16, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.13);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.14);
  }catch(e){ /* sessiz geç */ }
}
function playFanfare(){
  try{
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25,659.25,783.99,1046.5];
    notes.forEach((f,i)=>{
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle'; osc.frequency.value = f;
      const t0 = audioCtx.currentTime + i*0.14;
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.2, t0+0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t0+0.35);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(t0); osc.stop(t0+0.4);
    });
  }catch(e){}
}
