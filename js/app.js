/*BOOT_START*/
let firebaseConfig, initializeApp, getAuth, onAuthStateChanged, setPersistence, browserSessionPersistence, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut, sendEmailVerification, sendPasswordResetEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider;
let getFirestore, collection, doc, addDoc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, onSnapshot, query, where, orderBy, limit, writeBatch;
let mktList, mktDef, lineSuggest, buildPick, evalTip, otFlag;
let bootError = null;
try {
  ({ firebaseConfig } = await import('./firebase-config.js'));
  ({ initializeApp } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'));
  ({ getAuth, onAuthStateChanged, setPersistence, browserSessionPersistence, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut, sendEmailVerification, sendPasswordResetEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'));
  ({ getFirestore, collection, doc, addDoc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, onSnapshot, query, where, orderBy, limit, writeBatch } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js'));
  ({ mktList, mktDef, lineSuggest, buildPick, evalTip, otFlag } = await import('./markets.js'));
} catch (e) { bootError = e; }
/*BOOT_END*/

const ADMIN_NAMES = ['_notryn', 'Kriszhhh'];                 // foglalt (admin) nevek: aki ezeket elsőként regisztrálja, az lesz az admin = tippadó
const RESERVED = ADMIN_NAMES.map(n => n.toLowerCase());
const isReserved = n => RESERVED.includes(String(n || '').toLowerCase());
let ADMIN_SET = new Set(RESERVED);                          // az admin fiókok (nevek), a Firestore "admins" gyűjteményből töltődik
const isAdminName = n => ADMIN_SET.has(String(n || '').toLowerCase());
const BAD_MAIL = /@(mailinator|guerrillamail|guerrillamailblock|sharklasers|grr|10minutemail|tempmail|temp-mail|throwawaymail|yopmail|trashmail|getnada|dispostable|maildrop|fakeinbox|mohmal|mintemail|spamgourmet|tempr|emailondeck|moakt|mailnesia|mytemp|tmpmail|burnermail|vikinggold\.local|example\.(com|org|net)|test\.(com|hu))\b/i;
const MAIL_RE = /^[^\s@]{1,64}@[^\s@]+\.[A-Za-z]{2,}$/;
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const DAYS = ['vasárnap', 'hétfő', 'kedd', 'szerda', 'csütörtök', 'péntek', 'szombat'];
const MONTHS = ['', 'január', 'február', 'március', 'április', 'május', 'június', 'július', 'augusztus', 'szeptember', 'október', 'november', 'december'];
const huDate = s => { const d = new Date(s + 'T12:00:00'); return isNaN(d) ? s : `${d.getFullYear()}. ${MONTHS[d.getMonth() + 1]} ${d.getDate()}., ${DAYS[d.getDay()]}`; };
const page = document.body.dataset.page;
const params = new URLSearchParams(location.search);
const configured = !bootError && !!firebaseConfig && !!firebaseConfig.apiKey && !String(firebaseConfig.apiKey).startsWith('IDE_');

let app, auth, db, user = null, profile = null, adminFlag = false, authBusy = false;
const isAdmin = () => !!user && adminFlag;

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
  $('#hdr').innerHTML = `
<header class="top">
  <a class="logo" href="index.html" aria-label="VikingGOLD"><span class="mark"><svg viewBox="0 0 48 48" width="34" height="34" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffdc82"/><stop offset=".55" stop-color="#f5b83d"/><stop offset="1" stop-color="#d98e0b"/></linearGradient></defs><path d="M24 3 42 10v14c0 10-7.5 17.5-18 21C13.5 41.5 6 34 6 24V10z" fill="none" stroke="url(#lg)" stroke-width="2.5"/><path d="M14 16l10 18 10-18" fill="none" stroke="url(#lg)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="wm">Viking<b>GOLD</b></span></a>
  <button class="burger" id="burger" aria-label="Menü" aria-expanded="false"><i></i><i></i><i></i></button>
  <nav class="nav" id="nav">${nav.map(([k, h, l]) => `<a href="${h}" class="${page === k ? 'on' : ''}">${l}</a>`).join('')}</nav>
  <div class="usr" id="usr"><button class="uic" id="uic" aria-haspopup="true" aria-expanded="false" aria-label="Fiók"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.2 3.6-7 8-7s8 2.8 8 7"/></svg>${user ? '<i class="dot"></i>' : ''}</button>
    <div class="menu" id="umenu" hidden>${user
      ? `<div class="who"><span>${esc((profile && profile.name) || user.displayName || user.email.split('@')[0])}</span><small>${isAdmin() ? 'Admin' : 'Tag'}</small></div><a href="tippek.html">Tippek</a><a href="beallitasok.html">${isAdmin() ? 'Beállítások / Tagkezelés' : 'Beállítások'}</a><a href="#" id="logout">Kijelentkezés</a>`
      : '<a href="auth.html?mode=login">Belépés</a><a href="auth.html?mode=register">Regisztráció</a>'}</div></div>
</header>`;
  $('#ftr').innerHTML = `<footer class="foot"><div class="wrap"><div><b>Viking<span class="g">GOLD</span></b><p>Labdarúgás, jégkorong, kézilabda, tenisz és kosárlabda tippek.</p></div><div class="fl"><a href="index.html">Kezdőlap</a><a href="tippek.html">Tippek</a><a href="elerhetosegek.html">Elérhetőségek</a></div><p class="small">A tippek nem garantálnak nyereményt. A fogadás kockázattal jár – csak annyit tegyél fel, amennyit megengedhetsz magadnak. 18 év alatt tilos. Segítség: Kék Vonal 116-123.</p></div></footer>`;
  // menü viselkedés
  const uic = $('#uic'), um = $('#umenu'), bg = $('#burger'), nv = $('#nav');
  uic.onclick = e => { e.stopPropagation(); um.hidden = !um.hidden; uic.setAttribute('aria-expanded', String(!um.hidden)); };
  document.onclick = e => { if (!um.hidden && !um.contains(e.target)) um.hidden = true; };
  bg.onclick = () => { const o = nv.classList.toggle('open'); bg.setAttribute('aria-expanded', String(o)); };
  const lo = $('#logout'); if (lo) lo.onclick = async e => { e.preventDefault(); await signOut(auth); flashNext('Sikeresen kijelentkeztél.'); location.href = 'index.html'; };
}



/* ---------- közös ---------- */
const SPORTS = [['labdarugas', 'Labdarúgás', '⚽'], ['jegkorong', 'Jégkorong', '🏒'], ['kezilabda', 'Kézilabda', '🤾'], ['tenisz', 'Tenisz', '🎾'], ['kosarlabda', 'Kosárlabda', '🏀']];
const SPORT_KEYS = SPORTS.map(x => x[0]);
const sportOf = t => SPORT_KEYS.includes(t.sport) ? t.sport : 'jegkorong';   // régi tippek = jégkorong
const LAB = { pend: 'Függőben', win: 'Nyert', loss: 'Vesztett', void: 'Érvénytelen' };
const NEXT = { pend: 'win', win: 'loss', loss: 'void', void: 'pend' };
const ICON = { win: '<span class="ic win" title="Nyert">✔</span>', loss: '<span class="ic loss" title="Vesztett">✕</span>', void: '<span class="ic void" title="Érvénytelen">↩</span>', pend: '<span class="ic pend" title="Függőben">⏳</span>' };
/* a tipp tényleges állapota: ha van végeredmény és még "függőben", a rendszer magától eldönti (nyert / vesztett / érvénytelen) */
const effStatus = t => { const s = t.status || 'pend'; if (s !== 'pend') return s; return (t.mk && t.result && evalTip({ ...t, sport: sportOf(t) })) || 'pend'; };
/* összegzés a listázott tippekről: állások, találati arány, kombi szorzat, 1 egységes tét eredménye */
function summary(l) {
  if (!l.length) return '';
  let w = 0, ls = 0, v = 0, p = 0, comb = 1, combN = 0, oddsSum = 0, oddsN = 0, profit = 0, staked = 0;
  l.forEach(t => {
    const s = effStatus(t), o = Number(t.odds) > 1 ? Number(t.odds) : 0;
    if (s === 'win') w++; else if (s === 'loss') ls++; else if (s === 'void') v++; else p++;
    if (o) { oddsSum += o; oddsN++; }
    if (o && s !== 'void') { comb *= o; combN++; }
    if (o && s === 'win') { profit += o - 1; staked++; } else if (o && s === 'loss') { profit -= 1; staked++; }
  });
  const dec = w + ls, rate = dec ? Math.round(w / dec * 100) : null;
  const kstat = ls ? 'loss' : p ? 'pend' : combN ? 'win' : 'pend';
  const kLab = { win: 'a kombi nyert', loss: 'a kombi elbukott', pend: 'még függőben' }[kstat];
  const f2 = n => n.toFixed(2).replace('.', ',');
  return combN > 1 ? `<p class="sumnote">Ha mindet egy szelvényen játszanád: <b>${f2(comb)}-szeres</b> szorzó, ${kLab}.</p>` : '';
}
const watchUsers = cb => onSnapshot(collection(db, 'users'), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => cb(null));

function setupBanner() {
  $('#main').innerHTML = `<section class="wrap narrow"><div class="panel center" style="margin-top:50px"><h1>Beállítás szükséges</h1><p class="small" style="font-size:.95rem">Töltsd ki a <b>js/firebase-config.js</b> fájlt a Firebase projekt adataival. A lépések a README.txt-ben vannak.</p></div></section>`;
}
function lockView() {
  return `<section class="wrap narrow"><div class="panel lock"><div class="big">🔒</div><h1>Csak tagoknak</h1><p class="small" style="font-size:.95rem">A tippeket a regisztrált és belépett felhasználók láthatják. A regisztráció ingyenes és két perc.</p><div class="row" style="justify-content:center;margin-top:18px"><a class="btn" href="auth.html?mode=login&next=tippek.html">Belépés</a><a class="btn ghost" href="auth.html?mode=register&next=tippek.html">Regisztráció</a></div></div></section>`;
}

function infoView(icon, title, text, extra = '') {
  return `<section class="wrap narrow"><div class="panel lock"><div class="big">${icon}</div><h1>${title}</h1><p class="small" style="font-size:.95rem">${text}</p>${extra}</div></section>`;
}
/* null = mehet; különben a megjelenítendő nézet (HTML) */
function gate() {
  if (!user) return lockView();
  if (!profile) return infoView('🚫', 'A fiókod nem érhető el', 'Ezt a fiókot az admin törölte, vagy hiányzik a profilja. Ha tévedésnek gondolod, írj nekünk az Elérhetőségek oldalon.', '<div class="row" style="justify-content:center;margin-top:18px"><button class="btn ghost" id="gOut">Kijelentkezés</button></div>');
  if (profile.disabled) return infoView('⛔', 'A fiókod fel van függesztve', 'Az admin ideiglenesen letiltotta a hozzáférésedet.', '<div class="row" style="justify-content:center;margin-top:18px"><button class="btn ghost" id="gOut">Kijelentkezés</button></div>');
  if (!user.emailVerified && !isAdmin()) return infoView('✉️', 'Erősítsd meg az e-mail címed', `Küldtünk egy levelet a(z) <b>${esc(user.email)}</b> címre. Kattints a benne lévő linkre, utána gyere vissza, és nyomd meg a „Megerősítettem” gombot. Nézd meg a spam mappát is.`, '<div class="row" style="justify-content:center;margin-top:18px"><button class="btn" id="vChk">Megerősítettem</button><button class="btn ghost" id="vRes">Levél újraküldése</button><button class="btn ghost" id="gOut">Kijelentkezés</button></div>');
  return null;
}
function gateEvents() {
  const o = $('#gOut'); if (o) o.onclick = async () => { await signOut(auth); location.href = 'index.html'; };
  const c = $('#vChk'); if (c) c.onclick = async () => {
    c.disabled = true;
    try { await auth.currentUser.reload(); if (auth.currentUser.emailVerified) { await auth.currentUser.getIdToken(true); location.reload(); return; } toast('Az e-mail címed még nincs megerősítve. Kattints a levélben lévő linkre.', 'err'); }
    catch (x) { toast('Hiba: ' + (x.code || x.message), 'err'); }
    c.disabled = false;
  };
  const r = $('#vRes'); if (r) r.onclick = async () => {
    r.disabled = true;
    try { await sendEmailVerification(auth.currentUser); toast('A megerősítő levelet újraküldtük.'); }
    catch (x) { toast(String(x.code || '').includes('too-many') ? 'Túl sok kérés, várj egy kicsit.' : 'Hiba: ' + (x.code || x.message), 'err'); }
    setTimeout(() => { r.disabled = false; }, 30000);
  };
}

/* ---------- kezdőlap ---------- */
function homePage() {
  const cta = $('#ctaReg'), bn = $('#bnRow');
  if (user && cta) cta.remove();
  if (bn) bn.innerHTML = user ? '<a class="btn" href="tippek.html">Tippek</a>' : '<div class="row"><a class="btn" href="auth.html?mode=register">Regisztráció</a><a class="btn ghost" href="auth.html?mode=login">Belépés</a></div>';
  const renderPl = list => {
    if (!list) { $('#plist').innerHTML = '<span class="small">A lista nem tölthető be.</span>'; return; }
    list = list.filter(u => !u.disabled).sort((a, b) => (isAdminName(b.name) - isAdminName(a.name)) || (a.created || 0) - (b.created || 0) || String(a.name).localeCompare(String(b.name)));
    $('#stPlayers').textContent = list.length;
    $('#plCount').textContent = '(' + list.length + ')';
    $('#plist').innerHTML = list.length ? list.map(u => `<span class="chip ${isAdminName(u.name) ? 'adm' : ''}">${esc(u.name || '?')}${isAdminName(u.name) ? ' <i>Admin · Tippadó</i>' : ''}</span>`).join('') : '<span class="small">Még nincs regisztrált játékos.</span>';
  };
  let lastUsers = null;
  onSnapshot(collection(db, 'admins'), sn => { ADMIN_SET = new Set([...RESERVED, ...sn.docs.map(d => String(d.data().name || '').toLowerCase())]); $('#stTipsters').textContent = Math.max(sn.size, 1); if (lastUsers) renderPl(lastUsers); }, () => { $('#stTipsters').textContent = ADMIN_NAMES.length; });
  $('#sportTiles').innerHTML = SPORTS.map(([k, n, e]) => `<a class="sp reveal" href="tippek.html?s=${k}"><span class="e">${e}</span><b>${n}</b><small>Tippek →</small></a>`).join('');
  watchUsers(list => { lastUsers = list; renderPl(list); });
  if (user && profile && !profile.disabled && (user.emailVerified || isAdmin())) onSnapshot(query(collection(db, 'tips'), where('date', '==', ymd(new Date()))), s => { $('#stToday').textContent = s.size; }, () => { });
}

function authPage() {
  const mode = params.get('mode') === 'register' ? 'register' : 'login';
  const nextRaw = params.get('next') || 'tippek.html';
  const next = ['tippek.html', 'index.html', 'elerhetosegek.html', 'beallitasok.html'].includes(nextRaw) ? nextRaw : 'tippek.html';
  if (user) { location.replace(next); return; }
  const reg = mode === 'register';
  $('#main').innerHTML = `<section class="wrap narrow authbox"><div class="panel">
  <div class="tabs"><a class="${!reg ? 'on' : ''}" href="auth.html?mode=login&next=${next}">Belépés</a><a class="${reg ? 'on' : ''}" href="auth.html?mode=register&next=${next}">Regisztráció</a></div>
  <h1>${reg ? 'Csatlakozz' : 'Üdv újra!'}</h1>
  <p class="small">${reg ? 'Ingyenes regisztráció valódi e-mail címmel. Küldünk egy megerősítő levelet, utána látod a tippeket.' : 'Lépj be az e-mail címeddel. A belépés addig él, amíg be nem zárod a böngészőt.'}</p>
  <div id="aerr"></div>
  <form id="af">
  ${reg ? '<label for="name">Felhasználónév</label><input id="name" required maxlength="20" autocomplete="username" autofocus>' : ''}
  <label for="email">E-mail cím</label><input id="email" type="email" required maxlength="100" autocomplete="email" ${reg ? '' : 'autofocus'}>
  <label for="pass">Jelszó</label><input id="pass" type="password" required autocomplete="${reg ? 'new-password' : 'current-password'}">
  ${reg ? '<label for="pass2">Jelszó újra</label><input id="pass2" type="password" required autocomplete="new-password">' : ''}
  <div style="margin-top:20px"><button class="btn" style="width:100%" type="submit">${reg ? 'Regisztráció' : 'Belépés'}</button></div></form>
  ${reg ? '' : '<p class="small" style="margin:16px 0 0;text-align:center"><a href="#" id="forgot">Elfelejtett jelszó?</a></p>'}</div></section>`;
  const err = m => $('#aerr').innerHTML = m ? `<div class="flash err" style="margin:12px 0">${esc(m)}</div>` : '';
  const fb = $('#forgot');
  if (fb) fb.onclick = async e => {
    e.preventDefault(); err('');
    const mail = $('#email').value.trim();
    if (!MAIL_RE.test(mail)) { err('Írd be fent az e-mail címedet, majd kattints újra az „Elfelejtett jelszó?” linkre.'); return; }
    try { await sendPasswordResetEmail(auth, mail); toast('Ha ez az e-mail cím regisztrálva van, elküldtük a jelszó-visszaállító levelet. Nézd meg a spam mappát is.'); }
    catch (x) { err(String(x.code || '').includes('too-many') ? 'Túl sok kérés, várj egy kicsit.' : 'Nem sikerült elküldeni: ' + (x.code || x.message)); }
  };
  $('#af').onsubmit = async e => {
    e.preventDefault(); err('');
    const email = $('#email').value.trim().toLowerCase(), pass = $('#pass').value, btn = (e.submitter || e.target.querySelector('[type=submit]')); btn.disabled = true; authBusy = true;
    try {
      if (reg) {
        const name = $('#name').value.trim(), lc = name.toLowerCase();
        if (!/^[A-Za-z0-9_.\-]{3,20}$/.test(name)) throw { m: 'A felhasználónév 3–20 karakter lehet (angol betű, szám, _ . -).' };
        if (!MAIL_RE.test(email)) throw { m: 'Az e-mail cím formátuma hibás.' };
        if (BAD_MAIL.test(email)) throw { m: 'Eldobható vagy kamu e-mail címet nem fogadunk el. Adj meg egy valódi címet.' };
        if (pass.length < 6) throw { m: 'A jelszó legalább 6 karakter legyen.' };
        if (pass !== $('#pass2').value) throw { m: 'A két jelszó nem egyezik.' };
        if ((await getDoc(doc(db, 'usernames', lc))).exists()) throw { m: 'Ez a felhasználónév már foglalt.' };
        const c = await createUserWithEmailAndPassword(auth, email, pass);   // egy e-mailhez egy fiók: ezt a Firebase kényszeríti ki
        try {
          const b = writeBatch(db);
          b.set(doc(db, 'usernames', lc), { uid: c.user.uid });
          b.set(doc(db, 'users', c.user.uid), { name, created: Date.now() });
          b.set(doc(db, 'userEmails', c.user.uid), { email });
          if (isReserved(lc)) b.set(doc(db, 'admins', c.user.uid), { name, uid: c.user.uid });
          await b.commit();
        } catch (x) { await c.user.delete().catch(() => { }); throw { m: 'A regisztráció nem sikerült (a név közben foglalt lett?): ' + (x.code || x.message) }; }
        await updateProfile(c.user, { displayName: name }).catch(() => { });
        sendEmailVerification(c.user).catch(() => { });
        flashNext('Sikeres regisztráció! Küldtünk egy megerősítő levelet, kattints a benne lévő linkre.');
      } else {
        await signInWithEmailAndPassword(auth, email, pass);
        flashNext('Üdv újra!');
      }
      location.href = next;
    } catch (x) {
      const c = x.code || '';
      err(x.m || (c.includes('email-already') ? 'Ezzel az e-mail címmel már van regisztráció.' : c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found') ? 'Hibás e-mail cím vagy jelszó.' : c.includes('invalid-email') ? 'Az e-mail cím formátuma hibás.' : c.includes('weak-password') ? 'A jelszó túl gyenge.' : c.includes('too-many') ? 'Túl sok próbálkozás, várj egy kicsit.' : c.includes('operation-not-allowed') ? 'A Firebase-ben nincs bekapcsolva az Email/Password belépés.' : 'Hiba: ' + (x.message || c)));
      btn.disabled = false; authBusy = false;
    }
  };
}


/* ---------- tippek ---------- */
function tippekPage() {
  const root = $('#main');
  const gv = gate(); if (gv) { root.innerHTML = gv; gateEvents(); showStoredFlash(); return; }
  const admin = isAdmin(), today = ymd(new Date()), tomorrow = ymd(new Date(Date.now() + 864e5));
  const st = {
    s: SPORT_KEYS.includes(params.get('s')) ? params.get('s') : 'jegkorong',
    v: ['today', 'tomorrow', 'date', 'all'].includes(params.get('v')) ? params.get('v') : 'today',
    d: /^\d{4}-\d{2}-\d{2}$/.test(params.get('d') || '') ? params.get('d') : today
  };
  let all = [], loaded = false, form = null, pending = false;
  const sync = () => history.replaceState(null, '', `tippek.html?s=${st.s}&v=${st.v}${st.v === 'date' ? '&d=' + st.d : ''}`);
  const curDate = () => st.v === 'tomorrow' ? tomorrow : st.v === 'date' ? st.d : today;

  root.innerHTML = `<section class="wrap" style="padding-top:26px">
  <div class="row" style="justify-content:space-between;margin-bottom:12px"><h1 style="margin:0">Tippek</h1>${admin ? '<button class="btn sm" id="newBtn">+ Új tipp</button>' : ''}</div>
  <div class="tabs" id="sTabs"></div>
  <div class="tabs vtabs" id="vTabs"></div>
  <div class="row" id="dRow" style="margin:-6px 0 14px" hidden><input id="dpick" type="date" style="max-width:200px" aria-label="Dátum választása"></div>
  <div id="formBox"></div>
  <div class="tlog"><div class="tlh"><span>Tippek és eredmények</span><small id="tlSub"></small></div><div id="tsum"></div><div id="tlist"><div class="empty">Betöltés…</div></div></div>
  </section>`;
  showStoredFlash();

  const matches = () => {
    let l = all.filter(t => sportOf(t) === st.s);
    if (st.v !== 'all') l = l.filter(t => t.date === curDate());
    const tk = t => t.time || '99:99';   // a korábbi kezdés van elöl, az idő nélküliek a végén
    return l.sort(st.v === 'all' ? (a, b) => b.date.localeCompare(a.date) || tk(a).localeCompare(tk(b)) : (a, b) => tk(a).localeCompare(tk(b)));
  };
  function tabs() {
    $('#sTabs').innerHTML = SPORTS.map(([k, n, e]) => `<a href="#" data-s="${k}" class="${st.s === k ? 'on' : ''}">${e} ${n} <small>${all.filter(t => sportOf(t) === k && (st.v === 'all' || t.date === curDate())).length}</small></a>`).join('');
    $('#vTabs').innerHTML = [['today', 'Mai'], ['tomorrow', 'Holnapi'], ['date', 'Dátum szerint'], ['all', 'Összes']].map(([k, n]) => `<a href="#" data-v="${k}" class="${st.v === k ? 'on' : ''}">${n}</a>`).join('');
    $('#dRow').hidden = st.v !== 'date'; $('#dpick').value = st.d;
    $('#sTabs').querySelectorAll('[data-s]').forEach(a => a.onclick = e => { e.preventDefault(); st.s = a.dataset.s; sync(); tabs(); list(); });
    $('#vTabs').querySelectorAll('[data-v]').forEach(a => a.onclick = e => { e.preventDefault(); st.v = a.dataset.v; sync(); tabs(); list(); });
  }
  function list() {
    if (!loaded) return;
    const ae = document.activeElement;
    if (ae && ae.classList && ae.classList.contains('rb') && $('#tlist').contains(ae)) { pending = true; return; }   // gépelés közben nem frissítjük
    pending = false;
    const l = matches();
    $('#tsum').innerHTML = summary(l);
    $('#tlSub').textContent = (st.v === 'all' ? 'összes nap' : huDate(curDate())) + ' · ' + l.length + ' tipp';
    $('#tlist').innerHTML = l.length ? l.map(t => {
      const s = effStatus(t), ot = sportOf(t) === 'jegkorong' && otFlag(t.result);
      const odds = t.odds > 1 ? ` <span class="od">@${Number(t.odds).toFixed(2)}</span>` : '';
      const who = t.tipster || '?';
      return `<div class="tl st-${s}" data-id="${t.id}"><div class="tlm"><div class="tn">${esc(t.home)} – ${esc(t.away)} ${esc(t.date)}</div>
      <div class="ts">${t.league ? `<span class="lg">${esc(t.league)}</span> · ` : ''}${t.time ? esc(t.time) + ' · ' : ''}Tipp: <b>${esc(t.pick)}</b>${odds} · Tippadó: <b class="tp">${esc(who)}</b>${isAdminName(who) ? ' <i class="tag">Admin</i>' : ''}</div></div>
      <div class="tlr">${admin ? `<input class="rb" data-id="${t.id}" value="${esc(t.result || '')}" placeholder="3-2" maxlength="20" aria-label="Végeredmény">` : `<span class="rb ro ${t.result ? '' : 'e'}">${esc(t.result || '3-2')}</span>`}
      ${admin ? `<button class="icb" data-cy="${t.id}" title="Állapot váltása (eredmény alapján automatikus)">${ICON[s]}</button>` : ICON[s]}${ot ? '<span class="ic ot" title="Hosszabbítás / szétlövés">🏒</span>' : ''}
      ${admin ? `<a href="#" class="ra" data-edit="${t.id}">Szerkesztés</a> · <a href="#" class="ra" data-del="${t.id}">Törlés</a>` : ''}</div></div>`;
    }).join('') : `<div class="empty">Ehhez a sportághoz erre a napra még nincs tipp.${admin ? ' A „+ Új tipp” gombbal tölthetsz fel egyet.' : ' Nézz vissza később!'}</div>`;
    if (!admin) return;
    $('#tlist').querySelectorAll('.rb').forEach(i => {
      i.onkeydown = e => { if (e.key === 'Enter') i.blur(); };
      i.onblur = async () => {
        const t = all.find(x => x.id === i.dataset.id), val = i.value.trim();
        if (t && (t.result || '') !== val) {
          const upd = { result: val };
          if (t.mk) { if (!val) upd.status = 'pend'; else { const r = evalTip({ ...t, result: val }); if (r) upd.status = r; } }   // az eredményből eldönti: nyert / vesztett / érvénytelen
          try { await updateDoc(doc(db, 'tips', t.id), upd); } catch (x) { toast('Nem sikerült: ' + (x.code || x.message), 'err'); }
        }
        if (pending) setTimeout(list, 0);
      };
    });
    $('#tlist').querySelectorAll('[data-cy]').forEach(b => b.onclick = async () => { const t = all.find(x => x.id === b.dataset.cy); try { await updateDoc(doc(db, 'tips', t.id), { status: NEXT[effStatus(t)] }); } catch (x) { toast('Nem sikerült: ' + (x.code || x.message), 'err'); } });
    $('#tlist').querySelectorAll('[data-del]').forEach(a => a.onclick = async e => { e.preventDefault(); if (!confirm('Biztosan törlöd ezt a tippet?')) return; try { await deleteDoc(doc(db, 'tips', a.dataset.del)); } catch (x) { toast('Nem sikerült: ' + (x.code || x.message), 'err'); } });
    $('#tlist').querySelectorAll('[data-edit]').forEach(a => a.onclick = e => { e.preventDefault(); openForm(all.find(x => x.id === a.dataset.edit)); });
  }
  let LG = null;
  async function openForm(t) {
    if (!LG) { try { LG = (await import('./leagues.js')).LEAGUES; } catch (e) { LG = {}; } }
    let tipsters = ADMIN_NAMES; try { const q = await getDocs(collection(db, 'admins')); const nm = q.docs.map(d => d.data().name).filter(Boolean); if (nm.length) tipsters = nm; } catch (e) { }
    const me = (profile && profile.name) || tipsters[0];
    const f = t || { sport: st.s, date: curDate(), tipster: me, status: 'pend' };
    const v = k => esc(f[k] ?? '');
    $('#formBox').innerHTML = `<div class="panel fpanel"><h2 style="font-size:1.2rem">${t ? 'Tipp szerkesztése' : 'Új tipp feltöltése'}</h2><form id="tf" autocomplete="off">
    <div class="g3"><div><label>Sportág</label><select id="f_sport">${SPORTS.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></div><div><label>Dátum</label><input type="date" id="f_date" required value="${v('date')}"></div><div><label>Kezdés <span class="opt">(opc.)</span></label><input type="time" id="f_time" value="${v('time')}"></div></div>
    <div class="g2"><div><label>Liga / bajnokság</label><select id="f_league"></select></div><div id="f_lgbox" hidden><label>Saját liga neve</label><input id="f_lgcustom" maxlength="60"></div></div>
    <div class="g2"><div><label>Hazai csapat / játékos</label><input id="f_home" list="dlTeams" required maxlength="60" placeholder="Kezdj el gépelni…" value="${v('home')}"></div><div><label>Vendég csapat / játékos</label><input id="f_away" list="dlTeams" required maxlength="60" placeholder="Kezdj el gépelni…" value="${v('away')}"></div></div>
    <datalist id="dlTeams"></datalist><datalist id="dlLines"></datalist>
    <div class="fsep">Fő tipp</div>
    <div class="g3"><div><label>Piac</label><select id="f_mk"></select></div><div id="f_sdbox"><label>Kimenet</label><select id="f_sd"></select></div><div id="f_lnbox"><label>Vonal <span class="opt" id="f_lnhint"></span></label><input id="f_ln" list="dlLines" inputmode="decimal" placeholder="pl. 2.5"></div><div id="f_frbox" hidden style="grid-column:span 2"><label>Tipp szövege</label><input id="f_free" maxlength="80"></div></div>
    <div class="pickprev" id="f_prev"></div>
    <div class="g3"><div><label>Szorzó <span class="opt">(opc.)</span></label><input id="f_odds" inputmode="decimal" placeholder="1.85" value="${v('odds')}"></div><div><label>Tippadó</label><select id="f_tipster">${[...new Set([...(f.tipster ? [f.tipster] : []), ...tipsters])].map(n => `<option ${(f.tipster || me) === n ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div><div><label>Végeredmény <span class="opt">(opc.)</span></label><input id="f_result" maxlength="30" placeholder="3-2" value="${v('result')}"></div></div>
    <div class="g3"><div><label>Állapot <span class="opt">(nem kell állítani)</span></label><select id="f_status">${Object.entries(LAB).map(([k, n]) => `<option value="${k}" ${(f.status || 'pend') === k ? 'selected' : ''}>${k === 'pend' ? 'Automatikus (a végeredményből)' : n + ' (kézi)'}</option>`).join('')}</select></div><div style="grid-column:span 2"><p class="hint">Ha megadsz végeredményt, a nyert / vesztett / érvénytelen állapotot a rendszer a fő tippből magától eldönti (pl. 4,5 felett + 1-4 = nyert). Jégkorongnál hosszabbításnál / szétlövésnél írd az eredmény mellé: 4-3 ot vagy 3-2 so (a 60 perces piacoknál ilyenkor döntetlen az állás). Tenisznél szettek: 2-1, vagy szettenként: 6-4 3-6 7-5.</p></div></div>
    <div class="row" style="margin-top:18px"><button class="btn" type="submit">Mentés</button><button class="btn ghost" type="button" id="fcancel">Mégse</button></div></form></div>`;
    const E = id => $('#' + id), sport = () => E('f_sport').value;
    const leaguesOf = () => LG[sport()] || [];
    const allTeams = () => [...new Set(leaguesOf().flatMap(l => l.t))];
    function fillTeams() {
      const sel = E('f_league').value, lg = leaguesOf().find(l => l.n === sel);
      const list = lg && lg.t.length ? lg.t : allTeams();
      E('dlTeams').innerHTML = list.map(x => `<option value="${esc(x)}">`).join('');
    }
    function fillLeagues(cur) {
      const ls = leaguesOf();
      E('f_league').innerHTML = '<option value="">– válassz ligát –</option>' + ls.map(l => `<option>${esc(l.n)}</option>`).join('') + '<option value="__x">Egyéb (saját)…</option>';
      let val = '', custom = '';
      if (cur) { if (ls.some(l => l.n === cur)) val = cur; else { val = '__x'; custom = cur; } }
      E('f_league').value = val; E('f_lgcustom').value = custom; E('f_lgbox').hidden = val !== '__x'; fillTeams();
    }
    function fillMarkets(curMk) {
      const ms = mktList(sport());
      E('f_mk').innerHTML = ms.map(m => `<option value="${m.k}">${esc(m.l)}</option>`).join('');
      if (curMk && ms.some(m => m.k === curMk)) E('f_mk').value = curMk;
      fillMarket();
    }
    function fillMarket(curSd, curLn) {
      const m = mktDef(sport(), E('f_mk').value);
      E('f_sd').innerHTML = m.s.map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join('');
      if (curSd && m.s.some(x => x[0] === curSd)) E('f_sd').value = curSd;
      E('f_sdbox').hidden = !!m.free; E('f_frbox').hidden = !m.free; E('f_lnbox').hidden = !m.line;
      if (m.line) {
        E('f_lnhint').textContent = m.line === 'signed' ? '(− vagy + is lehet)' : '';
        E('dlLines').innerHTML = lineSuggest(sport(), m.k).map(x => `<option value="${x}">`).join('');
        E('f_ln').value = curLn != null ? curLn : '';
      }
      prev();
    }
    const readLn = () => { const n = parseFloat(String(E('f_ln').value).replace(',', '.').replace('−', '-')); return isNaN(n) ? null : n; };
    function curPick() {
      const m = mktDef(sport(), E('f_mk').value);
      if (m.free) return E('f_free').value.trim();
      if (m.line && readLn() == null) return '';
      return buildPick({ sport: sport(), mk: m.k, sd: E('f_sd').value, ln: readLn(), home: E('f_home').value, away: E('f_away').value });
    }
    function prev() { const p = curPick(); E('f_prev').innerHTML = p ? `Tipp: <b>${esc(p)}</b>` : '<span class="small">Válaszd ki a fő tippet…</span>'; }

    // kezdőállapot (új vagy szerkesztett tipp)
    E('f_sport').value = sportOf(f);
    fillLeagues(f.league || '');
    const hasMk = !!f.mk;
    fillMarkets(hasMk ? f.mk : (t ? 'free' : ''));
    if (hasMk) fillMarket(f.sd, f.ln); else if (t) E('f_free').value = f.pick || '';
    prev();

    E('f_sport').onchange = () => { fillLeagues(''); fillMarkets(''); };
    E('f_league').onchange = () => { E('f_lgbox').hidden = E('f_league').value !== '__x'; fillTeams(); };
    E('f_mk').onchange = () => fillMarket();
    ['f_sd', 'f_ln', 'f_home', 'f_away', 'f_free'].forEach(id => { E(id).oninput = prev; E(id).onchange = prev; });
    $('#formBox').scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('#fcancel').onclick = () => { $('#formBox').innerHTML = ''; };
    $('#tf').onsubmit = async e => {
      e.preventDefault();
      const m = mktDef(sport(), E('f_mk').value), ln = readLn(), pick = curPick();
      if (m.line && ln == null) { toast('Add meg a vonalat (pl. 2.5 vagy -1.5).', 'err'); return; }
      if (!pick) { toast('Add meg a fő tippet.', 'err'); return; }
      const odds = parseFloat(String(E('f_odds').value).replace(',', '.'));
      const lgSel = E('f_league').value;
      const row = { sport: sport(), date: E('f_date').value, time: E('f_time').value, league: lgSel === '__x' ? E('f_lgcustom').value.trim() : lgSel, home: E('f_home').value.trim(), away: E('f_away').value.trim(), mk: m.free ? '' : m.k, sd: m.free ? '' : E('f_sd').value, ln: m.line ? ln : null, pick, odds: odds > 1 ? Math.round(odds * 100) / 100 : 0, tipster: E('f_tipster').value, status: E('f_status').value, result: E('f_result').value.trim() };
      if (row.result && row.mk) { const r = evalTip(row); if (r) row.status = r; }
      (e.submitter || e.target.querySelector('[type=submit]')).disabled = true;
      try {
        if (t) await updateDoc(doc(db, 'tips', t.id), row); else await addDoc(collection(db, 'tips'), { ...row, created: Date.now() });
        st.s = row.sport; if (st.v !== 'all') { st.v = row.date === today ? 'today' : row.date === tomorrow ? 'tomorrow' : 'date'; st.d = row.date; }
        $('#formBox').innerHTML = ''; sync(); tabs(); list(); toast(t ? 'A tipp módosítva.' : 'A tipp elmentve.');
      } catch (x) { toast('Mentés sikertelen: ' + (x.code || x.message), 'err'); (e.submitter || e.target.querySelector('[type=submit]')).disabled = false; }
    };
  }
  const dp = $('#dpick'); dp.onchange = () => { if (dp.value) { st.d = dp.value; sync(); tabs(); list(); } };
  if (admin) $('#newBtn').onclick = () => openForm(null);
  tabs();
  // élő frissítés: bárki bármit módosít, azonnal megjelenik
  onSnapshot(query(collection(db, 'tips'), orderBy('date', 'desc'), limit(500)), snap => {
    if (loaded && !admin) snap.docChanges().forEach(c => { if (c.type === 'added' && !c.doc.metadata.hasPendingWrites) { const t = c.doc.data(); toast(`Új tipp: ${t.home} – ${t.away} (${t.tipster || 'tippadó'})`); } });
    all = snap.docs.map(x => ({ id: x.id, ...x.data() })); loaded = true; tabs(); list();
  }, x => { $('#tlist').innerHTML = `<div class="flash err">A tippek betöltése nem sikerült: ${esc(x.code || x.message)}</div>`; });
}

/* ---------- elérhetőségek ---------- */
function contactPage() {
  const box = $('#cform');
  if (!user) {
    box.innerHTML = `<p class="small" style="font-size:.95rem">Üzenetet csak regisztrált, belépett tag küldhet. A neved automatikusan a regisztrált felhasználóneved lesz.</p><div class="row"><a class="btn" href="auth.html?mode=login&next=elerhetosegek.html">Belépés</a><a class="btn ghost" href="auth.html?mode=register&next=elerhetosegek.html">Regisztráció</a></div>`;
  } else if (gate()) {
    box.innerHTML = '<p class="small" style="font-size:.95rem">Üzenetet csak megerősített e-mail címmel rendelkező, engedélyezett tag küldhet. Nyisd meg a <a href="tippek.html">Tippek</a> oldalt a megerősítéshez.</p>';
  } else {
    const name = (profile && profile.name) || user.displayName || user.email.split('@')[0];
    box.innerHTML = `<form id="cf"><div style="position:absolute;left:-9999px" aria-hidden="true"><input id="c_hp" tabindex="-1" autocomplete="off"></div>
    <label>Neved <span class="opt">(a regisztrált neved)</span></label><input id="c_name" value="${esc(name)}" readonly>
    <label>E-mail <span class="opt">(ha választ vársz)</span></label><input id="c_mail" type="email" maxlength="100" value="${esc(user.email || '')}">
    <label>Üzenet</label><textarea id="c_msg" required maxlength="2000"></textarea>
    <div style="margin-top:16px"><button class="btn" type="submit">Küldés</button></div></form>`;
    $('#cf').onsubmit = async e => {
      e.preventDefault();
      if ($('#c_hp').value) return;
      const last = +localStorage.getItem('vg_lastmsg') || 0; if (Date.now() - last < 30000) { toast('Várj egy kicsit két üzenet között.', 'err'); return; }
      const email = $('#c_mail').value.trim(), msg = $('#c_msg').value.trim();
      if (msg.length < 5) { toast('Írj egy rövid üzenetet.', 'err'); return; }
      (e.submitter || e.target.querySelector('[type=submit]')).disabled = true;
      try { await addDoc(collection(db, 'messages'), { name, uid: user.uid, email: email.slice(0, 100), msg: msg.slice(0, 2000), time: Date.now() }); localStorage.setItem('vg_lastmsg', Date.now()); $('#c_msg').value = ''; toast('Köszönjük, az üzeneted megérkezett!'); }
      catch (x) { toast('Az üzenet küldése nem sikerült: ' + (x.code || x.message), 'err'); }
      (e.submitter || e.target.querySelector('[type=submit]')).disabled = false;
    };
  }
  if (isAdmin()) {
    const bx = $('#adminmsgs'); bx.hidden = false;
    onSnapshot(query(collection(db, 'messages'), orderBy('time', 'desc'), limit(100)), snap => {
      $('#mlist').innerHTML = snap.docs.length ? snap.docs.map(x => { const m = x.data(); return `<div style="padding:12px 0;border-bottom:1px solid var(--bd)"><b>${esc(m.name)}</b> <span class="small">· ${esc(m.email || 'nincs e-mail')} · ${new Date(m.time).toLocaleString('hu-HU')}</span><p style="margin:6px 0">${esc(m.msg).replace(/\n/g, '<br>')}</p><button class="btn sm ghost" data-m="${x.id}">Törlés</button></div>`; }).join('') : '<p class="small" style="margin:0">Még nincs üzenet.</p>';
      $('#mlist').querySelectorAll('[data-m]').forEach(b => b.onclick = () => deleteDoc(doc(db, 'messages', b.dataset.m)));
    }, x => { $('#mlist').textContent = 'Az üzenetek nem tölthetők be: ' + (x.code || x.message); });
  }
}

/* ---------- beállítások / tagkezelés ---------- */
function settingsPage() {
  const root = $('#main');
  if (!user) { root.innerHTML = lockView(); return; }
  if (!profile || profile.disabled) { const g = gate(); root.innerHTML = g; gateEvents(); return; }
  const admin = isAdmin();
  const NAME_RE = /^[A-Za-z0-9_.\-]{3,20}$/;
  root.innerHTML = `<section class="wrap" style="padding-top:26px"><h1>Beállítások</h1>
  <div class="g2" style="align-items:start">
    <div class="card"><h2>Fiók</h2>
      <p style="margin:0 0 4px"><span class="small">E-mail</span><br><b>${esc(user.email)}</b> ${user.emailVerified || admin ? '<span class="pill g">megerősítve</span>' : '<span class="pill y">nincs megerősítve</span>'}</p>
      <form id="nameForm"><label for="nn">Felhasználónév</label><input id="nn" required maxlength="20" value="${esc(profile.name)}" autocomplete="off">
      <div style="margin-top:14px"><button class="btn sm" type="submit">Név mentése</button></div></form></div>
    <div class="card"><h2>Jelszó</h2>
      <form id="pwForm"><label for="pw0">Jelenlegi jelszó</label><input id="pw0" type="password" required autocomplete="current-password">
      <label for="pw1">Új jelszó</label><input id="pw1" type="password" required minlength="6" autocomplete="new-password">
      <label for="pw2">Új jelszó újra</label><input id="pw2" type="password" required minlength="6" autocomplete="new-password">
      <div class="row" style="margin-top:14px"><button class="btn sm" type="submit">Jelszó módosítása</button><button class="btn sm ghost" type="button" id="selfReset">Elfelejtettem: e-mail küldése</button></div></form></div>
  </div>
  ${admin ? `<div class="card"><h2>Tagok kezelése <span class="small" id="mCount"></span></h2>
    <input id="mSearch" placeholder="Keresés név vagy e-mail alapján…" style="margin-bottom:12px" autocomplete="off">
    <div class="tbl"><table><thead><tr><th>Név</th><th>E-mail</th><th>Regisztrált</th><th>Állapot</th><th>Műveletek</th></tr></thead><tbody id="mBody"><tr><td colspan="5">Betöltés…</td></tr></tbody></table></div>
    <p class="hint" style="margin:12px 0 0">Jelszót másnak nem lehet közvetlenül beállítani: a „Jelszó-mail” gomb jelszó-visszaállító levelet küld a tagnak, abban ő maga választ újat. A „Törlés” eltávolítja a profilját és letiltja a hozzáférését (a neve felszabadul). A bejelentkezési adata a Firebase Console → Authentication → Users listán egy kattintással véglegesen is törölhető.</p></div>` : ''}
  </section>`;
  showStoredFlash();

  $('#nameForm').onsubmit = async e => {
    e.preventDefault();
    const nn = $('#nn').value.trim(), lcNew = nn.toLowerCase(), lcOld = profile.name.toLowerCase(), btn = e.submitter || e.target.querySelector('[type=submit]');
    if (!NAME_RE.test(nn)) { toast('A felhasználónév 3–20 karakter lehet (angol betű, szám, _ . -).', 'err'); return; }
    if (nn === profile.name) { toast('Ez már a jelenlegi neved.', 'err'); return; }
    btn.disabled = true;
    try {
      if (lcNew !== lcOld) {
        const ex = await getDoc(doc(db, 'usernames', lcNew));
        if (ex.exists() && ex.data().uid !== user.uid) throw { m: 'Ez a felhasználónév már foglalt.' };
      }
      const b = writeBatch(db);
      if (lcNew !== lcOld) { b.set(doc(db, 'usernames', lcNew), { uid: user.uid }); if (!isReserved(lcOld)) b.delete(doc(db, 'usernames', lcOld)); }
      b.update(doc(db, 'users', user.uid), { name: nn });
      if (isAdmin()) b.update(doc(db, 'admins', user.uid), { name: nn });
      await b.commit();
      await updateProfile(auth.currentUser, { displayName: nn }).catch(() => { });
      flashNext('A felhasználóneved megváltozott.'); location.reload();
    } catch (x) { toast(x.m || ('Nem sikerült: ' + (x.code || x.message)), 'err'); btn.disabled = false; }
  };
  $('#pwForm').onsubmit = async e => {
    e.preventDefault();
    const p0 = $('#pw0').value, p1 = $('#pw1').value, p2 = $('#pw2').value, btn = e.submitter || e.target.querySelector('[type=submit]');
    if (p1.length < 6) { toast('Az új jelszó legalább 6 karakter legyen.', 'err'); return; }
    if (p1 !== p2) { toast('A két új jelszó nem egyezik.', 'err'); return; }
    btn.disabled = true;
    try {
      await reauthenticateWithCredential(auth.currentUser, EmailAuthProvider.credential(user.email, p0));
      await updatePassword(auth.currentUser, p1);
      e.target.reset(); toast('A jelszavad megváltozott.');
    } catch (x) { const c = String(x.code || ''); toast(c.includes('invalid-credential') || c.includes('wrong-password') ? 'A jelenlegi jelszó hibás.' : c.includes('too-many') ? 'Túl sok próbálkozás, várj egy kicsit.' : 'Nem sikerült: ' + (x.code || x.message), 'err'); }
    btn.disabled = false;
  };
  $('#selfReset').onclick = async () => { try { await sendPasswordResetEmail(auth, user.email); toast('Elküldtük a jelszó-visszaállító levelet a(z) ' + user.email + ' címre.'); } catch (x) { toast('Nem sikerült: ' + (x.code || x.message), 'err'); } };

  if (!admin) return;
  let users = [], mails = {}, filter = '';
  const draw = () => {
    const l = users.filter(u => !filter || (u.name || '').toLowerCase().includes(filter) || (mails[u.id] || '').toLowerCase().includes(filter))
      .sort((a, b) => (isAdminName(b.name) - isAdminName(a.name)) || (a.created || 0) - (b.created || 0));
    $('#mCount').textContent = '(' + users.length + ')';
    $('#mBody').innerHTML = l.length ? l.map(u => {
      const adm = isAdminName(u.name), me = u.id === user.uid;
      const stt = adm ? '<span class="pill v">Admin</span>' : u.disabled ? '<span class="pill r">Letiltva</span>' : '<span class="pill g">Aktív</span>';
      return `<tr><td><b>${esc(u.name || '?')}</b>${me ? ' <span class="small">(te)</span>' : ''}</td><td>${esc(mails[u.id] || '–')}</td><td>${u.created ? new Date(u.created).toLocaleDateString('hu-HU') : '–'}</td><td>${stt}</td>
      <td class="acts"><button class="btn sm ghost" data-rs="${u.id}">Jelszó-mail</button>${adm ? '' : `<button class="btn sm ghost" data-dis="${u.id}">${u.disabled ? 'Feloldás' : 'Letiltás'}</button><button class="btn sm danger" data-rm="${u.id}">Törlés</button>`}</td></tr>`;
    }).join('') : '<tr><td colspan="5">Nincs találat.</td></tr>';
    const U = id => users.find(x => x.id === id);
    $('#mBody').querySelectorAll('[data-rs]').forEach(b => b.onclick = async () => {
      const em = mails[b.dataset.rs]; if (!em) { toast('Ennek a tagnak nincs ismert e-mail címe.', 'err'); return; }
      if (!confirm('Jelszó-visszaállító levelet küldesz ide: ' + em + ' ?')) return;
      try { await sendPasswordResetEmail(auth, em); toast('A jelszó-visszaállító levél elment: ' + em); } catch (x) { toast('Nem sikerült: ' + (x.code || x.message), 'err'); }
    });
    $('#mBody').querySelectorAll('[data-dis]').forEach(b => b.onclick = async () => { const u = U(b.dataset.dis); try { await updateDoc(doc(db, 'users', u.id), { disabled: !u.disabled }); toast(u.disabled ? 'A tag hozzáférése visszaállítva.' : 'A tag le van tiltva.'); } catch (x) { toast('Nem sikerült: ' + (x.code || x.message), 'err'); } });
    $('#mBody').querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => {
      const u = U(b.dataset.rm); if (!confirm('Biztosan törlöd ezt a tagot: ' + u.name + ' ?\nA profilja megszűnik, és nem fér hozzá a tippekhez.')) return;
      try {
        const bt = writeBatch(db);
        bt.delete(doc(db, 'users', u.id)); bt.delete(doc(db, 'userEmails', u.id)); bt.delete(doc(db, 'usernames', String(u.name || '').toLowerCase()));
        bt.set(doc(db, 'banned', u.id), { name: u.name || '', time: Date.now() });
        await bt.commit(); toast('A tag törölve.');
      } catch (x) { toast('Nem sikerült: ' + (x.code || x.message), 'err'); }
    });
  };
  $('#mSearch').oninput = e => { filter = e.target.value.trim().toLowerCase(); draw(); };
  onSnapshot(collection(db, 'users'), sn => { users = sn.docs.map(d => ({ id: d.id, ...d.data() })); draw(); }, x => { $('#mBody').innerHTML = `<tr><td colspan="5">Nem tölthető be: ${esc(x.code || x.message)}</td></tr>`; });
  onSnapshot(collection(db, 'userEmails'), sn => { mails = {}; sn.docs.forEach(d => mails[d.id] = d.data().email); draw(); }, () => { });
}

/* ---------- indítás ---------- */
async function start(u) {
  user = u; profile = null; adminFlag = false;
  if (u) {
    try {
      const [p, a] = await Promise.all([getDoc(doc(db, 'users', u.uid)), getDoc(doc(db, 'admins', u.uid))]);
      profile = p.exists() ? p.data() : null; adminFlag = a.exists();
    } catch (e) { }
  }
  layout();
  if (page === 'auth') authPage();
  else if (page === 'tippek') tippekPage();
  else if (page === 'contact') contactPage();
  else if (page === 'home') homePage();
  else if (page === 'settings') settingsPage();
  if (page !== 'tippek' && page !== 'settings') showStoredFlash();
}

if (bootError) {
  layout();
  $('#main').innerHTML = `<section class="wrap narrow"><div class="panel center" style="margin-top:50px"><h1>Betöltési hiba</h1><p class="small" style="font-size:.95rem">Az oldal egy szükséges fájlt nem tudott betölteni. Valószínűleg a <b>js/firebase-config.js</b> hiányzik, vagy hibás a tartalma (az első sorának ez kell lennie: <code>export const firebaseConfig = {</code>).</p><p class="small" style="word-break:break-word;color:var(--bad)">${esc(String(bootError && bootError.message || bootError))}</p></div></section>`;
} else if (!configured) { layout(); setupBanner(); }
else {
  app = initializeApp(firebaseConfig); auth = getAuth(app); auth.languageCode = 'hu'; db = getFirestore(app);
  setPersistence(auth, browserSessionPersistence).catch(() => { }).finally(() => {
    let first = true;
    onAuthStateChanged(auth, u => { if (first) { first = false; start(u); } else if (!authBusy && (!!u) !== (!!user)) location.reload(); });
  });
}
