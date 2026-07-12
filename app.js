/* ---------- STORAGE ---------- */
const store = {
  get(key, fallback){ try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }catch(e){ return fallback; } },
  set(key, value){ try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){ console.error(e); toast('Armazenamento cheio — tente com arquivos menores.'); } }
};
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function escapeHtml(str){ return (str||'').toString().replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2200); }
function fileToDataUrl(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); }); }
function buildSignUrl(params){
  const url = new URL(location.href);
  url.search = '';
  Object.entries(params).forEach(([k,v])=> url.searchParams.set(k, v));
  return url.toString();
}
function dataUrlToFile(dataUrl, name){
  const [meta, b64] = dataUrl.split(',');
  const mime = (meta.match(/data:(.*?);base64/)||[])[1] || 'application/octet-stream';
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], name, {type: mime});
}

async function shareFiles(items, text){
  // items: [{dataUrl, name}]
  try{
    const files = items.map(it=> dataUrlToFile(it.dataUrl, it.name));
    if(navigator.canShare && navigator.canShare({files})){
      await navigator.share({files, title: text, text});
      return;
    }
  }catch(e){ /* cai no fallback abaixo */ }
  items.forEach(it=>{
    const a = document.createElement('a');
    a.href = it.dataUrl; a.download = it.name; a.click();
  });
  toast('Seu navegador não permite anexar direto — os arquivos foram baixados.');
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

function emailWithFiles(items, subject, text){
  items.forEach(it=>{
    const a = document.createElement('a');
    a.href = it.dataUrl; a.download = it.name; a.click();
  });
  toast('Arquivos baixados — anexe-os no e-mail que vai abrir.');
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
}

const CHECKLIST_DEFAULTS = [
  'Contrato assinado',
  'Sinal pago',
  'Rider técnico recebido',
  'Rider técnico validado (sem pendências)',
  'Rider de hospitalidade recebido',
  'Lista da equipe enviada (nomes completos)',
  'Bilhetes / credenciais (GC) enviados',
  'Lista de convidados recebida',
  'Transporte organizado',
  'Hotel / hospedagem reservada',
  'Divulgação / imprensa feita',
];

/* ---------- SEED DEMO DATA ---------- */
if(!store.get('seeded3', false)){
  const artistIds = [uid(), uid(), uid()];
  store.set('artists', [
    {id:artistIds[0], name:'Kizua', instagram:'@kizuaoficial', currency:'EUR', cache:'3.000,00', bio:'Kizua mistura kizomba e afrobeat...', photos:[], rider:'', files:[], contracts:[]},
    {id:artistIds[1], name:'Nayla Santos', instagram:'@naylasantos', currency:'AOA', cache:'800.000', bio:'Voz revelação da música urbana...', photos:[], rider:'', files:[], contracts:[]},
    {id:artistIds[2], name:'DJ Trovão', instagram:'@djtrovao', currency:'EUR', cache:'1.200,00', bio:'Um dos DJs mais requisitados...', photos:[], rider:'', files:[], contracts:[]},
  ]);
  const today = new Date();
  const inDays = (n)=>{ const d=new Date(today); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
  store.set('shows', [
    {id:uid(), artistId:artistIds[0], eventType:'Show musical', date:inDays(6), time:'22:00', venue:'Sala Corda', city:'Lisboa, Portugal', currency:'EUR', value:'3.000,00', status:'confirmado', hirerName:'Casa de Espetáculos Lda', hirerPhone1:'+351 912 345 678', hirerIg:'@salacorda', checklist:CHECKLIST_DEFAULTS.map((t,i)=>({text:t, done:i<2})), payments:[{date:inDays(2), value:'1.500,00', receipt:''}]},
    {id:uid(), artistId:artistIds[1], eventType:'Festival', date:inDays(14), time:'21:00', venue:'Cine Atlântico', city:'Luanda, Angola', currency:'AOA', value:'900.000', status:'reserva', hirerName:'Produções Kianda', hirerPhone1:'+244 923 000 111', hirerIg:'', checklist:CHECKLIST_DEFAULTS.map(t=>({text:t, done:false})), payments:[]},
  ]);
  store.set('tracks', [
    {id:uid(), artistId:artistIds[0], title:'Luz da Manhã', isrc:'QZK5X2400001', distributor:'Onerpm', contributors:[{name:'Kizua', role:'artista principal', status:'assinado'},{name:'Beat Menor', role:'produtor', status:'pendente'}]},
  ]);
  store.set('suppliers', [{id:uid(), category:'Som', name:'AudioPro Lisboa', contact:'+351 910 000 000', notes:''}]);
  store.set('expenses', []);
  store.set('seeded3', true);
}

let artists = store.get('artists', []);
let shows = store.get('shows', []);
let tracks = store.get('tracks', []);
let suppliers = store.get('suppliers', []);
let expenses = store.get('expenses', []);
let vault = store.get('vault', {}); // { artistId: { notes:[{id,text,at}], files:[{id,name,url,at}] } }
let calDate = new Date();
let editingShowId=null, editingArtistId=null, editingTrackId=null, editingSupplierId=null;
let modalContributors = [], modalChecklist = [], modalPhotos = [], modalContracts = [], modalLogo = '', modalRider = '', modalFiles = [], modalHirerDoc = '';
let modalPkSelection = {}; // {logo:bool, rider:bool, photos:bool, files:bool, contracts:bool}
let sigTarget = null;
let currentRole = 'admin';
let currentArtistAccess = null;
let users = store.get('users', null);
if(!users){
  users = [{id:'seed-admin', name:'Você', username:'admin', password:'admin', role:'admin', artistAccess:{}}];
  store.set('users', users);
}
users = users.map(u=>{
  if(u.artistAccess) return u;
  if(u.role==='admin') return {...u, artistAccess:{}};
  const access = {};
  const lvl = u.role==='editor' ? 'editor' : 'leitor';
  (u.limited ? (u.artistIds||[]) : []).forEach(id=> access[id]=lvl);
  return {...u, role:'custom', artistAccess:access, defaultLevel: u.limited ? null : lvl};
});
store.set('users', users);
if(!users.some(u=>u.role==='admin')){
  users[0] = {...users[0], role:'admin', artistAccess:{}};
  store.set('users', users);
}
const _defaultAdmin = users.find(u=>u.role==='admin') || users[0];
let currentUserId = store.get('currentUserId', _defaultAdmin.id);
if(!users.some(u=>u.id===currentUserId)) currentUserId = _defaultAdmin.id;
let editingUserId = null;
function computeAccess(u){
  if(u.role==='admin') return null;
  const access = {...(u.artistAccess||{})};
  if(u.defaultLevel){ artists.forEach(a=>{ if(!access[a.id]) access[a.id]=u.defaultLevel; }); }
  return access;
}
let viewingArtistId = store.get('viewingArtistId', null);
let brandLogo = store.get('brandLogo', '');

const DOW=['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];
const MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const STATUS_LABELS={confirmado:'Confirmado',reserva:'Reserva',imprensa:'Imprensa',tramite:'Trâmite'};

function isAdmin(){ return currentRole==='admin'; }
function currentUserObj(){ return users.find(u=>u.id===currentUserId); }
function canSeeVault(){ const u = currentUserObj(); return isAdmin() || (u && !!u.vaultAccess); }
function canSeeEquipe(){ const u = currentUserObj(); if(isAdmin()) return true; return u && Object.values(computeAccess(u)||{}).includes('editor'); }
function canEdit(){
  if(isAdmin()) return true;
  return currentArtistAccess && Object.values(currentArtistAccess).includes('editor');
}
function canEditArtist(artistId){
  if(isAdmin()) return true;
  return currentArtistAccess && currentArtistAccess[artistId]==='editor';
}
function canEditTracks(artistId){
  if(isAdmin()) return true;
  const lvl = currentArtistAccess && currentArtistAccess[artistId];
  return lvl==='editor' || lvl==='musicas';
}
function canAddTracks(){
  if(isAdmin()) return true;
  return currentArtistAccess && Object.values(currentArtistAccess).some(l=> l==='editor'||l==='musicas');
}
function canSeeArtist(artistId){
  if(isAdmin()) return true;
  return currentArtistAccess && !!currentArtistAccess[artistId];
}
function artistName(id){ const a=artists.find(x=>x.id===id); return a?a.name:'(removido)'; }
function fmtCurrency(v,c){ 
  if(c==='USD') return `$ ${v||'0'}`;
  if(c==='AOA') return `${v||'0'} Kz`;
  return `€ ${v||'0'}`;
}

/* ---------- LOGIN (usuário + senha) ---------- */
function userRoleLabel(u){
  if(u.role==='admin') return 'Admin';
  const levels = Object.values(computeAccess(u)||{});
  if(levels.includes('editor')) return 'Editor';
  if(levels.includes('musicas')) return 'Músicas';
  if(levels.length) return 'Leitor';
  return 'Sem acesso';
}
function sellers(){ return users.filter(u=> u.isSeller); }
function sellerName(id){ const u = users.find(x=>x.id===id); return u ? u.name : ''; }
function renderLoggedUser(){
  const u = users.find(x=>x.id===currentUserId);
  if(!u) return;
  document.getElementById('loggedUserName').textContent = u.name;
  document.getElementById('loggedUserRole').textContent = userRoleLabel(u) + (u.isSeller ? ' · 💼 Vendedor' : '');
}
function showLoginScreen(){
  document.body.classList.add('locked');
  const img = document.getElementById('loginLogoImg');
  const ph = document.getElementById('loginLogoPh');
  if(brandLogo){ img.src = brandLogo; img.classList.remove('hidden'); ph.classList.add('hidden'); }
  else { img.classList.add('hidden'); ph.classList.remove('hidden'); }
  document.getElementById('login_username').value = '';
  document.getElementById('login_password').value = '';
  document.getElementById('loginError').classList.remove('show');
  setTimeout(()=> document.getElementById('login_username').focus(), 100);
}
function doLogin(){
  const username = document.getElementById('login_username').value.trim();
  const password = document.getElementById('login_password').value;
  const u = users.find(x=> x.username.toLowerCase()===username.toLowerCase() && x.password===password);
  if(!u){
    document.getElementById('loginError').classList.add('show');
    document.getElementById('login_password').value = '';
    return;
  }
  document.getElementById('loginError').classList.remove('show');
  // Sessão salva por 1 semana (7 dias). Depois disso, pede login de novo.
  const SETE_DIAS = 7 * 24 * 60 * 60 * 1000;
  store.set('session', { userId: u.id, expiresAt: Date.now() + SETE_DIAS });
  document.body.classList.remove('locked');
  applyLoggedUser(u.id);
  toast(`Bem-vindo(a), ${u.name}!`);
}
document.getElementById('loginBtn').addEventListener('click', doLogin);
document.getElementById('login_password').addEventListener('keydown', e=>{ if(e.key==='Enter') doLogin(); });
document.getElementById('login_username').addEventListener('keydown', e=>{ if(e.key==='Enter') document.getElementById('login_password').focus(); });
document.getElementById('logoutBtn').addEventListener('click', ()=>{
  if(!confirm('Sair da conta?')) return;
  store.set('session', null);
  store.set('sessionUserId', null);
  showLoginScreen();
});
function applyLoggedUser(userId){
  const u = users.find(x=>x.id===userId) || users[0];
  currentUserId = u.id;
  currentRole = u.role==='admin' ? 'admin' : 'custom';
  currentArtistAccess = computeAccess(u);
  store.set('currentUserId', currentUserId);
  if(currentArtistAccess && viewingArtistId && !currentArtistAccess[viewingArtistId]){
    viewingArtistId = null; store.set('viewingArtistId', null);
  }
  renderLoggedUser();
  applyRoleUI();
  applyBrandLogo();
  renderArtistSwitcher();
  renderCalendar(); renderShowList(); renderArtistList(); renderTrackList(); renderSupplierList(); renderUsersList(); renderContactsList(); renderFinances();
}
function applyRoleUI(){
  const editable = canEdit();
  document.getElementById('newSupplierBtn').style.display = editable?'flex':'none';
  document.getElementById('newTrackBtn').style.display = canAddTracks()?'flex':'none';
  document.getElementById('newArtistBtn').style.display = isAdmin()?'flex':'none';
  document.getElementById('newUserBtn').style.display = isAdmin()?'inline-flex':'none';
  document.getElementById('fabNewShow').style.display = editable?'flex':'none';
  // Aba Equipe: só Admin ou Editor
  const navEquipe = document.getElementById('navEquipe');
  if(navEquipe) navEquipe.style.display = canSeeEquipe() ? 'flex' : 'none';
  // Botão do cofre no menu Outros: só quem tem acesso
  const vaultBtn = document.getElementById('vaultMenuBtn');
  if(vaultBtn) vaultBtn.style.display = canSeeVault() ? 'flex' : 'none';
}

/* ---------- BRAND LOGO ---------- */
function applyBrandLogo(){
  const img = document.getElementById('brandLogoImg');
  const ph = document.getElementById('brandLogoPh');
  if(brandLogo){ img.src = brandLogo; img.classList.remove('hidden'); ph.classList.add('hidden'); }
  else { img.classList.add('hidden'); ph.classList.remove('hidden'); }
}
document.getElementById('logoUploadTrigger').addEventListener('click', ()=>{
  if(!isAdmin()){ toast('Só o administrador pode trocar a logo.'); return; }
  document.getElementById('brandLogoFile').click();
});
document.getElementById('brandLogoFile').addEventListener('change', async (e)=>{
  const file = e.target.files[0]; if(!file) return;
  brandLogo = await fileToDataUrl(file);
  store.set('brandLogo', brandLogo);
  applyBrandLogo();
  toast('Logo atualizada.');
});

/* ---------- ARTIST SWITCHER ---------- */
function currentViewingArtist(){ return viewingArtistId ? artists.find(a=>a.id===viewingArtistId) : null; }
function renderArtistSwitcher(){
  const btn = document.getElementById('artistSwitchBtn');
  const a = currentViewingArtist();
  const accessibleArtists = (isAdmin() ? artists : artists.filter(ar=>canSeeArtist(ar.id))).filter(ar=>!ar.archived);
  btn.innerHTML = (a ? escapeHtml(a.name) : (!isAdmin() ? 'Meus artistas' : 'Todos os artistas')) + ' <span class="chev">▾</span>';
  const menu = document.getElementById('artistSwitchMenu');
  const allOpt = !isAdmin() ? '' : `<button data-id="">Todos os artistas</button>`;
  const opts = accessibleArtists.map(ar=>`<button data-id="${ar.id}">${ar.logo?`<img class="thumb-mini" src="${ar.logo}">`:''}${escapeHtml(ar.name)}</button>`).join('');
  menu.innerHTML = allOpt + opts || '<div class="empty-note" style="border:none;">Nenhum artista liberado.</div>';
  menu.querySelectorAll('button').forEach(b=>{
    b.addEventListener('click', ()=>{
      viewingArtistId = b.dataset.id || null;
      store.set('viewingArtistId', viewingArtistId);
      menu.classList.add('hidden');
      renderArtistSwitcher();
      renderCalendar(); renderShowList(); renderArtistList(); renderTrackList(); renderFinances();
    });
  });
}
document.getElementById('artistSwitchBtn').addEventListener('click', (e)=>{
  e.stopPropagation();
  document.getElementById('artistSwitchMenu').classList.toggle('hidden');
});
document.addEventListener('click', ()=> document.getElementById('artistSwitchMenu').classList.add('hidden'));
function filterByViewingArtist(list, artistKey){
  let out = list;
  if(!isAdmin()) out = out.filter(x=> canSeeArtist(x[artistKey]));
  if(viewingArtistId) out = out.filter(x=> x[artistKey]===viewingArtistId);
  return out;
}

/* ---------- VALUE MASK ---------- */
let revealedValues = {};
function valueMaskHtml(key, value, currency){
  const revealed = !!revealedValues[key];
  const admin = canEdit();
  const text = revealed ? fmtCurrency(value, currency) : '••••••';
  if(!admin){
    return `<span class="value-mask locked" title="Leitor não pode ver o valor">${text} <span class="eye">🔒</span></span>`;
  }
  return `<span class="value-mask" data-key="${key}" title="Toque para ${revealed?'ocultar':'ver'}">${text} <span class="eye">${revealed?'🙈':'👁'}</span></span>`;
}
function bindValueMasks(container){
  if(!container) return;
  container.querySelectorAll('.value-mask[data-key]').forEach(el=>{
    el.addEventListener('click', ()=>{
      const key = el.dataset.key;
      revealedValues[key] = !revealedValues[key];
      renderShowList(); renderStats();
    });
  });
}

/* ---------- NAV ---------- */
document.querySelectorAll('.navbtn').forEach(b=>{
  b.addEventListener('click', ()=>{
    document.querySelectorAll('.navbtn').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    document.getElementById('view-'+b.dataset.tab).classList.add('active');
    if(b.dataset.tab==='financas') renderFinances();
    if(b.dataset.tab==='eventos') renderShowList();
    if(b.dataset.tab==='outros'){ showOutrosMenu(); }
    document.querySelector('.wrap').scrollTop = 0;
    window.scrollTo(0,0);
  });
});

/* ---------- OUTROS (menu → sub-telas) ---------- */
function showOutrosMenu(){
  document.getElementById('outrosMenu').style.display = 'block';
  document.querySelectorAll('.outros-sub').forEach(s=> s.classList.remove('active'));
}
function openOutrosSub(sub){
  if(sub==='cofre' && !canSeeVault()){ toast('Você não tem acesso ao cofre de Artistas.'); return; }
  document.getElementById('outrosMenu').style.display = 'none';
  document.querySelectorAll('.outros-sub').forEach(s=> s.classList.toggle('active', s.id==='sub-'+sub));
  if(sub==='fornecedores') renderSupplierList();
  if(sub==='contatos') renderContactsList();
  if(sub==='cofre') openVault();
  window.scrollTo(0,0);
}
document.querySelectorAll('#outrosMenu .menu-btn').forEach(b=> b.addEventListener('click', ()=> openOutrosSub(b.dataset.sub)));
document.querySelectorAll('.outros-sub .back-btn').forEach(b=> b.addEventListener('click', showOutrosMenu));

/* ---------- AGENDA SUBNAV ---------- */
// Vai até uma aba da barra inferior pelo nome; para contratos, abre a sub-tela dentro de Outros
function goToTab(tab){
  if(tab==='contratos'){
    document.querySelector('.navbtn[data-tab="outros"]').click();
    openOutrosSub('contratos');
    return;
  }
  const btn = document.querySelector(`.navbtn[data-tab="${tab}"]`);
  if(btn) btn.click();
}

/* ---------- CALENDAR ---------- */
function populateArtistSelects(){
  const act = artists.filter(a=>!a.archived);
  const showArtists = isAdmin() ? act : act.filter(a=>canEditArtist(a.id));
  const trackArtists = isAdmin() ? act : act.filter(a=>canEditTracks(a.id));
  document.getElementById('f_artist').innerHTML = showArtists.map(a=>`<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');
  document.getElementById('t_artist').innerHTML = trackArtists.map(a=>`<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');
  document.getElementById('e_artist').innerHTML = showArtists.map(a=>`<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');
  const sellerList = sellers();
  document.getElementById('f_seller').innerHTML = '<option value="">— Nenhum / não informado —</option>' +
    sellerList.map(u=>`<option value="${u.id}">${escapeHtml(u.name)}${u.commission?` (${escapeHtml(u.commission)}%)`:''}</option>`).join('');
}

function renderCalendar(){
  document.getElementById('calDow').innerHTML = DOW.map(d=>`<div class="cal-dow">${d}</div>`).join('');
  const y=calDate.getFullYear(), m=calDate.getMonth();
  document.getElementById('calMonthLabel').textContent = `${MONTHS[m]} ${y}`;
  const firstDay = new Date(y,m,1).getDay();
  const daysInMonth = new Date(y,m+1,0).getDate();
  const todayStr = new Date().toISOString().slice(0,10);
  let html='';
  for(let i=0;i<firstDay;i++) html+='<div class="cal-day empty"></div>';
  for(let d=1; d<=daysInMonth; d++){
    const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayShows = filterByViewingArtist(shows, 'artistId').filter(s=>s.date===dateStr);
    html += `<div class="cal-day ${dateStr===todayStr?'today':''}" data-date="${dateStr}"><div class="num">${d}</div>${dayShows.map(s=>`<div class="show-dot dot-${s.status}">${escapeHtml(artistName(s.artistId))}</div>`).join('')}</div>`;
  }
  document.getElementById('calGrid').innerHTML = html;
  document.querySelectorAll('.cal-day[data-date]').forEach(day=> day.addEventListener('click', ()=> openShowModal(null, day.dataset.date)));
  renderStats();
}
document.getElementById('prevMonth').addEventListener('click', ()=>{ calDate.setMonth(calDate.getMonth()-1); renderCalendar(); });
document.getElementById('nextMonth').addEventListener('click', ()=>{ calDate.setMonth(calDate.getMonth()+1); renderCalendar(); });
document.getElementById('fabNewShow').addEventListener('click', ()=> openShowModal(null, null));

function renderStats(){
  const todayStr = new Date().toISOString().slice(0,10);
  const scopedShows = filterByViewingArtist(shows, 'artistId');
  const upcoming = scopedShows.filter(s=>s.date>=todayStr).length;
  const confirmed = scopedShows.filter(s=>s.status==='confirmado').length;
  const totals={EUR:0,USD:0,AOA:0};
  scopedShows.filter(s=>s.date>=todayStr).forEach(s=>{
    const n = parseFloat((s.value||'0').replace(/\./g,'').replace(',', '.'));
    if(!isNaN(n)) totals[s.currency||'EUR']+=n;
  });
  const totalsHtml = canEdit()
    ? (totals.EUR>0 ? valueMaskHtml('stat-total-eur', totals.EUR.toLocaleString('pt-PT',{maximumFractionDigits:0}), 'EUR') + '<br>' : '') +
      (totals.USD>0 ? valueMaskHtml('stat-total-usd', totals.USD.toLocaleString('pt-PT',{maximumFractionDigits:0}), 'USD') + '<br>' : '') +
      (totals.AOA>0 ? valueMaskHtml('stat-total-aoa', totals.AOA.toLocaleString('pt-PT',{maximumFractionDigits:0}), 'AOA') : '')
    : '<span class="value-mask locked">•••• 🔒</span>';
  document.getElementById('statsGrid').innerHTML = `
    <div class="stat"><div class="num">${upcoming}</div><div class="label">Futuros</div></div>
    <div class="stat"><div class="num">${confirmed}</div><div class="label">Confirmados</div></div>
    <div class="stat"><div class="num" style="font-size:12px;">${totalsHtml}</div><div class="label">Valores futuros</div></div>`;
  bindValueMasks(document.getElementById('statsGrid'));
}

function renderShowList(){
  const el = document.getElementById('showList');
  const admin = canEdit();
  const list = filterByViewingArtist([...shows], 'artistId').sort((a,b)=>a.date.localeCompare(b.date));
  if(list.length===0){ el.innerHTML='<div class="empty-note">Nenhum evento.</div>'; return; }
  el.innerHTML = list.map(s=>{
    const [y,m,d]=s.date.split('-');
    const cl = s.checklist||[];
    const done = cl.filter(i=>i.done).length;
    return `<div class="list-row">
      <div class="thumb">${escapeHtml((artistName(s.artistId)[0]||'?').toUpperCase())}</div>
      <div class="body">
        <div class="title-line">${escapeHtml(artistName(s.artistId))} <span class="badge ${s.status}">${STATUS_LABELS[s.status]}</span> ${s.eventType?`<span class="badge tipo">${escapeHtml(s.eventType)}</span>`:''}</div>
        <div class="meta">${d}/${m}/${y} ${s.time||''} — ${escapeHtml(s.venue||'')}${s.city?', '+escapeHtml(s.city):''}</div>
        <div class="meta">${valueMaskHtml('show-'+s.id, s.value, s.currency||'EUR')}${cl.length?` · ☑ ${done}/${cl.length}`:''}${s.sellerId?` · 💼 ${escapeHtml(sellerName(s.sellerId))}`:''}</div>
      </div>
      <div class="actions"><button class="edit" data-id="${s.id}">${admin?'editar':'ver'}</button><button class="contract" data-id="${s.id}">contrato</button>${admin?`<button class="del delshow" data-id="${s.id}">🗑 excluir</button>`:''}</div>
    </div>`;
  }).join('');
  el.querySelectorAll('.edit').forEach(b=>b.addEventListener('click', ()=>openShowModal(b.dataset.id)));
  el.querySelectorAll('.contract').forEach(b=>b.addEventListener('click', ()=>{
    const s = shows.find(x=>x.id===b.dataset.id);
    if(s){ showContract(s); goToTab('contratos'); }
  }));
  el.querySelectorAll('.delshow').forEach(b=>b.addEventListener('click', ()=>{
    const s = shows.find(x=>x.id===b.dataset.id);
    if(!s) return;
    const [y,m,d]=s.date.split('-');
    if(!confirm(`Excluir o evento de ${artistName(s.artistId)} em ${d}/${m}/${y} (${s.venue||'sem local'})?\n\nEsta ação não pode ser desfeita.`)) return;
    shows = shows.filter(x=> x.id !== b.dataset.id);
    store.set('shows', shows);
    renderCalendar(); renderShowList(); renderFinances(); renderContactsList();
    toast('Evento excluído.');
  }));
  bindValueMasks(el);
}

/* ---- checklist dentro do modal de evento ---- */
function renderChecklist(){
  const admin = canEdit();
  const el = document.getElementById('checklistItems');
  el.innerHTML = modalChecklist.map((item,i)=>`
    <div class="checklist-row" style="flex-wrap:wrap;">
      <input type="checkbox" data-i="${i}" ${item.done?'checked':''} ${admin?'':'disabled'}>
      <span class="txt ${item.done?'done':''}">${escapeHtml(item.text)}</span>
      <button data-i="${i}" class="toggledet" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:11px;font-weight:600;">${item.details?'📝':'+ info'}</button>
      ${admin ? `<button data-i="${i}" class="rmci" style="background:none;border:none;color:var(--danger);cursor:pointer;">×</button>` : ''}
      <textarea data-i="${i}" class="detfield" rows="2" placeholder="Detalhes (ex: nomes da equipe, lista de convidados...)" style="width:100%;margin-top:6px;font-size:12px;display:${item._open||item.details?'block':'none'};" ${admin?'':'disabled'}>${escapeHtml(item.details||'')}</textarea>
    </div>`).join('');
  el.querySelectorAll('input[type=checkbox]').forEach(cb=> cb.addEventListener('change', ()=>{ modalChecklist[cb.dataset.i].done = cb.checked; renderChecklist(); }));
  el.querySelectorAll('.rmci').forEach(b=> b.addEventListener('click', ()=>{ modalChecklist.splice(b.dataset.i,1); renderChecklist(); }));
  el.querySelectorAll('.toggledet').forEach(b=> b.addEventListener('click', ()=>{
    modalChecklist[b.dataset.i]._open = !modalChecklist[b.dataset.i]._open;
    renderChecklist();
  }));
  el.querySelectorAll('.detfield').forEach(t=> t.addEventListener('input', ()=>{ modalChecklist[t.dataset.i].details = t.value; }));
}
document.getElementById('addChecklistItemBtn').addEventListener('click', ()=>{
  const input = document.getElementById('newChecklistItem');
  const text = input.value.trim();
  if(!text) return;
  modalChecklist.push({text, done:false});
  input.value=''; renderChecklist();
});

/* ---- pagamento parcelado ---- */
let modalPayments = [];
let pendingReceiptIndex = null;
function parseNum(v){ const n = parseFloat((v||'0').toString().replace(/\./g,'').replace(',', '.')); return isNaN(n)?0:n; }
function renderPayments(){
  const admin = canEdit();
  const total = parseNum(document.getElementById('f_value').value);
  const paid = modalPayments.reduce((sum,p)=>sum+parseNum(p.value),0);
  const pct = total>0 ? Math.round((paid/total)*100) : 0;
  const color = paid>total ? 'var(--danger)' : (paid===total && total>0 ? 'var(--success)' : 'var(--warning)');
  document.getElementById('paymentSummary').innerHTML = `<span style="color:${color};font-weight:700;">${fmtCurrency(paid.toFixed(2).replace('.',','), document.getElementById('f_currency').value)} pago</span> de ${fmtCurrency(total.toFixed(2).replace('.',','), document.getElementById('f_currency').value)} — ${pct}%${paid>total?' (parcelas somam mais!)':''}`;
  const el = document.getElementById('paymentsList');
  if(modalPayments.length===0){ el.innerHTML = admin ? '' : '<div class="empty-note">Nenhuma parcela registrada.</div>'; }
  else {
    el.innerHTML = modalPayments.map((p,i)=>{
      const [y,m,d] = (p.date||'').split('-');
      const ppct = total>0 ? Math.round((parseNum(p.value)/total)*100) : 0;
      return `<div class="payment-row">
        <span class="pdate">${d?`${d}/${m}/${y}`:'—'}</span>
        <span class="pvalue">${fmtCurrency(p.value, document.getElementById('f_currency').value)}</span>
        <span class="ppct">${ppct}%</span>
        ${p.receipt ? `<a href="${p.receipt}" target="_blank" class="receipt-chip">📎</a>` : (admin?`<button class="receipt-btn" data-i="${i}">+ recibo</button>`:'')}
        ${admin ? `<button class="rmpay" data-i="${i}">×</button>` : ''}
      </div>`;
    }).join('');
    el.querySelectorAll('.rmpay').forEach(b=> b.addEventListener('click', ()=>{ modalPayments.splice(b.dataset.i,1); renderPayments(); }));
    el.querySelectorAll('.receipt-btn').forEach(b=> b.addEventListener('click', ()=>{
      pendingReceiptIndex = Number(b.dataset.i);
      document.getElementById('receiptFileInput').click();
    }));
  }
}
document.getElementById('receiptFileInput').addEventListener('change', async (e)=>{
  const file = e.target.files[0]; if(!file || pendingReceiptIndex===null) return;
  modalPayments[pendingReceiptIndex].receipt = await fileToDataUrl(file);
  pendingReceiptIndex = null;
  renderPayments();
  toast('Comprovativo anexado.');
  e.target.value = '';
});
document.getElementById('hirerDocBtn').addEventListener('click', ()=> document.getElementById('hirerDocFile').click());
document.getElementById('hirerDocFile').addEventListener('change', async (e)=>{
  const file = e.target.files[0]; if(!file) return;
  modalHirerDoc = await fileToDataUrl(file);
  const prev = document.getElementById('hirerDocPreview');
  prev.src = modalHirerDoc; prev.style.display = 'block';
  toast('Foto do documento anexada.');
  e.target.value = '';
});
document.getElementById('addPaymentBtn').addEventListener('click', ()=>{
  const date = document.getElementById('np_date').value;
  const value = document.getElementById('np_value').value.trim();
  if(!date || !value){ toast('Preencha data e valor da parcela.'); return; }
  modalPayments.push({date, value, receipt:null});
  document.getElementById('np_date').value=''; document.getElementById('np_value').value='';
  renderPayments();
});
document.getElementById('f_value').addEventListener('input', renderPayments);
document.getElementById('f_currency').addEventListener('change', renderPayments);

function openShowModal(showId, dateStr){
  editingShowId = showId;
  const existing = showId ? shows.find(s=>s.id===showId) : null;
  const admin = existing ? canEditArtist(existing.artistId) : canEdit();
  populateArtistSelects();
  const firstEditable = isAdmin() ? artists[0] : artists.find(a=>canEditArtist(a.id));
  if(!existing && !firstEditable){ toast('Você não tem permissão de editor em nenhum artista.'); return; }
  document.getElementById('showModalTitle').textContent = existing ? (admin?'Editar evento':'Detalhes do evento') : 'Novo evento';
  if(existing && ![...document.getElementById('f_artist').options].some(o=>o.value===existing.artistId)){
    document.getElementById('f_artist').insertAdjacentHTML('beforeend', `<option value="${existing.artistId}">${escapeHtml(artistName(existing.artistId))}</option>`);
  }
  document.getElementById('f_artist').value = existing ? existing.artistId : firstEditable.id;
  document.getElementById('f_eventtype').value = existing ? (existing.eventType||'Show musical') : 'Show musical';
  document.getElementById('f_date').value = existing ? existing.date : (dateStr||'');
  document.getElementById('f_time').value = existing ? existing.time||'' : '';
  document.getElementById('f_arrival').value = existing ? existing.arrival||'' : '';
  document.getElementById('f_soundcheck').value = existing ? existing.soundcheck||'' : '';
  document.getElementById('f_venue').value = existing ? existing.venue||'' : '';
  document.getElementById('f_city').value = existing ? existing.city||'' : '';
  document.getElementById('f_venue_ig').value = existing ? existing.venueIg||'' : '';
  document.getElementById('f_venue_fb').value = existing ? existing.venueFb||'' : '';
  document.getElementById('f_currency').value = existing ? existing.currency||'EUR' : 'EUR';
  document.getElementById('f_value').value = existing ? existing.value||'' : '';
  document.getElementById('f_status').value = existing ? existing.status : 'reserva';
  if(existing && existing.sellerId && ![...document.getElementById('f_seller').options].some(o=>o.value===existing.sellerId)){
    document.getElementById('f_seller').insertAdjacentHTML('beforeend', `<option value="${existing.sellerId}">${escapeHtml(sellerName(existing.sellerId)||'(removido)')}</option>`);
  }
  document.getElementById('f_seller').value = existing ? (existing.sellerId||'') : '';
  document.getElementById('f_hirer_name').value = existing ? existing.hirerName||'' : '';
  document.getElementById('f_hirer_rep').value = existing ? existing.hirerRep||'' : '';
  document.getElementById('f_hirer_civil').value = existing ? existing.hirerCivil||'' : '';
  document.getElementById('f_hirer_birth').value = existing ? existing.hirerBirth||'' : '';
  document.getElementById('f_hirer_doctype').value = existing ? existing.hirerDocType||'BI' : 'BI';
  document.getElementById('f_hirer_docnum').value = existing ? existing.hirerDocNum||'' : '';
  modalHirerDoc = existing ? existing.hirerDocPhoto||'' : '';
  const docPrev = document.getElementById('hirerDocPreview');
  docPrev.src = modalHirerDoc || '';
  docPrev.style.display = modalHirerDoc ? 'block' : 'none';
  document.getElementById('f_hirer_company_addr').value = existing ? existing.hirerCompanyAddr||'' : '';
  document.getElementById('f_hirer_addr').value = existing ? existing.hirerAddr||'' : '';
  document.getElementById('f_hirer_ig').value = existing ? existing.hirerIg||'' : '';
  document.getElementById('f_hirer_fb').value = existing ? existing.hirerFb||'' : '';
  document.getElementById('f_hirer_phone1').value = existing ? existing.hirerPhone1||'' : '';
  document.getElementById('f_hirer_phone2').value = existing ? existing.hirerPhone2||'' : '';
  document.getElementById('f_hirer_email1').value = existing ? existing.hirerEmail1||'' : '';
  document.getElementById('f_hirer_email2').value = existing ? existing.hirerEmail2||'' : '';
  document.getElementById('f_notes').value = existing ? existing.notes||'' : '';
  modalChecklist = existing && existing.checklist ? JSON.parse(JSON.stringify(existing.checklist)) : CHECKLIST_DEFAULTS.map(t=>({text:t, done:false}));
  modalPayments = existing && existing.payments ? JSON.parse(JSON.stringify(existing.payments)) : [];
  renderChecklist();
  renderPayments();

  [...document.querySelectorAll('#showModalBg input, #showModalBg select, #showModalBg textarea')].forEach(f=>{ if(f.id!=='newChecklistItem' && f.id!=='np_date' && f.id!=='np_value') f.disabled = !admin; });
  document.getElementById('saveShowBtn').style.display = admin?'inline-flex':'none';
  document.getElementById('deleteShowBtn').style.display = (admin && existing)?'inline-flex':'none';
  document.getElementById('addChecklistItemBtn').style.display = admin?'inline-flex':'none';
  document.getElementById('newChecklistItem').style.display = admin?'block':'none';
  document.getElementById('addPaymentBtn').style.display = admin?'inline-flex':'none';
  document.querySelectorAll('#np_date,#np_value').forEach(f=> f.style.display = admin?'block':'none');

  document.getElementById('showModalBg').classList.add('open');
}
document.getElementById('cancelShowModal').addEventListener('click', ()=>document.getElementById('showModalBg').classList.remove('open'));
document.getElementById('deleteShowBtn').addEventListener('click', ()=>{
  if(!editingShowId || !confirm('Tem certeza que quer excluir este evento?')) return;
  shows = shows.filter(s=> s.id !== editingShowId);
  store.set('shows', shows);
  document.getElementById('showModalBg').classList.remove('open');
  renderCalendar(); renderShowList(); renderFinances(); renderContactsList();
  toast('Evento excluído.');
});
document.getElementById('saveShowBtn').addEventListener('click', ()=>{
  if(!canEdit()) return;
  const artistId = document.getElementById('f_artist').value;
  const date = document.getElementById('f_date').value;
  if(!artistId||!date){ toast('Selecione artista e data.'); return; }
  const data = {
    artistId, date, eventType: document.getElementById('f_eventtype').value, time:document.getElementById('f_time').value,
    arrival: document.getElementById('f_arrival').value, soundcheck: document.getElementById('f_soundcheck').value,
    venue:document.getElementById('f_venue').value.trim(), city:document.getElementById('f_city').value.trim(),
    venueIg:document.getElementById('f_venue_ig').value.trim(), venueFb:document.getElementById('f_venue_fb').value.trim(),
    currency:document.getElementById('f_currency').value, value:document.getElementById('f_value').value.trim(),
    status:document.getElementById('f_status').value,
    sellerId:document.getElementById('f_seller').value,
    hirerName:document.getElementById('f_hirer_name').value.trim(),
    hirerRep:document.getElementById('f_hirer_rep').value.trim(),
    hirerCivil:document.getElementById('f_hirer_civil').value,
    hirerBirth:document.getElementById('f_hirer_birth').value,
    hirerDocType:document.getElementById('f_hirer_doctype').value,
    hirerDocNum:document.getElementById('f_hirer_docnum').value.trim(),
    hirerDocPhoto: modalHirerDoc,
    hirerCompanyAddr:document.getElementById('f_hirer_company_addr').value.trim(),
    hirerAddr:document.getElementById('f_hirer_addr').value.trim(),
    hirerIg:document.getElementById('f_hirer_ig').value.trim(),
    hirerFb:document.getElementById('f_hirer_fb').value.trim(),
    hirerPhone1:document.getElementById('f_hirer_phone1').value.trim(),
    hirerPhone2:document.getElementById('f_hirer_phone2').value.trim(),
    hirerEmail1:document.getElementById('f_hirer_email1').value.trim(),
    hirerEmail2:document.getElementById('f_hirer_email2').value.trim(),
    notes:document.getElementById('f_notes').value.trim(),
    checklist: modalChecklist.map(({text,done,details})=>({text,done,details:details||''})),
    payments: modalPayments,
  };
  let saved;
  if(editingShowId){ shows = shows.map(s=> s.id===editingShowId ? {...s,...data} : s); saved = shows.find(s=>s.id===editingShowId); }
  else { saved = {id:uid(), ...data}; shows.push(saved); }
  store.set('shows', shows);
  document.getElementById('showModalBg').classList.remove('open');
  renderCalendar(); renderShowList(); showContract(saved); goToTab('contratos'); renderFinances(); renderContactsList();
});

/* ---------- CONTRACT + ONLINE SIGNATURE ---------- */
function buildContractText(s){
  const [y,m,d] = s.date.split('-');
  const payments = s.payments||[];
  const paymentLines = payments.length
    ? payments.map((p,i)=>{
        const [py,pm,pd] = (p.date||'').split('-');
        const pct = parseNum(s.value)>0 ? Math.round((parseNum(p.value)/parseNum(s.value))*100) : 0;
        return `  Parcela ${i+1} — ${pd}/${pm}/${py} — ${fmtCurrency(p.value, s.currency||'EUR')} (${pct}% do cachê)`;
      }).join('\n')
    : '  Nenhuma parcela registrada ainda.';
  const cl = s.checklist||[];
  const clWithInfo = cl.filter(i=> i.done || (i.details&&i.details.trim()));
  const productionLines = clWithInfo.length
    ? clWithInfo.map(i=> `  [${i.done?'x':' '}] ${i.text}${i.details&&i.details.trim() ? `\n      ${i.details.trim().replace(/\n/g,'\n      ')}` : ''}`).join('\n')
    : '  —';
  return `CONTRATO DE PRESTAÇÃO DE SERVIÇOS — ${(s.eventType||'EVENTO').toUpperCase()}
=================================================
CONTRATADO: Egrégora
ARTISTA/ATRAÇÃO: ${artistName(s.artistId)}

LOCAL DO EVENTO: ${s.venue||'[local]'} — ${s.city||'[cidade]'}
Instagram: ${s.venueIg||'—'}   Facebook: ${s.venueFb||'—'}

CONTRATANTE
Empresa: ${s.hirerName||'[empresa]'}
Morada: ${s.hirerCompanyAddr||'[morada da empresa]'}
Responsável: ${s.hirerRep||'[responsável]'}
Estado civil: ${s.hirerCivil||'—'}   Data de nascimento: ${s.hirerBirth ? s.hirerBirth.split('-').reverse().join('/') : '—'}
Documento: ${s.hirerDocType||'—'} nº ${s.hirerDocNum||'[número]'}
Morada física: ${s.hirerAddr||'[morada]'}
Instagram: ${s.hirerIg||'—'}   Facebook: ${s.hirerFb||'—'}
Telefone 1: ${s.hirerPhone1||'—'}   Telefone 2: ${s.hirerPhone2||'—'}
E-mail 1: ${s.hirerEmail1||'—'}   E-mail 2: ${s.hirerEmail2||'—'}

Data: ${d}/${m}/${y}   Hora do show: ${s.time||'[a definir]'}
Chegada: ${s.arrival||'—'}   Soundcheck: ${s.soundcheck||'—'}
Valor total do cachê: ${fmtCurrency(s.value, s.currency||'EUR')}
Vendedor responsável: ${s.sellerId ? sellerName(s.sellerId) : '—'}

PAGAMENTO (parcelas):
${paymentLines}

PRODUÇÃO / LOGÍSTICA (checklist):
${productionLines}

Observações: ${s.notes||'—'}

As partes concordam com os termos acima.`;
}
function showContract(s){
  const text = buildContractText(s);
  const area = document.getElementById('contractArea');
  area.innerHTML = `
    <div class="contract-box">${escapeHtml(text)}</div>
    <div class="contract-actions">
      <button class="btn small" id="copyContract">Copiar</button>
      <button class="btn small whatsapp" id="shareWhatsapp">WhatsApp</button>
      <button class="btn small secondary" id="signOnlineBtn">✍️ Assinar</button>
      <button class="btn small ghost" id="genSignLinkBtn">🔗 Link</button>
    </div>
    <div id="signedInfo"></div>`;
  renderSignedInfo(s);
  document.getElementById('copyContract').addEventListener('click', ()=> navigator.clipboard.writeText(text).then(()=>toast('Copiado!')));
  document.getElementById('shareWhatsapp').addEventListener('click', ()=> window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,'_blank'));
  document.getElementById('signOnlineBtn').addEventListener('click', ()=> openSigModal({type:'show', id:s.id}, text));
  document.getElementById('genSignLinkBtn').addEventListener('click', ()=>{
    const link = buildSignUrl({sign:'show', id:s.id});
    const msg = `Olá! Link para assinar o contrato do evento:\n${link}`;
    navigator.clipboard.writeText(link).then(()=> toast('Link copiado!'));
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,'_blank');
  });
}
function renderSignedInfo(s){
  const el = document.getElementById('signedInfo');
  if(!el) return;
  el.innerHTML = s.signature ? `<div class="signed-box">
      <div class="who">✅ Assinado digitalmente por ${escapeHtml(s.signature.name)}</div>
      <div class="when">${new Date(s.signature.at).toLocaleString('pt-BR')}</div>
      <img src="${s.signature.dataUrl}"></div>` : '';
}
let sigCtx, sigDrawing=false, sigActiveCanvasId='sigCanvas';
function setupCanvas(canvasId){
  sigActiveCanvasId = canvasId || 'sigCanvas';
  const canvas = document.getElementById(sigActiveCanvasId);
  const ratio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * ratio; canvas.height = canvas.clientHeight * ratio;
  sigCtx = canvas.getContext('2d'); sigCtx.scale(ratio, ratio);
  sigCtx.lineWidth = 2.2; sigCtx.lineCap = 'round'; sigCtx.strokeStyle = '#101114';
}
function pos(e, canvas){ const rect=canvas.getBoundingClientRect(); const p=e.touches?e.touches[0]:e; return {x:p.clientX-rect.left,y:p.clientY-rect.top}; }
function bindCanvasEvents(canvasId){
  const canvas = document.getElementById(canvasId || sigActiveCanvasId);
  const start=(e)=>{ sigDrawing=true; const p=pos(e,canvas); sigCtx.beginPath(); sigCtx.moveTo(p.x,p.y); e.preventDefault(); };
  const move=(e)=>{ if(!sigDrawing) return; const p=pos(e,canvas); sigCtx.lineTo(p.x,p.y); sigCtx.stroke(); e.preventDefault(); };
  const end=()=>{ sigDrawing=false; };
  canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', move); window.addEventListener('mouseup', end);
  canvas.addEventListener('touchstart', start, {passive:false}); canvas.addEventListener('touchmove', move, {passive:false}); canvas.addEventListener('touchend', end);
}
function openSigModal(target, contractText){
  sigTarget = target;
  document.getElementById('sigContractPreview').textContent = contractText;
  document.getElementById('sig_name').value = '';
  document.getElementById('sigModalBg').classList.add('open');
  setTimeout(()=>{ setupCanvas('sigCanvas'); bindCanvasEvents('sigCanvas'); }, 50);
}
document.getElementById('cancelSigModal').addEventListener('click', ()=> document.getElementById('sigModalBg').classList.remove('open'));
document.getElementById('clearSigBtn').addEventListener('click', ()=>{ const c=document.getElementById('sigCanvas'); sigCtx.clearRect(0,0,c.width,c.height); });
document.getElementById('confirmSigBtn').addEventListener('click', ()=>{
  const name = document.getElementById('sig_name').value.trim();
  if(!name){ toast('Digite o nome de quem está assinando.'); return; }
  const dataUrl = document.getElementById('sigCanvas').toDataURL('image/png');
  const signature = {name, dataUrl, at:new Date().toISOString()};
  if(sigTarget.type==='show'){
    shows = shows.map(s=> s.id===sigTarget.id ? {...s, signature} : s);
    store.set('shows', shows);
    showContract(shows.find(x=>x.id===sigTarget.id));
  } else if(sigTarget.type==='contrib'){
    const t = tracks.find(x=>x.id===sigTarget.id);
    t.contributors[sigTarget.contribIndex].status='assinado';
    t.contributors[sigTarget.contribIndex].signature=signature;
    store.set('tracks', tracks);
    renderTrackList();
    if(document.getElementById('trackModalBg').classList.contains('open')) renderContributors();
  }
  document.getElementById('sigModalBg').classList.remove('open');
  toast('Assinado com sucesso!');
});

/* ---------- ARTISTAS / PRESS KIT + CONTRATOS ---------- */
let showArchivedArtists = false;
let showArchivedTracks = false;
document.getElementById('toggleArchivedArtists').addEventListener('click', ()=>{
  showArchivedArtists = !showArchivedArtists;
  document.getElementById('toggleArchivedArtists').textContent = showArchivedArtists ? '👁 ocultar desativados' : '🙈 ver desativados';
  renderArtistList();
});
document.getElementById('toggleArchivedTracks').addEventListener('click', ()=>{
  showArchivedTracks = !showArchivedTracks;
  document.getElementById('toggleArchivedTracks').textContent = showArchivedTracks ? '👁 ocultar desativadas' : '🙈 ver desativadas';
  renderTrackList();
});
function renderArtistList(){
  const el = document.getElementById('artistList');
  let list = filterByViewingArtist(artists, 'id');
  const archivedCount = list.filter(a=>a.archived).length;
  if(!showArchivedArtists) list = list.filter(a=>!a.archived);
  document.getElementById('toggleArchivedArtists').style.display = (archivedCount>0 || showArchivedArtists) ? 'inline-flex' : 'none';
  if(list.length===0){ el.innerHTML='<div class="empty-note">Nenhum artista.</div>'; return; }
  el.innerHTML = list.map(a=>`
    <div class="artist-card ${a.archived?'archived-item':''}" data-id="${a.id}">
      ${a.logo ? `<img class="logo" src="${a.logo}">` : `<div class="logo">${escapeHtml((a.name[0]||'?').toUpperCase())}</div>`}
      <div class="info">
        <div class="name">${escapeHtml(a.name)} ${a.archived?'<span class="badge desativado">Desativado</span>':''}</div>
        <div class="sub">${a.cache?fmtCurrency(a.cache,a.currency||'EUR'):'sem cachê padrão'}</div>
        <div class="social-row">
          ${a.instagram?`<span class="social-chip">IG ${escapeHtml(a.instagram)}</span>`:''}
          ${a.tiktok?`<span class="social-chip">TikTok ${escapeHtml(a.tiktok)}</span>`:''}
          ${a.spotify?`<span class="social-chip">Spotify</span>`:''}
          ${a.rider?`<span class="social-chip">📄 rider</span>`:''}
          ${(a.photos&&a.photos.length)?`<span class="social-chip">📷 ${a.photos.length}</span>`:''}
          ${(a.contracts&&a.contracts.length)?`<span class="social-chip">📋 ${a.contracts.length}</span>`:''}
        </div>
      </div>
    </div>`).join('');
  el.querySelectorAll('.artist-card').forEach(c=> c.addEventListener('click', ()=> openArtistModal(c.dataset.id)));
}
function renderPhotoGrid(){ document.getElementById('a_photosGrid').innerHTML = modalPhotos.map((url,i)=>`
  <div class="ph">
    <img src="${url}">
    <button class="rmph" data-i="${i}">×</button>
  </div>`).join('');
  document.getElementById('a_photosGrid').querySelectorAll('.rmph').forEach(b=> b.addEventListener('click', (e)=>{ e.stopPropagation(); modalPhotos.splice(b.dataset.i,1); renderPhotoGrid(); }));
}
function renderFilesList(){
  const admin = canEdit();
  document.getElementById('a_filesList').innerHTML = modalFiles.map((f,i)=>`
    <div class="rider-chip" style="justify-content:space-between;">
      <a href="${f.url}" download="${escapeHtml(f.name)}" target="_blank" style="color:inherit;text-decoration:none;">📎 ${escapeHtml(f.name)}</a>
      <span>
        ${admin ? `<button data-i="${i}" class="rmfile" style="background:none;border:none;color:var(--danger);cursor:pointer;margin-left:8px;">×</button>` : ''}
      </span>
    </div>`).join('');
  document.getElementById('a_filesList').querySelectorAll('.rmfile').forEach(b=> b.addEventListener('click', ()=>{ modalFiles.splice(b.dataset.i,1); renderFilesList(); }));
}
function renderContractsList(){
  const admin = canEdit();
  document.getElementById('a_contractsList').innerHTML = modalContracts.map((c,i)=>`
    <div class="rider-chip" style="justify-content:space-between;">
      <a href="${c.url}" download="${escapeHtml(c.name)}" target="_blank" style="color:inherit;text-decoration:none;">📋 ${escapeHtml(c.name)}</a>
      <span>
        ${admin ? `<button data-i="${i}" class="rmctr" style="background:none;border:none;color:var(--danger);cursor:pointer;margin-left:8px;">×</button>` : ''}
      </span>
    </div>`).join('');
  document.getElementById('a_contractsList').querySelectorAll('.rmctr').forEach(b=> b.addEventListener('click', ()=>{ modalContracts.splice(b.dataset.i,1); renderContractsList(); }));
}
function renderPkSelection(){
  const items = [];
  if(modalLogo) items.push({key:'logo', name:'Logo', checked:modalPkSelection.logo||false});
  if(modalRider) items.push({key:'rider', name:'Rider Técnico (PDF)', checked:modalPkSelection.rider||false});
  if(modalPhotos.length) items.push({key:'photos', name:`Fotos (${modalPhotos.length})`, checked:modalPkSelection.photos||false});
  if(modalFiles.length) items.push({key:'files', name:`Arquivos (${modalFiles.length})`, checked:modalPkSelection.files||false});
  if(modalContracts.length) items.push({key:'contracts', name:`Contratos (${modalContracts.length})`, checked:modalPkSelection.contracts||false});
  const el = document.getElementById('pkSelectList');
  if(items.length===0){ el.innerHTML='<p style="font-size:11px;color:var(--muted);">Adicione arquivo para poder enviar.</p>'; return; }
  el.innerHTML = items.map(it=>`
    <div class="pk-select-row">
      <input type="checkbox" data-key="${it.key}" ${it.checked?'checked':''}>
      <span class="pkname">${escapeHtml(it.name)}</span>
    </div>`).join('');
  el.querySelectorAll('input').forEach(cb=> cb.addEventListener('change', ()=> modalPkSelection[cb.dataset.key] = cb.checked));
}
function openArtistModal(artistId){
  editingArtistId = artistId;
  const existing = artistId ? artists.find(a=>a.id===artistId) : null;
  const admin = existing ? canEditArtist(existing.id) : isAdmin();
  document.getElementById('artistModalTitle').textContent = existing ? (admin?'Editar artista':'Perfil / press kit') : 'Novo artista';
  document.getElementById('artistLogoPreview').src = existing?.logo || '';
  modalLogo = existing?.logo || '';
  modalRider = existing?.rider || '';
  document.getElementById('a_riderChip').innerHTML = modalRider ? `<span class="rider-chip">📄 rider</span>` : '';
  document.getElementById('a_name').value = existing?.name || '';
  document.getElementById('a_currency').value = existing?.currency || 'EUR';
  document.getElementById('a_cache').value = existing?.cache || '';
  document.getElementById('a_instagram').value = existing?.instagram || '';
  document.getElementById('a_tiktok').value = existing?.tiktok || '';
  document.getElementById('a_facebook').value = existing?.facebook || '';
  document.getElementById('a_youtube').value = existing?.youtube || '';
  document.getElementById('a_spotify').value = existing?.spotify || '';
  document.getElementById('a_bio').value = existing?.bio || '';
  modalPhotos = existing?.photos ? [...existing.photos] : [];
  modalFiles = existing?.files ? JSON.parse(JSON.stringify(existing.files)) : [];
  modalContracts = existing?.contracts ? JSON.parse(JSON.stringify(existing.contracts)) : [];
  modalPkSelection = {};
  renderPhotoGrid();
  renderFilesList();
  renderContractsList();
  renderPkSelection();
  [...document.querySelectorAll('#artistModalBg input, #artistModalBg select, #artistModalBg textarea')].forEach(f=> f.disabled = !admin);
  document.querySelectorAll('#a_riderBtn,#a_photosBtn,#artistLogoBtn,#a_filesBtn,#a_contractsBtn').forEach(b=> b.style.display = admin?'inline-flex':'none');
  document.getElementById('saveArtistBtn').style.display = admin?'inline-flex':'none';
  const archBtn = document.getElementById('archiveArtistBtn');
  const delBtn = document.getElementById('deleteArtistBtn');
  archBtn.style.display = (existing && isAdmin()) ? 'inline-flex' : 'none';
  delBtn.style.display = (existing && isAdmin()) ? 'inline-flex' : 'none';
  archBtn.textContent = existing?.archived ? '👁 Reativar' : '🙈 Desativar';
  document.getElementById('artistModalBg').classList.add('open');
}
document.getElementById('artistLogoBtn').addEventListener('click', ()=>document.getElementById('artistLogoFile').click());
document.getElementById('artistLogoFile').addEventListener('change', async (e)=>{
  const file = e.target.files[0]; if(!file) return;
  modalLogo = await fileToDataUrl(file);
  document.getElementById('artistLogoPreview').src = modalLogo;
});
document.getElementById('a_riderBtn').addEventListener('click', ()=>document.getElementById('a_riderFile').click());
document.getElementById('a_riderFile').addEventListener('change', async (e)=>{
  const file = e.target.files[0]; if(!file) return;
  modalRider = await fileToDataUrl(file);
  document.getElementById('a_riderChip').innerHTML = `<span class="rider-chip">📄 ${escapeHtml(file.name)}</span>`;
  renderPkSelection();
});
document.getElementById('a_photosBtn').addEventListener('click', ()=>document.getElementById('a_photosFile').click());
document.getElementById('a_photosFile').addEventListener('change', async (e)=>{
  for(const file of [...e.target.files]){ modalPhotos.push(await fileToDataUrl(file)); }
  renderPhotoGrid();
  renderPkSelection();
});
document.getElementById('a_filesBtn').addEventListener('click', ()=>document.getElementById('a_filesFile').click());
document.getElementById('a_filesFile').addEventListener('change', async (e)=>{
  for(const file of [...e.target.files]){ modalFiles.push({name:file.name, url: await fileToDataUrl(file)}); }
  renderFilesList();
  renderPkSelection();
});
document.getElementById('a_contractsBtn').addEventListener('click', ()=>document.getElementById('a_contractsFile').click());
document.getElementById('a_contractsFile').addEventListener('change', async (e)=>{
  for(const file of [...e.target.files]){ modalContracts.push({name:file.name, url: await fileToDataUrl(file)}); }
  renderContractsList();
  renderPkSelection();
});

function collectPressKitItems(){
  const artistName = document.getElementById('a_name').value || 'Artista';
  const items = [];
  if(modalLogo && modalPkSelection.logo) items.push({dataUrl:modalLogo, name:`logo-${artistName}.png`});
  if(modalRider && modalPkSelection.rider) items.push({dataUrl:modalRider, name:`rider-${artistName}.pdf`});
  if(modalPkSelection.photos) modalPhotos.forEach((url,i)=> items.push({dataUrl:url, name:`foto-${artistName}-${i+1}.jpg`}));
  if(modalPkSelection.files) modalFiles.forEach(f=> items.push({dataUrl:f.url, name:f.name}));
  if(modalPkSelection.contracts) modalContracts.forEach(c=> items.push({dataUrl:c.url, name:c.name}));
  return items;
}
document.getElementById('pkWhatsappBtn').addEventListener('click', ()=>{
  const artistName = document.getElementById('a_name').value || 'Artista';
  const items = collectPressKitItems();
  if(items.length===0){ toast('Marque pelo menos um item para enviar.'); return; }
  const text = `Press kit de ${artistName}`;
  shareFiles(items, text);
});
document.getElementById('pkEmailBtn').addEventListener('click', ()=>{
  const artistName = document.getElementById('a_name').value || 'Artista';
  const items = collectPressKitItems();
  if(items.length===0){ toast('Marque pelo menos um item para enviar.'); return; }
  emailWithFiles(items, `Press kit — ${artistName}`, `Segue o press kit de ${artistName}.\n\n— Egrégora`);
});
document.getElementById('pkShareBtn').addEventListener('click', ()=>{
  const artistName = document.getElementById('a_name').value || 'Artista';
  const items = collectPressKitItems();
  if(items.length===0){ toast('Marque pelo menos um item para enviar.'); return; }
  shareFiles(items, `Press kit — ${artistName}`);
});
document.getElementById('cancelArtistModal').addEventListener('click', ()=>document.getElementById('artistModalBg').classList.remove('open'));
document.getElementById('saveArtistBtn').addEventListener('click', ()=>{
  if(!canEdit()) return;
  const name = document.getElementById('a_name').value.trim();
  if(!name){ toast('Digite o nome.'); return; }
  const data = {
    name, currency:document.getElementById('a_currency').value, cache:document.getElementById('a_cache').value.trim(),
    instagram:document.getElementById('a_instagram').value.trim(), tiktok:document.getElementById('a_tiktok').value.trim(),
    facebook:document.getElementById('a_facebook').value.trim(), youtube:document.getElementById('a_youtube').value.trim(),
    spotify:document.getElementById('a_spotify').value.trim(), bio:document.getElementById('a_bio').value.trim(),
    logo: modalLogo, rider: modalRider, photos: modalPhotos, files: modalFiles, contracts: modalContracts,
  };
  if(editingArtistId){ artists = artists.map(a=> a.id===editingArtistId ? {...a,...data} : a); }
  else { artists.push({id:uid(), ...data}); }
  store.set('artists', artists);
  document.getElementById('artistModalBg').classList.remove('open');
  populateArtistSelects(); renderArtistList(); renderCalendar(); renderShowList();
  toast('Artista salvo.');
});
document.getElementById('newArtistBtn').addEventListener('click', ()=>openArtistModal(null));
document.getElementById('archiveArtistBtn').addEventListener('click', ()=>{
  if(!editingArtistId || !isAdmin()) return;
  const a = artists.find(x=>x.id===editingArtistId);
  if(!a) return;
  const activating = !!a.archived;
  if(!activating && !confirm(`Desativar "${a.name}"?\n\nEle será ocultado das listas e não poderá receber novos eventos/músicas, mas nada é apagado — os eventos e músicas existentes continuam no histórico. Você pode reativar quando quiser.`)) return;
  artists = artists.map(x=> x.id===editingArtistId ? {...x, archived: !activating} : x);
  store.set('artists', artists);
  if(viewingArtistId===editingArtistId && !activating){ viewingArtistId = null; store.set('viewingArtistId', null); }
  document.getElementById('artistModalBg').classList.remove('open');
  populateArtistSelects(); renderArtistSwitcher(); renderArtistList(); renderCalendar(); renderShowList(); renderTrackList(); renderFinances();
  toast(activating ? 'Artista reativado.' : 'Artista desativado (oculto).');
});
document.getElementById('deleteArtistBtn').addEventListener('click', ()=>{
  if(!editingArtistId || !isAdmin()) return;
  const a = artists.find(x=>x.id===editingArtistId);
  if(!a) return;
  const nShows = shows.filter(s=>s.artistId===editingArtistId).length;
  const nTracks = tracks.filter(t=>t.artistId===editingArtistId).length;
  let msg = `Excluir "${a.name}" DEFINITIVAMENTE?\n\nIsso apaga o perfil, press kit e contratos anexados do artista.`;
  if(nShows||nTracks) msg += `\n\n⚠️ Ele tem ${nShows} evento(s) e ${nTracks} música(s), que continuarão no histórico como "(removido)".\n\nSe quiser apenas ocultar sem perder nada, use "Desativar" em vez de excluir.`;
  if(!confirm(msg)) return;
  if(!confirm('Tem CERTEZA? Esta ação não pode ser desfeita.')) return;
  artists = artists.filter(x=> x.id !== editingArtistId);
  store.set('artists', artists);
  if(viewingArtistId===editingArtistId){ viewingArtistId = null; store.set('viewingArtistId', null); }
  document.getElementById('artistModalBg').classList.remove('open');
  populateArtistSelects(); renderArtistSwitcher(); renderArtistList(); renderCalendar(); renderShowList(); renderTrackList(); renderFinances();
  toast('Artista excluído.');
});

/* ---------- MÚSICAS ---------- */
function renderTrackList(){
  const el = document.getElementById('trackList');
  let list = filterByViewingArtist(tracks, 'artistId');
  const archivedCount = list.filter(t=>t.archived).length;
  if(!showArchivedTracks) list = list.filter(t=>!t.archived);
  document.getElementById('toggleArchivedTracks').style.display = (archivedCount>0 || showArchivedTracks) ? 'inline-flex' : 'none';
  if(list.length===0){ el.innerHTML='<div class="empty-note">Nenhuma música.</div>'; return; }
  el.innerHTML = list.map(t=>{
    const contribs = t.contributors||[];
    const allSigned = contribs.length>0 && contribs.every(c=>c.status==='assinado');
    return `<div class="list-row ${t.archived?'archived-item':''}">
      <div class="thumb">🎵</div>
      <div class="body">
        <div class="title-line">${escapeHtml(t.title)} <span class="badge ${allSigned?'assinado':'pendente'}">${allSigned?'Assinado':'Pendente'}</span>${t.archived?'<span class="badge desativado">Desativada</span>':''}</div>
        <div class="meta">${escapeHtml(artistName(t.artistId))} · ${escapeHtml(t.distributor||'—')}</div>
        <div class="meta mono">ISRC: ${escapeHtml(t.isrc||'—')}</div>
        ${t.composers?`<div class="meta">✍ ${escapeHtml(t.composers)}</div>`:''}
        ${t.producers?`<div class="meta">🎚 ${escapeHtml(t.producers)}</div>`:''}
      </div>
      <div class="actions"><button class="edit" data-id="${t.id}">${canEditTracks(t.artistId)?'editar':'ver'}</button></div>
    </div>`;
  }).join('');
  el.querySelectorAll('.edit').forEach(b=>b.addEventListener('click', ()=>openTrackModal(b.dataset.id)));
}
function renderContributors(){
  const admin = canEdit();
  const el = document.getElementById('contributorsList');
  if(modalContributors.length===0){ el.innerHTML='<div class="empty-note">Nenhum colaborador.</div>'; return; }
  el.innerHTML = modalContributors.map((c,i)=>`
    <div class="contrib-row">
      <span class="name">${escapeHtml(c.name)}</span>
      <span class="role">${escapeHtml(c.role||'')}</span>
      <span class="badge ${c.status==='assinado'?'assinado':'pendente'}">${c.status==='assinado'?'Assinado':'Pendente'}</span>
      ${admin && c.status!=='assinado' ? `<button data-i="${i}" class="signcontrib" style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:11px;">✍️ assinar</button>` : ''}
      ${admin ? `<button data-i="${i}" class="rmcontrib" style="background:none;border:none;color:var(--danger);cursor:pointer;">×</button>` : ''}
    </div>`).join('');
  el.querySelectorAll('.rmcontrib').forEach(b=>b.addEventListener('click', ()=>{ modalContributors.splice(b.dataset.i,1); renderContributors(); }));
  el.querySelectorAll('.signcontrib').forEach(b=>b.addEventListener('click', ()=>{
    const c = modalContributors[b.dataset.i];
    const title = document.getElementById('t_title').value.trim()||'(música)';
    const text = `Termo de participação na música "${title}"\nColaborador(a): ${c.name}\nFunção: ${c.role||'—'}`;
    openSigModal({type:'contrib', id:editingTrackId, contribIndex:Number(b.dataset.i)}, text);
  }));
}
document.getElementById('addContribBtn').addEventListener('click', ()=>{
  const name = document.getElementById('newContribName').value.trim();
  const role = document.getElementById('newContribRole').value.trim();
  if(!name) return;
  modalContributors.push({name, role, status:'pendente'});
  document.getElementById('newContribName').value=''; document.getElementById('newContribRole').value='';
  renderContributors();
});
function openTrackModal(trackId){
  editingTrackId = trackId;
  const existing = trackId ? tracks.find(t=>t.id===trackId) : null;
  const admin = existing ? canEditTracks(existing.artistId) : canAddTracks();
  populateArtistSelects();
  const firstEditable = isAdmin() ? artists[0] : artists.find(a=>canEditTracks(a.id));
  if(!existing && !firstEditable){ toast('Você não tem permissão para adicionar músicas.'); return; }
  document.getElementById('trackModalTitle').textContent = existing?(admin?'Editar música':'Detalhes da música'):'Nova música';
  if(existing && ![...document.getElementById('t_artist').options].some(o=>o.value===existing.artistId)){
    document.getElementById('t_artist').insertAdjacentHTML('beforeend', `<option value="${existing.artistId}">${escapeHtml(artistName(existing.artistId))}</option>`);
  }
  document.getElementById('t_artist').value = existing?existing.artistId:firstEditable.id;
  document.getElementById('t_title').value = existing?.title||'';
  document.getElementById('t_isrc').value = existing?.isrc||'';
  document.getElementById('t_composers').value = existing?.composers||'';
  document.getElementById('t_producers').value = existing?.producers||'';
  document.getElementById('t_lyrics').value = existing?.lyrics||'';
  document.getElementById('t_distributor').value = existing?.distributor||'Virgin Music';
  modalContributors = existing?.contributors ? JSON.parse(JSON.stringify(existing.contributors)) : [];
  renderContributors();
  [...document.querySelectorAll('#trackModalBg input, #trackModalBg select, #trackModalBg textarea')].forEach(f=> f.disabled = !admin);
  document.getElementById('saveTrackBtn').style.display = admin?'inline-flex':'none';
  const tArchBtn = document.getElementById('archiveTrackBtn');
  const tDelBtn = document.getElementById('deleteTrackBtn');
  tArchBtn.style.display = (existing && admin) ? 'inline-flex' : 'none';
  tDelBtn.style.display = (existing && admin) ? 'inline-flex' : 'none';
  tArchBtn.textContent = existing?.archived ? '👁 Reativar' : '🙈 Desativar';
  document.getElementById('trackModalBg').classList.add('open');
}
document.getElementById('cancelTrackModal').addEventListener('click', ()=>document.getElementById('trackModalBg').classList.remove('open'));
function persistTrack(closeModal){
  const title = document.getElementById('t_title').value.trim();
  if(!title){ toast('Digite o título.'); return null; }
  const data = {
    artistId: document.getElementById('t_artist').value, title,
    isrc: document.getElementById('t_isrc').value.trim(),
    composers: document.getElementById('t_composers').value.trim(),
    producers: document.getElementById('t_producers').value.trim(),
    lyrics: document.getElementById('t_lyrics').value,
    distributor: document.getElementById('t_distributor').value,
    contributors: modalContributors,
  };
  let saved;
  if(editingTrackId){ tracks = tracks.map(t=> t.id===editingTrackId ? {...t,...data} : t); saved = tracks.find(t=>t.id===editingTrackId); }
  else { saved = {id:uid(), ...data}; tracks.push(saved); editingTrackId = saved.id; }
  store.set('tracks', tracks);
  renderTrackList();
  if(closeModal) document.getElementById('trackModalBg').classList.remove('open');
  return saved;
}
document.getElementById('saveTrackBtn').addEventListener('click', ()=>{
  if(!canEdit()) return;
  persistTrack(true);
});
document.getElementById('newTrackBtn').addEventListener('click', ()=>openTrackModal(null));
document.getElementById('archiveTrackBtn').addEventListener('click', ()=>{
  if(!editingTrackId) return;
  const t = tracks.find(x=>x.id===editingTrackId);
  if(!t || !canEditTracks(t.artistId)) return;
  const activating = !!t.archived;
  tracks = tracks.map(x=> x.id===editingTrackId ? {...x, archived: !activating} : x);
  store.set('tracks', tracks);
  document.getElementById('trackModalBg').classList.remove('open');
  renderTrackList();
  toast(activating ? 'Música reativada.' : 'Música desativada (oculta).');
});
document.getElementById('deleteTrackBtn').addEventListener('click', ()=>{
  if(!editingTrackId) return;
  const t = tracks.find(x=>x.id===editingTrackId);
  if(!t || !canEditTracks(t.artistId)) return;
  if(!confirm(`Excluir a música "${t.title}" DEFINITIVAMENTE?\n\nIsso apaga ISRC, letra, participantes e assinaturas. Se quiser apenas ocultar, use "Desativar".`)) return;
  tracks = tracks.filter(x=> x.id !== editingTrackId);
  store.set('tracks', tracks);
  document.getElementById('trackModalBg').classList.remove('open');
  renderTrackList();
  toast('Música excluída.');
});

/* ---------- FORNECEDORES ---------- */
function renderSupplierList(){
  const el = document.getElementById('supplierList');
  const admin = canEdit();
  if(suppliers.length===0){ el.innerHTML='<div class="empty-note">Nenhum fornecedor.</div>'; return; }
  el.innerHTML = suppliers.map(s=>`
    <div class="list-row">
      <div class="thumb">${escapeHtml((s.category||'?')[0])}</div>
      <div class="body"><div class="title-line">${escapeHtml(s.name)} <span class="badge tramite">${escapeHtml(s.category||'')}</span></div><div class="meta">${escapeHtml(s.contact||'')}</div>${s.notes?`<div class="meta">${escapeHtml(s.notes)}</div>`:''}</div>
      <div class="actions"><button class="edit" data-id="${s.id}">${admin?'editar':'ver'}</button></div>
    </div>`).join('');
  el.querySelectorAll('.edit').forEach(b=>b.addEventListener('click', ()=>openSupplierModal(b.dataset.id)));
}
function openSupplierModal(supplierId){
  editingSupplierId = supplierId;
  const existing = supplierId ? suppliers.find(s=>s.id===supplierId) : null;
  const admin = canEdit();
  document.getElementById('sp_category').value = existing?.category||'Som';
  document.getElementById('sp_name').value = existing?.name||'';
  document.getElementById('sp_contact').value = existing?.contact||'';
  document.getElementById('sp_notes').value = existing?.notes||'';
  [...document.querySelectorAll('#supplierModalBg input, #supplierModalBg select, #supplierModalBg textarea')].forEach(f=> f.disabled = !admin);
  document.getElementById('saveSupplierBtn').style.display = admin?'inline-flex':'none';
  document.getElementById('supplierModalBg').classList.add('open');
}
document.getElementById('cancelSupplierModal').addEventListener('click', ()=>document.getElementById('supplierModalBg').classList.remove('open'));
document.getElementById('saveSupplierBtn').addEventListener('click', ()=>{
  if(!canEdit()) return;
  const name = document.getElementById('sp_name').value.trim();
  if(!name){ toast('Digite o nome.'); return; }
  const data = {category:document.getElementById('sp_category').value, name, contact:document.getElementById('sp_contact').value.trim(), notes:document.getElementById('sp_notes').value.trim()};
  if(editingSupplierId){ suppliers = suppliers.map(s=> s.id===editingSupplierId ? {...s,...data} : s); }
  else { suppliers.push({id:uid(), ...data}); }
  store.set('suppliers', suppliers);
  document.getElementById('supplierModalBg').classList.remove('open');
  renderSupplierList(); renderContactsList();
});
document.getElementById('newSupplierBtn').addEventListener('click', ()=>openSupplierModal(null));

/* ---------- USUÁRIOS ---------- */
function renderUsersList(){
  const el = document.getElementById('usersList');
  const admin = isAdmin();
  if(users.length===0){ el.innerHTML='<div class="empty-note">Nenhum usuário.</div>'; return; }
  el.innerHTML = users.map(u=>`
    <div class="list-row">
      <div class="user-avatar">${escapeHtml(u.name[0]||'?').toUpperCase()}</div>
      <div class="body">
        <div class="title-line">${escapeHtml(u.name)} <span class="badge tramite">${userRoleLabel(u)}</span>${u.isSeller?`<span class="badge assinado">💼 Vendedor${u.commission?` ${escapeHtml(u.commission)}%`:''}</span>`:''}</div>
        <div class="meta">@${escapeHtml(u.username)}</div>
      </div>
      <div class="actions"><button class="edit" data-id="${u.id}" ${admin?'':'disabled'}>${admin?'editar':'ver'}</button></div>
    </div>`).join('');
  el.querySelectorAll('.edit').forEach(b=> !b.disabled && b.addEventListener('click', ()=>openUserModal(b.dataset.id)));
}
function openUserModal(userId){
  editingUserId = userId;
  const existing = userId ? users.find(u=>u.id===userId) : null;
  document.getElementById('userModalTitle').textContent = existing?'Editar usuário':'Novo usuário';
  document.getElementById('u_name').value = existing?.name||'';
  document.getElementById('u_username').value = existing?.username||'';
  document.getElementById('u_password').value = existing?.password||'';
  document.getElementById('u_isSeller').checked = !!existing?.isSeller;
  document.getElementById('u_commission').value = existing?.commission||'';
  document.getElementById('u_vaultAccess').checked = !!existing?.vaultAccess;
  document.getElementById('u_commissionWrap').style.display = existing?.isSeller ? 'block' : 'none';
  document.querySelector('input[name="u_role"][value="' + (existing?.role||'custom') + '"]').checked = true;
  const isEditingAdmin = existing?.role==='admin';
  document.getElementById('u_artistAccessWrap').style.display = isEditingAdmin?'none':'block';
  if(!isEditingAdmin){
    const access = existing ? (computeAccess(existing)||{}) : {};
    document.getElementById('u_artistsList').innerHTML = artists.map(a=>
      `<div class="artist-access-row"><span class="aname">${escapeHtml(a.name)}</span><select data-id="${a.id}"><option value="">Sem acesso</option><option value="editor">Editor</option><option value="musicas">Só músicas</option><option value="leitor">Leitor</option></select></div>`
    ).join('');
    document.getElementById('u_artistsList').querySelectorAll('select').forEach(sel=> {
      sel.value = access[sel.dataset.id]||'';
    });
  }
  document.getElementById('deleteUserBtn').style.display = (existing && isAdmin())?'inline-flex':'none';
  document.getElementById('userModalBg').classList.add('open');
}
document.getElementById('deleteUserBtn').addEventListener('click', ()=>{
  if(!editingUserId || !confirm('Tem certeza? Isso não pode ser desfeito.')) return;
  users = users.filter(u=> u.id !== editingUserId);
  store.set('users', users);
  document.getElementById('userModalBg').classList.remove('open');
  renderUsersList();
  renderLoggedUser();
  toast('Usuário removido.');
});
document.getElementById('cancelUserModal').addEventListener('click', ()=>document.getElementById('userModalBg').classList.remove('open'));
document.getElementById('saveUserBtn').addEventListener('click', ()=>{
  const name = document.getElementById('u_name').value.trim();
  const username = document.getElementById('u_username').value.trim();
  const password = document.getElementById('u_password').value;
  const role = document.querySelector('input[name="u_role"]:checked').value;
  if(!name||!username||!password){ toast('Preencha nome, usuário e senha.'); return; }
  const usernameTaken = users.some(u=> u.username.toLowerCase()===username.toLowerCase() && u.id!==editingUserId);
  if(usernameTaken){ toast('Já existe um usuário com esse login. Escolha outro.'); return; }
  const data = {name, username, password, role, artistAccess:{},
    isSeller: document.getElementById('u_isSeller').checked,
    commission: document.getElementById('u_commission').value.trim(),
    vaultAccess: document.getElementById('u_vaultAccess').checked};
  if(role==='custom'){
    document.getElementById('u_artistsList').querySelectorAll('select').forEach(sel=>{
      if(sel.value) data.artistAccess[sel.dataset.id] = sel.value;
    });
  }
  if(editingUserId){ users = users.map(u=> u.id===editingUserId ? {...u,...data} : u); }
  else { users.push({id:uid(), ...data}); }
  store.set('users', users);
  document.getElementById('userModalBg').classList.remove('open');
  renderUsersList();
  renderLoggedUser();
  toast('Usuário salvo.');
});
document.getElementById('newUserBtn').addEventListener('click', ()=>openUserModal(null));
document.querySelectorAll('input[name="u_role"]').forEach(r=> r.addEventListener('change', ()=>{
  const isAdminRole = document.querySelector('input[name="u_role"]:checked').value==='admin';
  document.getElementById('u_artistAccessWrap').style.display = isAdminRole?'none':'block';
  if(!isAdminRole && !document.getElementById('u_artistsList').innerHTML.trim()){
    document.getElementById('u_artistsList').innerHTML = artists.map(a=>
      `<div class="artist-access-row"><span class="aname">${escapeHtml(a.name)}</span><select data-id="${a.id}"><option value="">Sem acesso</option><option value="editor">Editor</option><option value="musicas">Só músicas</option><option value="leitor">Leitor</option></select></div>`
    ).join('');
  }
}));
document.getElementById('u_isSeller').addEventListener('change', (e)=>{
  document.getElementById('u_commissionWrap').style.display = e.target.checked ? 'block' : 'none';
});

/* ---------- CONTATOS ---------- */
function renderContactsList(){
  const el = document.getElementById('contactsList');
  const typeFilter = document.getElementById('filterContactType').value;
  const searchTerm = document.getElementById('searchContact').value.toLowerCase();
  const contacts = new Map();
  // contratantes dos eventos
  shows.forEach(s=>{
    if(s.hirerName){
      const key = s.hirerName;
      if(!contacts.has(key)){
        contacts.set(key, {name:s.hirerName, email:s.hirerEmail1||'', phone:s.hirerPhone1||'', type:'contratante', refs:[]});
      }
      contacts.get(key).refs.push(s.venue);
    }
  });
  // fornecedores
  suppliers.forEach(sp=>{
    const key = sp.name;
    if(!contacts.has(key)){
      contacts.set(key, {name:sp.name, email:'', phone:sp.contact||'', type:'fornecedor', refs:[sp.category]});
    }
  });
  let list = [...contacts.values()];
  if(typeFilter) list = list.filter(c=>c.type===typeFilter);
  if(searchTerm) list = list.filter(c=>c.name.toLowerCase().includes(searchTerm) || c.email.toLowerCase().includes(searchTerm));
  if(list.length===0){ el.innerHTML='<div class="empty-note">Nenhum contato encontrado.</div>'; return; }
  el.innerHTML = list.map(c=>`
    <div class="list-row">
      <div class="thumb">${escapeHtml((c.name[0]||'?').toUpperCase())}</div>
      <div class="body">
        <div class="title-line">${escapeHtml(c.name)} <span class="badge ${c.type==='fornecedor'?'tramite':'confirmado'}">${c.type==='fornecedor'?'Fornecedor':'Contratante'}</span></div>
        ${c.phone?`<div class="meta">📱 ${escapeHtml(c.phone)}</div>`:''}
        ${c.email?`<div class="meta">✉️ ${escapeHtml(c.email)}</div>`:''}
        ${c.refs.length?`<div class="meta">📍 ${c.refs.slice(0,2).map(r=>escapeHtml(r)).join(', ')}${c.refs.length>2?'...':''}</div>`:''}
      </div>
    </div>`).join('');
}
document.getElementById('filterContactType').addEventListener('change', renderContactsList);
document.getElementById('searchContact').addEventListener('input', renderContactsList);
document.getElementById('exportContactsBtn').addEventListener('click', ()=>{
  const typeFilter = document.getElementById('filterContactType').value;
  const searchTerm = document.getElementById('searchContact').value.toLowerCase();
  const contacts = new Map();
  shows.forEach(s=>{ if(s.hirerName){ const key = s.hirerName; if(!contacts.has(key)) contacts.set(key, {name:s.hirerName, email:s.hirerEmail1||'', phone:s.hirerPhone1||'', type:'contratante'}); } });
  suppliers.forEach(sp=>{ const key = sp.name; if(!contacts.has(key)) contacts.set(key, {name:sp.name, email:'', phone:sp.contact||'', type:'fornecedor'}); });
  let list = [...contacts.values()];
  if(typeFilter) list = list.filter(c=>c.type===typeFilter);
  if(searchTerm) list = list.filter(c=>c.name.toLowerCase().includes(searchTerm) || c.email.toLowerCase().includes(searchTerm));
  const csv = 'Nome,Email,Telefone,Tipo\n' + list.map(c=>`"${c.name}","${c.email}","${c.phone}","${c.type}"`).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'contatos-egregora.csv';
  a.click();
  toast('Contatos exportados.');
});

/* ---------- MAILING (só nome + e-mail) ---------- */
function buildContactsWithEmail(){
  const contacts = new Map();
  shows.forEach(s=>{
    if(s.hirerName){
      // dois possíveis e-mails do contratante
      [s.hirerEmail1, s.hirerEmail2].forEach(em=>{
        if(em && em.trim()){
          const key = em.trim().toLowerCase();
          if(!contacts.has(key)) contacts.set(key, {name:s.hirerName, email:em.trim()});
        }
      });
    }
  });
  // fornecedores: se o "contato" tiver cara de e-mail
  suppliers.forEach(sp=>{
    if(sp.contact && sp.contact.includes('@')){
      const key = sp.contact.trim().toLowerCase();
      if(!contacts.has(key)) contacts.set(key, {name:sp.name, email:sp.contact.trim()});
    }
  });
  return [...contacts.values()];
}
document.getElementById('mailingBtn').addEventListener('click', ()=>{
  const list = buildContactsWithEmail();
  if(list.length===0){ toast('Nenhum e-mail cadastrado ainda nos eventos/fornecedores.'); return; }
  // CSV com BOM para abrir certinho no Excel (acentos) — abre também como XLS
  const header = 'Nome,Email\n';
  const body = list.map(c=>`"${c.name.replace(/"/g,'""')}","${c.email}"`).join('\r\n');
  const csv = '\ufeff' + header + body;
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'mailing-egregora.csv';
  a.click();
  toast(`Mailing exportado: ${list.length} e-mail(s).`);
});

/* ---------- COFRE DE ARTISTAS (restrito) ---------- */
let vaultArtistId = null;
let vaultFileInput = null;
function openVault(){
  const sel = document.getElementById('vaultArtistSelect');
  const list = artists.filter(a=>!a.archived);
  if(list.length===0){
    document.getElementById('vaultContent').innerHTML = '<div class="empty-note">Cadastre um artista primeiro.</div>';
    sel.innerHTML = '';
    return;
  }
  sel.innerHTML = list.map(a=>`<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');
  if(!vaultArtistId || !list.some(a=>a.id===vaultArtistId)) vaultArtistId = list[0].id;
  sel.value = vaultArtistId;
  renderVault();
}
document.getElementById('vaultArtistSelect').addEventListener('change', (e)=>{ vaultArtistId = e.target.value; renderVault(); });
function renderVault(){
  const el = document.getElementById('vaultContent');
  if(!canSeeVault()){ el.innerHTML = '<div class="vault-locked"><div class="ic">🔒</div>Você não tem acesso a este cofre.</div>'; return; }
  const data = vault[vaultArtistId] || {notes:[], files:[]};
  const notes = data.notes || [];
  const files = data.files || [];
  el.innerHTML = `
    <div class="section-label">Anotações / negociações</div>
    <div id="vaultNotes">${notes.length ? notes.map(n=>`
      <div class="vault-note">
        <div class="vn-date">${new Date(n.at).toLocaleString('pt-BR')}</div>
        <div>${escapeHtml(n.text).replace(/\n/g,'<br>')}</div>
        <div class="vn-actions"><button data-id="${n.id}" class="rmnote">🗑 remover</button></div>
      </div>`).join('') : '<div class="empty-note">Nenhuma anotação ainda.</div>'}</div>
    <div class="field" style="margin-top:8px;">
      <textarea id="newVaultNote" rows="3" placeholder="Escreva aqui uma negociação, condição combinada, lembrete..."></textarea>
    </div>
    <button class="btn secondary full" id="addVaultNoteBtn" style="margin-bottom:16px;">+ Salvar anotação</button>

    <div class="section-label">Arquivos (contratos, documentos)</div>
    <div id="vaultFiles">${files.length ? files.map(f=>`
      <div class="vault-file">
        📎 <a href="${f.url}" download="${escapeHtml(f.name)}" target="_blank">${escapeHtml(f.name)}</a>
        <button data-id="${f.id}" class="rm rmfilevault">×</button>
      </div>`).join('') : '<div class="empty-note">Nenhum arquivo ainda.</div>'}</div>
    <button class="btn full" id="addVaultFileBtn">📎 Anexar arquivo</button>
    <input type="file" id="vaultFileInputEl" accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx" style="display:none;">
  `;
  // anotações
  document.getElementById('addVaultNoteBtn').addEventListener('click', ()=>{
    const text = document.getElementById('newVaultNote').value.trim();
    if(!text) return;
    if(!vault[vaultArtistId]) vault[vaultArtistId] = {notes:[], files:[]};
    vault[vaultArtistId].notes = vault[vaultArtistId].notes || [];
    vault[vaultArtistId].notes.unshift({id:uid(), text, at:new Date().toISOString()});
    store.set('vault', vault);
    renderVault();
    toast('Anotação salva no cofre.');
  });
  el.querySelectorAll('.rmnote').forEach(b=> b.addEventListener('click', ()=>{
    if(!confirm('Remover esta anotação?')) return;
    vault[vaultArtistId].notes = vault[vaultArtistId].notes.filter(n=>n.id!==b.dataset.id);
    store.set('vault', vault);
    renderVault();
  }));
  // arquivos
  document.getElementById('addVaultFileBtn').addEventListener('click', ()=> document.getElementById('vaultFileInputEl').click());
  document.getElementById('vaultFileInputEl').addEventListener('change', async (e)=>{
    for(const file of [...e.target.files]){
      const url = await fileToDataUrl(file);
      if(!vault[vaultArtistId]) vault[vaultArtistId] = {notes:[], files:[]};
      vault[vaultArtistId].files = vault[vaultArtistId].files || [];
      vault[vaultArtistId].files.unshift({id:uid(), name:file.name, url, at:new Date().toISOString()});
    }
    store.set('vault', vault);
    renderVault();
    toast('Arquivo guardado no cofre.');
    e.target.value = '';
  });
  el.querySelectorAll('.rmfilevault').forEach(b=> b.addEventListener('click', ()=>{
    if(!confirm('Remover este arquivo do cofre?')) return;
    vault[vaultArtistId].files = vault[vaultArtistId].files.filter(f=>f.id!==b.dataset.id);
    store.set('vault', vault);
    renderVault();
  }));
}

/* ---------- FINANÇAS ---------- */
let expenseReceiptFile = null;
function renderFinances(){
  const el = document.getElementById('finList');
  const artistLabel = document.getElementById('finArtistLabel');
  const artist = viewingArtistId ? artists.find(a=>a.id===viewingArtistId) : null;
  artistLabel.textContent = artist ? `— ${escapeHtml(artist.name)}` : '';
  const currencyFilter = document.getElementById('finCurrencyFilter').value;
  const periodFilter = document.getElementById('finPeriodFilter').value;
  const now = new Date();
  const getDateRange = ()=>{
    if(periodFilter==='month') return {start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth()+1, 0)};
    if(periodFilter==='year') return {start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31)};
    return {start: new Date(0), end: new Date()};
  };
  const range = getDateRange();
  const isInRange = (dateStr)=> { const d = new Date(dateStr+'T00:00:00'); return d >= range.start && d <= range.end; };
  
  const items = [];
  // receitas dos eventos
  const scopedShows = filterByViewingArtist(shows, 'artistId').filter(s=>isInRange(s.date));
  scopedShows.forEach(s=>{
    (s.payments||[]).forEach(p=>{
      if(p.date && isInRange(p.date) && (!currencyFilter || s.currency===currencyFilter)){
        items.push({type:'receita', date:p.date, desc:`Parcela do evento em ${s.venue}`, value:p.value, currency:s.currency, receipt:p.receipt, eventId:s.id});
      }
    });
  });
  // despesas
  filterByViewingArtist(expenses, 'artistId').filter(e=>isInRange(e.date) && (!currencyFilter || e.currency===currencyFilter)).forEach(e=>{
    items.push({type:'despesa', date:e.date, desc:e.desc, value:e.value, currency:e.currency, category:e.category, receipt:e.receipt, id:e.id});
  });
  
  items.sort((a,b)=>b.date.localeCompare(a.date));
  
  // resumo
  const receitas = {};
  const despesas = {};
  items.forEach(it=>{
    const n = parseNum(it.value);
    const c = it.currency||'EUR';
    if(it.type==='receita'){ receitas[c] = (receitas[c]||0) + n; }
    else { despesas[c] = (despesas[c]||0) + n; }
  });
  
  const summaryCurrencies = [...new Set(items.map(i=>i.currency||'EUR'))];
  document.getElementById('finSummary').innerHTML = summaryCurrencies.map(c=>{
    const r = receitas[c]||0;
    const d = despesas[c]||0;
    const bal = r - d;
    return `<div class="stat">
      <div class="label">Saldo em ${c}</div>
      <div class="num ${bal>=0?'pos':'neg'}">${fmtCurrency(Math.abs(bal).toFixed(0).replace('.',','),c)}${bal<0?' (prejuízo)':''}</div>
      <div class="meta" style="font-size:10px;margin-top:4px;color:var(--muted);">
        <span style="color:var(--success);">+${fmtCurrency(r.toFixed(0).replace('.',','),c)}</span><br>
        <span style="color:var(--danger);">-${fmtCurrency(d.toFixed(0).replace('.',','),c)}</span>
      </div>
    </div>`;
  }).join('');
  
  if(items.length===0){ el.innerHTML='<div class="empty-note">Nenhum lançamento neste período.</div>'; return; }
  el.innerHTML = items.map((it,idx)=>{
    const [y,m,d] = it.date.split('-');
    return `<div class="expense-row">
      <span class="edate">${d}/${m}/${y}</span>
      <span class="edesc">${escapeHtml(it.desc)}</span>
      ${it.category?`<span class="ecat">${escapeHtml(it.category)}</span>`:''}
      <span class="evalue ${it.type}">${it.type==='receita'?'+':'-'}${fmtCurrency(it.value, it.currency||'EUR')}</span>
      ${it.receipt ? `<a href="${it.receipt}" target="_blank" class="receipt-chip">📎</a>` : (canEdit() && it.type==='despesa'?`<button class="receipt-btn" data-i="${idx}">+ recibo</button>`:'')}
      ${canEdit() && it.type==='despesa' ? `<button class="rmexp" data-i="${it.id}">×</button>` : ''}
    </div>`;
  }).join('');
  
  el.querySelectorAll('.receipt-btn').forEach(b=> b.addEventListener('click', ()=>{
    expenseReceiptFile = items[b.dataset.i].id;
    document.getElementById('expReceiptFile').click();
  }));
  el.querySelectorAll('.rmexp').forEach(b=> b.addEventListener('click', ()=>{
    expenses = expenses.filter(e=> e.id !== b.dataset.i);
    store.set('expenses', expenses);
    renderFinances();
  }));
}
document.getElementById('finCurrencyFilter').addEventListener('change', renderFinances);
document.getElementById('finPeriodFilter').addEventListener('change', renderFinances);
document.getElementById('expReceiptBtn').addEventListener('click', ()=>document.getElementById('expReceiptFile').click());
document.getElementById('expReceiptFile').addEventListener('change', async (e)=>{
  const file = e.target.files[0]; if(!file || !expenseReceiptFile) return;
  const receiptData = await fileToDataUrl(file);
  expenses = expenses.map(ex=> ex.id===expenseReceiptFile ? {...ex, receipt:receiptData} : ex);
  expenseReceiptFile = null;
  store.set('expenses', expenses);
  renderFinances();
  toast('Recibo anexado.');
  e.target.value = '';
});
document.getElementById('addExpenseBtn').addEventListener('click', async ()=>{
  if(!canEdit()) return;
  const type = document.getElementById('e_type').value;
  const artistId = document.getElementById('e_artist').value;
  const date = document.getElementById('e_date').value;
  const category = document.getElementById('e_category').value;
  const desc = document.getElementById('e_desc').value.trim();
  const currency = document.getElementById('e_currency').value;
  const value = document.getElementById('e_value').value.trim();
  
  if(!artistId || !date || !desc || !value){ toast('Preencha todos os campos.'); return; }
  expenses.push({id:uid(), type, artistId, date, category, desc, currency, value, receipt:''});
  store.set('expenses', expenses);
  document.getElementById('e_date').value = '';
  document.getElementById('e_desc').value = '';
  document.getElementById('e_value').value = '';
  renderFinances();
  toast('Lançamento adicionado.');
});
document.getElementById('finExportBtn').addEventListener('click', ()=>{
  const artist = viewingArtistId ? artists.find(a=>a.id===viewingArtistId) : null;
  const currency = document.getElementById('finCurrencyFilter').value;
  const period = document.getElementById('finPeriodFilter').value;
  const now = new Date();
  const getDateRange = ()=>{
    if(period==='month') return {start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth()+1, 0)};
    if(period==='year') return {start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31)};
    return {start: new Date(0), end: new Date()};
  };
  const range = getDateRange();
  const isInRange = (dateStr)=> { const d = new Date(dateStr+'T00:00:00'); return d >= range.start && d <= range.end; };
  const lines = ['Data,Tipo,Descrição,Categoria,Valor,Moeda,Comprovativo'];
  const scopedShows = filterByViewingArtist(shows, 'artistId').filter(s=>isInRange(s.date));
  scopedShows.forEach(s=> (s.payments||[]).forEach(p=> p.date && isInRange(p.date) && (!currency || s.currency===currency) && lines.push(`${p.date},Receita,Evento em ${s.venue},,${p.value},${s.currency},${p.receipt?'Sim':'Não'}`)));
  filterByViewingArtist(expenses, 'artistId').filter(e=>isInRange(e.date) && (!currency || e.currency===currency)).forEach(e=> lines.push(`${e.date},Despesa,${e.desc},${e.category},${e.value},${e.currency},${e.receipt?'Sim':'Não'}`));
  const csv = lines.join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = `financas-${artist?artist.name.replace(/\s+/g,'-'):'onmess'}.csv`;
  a.click();
  toast('Relatório exportado.');
});
document.getElementById('finWhatsappBtn').addEventListener('click', ()=>{
  const artist = viewingArtistId ? artists.find(a=>a.id===viewingArtistId) : null;
  const period = document.getElementById('finPeriodFilter').value;
  const now = new Date();
  const periodLabel = period==='month'?`${MONTHS[now.getMonth()]} ${now.getFullYear()}`:period==='year'?now.getFullYear():'todo período';
  const msg = `Olá! Segue o relatório financeiro de ${artist?artist.name:'Egrégora'} referente a ${periodLabel}. Confira em anexo a planilha completa.`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,'_blank');
});

/* ---------- INICIALIZAÇÃO ---------- */
// Login fica salvo por 1 semana. Se a sessão ainda for válida, entra direto;
// senão (ou expirada), mostra a tela de login.
(function initSession(){
  const session = store.get('session', null);
  const valid = session && session.userId && session.expiresAt && Date.now() < session.expiresAt
                && users.some(u => u.id === session.userId);
  if(valid){
    document.body.classList.remove('locked');
    applyLoggedUser(session.userId);
  } else {
    if(session) store.set('session', null); // limpa sessão expirada
    applyLoggedUser(currentUserId); // prepara os renders internamente
    showLoginScreen();              // bloqueia com a tela de login
  }
})();

/* URL para assinatura pública (signing mode) */
const params = new URLSearchParams(location.search);
if(params.has('sign')){
  document.body.classList.remove('locked'); // contratante não precisa de login para assinar
  document.body.classList.add('signing-mode');
  const signType = params.get('sign');
  const id = params.get('id');
  if(signType==='show'){
    const s = shows.find(x=>x.id===id);
    if(s){
      const text = buildContractText(s);
      document.getElementById('signBody').innerHTML = `
        <div class="sign-summary">Contrato de prestação de serviços<br><b>${artistName(s.artistId)}</b> — ${s.venue}, ${s.city}</div>
        <div class="contract-box">${escapeHtml(text)}</div>
        <div class="field" style="margin-top:12px;"><label>Nome (quem assina)</label><input id="pubSigName"></div>
        <label>Assinatura</label>
        <div class="sig-pad-wrap"><canvas id="ssCanvas"></canvas></div>
        <div class="contract-actions"><button class="btn small ghost" id="pubClearBtn">Limpar</button><button class="btn" id="pubSignBtn">Assinar</button></div>`;
      setupCanvas('ssCanvas');
      bindCanvasEvents('ssCanvas');
      document.getElementById('pubClearBtn').addEventListener('click', ()=>{ const c=document.getElementById('ssCanvas'); sigCtx.clearRect(0,0,c.width,c.height); });
      document.getElementById('pubSignBtn').addEventListener('click', ()=>{
        const name = document.getElementById('pubSigName').value.trim();
        if(!name){ toast('Digite o nome.'); return; }
        const dataUrl = document.getElementById('ssCanvas').toDataURL('image/png');
        shows = shows.map(sh=> sh.id===s.id ? {...sh, signature:{name,dataUrl,at:new Date().toISOString()}} : sh);
        store.set('shows', shows);
        document.getElementById('signBody').innerHTML = `<div class="sign-success"><div class="icon">✅</div><h2>Assinado com sucesso!</h2><p style="font-size:12px;color:var(--muted);">Contrato de ${artistName(s.artistId)} em ${s.venue} foi assinado por ${name} em ${new Date().toLocaleString('pt-BR')}.</p></div>`;
      });
    }
  }
}
