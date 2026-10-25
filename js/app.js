import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, onAuthStateChanged, setPersistence, browserSessionPersistence, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, collection, doc, addDoc, setDoc, updateDoc, deleteDoc, getDocs, query, where, orderBy, limit, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const MAIL = '@vikinggold.local', SUF = '·VG!';          // Firebase min. 6 karakteres jelszót kér, ezért kerül a jelszó mögé egy fix végződés
const ADMIN_EMAIL = '_notryn' + MAIL;
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const DAYS = ['vasárnap', 'hétfő', 'kedd', 'szerda', 'csütörtök', 'péntek', 'szombat'];
const MONTHS = ['', 'január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'];
const huDate = s => { const d = new Date(s + 'T12:00:00'); return isNaN(d) ? s : `${d.getFullYear()}. ${MONTHS[d.getMonth() + 1]} ${d.getDate()}., ${DAYS[d.getDay()]}`; };
const page = document.body.dataset.page;
const params = new URLSearchParams(location.search);
const configured = firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('IDE_');

let app, auth, db, user = null;
const isAdmin = () => !!user && user.email === ADMIN_EMAIL;

function toast(msg, type = 'ok') {
  document.querySelectorAll('.flash').forEach(e => e.remove());
  const d = document.createElement('div'); d.className = 'flash ' + type; d.setAttribute('role', 'status'); d.textContent = msg;
  $('#main').prepend(d); setTimeout(() => d.remove(), 6000);
}
const flashNext = (m, t = 'ok') => sessionStorage.setItem('vg_flash', JSON.stringify([m, t]));
function showStoredFlash() { try { const f = JSON.parse(sessionStorage.getItem('vg_flash') || 'null'); if (f) { sessionStorage.removeItem('vg_flash'); toast(f[0], f[1]); } } catch (e) { } }

/* ---------- oldalváz ---------- */
function layout() {
  const nav = [['home', 'index.html', 'Kezdőlap'], ['tippek', 'tippek.html', 'Tippek'], ['contact', 'elerhetosegek.html', 'Elérhetőségek']];
  if (isAdmin()) nav.splice(2, 0, ['elemzes', 'elemzes.html', 'Elemzés']);
  $('#hdr').innerHTML = `
<header class="top">
  <a class="logo" href="index.html" aria-label="VikingGOLD"><span class="mark"><svg viewBox="0 0 48 48" width="34" height="34" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#38bdf8"/><stop offset=".55" stop-color="#6366f1"/><stop offset="1" stop-color="#a855f7"/></linearGradient></defs><path d="M24 3 42 10v14c0 10-7.5 17.5-18 21C13.5 41.5 6 34 6 24V10z" fill="none" stroke="url(#lg)" stroke-width="2.5"/><path d="M14 16l10 18 10-18" fill="none" stroke="url(#lg)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="wm">Viking<b>GOLD</b></span></a>
  <button class="burger" id="burger" aria-label="Menü" aria-expanded="false"><i></i><i></i><i></i></button>
  <nav class="nav" id="nav">${nav.map(([k, h, l]) => `<a href="${h}" class="${page === k ? 'on' : ''}">${l}</a>`).join('')}</nav>
  <div class="usr" id="usr"><button class="uic" id="uic" aria-haspopup="true" aria-expanded="false" aria-label="Fiók"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.2 3.6-7 8-7s8 2.8 8 7"/></svg>${user ? '<i class="dot"></i>' : ''}</button>
    <div class="menu" id="umenu" hidden>${user
      ? `<div class="who"><span>${esc(user.displayName || user.email.split('@')[0])}</span><small>${isAdmin() ? 'Admin' : 'Tag'}</small></div><a href="tippek.html">Tippek</a>${isAdmin() ? '<a href="elemzes.html">Elemzés</a>' : ''}<a href="#" id="logout">Kijelentkezés</a>`
      : '<a href="auth.html?mode=login">Belépés</a><a href="auth.html?mode=register">Regisztráció</a>'}</div></div>
</header>`;
  $('#ftr').innerHTML = `<footer class="foot"><div class="wrap"><div><b>Viking<span class="g">GOLD</span></b><p>Statisztikai alapú jégkorong elemzések és tippek.</p></div><div class="fl"><a href="index.html">Kezdőlap</a><a href="tippek.html">Tippek</a><a href="elerhetosegek.html">Elérhetőségek</a></div><p class="small">A tippek statisztikai becslések, nem garantálnak nyereményt. A fogadás kockázattal jár – csak annyit tegyél fel, amennyit megengedhetsz magadnak. 18 év alatt tilos. Segítség: Kék Vonal 116-123.</p></div></footer>`;
  // menü viselkedés
  const uic = $('#uic'), um = $('#umenu'), bg = $('#burger'), nv = $('#nav');
  uic.onclick = e => { e.stopPropagation(); um.hidden = !um.hidden; uic.setAttribute('aria-expanded', String(!um.hidden)); };
  document.onclick = e => { if (!um.hidden && !um.contains(e.target)) um.hidden = true; };
  bg.onclick = () => { const o = nv.classList.toggle('open'); bg.setAttribute('aria-expanded', String(o)); };
  const lo = $('#logout'); if (lo) lo.onclick = async e => { e.preventDefault(); await signOut(auth); flashNext('Sikeresen kijelentkeztél.'); location.href = 'index.html'; };
}

function setupBanner() {
  $('#main').innerHTML = `<section class="wrap narrow"><div class="panel center" style="margin-top:50px"><h1>Beállítás szükséges</h1><p class="small" style="font-size:.95rem">Töltsd ki a <b>js/firebase-config.js</b> fájlt a Firebase projekt adataival. A lépések a README.txt-ben vannak.</p></div></section>`;
}

/* ---------- oldalak ---------- */
function lockView() {
  return `<section class="wrap narrow"><div class="panel lock"><div class="big">🔒</div><h1>Csak tagoknak</h1><p class="small" style="font-size:.95rem">A tippeket a regisztrált és belépett felhasználók láthatják. A regisztráció ingyenes és két perc.</p><div class="row" style="justify-content:center;margin-top:18px"><a class="btn" href="auth.html?mode=login&next=tippek.html">Belépés</a><a class="btn ghost" href="auth.html?mode=register&next=tippek.html">Regisztráció</a></div></div></section>`;
}

function authPage() {
  const mode = params.get('mode') === 'register' ? 'register' : 'login';
  const nextRaw = params.get('next') || 'tippek.html';
  const next = ['tippek.html', 'elemzes.html', 'index.html', 'elerhetosegek.html'].includes(nextRaw) ? nextRaw : 'tippek.html';
  if (user) { location.replace(next); return; }
  const reg = mode === 'register';
  $('#main').innerHTML = `<section class="wrap narrow authbox"><div class="panel">
  <div class="tabs"><a class="${!reg ? 'on' : ''}" href="auth.html?mode=login&next=${next}">Belépés</a><a class="${reg ? 'on' : ''}" href="auth.html?mode=register&next=${next}">Regisztráció</a></div>
  <h1>${reg ? 'Csatlakozz' : 'Üdv újra!'}</h1>
  <p class="small">${reg ? 'Ingyenes regisztráció – utána azonnal láthatod a napi tippeket.' : 'Lépj be a tippek megtekintéséhez. A belépés addig él, amíg be nem zárod a böngészőt.'}</p>
  <div id="aerr"></div>
  <form id="af"><label for="name">Felhasználónév</label><input id="name" required maxlength="20" autocomplete="username" autofocus>
  <label for="pass">Jelszó</label><input id="pass" type="password" required autocomplete="${reg ? 'new-password' : 'current-password'}">
  ${reg ? '<label for="pass2">Jelszó újra</label><input id="pass2" type="password" required autocomplete="new-password">' : ''}
  <div style="margin-top:20px"><button class="btn" style="width:100%" type="submit">${reg ? 'Regisztráció' : 'Belépés'}</button></div></form></div></section>`;
  const err = m => $('#aerr').innerHTML = m ? `<div class="flash err" style="margin:12px 0">${esc(m)}</div>` : '';
  $('#af').onsubmit = async e => {
    e.preventDefault(); err('');
    const name = $('#name').value.trim(), pass = $('#pass').value, btn = e.submitter; btn.disabled = true;
    try {
      if (reg) {
        if (!/^[A-Za-z0-9_.\-]{3,20}$/.test(name)) throw { m: 'A felhasználónév 3–20 karakter lehet (angol betű, szám, _ . -).' };
        if (pass.length < 5) throw { m: 'A jelszó legalább 5 karakter legyen.' };
        if (pass !== $('#pass2').value) throw { m: 'A két jelszó nem egyezik.' };
        const c = await createUserWithEmailAndPassword(auth, name.toLowerCase() + MAIL, pass + SUF);
        await updateProfile(c.user, { displayName: name });
        try { await setDoc(doc(db, 'users', c.user.uid), { name, created: Date.now() }); } catch (x) { }
        flashNext('Sikeres regisztráció, üdv a VikingGOLD-ban!');
      } else {
        await signInWithEmailAndPassword(auth, name.toLowerCase() + MAIL, pass + SUF);
        flashNext('Üdv újra!');
      }
      location.href = next;
    } catch (x) {
      const c = x.code || '';
      err(x.m || (c.includes('email-already') ? 'Ez a felhasználónév már foglalt.' : c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found') ? 'Hibás felhasználónév vagy jelszó.' : c.includes('too-many') ? 'Túl sok próbálkozás, várj egy kicsit.' : c.includes('operation-not-allowed') ? 'A Firebase-ben nincs bekapcsolva az Email/Password belépés.' : 'Hiba: ' + (x.message || c)));
      btn.disabled = false;
    }
  };
}

async function tippekPage() {
  const root = $('#main');
  if (!user) { root.innerHTML = lockView(); return; }
  const admin = isAdmin(), today = ymd(new Date()), tomorrow = ymd(new Date(Date.now() + 864e5));
  let v = params.get('v') || 'today'; if (!['today', 'tomorrow', 'date', 'all'].includes(v)) v = 'today';
  let d = today; if (v === 'tomorrow') d = tomorrow; if (v === 'date') d = /^\d{4}-\d{2}-\d{2}$/.test(params.get('d') || '') ? params.get('d') : today;
  const viewUrl = date => date === today ? 'tippek.html?v=today' : date === tomorrow ? 'tippek.html?v=tomorrow' : 'tippek.html?v=date&d=' + date;
  root.innerHTML = '<section class="wrap" style="padding-top:26px"><div class="empty">Betöltés…</div></section>';
  let list = [];
  try {
    const q = v === 'all' ? query(collection(db, 'tips'), orderBy('date', 'desc'), limit(150)) : query(collection(db, 'tips'), where('date', '==', d));
    list = (await getDocs(q)).docs.map(x => ({ id: x.id, ...x.data() }));
  } catch (x) { root.innerHTML = `<section class="wrap"><div class="flash err">A tippek betöltése nem sikerült: ${esc(x.code || x.message)}</div></section>`; return; }
  list.sort(v === 'all' ? (a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')) : (a, b) => (a.time || '').localeCompare(b.time || ''));
  const edit = params.get('edit') && list.find(t => t.id === params.get('edit'));
  let form = null;
  if (admin) { if (edit) form = edit; else if (params.has('new')) form = { date: /^\d{4}-\d{2}-\d{2}$/.test(params.get('d') || '') ? params.get('d') : d, home: params.get('h') || '', away: params.get('a') || '', pick: params.get('m') || '', odds: params.get('o') || '', league: params.get('l') || '', note: params.get('n') || '' }; }
  const val = k => esc(form?.[k] ?? '');
  const title = { today: 'Mai tippek', tomorrow: 'Holnapi tippek', date: 'Tippek – ' + huDate(d), all: 'Összes tipp' }[v];
  const LAB = { pend: 'Függőben', win: 'Nyert', loss: 'Vesztett', void: 'Érvénytelen' };

  root.innerHTML = `<section class="wrap" style="padding-top:26px">
  <div class="row" style="justify-content:space-between;margin-bottom:6px"><h1 style="margin:0">Tippek</h1>${admin && !form ? `<a class="btn sm" href="tippek.html?new=1&d=${d}">+ Új tipp</a>` : ''}</div>
  <p class="small" style="margin:0 0 16px">${v === 'all' ? 'A legutóbbi 150 tipp.' : esc(huDate(d))}</p>
  <div class="tabs"><a class="${v === 'today' ? 'on' : ''}" href="tippek.html?v=today">Mai (${pad(new Date().getMonth() + 1)}.${pad(new Date().getDate())}.)</a><a class="${v === 'tomorrow' ? 'on' : ''}" href="tippek.html?v=tomorrow">Holnapi</a><a class="${v === 'date' ? 'on' : ''}" href="#" id="dtab">Dátum szerint</a><a class="${v === 'all' ? 'on' : ''}" href="tippek.html?v=all">Összes</a></div>
  <div class="row" style="margin:-6px 0 16px"><input id="dpick" type="date" value="${d}" style="max-width:200px" aria-label="Dátum választása"></div>
  ${admin && form ? `<div class="panel" id="form" style="border-color:rgba(99,102,241,.6)"><h2 style="font-size:1.2rem">${edit ? 'Tipp szerkesztése' : 'Új tipp feltöltése'}</h2>
   <form id="tf"><div class="g3"><div><label>Dátum</label><input type="date" id="f_date" required value="${val('date')}"></div><div><label>Kezdés <span class="opt">(opc.)</span></label><input type="time" id="f_time" value="${val('time')}"></div><div><label>Bajnokság</label><input id="f_league" maxlength="60" value="${val('league')}"></div></div>
   <div class="g2"><div><label>Hazai csapat</label><input id="f_home" required maxlength="60" value="${val('home')}"></div><div><label>Vendég csapat</label><input id="f_away" required maxlength="60" value="${val('away')}"></div></div>
   <div class="g3"><div><label>Tipp</label><input id="f_pick" required maxlength="80" placeholder="pl. Hazai továbbjut" value="${val('pick')}"></div><div><label>Szorzó</label><input id="f_odds" inputmode="decimal" placeholder="1.85" value="${val('odds')}"></div><div><label>Bizalom (1–5)</label><select id="f_conf">${[1, 2, 3, 4, 5].map(i => `<option value="${i}" ${(form.conf || 3) === i ? 'selected' : ''}>${i} / 5</option>`).join('')}</select></div></div>
   <label>Indoklás <span class="opt">(opc.)</span></label><textarea id="f_note" maxlength="800">${val('note')}</textarea>
   <div class="g3"><div><label>Állapot</label><select id="f_status">${Object.entries(LAB).map(([k, n]) => `<option value="${k}" ${(form.status || 'pend') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div><div><label>Végeredmény <span class="opt">(opc.)</span></label><input id="f_result" maxlength="20" placeholder="pl. 4-3 ot" value="${val('result')}"></div></div>
   <div class="row" style="margin-top:18px"><button class="btn" type="submit">Mentés</button><a class="btn ghost" href="${viewUrl(d)}">Mégse</a></div></form></div>` : ''}
  <h2 style="font-size:1.25rem;margin:8px 0 14px">${esc(title)} <span class="small">(${list.length})</span></h2>
  ${list.length ? '' : `<div class="empty">Erre a napra még nincs feltöltött tipp.${admin ? ' Az „+ Új tipp” gombbal tölthetsz fel egyet.' : ' Nézz vissza később!'}</div>`}
  ${list.map((t, i) => {
    const st = t.status || 'pend', cls = st === 'pend' ? '' : st;
    return `<article class="tip ${cls}" style="animation-delay:${Math.min(i, 12) * 60}ms"><div class="tm">${esc(t.time || '--:--')}<small>${v === 'all' ? esc(t.date.slice(5).replace('-', '.') + '.') : 'kezdés'}</small></div>
    <div><div class="lg">${esc(t.league || 'Jégkorong')}</div><div class="mt">${esc(t.home)} <span class="small">–</span> ${esc(t.away)}<span class="badge ${st === 'pend' ? 'pend' : st}">${LAB[st]}</span></div><span class="pk">${esc(t.pick)}</span>${t.result ? `<span class="pill v">Végeredmény: ${esc(t.result)}</span>` : ''}${t.note ? `<p class="nt">${esc(t.note).replace(/\n/g, '<br>')}</p>` : ''}</div>
    <div class="od"><b>${t.odds > 1 ? Number(t.odds).toFixed(2) : '–'}</b><small>szorzó</small><div class="conf">${[1, 2, 3, 4, 5].map(k => `<i class="${k <= (t.conf || 3) ? 'f' : ''}"></i>`).join('')}</div></div>
    ${admin ? `<div class="adm"><a class="btn sm ghost" href="tippek.html?edit=${t.id}&v=${v}&d=${d}#form">Szerkesztés</a>${Object.entries(LAB).filter(([k]) => k !== st).map(([k, n]) => `<button class="btn sm ghost" data-st="${k}" data-id="${t.id}">${n}</button>`).join('')}<button class="btn sm danger" data-del="${t.id}">Törlés</button></div>` : ''}</article>`;
  }).join('')}</section>`;
  showStoredFlash();

  const dp = $('#dpick'); dp.onchange = () => { if (dp.value) location.href = 'tippek.html?v=date&d=' + dp.value; };
  $('#dtab').onclick = e => { e.preventDefault(); dp.focus(); try { dp.showPicker(); } catch (x) { } };
  if (!admin) return;
  root.querySelectorAll('[data-st]').forEach(b => b.onclick = async () => { try { await updateDoc(doc(db, 'tips', b.dataset.id), { status: b.dataset.st }); flashNext('Az eredmény frissítve.'); location.reload(); } catch (x) { toast('Nem sikerült: ' + (x.code || x.message), 'err'); } });
  root.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if (!confirm('Biztosan törlöd ezt a tippet?')) return; try { await deleteDoc(doc(db, 'tips', b.dataset.del)); flashNext('A tipp törölve.'); location.reload(); } catch (x) { toast('Nem sikerült: ' + (x.code || x.message), 'err'); } });
  const tf = $('#tf'); if (tf) tf.onsubmit = async e => {
    e.preventDefault();
    const odds = parseFloat(String($('#f_odds').value).replace(',', '.'));
    const row = { date: $('#f_date').value, time: $('#f_time').value, league: $('#f_league').value.trim(), home: $('#f_home').value.trim(), away: $('#f_away').value.trim(), pick: $('#f_pick').value.trim(), odds: odds > 1 ? Math.round(odds * 100) / 100 : 0, conf: +$('#f_conf').value, note: $('#f_note').value.trim(), status: $('#f_status').value, result: $('#f_result').value.trim() };
    e.submitter.disabled = true;
    try {
      if (edit) await updateDoc(doc(db, 'tips', edit.id), row); else await addDoc(collection(db, 'tips'), { ...row, created: Date.now() });
      flashNext(edit ? 'A tipp módosítva.' : 'A tipp elmentve.'); location.href = viewUrl(row.date);
    } catch (x) { toast('Mentés sikertelen: ' + (x.code || x.message), 'err'); e.submitter.disabled = false; }
  };
}

async function contactPage() {
  const f = $('#cf'); if (!f) return;
  f.onsubmit = async e => {
    e.preventDefault();
    if ($('#c_hp').value) return;
    const last = +localStorage.getItem('vg_lastmsg') || 0; if (Date.now() - last < 30000) { toast('Várj egy kicsit két üzenet között.', 'err'); return; }
    const name = $('#c_name').value.trim(), email = $('#c_mail').value.trim(), msg = $('#c_msg').value.trim();
    if (!name || msg.length < 5) { toast('Add meg a neved és az üzeneted.', 'err'); return; }
    e.submitter.disabled = true;
    try { await addDoc(collection(db, 'messages'), { name: name.slice(0, 60), email: email.slice(0, 100), msg: msg.slice(0, 2000), time: Date.now() }); localStorage.setItem('vg_lastmsg', Date.now()); f.reset(); toast('Köszönjük, az üzeneted megérkezett!'); }
    catch (x) { toast('Az üzenet küldése nem sikerült: ' + (x.code || x.message), 'err'); }
    e.submitter.disabled = false;
  };
  if (isAdmin()) {
    const box = $('#adminmsgs'); box.hidden = false;
    try {
      const rs = (await getDocs(query(collection(db, 'messages'), orderBy('time', 'desc'), limit(100)))).docs;
      $('#mlist').innerHTML = rs.length ? rs.map(x => { const m = x.data(); return `<div style="padding:12px 0;border-bottom:1px solid var(--bd)"><b>${esc(m.name)}</b> <span class="small">· ${esc(m.email || 'nincs e-mail')} · ${new Date(m.time).toLocaleString('hu-HU')}</span><p style="margin:6px 0">${esc(m.msg).replace(/\n/g, '<br>')}</p><button class="btn sm ghost" data-m="${x.id}">Törlés</button></div>`; }).join('') : '<p class="small" style="margin:0">Még nincs üzenet.</p>';
      $('#mlist').querySelectorAll('[data-m]').forEach(b => b.onclick = async () => { await deleteDoc(doc(db, 'messages', b.dataset.m)); b.closest('div').remove(); });
    } catch (x) { $('#mlist').textContent = 'Az üzenetek nem tölthetők be: ' + (x.code || x.message); }
  }
}

function analyzerPage() {
  const main = $('#main');
  if (!isAdmin()) { main.innerHTML = `<section class="wrap narrow"><div class="panel center" style="margin-top:50px"><h1>${user ? '403' : '🔒'}</h1><p>${user ? 'Ehhez az oldalhoz csak az admin fér hozzá.' : 'Az elemző csak az adminnak elérhető.'}</p><a class="btn" href="${user ? 'index.html' : 'auth.html?mode=login&next=elemzes.html'}">${user ? 'Vissza a kezdőlapra' : 'Belépés'}</a></div></section>`; return; }
  main.innerHTML = document.getElementById('tpl').innerHTML;
  const s = document.createElement('script'); s.src = 'assets/analyzer.js?v=1'; document.body.append(s);
}

/* ---------- indítás ---------- */
function start(u) {
  user = u; layout();
  if (page === 'auth') authPage();
  else if (page === 'tippek') tippekPage();
  else if (page === 'contact') contactPage();
  else if (page === 'elemzes') analyzerPage();
  else if (page === 'home') { const cta = $('#ctaReg'), bn = $('#bnRow'); if (u && cta) cta.remove(); if (bn) bn.innerHTML = u ? '<a class="btn" href="tippek.html">Tippek</a>' : '<div class="row"><a class="btn" href="auth.html?mode=register">Regisztráció</a><a class="btn ghost" href="auth.html?mode=login">Belépés</a></div>'; }
  if (page !== 'tippek') showStoredFlash();
}

if (!configured) { layout(); setupBanner(); }
else {
  app = initializeApp(firebaseConfig); auth = getAuth(app); db = getFirestore(app);
  setPersistence(auth, browserSessionPersistence).catch(() => { }).finally(() => {
    let first = true;
    onAuthStateChanged(auth, u => { if (first) { first = false; start(u); } else if ((!!u) !== (!!user)) location.reload(); });
  });
}
