/*BOOT_START*/
let firebaseConfig, initializeApp, getAuth, onAuthStateChanged, setPersistence, browserSessionPersistence, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut, sendEmailVerification, sendPasswordResetEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, verifyPasswordResetCode, confirmPasswordReset, applyActionCode;
let getFirestore, collection, doc, addDoc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, onSnapshot, query, where, orderBy, limit, writeBatch;
let mktList, mktDef, lineSuggest, buildPick, evalTip, otFlag;
let bootError = null;
try {
  ({ firebaseConfig } = await import('./firebase-config.js'));
  ({ initializeApp } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'));
  ({ getAuth, onAuthStateChanged, setPersistence, browserSessionPersistence, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut, sendEmailVerification, sendPasswordResetEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, verifyPasswordResetCode, confirmPasswordReset, applyActionCode } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'));
  ({ getFirestore, collection, doc, addDoc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, onSnapshot, query, where, orderBy, limit, writeBatch } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js'));
  ({ mktList, mktDef, lineSuggest, buildPick, evalTip, otFlag } = await import('./markets.js'));
} catch (e) { bootError = e; }
/*BOOT_END*/

const ADMIN_NAMES = ['_Notryn', 'Kriszhhh'];                 // foglalt (admin) nevek: aki ezeket elsőként regisztrálja, az lesz az admin = tippadó
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

const picOf = p => (p && typeof p.avatar === 'string' && p.avatar.startsWith('data:image/')) ? p.avatar : '';

/* ---------- oldalváz ---------- */
function layout() {
  if (!document.querySelector('link[rel=manifest]')) document.head.insertAdjacentHTML('beforeend', '<link rel="manifest" href="/manifest.webmanifest"><link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png"><link rel="icon" type="image/png" sizes="64x64" href="/assets/favicon-64.png"><link rel="shortcut icon" href="/assets/favicon.ico"><link rel="apple-touch-icon" href="/assets/apple-touch-icon.png"><meta property="og:image" content="/assets/logo.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="VikingGOLD">');
  const nav = [['home', '/', 'Kezdőlap'], ['tippek', '/tippek', 'Tippek'], ['updates', '/updates', 'Updates'], ['chat', '/chat', 'Chat'], ['contact', '/elerhetosegek', 'Elérhetőségek']];
  $('#hdr').innerHTML = `
<header class="top">
  <a class="logo" href="/" aria-label="VikingGOLD"><span class="mark"><img src="/assets/logo.webp" alt="" width="46" height="46" style="display:block;width:46px;height:46px;object-fit:contain"></span><span class="wm">Viking<b>GOLD</b></span></a>
  <button class="burger" id="burger" aria-label="Menü" aria-expanded="false"><i></i><i></i><i></i></button>
  <nav class="nav" id="nav">${nav.map(([k, h, l]) => `<a href="${h}" class="${page === k ? 'on' : ''}">${l}</a>`).join('')}</nav>
  <div class="usr" id="usr"><button class="uic" id="uic" aria-haspopup="true" aria-expanded="false" aria-label="Fiók">${picOf(profile) ? `<img src="${picOf(profile)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block">` : `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.2 3.6-7 8-7s8 2.8 8 7"/></svg>`}${user ? '<i class="dot"></i>' : ''}</button>
    <div class="menu" id="umenu" hidden>${user
      ? `<div class="who"><span>${esc((profile && profile.name) || user.displayName || user.email.split('@')[0])}</span><small>${isAdmin() ? 'Admin' : 'Tag'}</small></div><a href="/tippek">Tippek</a><a href="/beallitasok">${isAdmin() ? 'Beállítások / Tagkezelés' : 'Beállítások'}</a><a href="#" id="logout">Kijelentkezés</a>`
      : '<a href="/auth?mode=login">Belépés</a><a href="/auth?mode=register">Regisztráció</a>'}</div></div>
</header>`;
  $('#ftr').innerHTML = `<footer class="foot"><div class="wrap"><div><b>Viking<span class="g">GOLD</span></b><p>Labdarúgás, jégkorong, kézilabda, tenisz és kosárlabda tippek.</p></div><div class="fl"><a href="/">Kezdőlap</a><a href="/tippek">Tippek</a><a href="/updates">Updates</a><a href="/chat">Chat</a><a href="/elerhetosegek">Elérhetőségek</a></div><p class="small">A tippek nem garantálnak nyereményt. A fogadás kockázattal jár – csak annyit tegyél fel, amennyit megengedhetsz magadnak. 18 év alatt tilos. Segítség: Kék Vonal 116-123.</p></div></footer>`;
  // menü viselkedés
  const uic = $('#uic'), um = $('#umenu'), bg = $('#burger'), nv = $('#nav');
  uic.onclick = e => { e.stopPropagation(); um.hidden = !um.hidden; uic.setAttribute('aria-expanded', String(!um.hidden)); };
  document.onclick = e => { if (!um.hidden && !um.contains(e.target)) um.hidden = true; };
  bg.onclick = () => { const o = nv.classList.toggle('open'); bg.setAttribute('aria-expanded', String(o)); };
  const lo = $('#logout'); if (lo) lo.onclick = async e => { e.preventDefault(); await signOut(auth); flashNext('Sikeresen kijelentkeztél.'); location.href = '/'; };
}



/* ---------- közös ---------- */
const SPORTS = [['labdarugas', 'Labdarúgás', '⚽'], ['jegkorong', 'Jégkorong', '🏒'], ['kezilabda', 'Kézilabda', '🤾'], ['tenisz', 'Tenisz', '🎾'], ['kosarlabda', 'Kosárlabda', '🏀']];
const SPORT_KEYS = SPORTS.map(x => x[0]);
const sportOf = t => SPORT_KEYS.includes(t.sport) ? t.sport : 'jegkorong';   // régi tippek = jégkorong
const LAB = { pend: 'Függőben', win: 'Nyert', loss: 'Vesztett', void: 'Érvénytelen' };
const NEXT = { pend: 'win', win: 'loss', loss: 'void', void: 'pend' };
const ICON = { win: '<span class="ic win" title="Nyert">✔</span>', loss: '<span class="ic loss" title="Vesztett">✕</span>', void: '<span class="ic void" title="Érvénytelen">↩</span>', pend: '<span class="ic pend" title="Függőben">⏳</span>' };
/* a tipp tényleges állapota: ha van végeredmény és még "függőben", a rendszer magától eldönti (nyert / vesztett / érvénytelen) */
const effStatus = t => { const s = t.status || 'pend'; if (s !== 'pend') return s; return (t.result && evalTip({ ...t, sport: sportOf(t) })) || 'pend'; };
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
/* bejött | összes (az érvénytelen tippek nem számítanak bele) */
const cnt = l => { let w = 0, n = 0, p = 0; l.forEach(t => { const s = effStatus(t); if (s === 'void') return; n++; if (s === 'win') w++; else if (s === 'pend') p++; }); return { w, n, p }; };
const scH = c => `<span class="sc" title="${c.w} bejött, ${c.n - c.w - c.p} elbukott, ${c.p} függőben"><b class="sw">${c.w}</b><i>|</i><b>${c.n}</b></span>`;
const fmtAvg = n => n.toFixed(1).replace('.', ',');
const watchUsers = cb => onSnapshot(collection(db, 'users'), s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => cb(null));

function setupBanner() {
  $('#main').innerHTML = `<section class="wrap narrow"><div class="panel center" style="margin-top:50px"><h1>Beállítás szükséges</h1><p class="small" style="font-size:.95rem">Töltsd ki a <b>js/firebase-config.js</b> fájlt a Firebase projekt adataival. A lépések a README.txt-ben vannak.</p></div></section>`;
}
function lockView() {
  return `<section class="wrap narrow"><div class="panel lock"><div class="big">🔒</div><h1>Csak tagoknak</h1><p class="small" style="font-size:.95rem">A tippeket a regisztrált és belépett felhasználók láthatják. A regisztráció ingyenes és két perc.</p><div class="row" style="justify-content:center;margin-top:18px"><a class="btn" href="/auth?mode=login&next=/tippek">Belépés</a><a class="btn ghost" href="/auth?mode=register&next=/tippek">Regisztráció</a></div></div></section>`;
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
  const o = $('#gOut'); if (o) o.onclick = async () => { await signOut(auth); location.href = '/'; };
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

/* ---------- kezdőlap: heti / havi statisztika (találati arány %) ---------- */
function statRanges() {
  const n = new Date(), d0 = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  const wk = new Date(d0); wk.setDate(d0.getDate() - ((d0.getDay() + 6) % 7));            // az aktuális hét hétfője
  const wk2 = new Date(wk); wk2.setDate(wk.getDate() + 7);
  const pwk = new Date(wk); pwk.setDate(wk.getDate() - 7);
  const mo = new Date(d0.getFullYear(), d0.getMonth(), 1), mo2 = new Date(d0.getFullYear(), d0.getMonth() + 1, 1), pmo = new Date(d0.getFullYear(), d0.getMonth() - 1, 1);
  const last = new Date(wk2); last.setDate(wk2.getDate() - 1);
  return {
    week: [ymd(wk), ymd(wk2)], pweek: [ymd(pwk), ymd(wk)], month: [ymd(mo), ymd(mo2)], pmonth: [ymd(pmo), ymd(mo)],
    from: [ymd(pwk), ymd(pmo)].sort()[0],
    weekLab: `${MONTHS[wk.getMonth() + 1]} ${wk.getDate()}. – ${MONTHS[last.getMonth() + 1]} ${last.getDate()}.`,
    monthLab: `${mo.getFullYear()}. ${MONTHS[mo.getMonth() + 1]}`
  };
}
/* tips: tömb = adatok, null = csak tagoknak, undefined = betöltési hiba */
function statCss() {
  if (document.getElementById('vgs-css')) return;
  const st = document.createElement('style'); st.id = 'vgs-css';
  st.textContent = `
#statBox{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin:0 0 14px;text-align:left}
.vgs{position:relative;overflow:hidden;min-width:0;padding:24px 24px 18px;border-radius:20px;border:1px solid rgba(148,163,184,.16);background:linear-gradient(180deg,rgba(17,24,39,.88),rgba(10,14,24,.94));box-shadow:0 24px 60px -30px #000;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.vgs::before{content:"";position:absolute;left:0;right:0;top:0;height:3px;background:linear-gradient(90deg,transparent,#f6c453,transparent)}
.vgs-x{grid-column:1/-1;text-align:center;padding:30px 20px}.vgs-x .big{font-size:2rem}.vgs-x p{margin:8px 0 0;color:#94a3b8}
.vgs-h{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:4px 12px}
.vgs-h span{font-weight:800;font-size:.82rem;letter-spacing:.1em;text-transform:uppercase;color:#ffe29a}
.vgs-h small{font-size:.8rem;color:#94a3b8;font-weight:600}
.vgs-main{display:flex;align-items:flex-end;gap:16px;margin:16px 0 14px}
.vgs-pct{font-size:3.6rem;line-height:.9;font-weight:800;letter-spacing:-.04em;color:#ffe29a;font-variant-numeric:tabular-nums}
.vgs-pct i{font-style:normal;font-size:1.7rem;margin-left:2px;color:#f6c453}
.vgs-lab{padding-bottom:3px;display:flex;flex-direction:column;gap:2px}
.vgs-lab b{font-size:.78rem;text-transform:uppercase;letter-spacing:.1em;color:#e2e8f0}
.vgs-lab span{font-size:.82rem;color:#94a3b8}
.vgs-bar{height:8px;border-radius:8px;background:rgba(148,163,184,.16);overflow:hidden}
.vgs-bar u{display:block;height:100%;border-radius:8px;background:linear-gradient(90deg,#2dd4a0,#7ef0c8);transition:width .6s}
.vgs-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:16px}
.vgs-c{padding:10px 4px;border-radius:12px;text-align:center;border:1px solid rgba(148,163,184,.14);background:rgba(255,255,255,.03)}
.vgs-c b{display:block;font-size:1.35rem;line-height:1.2;font-weight:800;color:#f1f5f9;font-variant-numeric:tabular-nums}
.vgs-c span{display:block;margin-top:2px;font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.02em;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vgs-c.w{border-color:rgba(45,212,160,.4);background:rgba(45,212,160,.07)}.vgs-c.w b{color:#2dd4a0}
.vgs-c.l{border-color:rgba(251,90,110,.4);background:rgba(251,90,110,.07)}.vgs-c.l b{color:#fb5a6e}
.vgs-cmp{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px;margin-top:14px;padding:11px 14px;border-radius:12px;background:rgba(255,255,255,.03);font-size:.86rem;color:#94a3b8}
.vgs-cmp b{color:#ffe29a;font-size:1rem}.vgs-cmp em{font-style:normal;color:#94a3b8}
.vgs-cmp i{font-style:normal;font-weight:800;margin-left:auto}.vgs-cmp i.up{color:#2dd4a0}.vgs-cmp i.dn{color:#fb5a6e}.vgs-cmp i.eq{color:#94a3b8}
.vgs-tot{margin:10px 2px 0;font-size:.78rem;color:#64748b}
.vgs-sp{margin-top:14px;padding-top:6px;border-top:1px solid rgba(148,163,184,.14)}
.vgs-r{display:grid;grid-template-columns:minmax(104px,1.1fr) minmax(40px,1fr) 44px 46px;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid rgba(148,163,184,.1);font-size:.9rem;color:#e2e8f0}
.vgs-r:last-child{border-bottom:0}
.vgs-r .n{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vgs-r .m{height:5px;border-radius:5px;background:rgba(148,163,184,.16);overflow:hidden}.vgs-r .m u{display:block;height:100%;background:#2dd4a0;border-radius:5px}
.vgs-r .s{text-align:right;color:#94a3b8;font-variant-numeric:tabular-nums;white-space:nowrap}
.vgs-r b{text-align:right;color:#ffe29a;font-variant-numeric:tabular-nums}
@media(max-width:760px){#statBox{grid-template-columns:minmax(0,1fr)}.vgs{padding:20px 18px 14px}.vgs-pct{font-size:3rem}}`;
  document.head.appendChild(st);
}
function homeStats(tips, err) {
  try { homeStatsDraw(tips, err); }
  catch (e) { const b = $('#statBox'); if (b) b.innerHTML = `<div class="card psx"><div class="big">⚠️</div><p class="small" style="font-size:.95rem">A statisztika kiszámítása nem sikerült.</p><p class="small" style="word-break:break-word;color:var(--bad)">${esc(String((e && e.message) || e))}</p></div>`; }
}
function homeStatsDraw(tips, err) {
  const box = $('#statBox'); if (!box) return;
  statCss();
  if (!tips) {
    const msg = tips === null ? 'A statisztikát a regisztrált, belépett tagok látják.' : 'A statisztika most nem tölthető be.' + (err ? `<br><span style="color:var(--bad);word-break:break-word">${esc(String(err.code || err.message || err))}</span>` : '');
    const cta = tips === null ? '<div class="row" style="justify-content:center;margin-top:14px"><a class="btn" href="/auth?mode=register">Regisztráció</a><a class="btn ghost" href="/auth?mode=login">Belépés</a></div>' : '';
    box.innerHTML = `<div class="vgs vgs-x"><div class="big">${tips === null ? '🔒' : '⚠️'}</div><p style="font-size:.95rem">${msg}</p>${cta}</div>`;
    return;
  }
  const R = statRanges(), inR = (t, r) => String(t.date || '') >= r[0] && String(t.date || '') < r[1];
  const tally = l => { const r = { w: 0, l: 0, v: 0, p: 0 }; l.forEach(t => { let st = 'pend'; try { st = effStatus(t); } catch (e) { } r[{ win: 'w', loss: 'l', void: 'v' }[st] || 'p']++; }); r.dec = r.w + r.l; r.pct = r.dec ? Math.round(r.w / r.dec * 100) : null; r.all = l.length; return r; };
  const pc = r => r.pct == null ? '–' : r.pct + '%';
  const card = (title, range, cur, prev, prevLab, list) => {
    const sp = SPORTS.map(([k, n, e]) => { const r = tally(list.filter(t => sportOf(t) === k)); return r.all ? `<div class="vgs-r"><span class="n">${e} ${n}</span><span class="m"><u style="width:${r.pct || 0}%"></u></span><span class="s">${r.w} | ${r.dec}</span><b>${pc(r)}</b></div>` : ''; }).join('');
    const dlt = cur.pct != null && prev.pct != null ? cur.pct - prev.pct : null;
    const dh = dlt == null ? '' : `<i class="${dlt > 0 ? 'up' : dlt < 0 ? 'dn' : 'eq'}">${dlt > 0 ? '▲' : dlt < 0 ? '▼' : '='} ${Math.abs(dlt)} százalékpont</i>`;
    return `<div class="vgs"><div class="vgs-h"><span>${title}</span><small>${range}</small></div>
      <div class="vgs-main"><div class="vgs-pct">${cur.pct == null ? '–' : cur.pct + '<i>%</i>'}</div><div class="vgs-lab"><b>találati arány</b><span>${cur.dec ? cur.w + ' | ' + cur.dec + ' lezárt tipp' : 'még nincs lezárt tipp'}</span></div></div>
      <div class="vgs-bar"><u style="width:${cur.pct || 0}%"></u></div>
      <div class="vgs-grid"><div class="vgs-c w"><b>${cur.w}</b><span>Nyert</span></div><div class="vgs-c l"><b>${cur.l}</b><span>Vesztett</span></div><div class="vgs-c"><b>${cur.v}</b><span>Érvénytelen</span></div><div class="vgs-c"><b>${cur.p}</b><span>Függőben</span></div></div>
      <div class="vgs-cmp"><span>${prevLab}</span><b>${pc(prev)}</b>${prev.dec ? `<em>${prev.w} | ${prev.dec}</em>` : '<em>nincs lezárt tipp</em>'}${dh}</div>
      <p class="vgs-tot">Az időszak összes tippje: ${cur.all}</p>
      ${cur.all ? `<div class="vgs-sp">${sp}</div>` : ''}</div>`;
  };
  const wl = tips.filter(t => inR(t, R.week)), ml = tips.filter(t => inR(t, R.month));
  box.innerHTML = card('Heti statisztika', R.weekLab, tally(wl), tally(tips.filter(t => inR(t, R.pweek))), 'Előző hét', wl) + card('Havi statisztika', R.monthLab, tally(ml), tally(tips.filter(t => inR(t, R.pmonth))), 'Előző hónap', ml);
}

function watchStats() {
  const done = sn => homeStats(sn.docs.map(d => ({ id: d.id, ...d.data() })));
  onSnapshot(query(collection(db, 'tips'), where('date', '>=', statRanges().from)), done,
    e1 => onSnapshot(query(collection(db, 'tips'), orderBy('date', 'desc'), limit(1000)), done, e2 => homeStats(undefined, e2 || e1)));   // ha a szűrt lekérdezés nem megy, a Tippek oldalival azonos módon próbáljuk
}

/* ---------- kezdőlap ---------- */
function homePage() {
  const cta = $('#ctaReg'), bn = $('#bnRow');
  if (user && cta) cta.remove();
  if (bn) bn.innerHTML = user ? '<a class="btn" href="/tippek">Tippek</a>' : '<div class="row"><a class="btn" href="/auth?mode=register">Regisztráció</a><a class="btn ghost" href="/auth?mode=login">Belépés</a></div>';
  const renderPl = list => {
    if (!list) { $('#plist').innerHTML = '<span class="small">A lista nem tölthető be.</span>'; return; }
    list = list.filter(u => !u.disabled && u.verified === true).sort((a, b) => (isAdminName(b.name) - isAdminName(a.name)) || (a.created || 0) - (b.created || 0) || String(a.name).localeCompare(String(b.name)));
    $('#stPlayers').textContent = list.length;
    $('#plCount').textContent = '(' + list.length + ')';
    $('#plist').innerHTML = list.length ? list.map(u => `<span class="chip ${isAdminName(u.name) ? 'adm' : ''}">${picOf(u) ? `<img src="${picOf(u)}" alt="" style="width:22px;height:22px;border-radius:50%;object-fit:cover;margin:-2px 2px -2px -6px">` : ''}${esc(u.name || '?')}${isAdminName(u.name) ? ' <i>Admin · Tippadó</i>' : ''}</span>`).join('') : '<span class="small">Még nincs regisztrált játékos.</span>';
  };
  let lastUsers = null;
  onSnapshot(collection(db, 'admins'), sn => { ADMIN_SET = new Set([...RESERVED, ...sn.docs.map(d => String(d.data().name || '').toLowerCase())]); $('#stTipsters').textContent = Math.max(sn.size, 1); if (lastUsers) renderPl(lastUsers); }, () => { $('#stTipsters').textContent = ADMIN_NAMES.length; });
  $('#sportTiles').innerHTML = SPORTS.map(([k, n, e]) => `<a class="sp reveal" href="/tippek?s=${k}"><span class="e">${e}</span><b>${n}</b><small>Tippek →</small></a>`).join('');
  watchUsers(list => { lastUsers = list; renderPl(list); });
  const member = user && profile && !profile.disabled && (user.emailVerified || isAdmin());
  if (member) {
    onSnapshot(query(collection(db, 'tips'), where('date', '==', ymd(new Date()))), s => { $('#stToday').textContent = s.size; }, () => { });
    watchStats();
  } else homeStats(null);
}


/* ---------- jelszó-visszaállítás: a levél 5 percig érvényes, és csak a legutolsó kért levél él ---------- */
const RESET_MIN = 5;
const sha = async t => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t.trim().toLowerCase())))].map(b => b.toString(16).padStart(2, '0')).join('');
async function sendReset(email) {
  const k = 'vg_rs_' + email.toLowerCase(), last = +localStorage.getItem(k) || 0;
  if (Date.now() - last < 60000) throw { m: 'Az előző levelet most küldtük, várj 1 percet az újabb kéréssel.' };
  const t = Date.now();
  await setDoc(doc(db, 'resetReqs', await sha(email)), { t });                       // ez jelöli ki az egyetlen érvényes levelet
  await sendPasswordResetEmail(auth, email, { url: location.origin + '/auth?rt=' + t, handleCodeInApp: false });
  localStorage.setItem(k, String(t));
}
const resetErr = x => x.m || (String(x.code || '').includes('too-many') ? 'Túl sok kérés, várj egy kicsit.' : 'Nem sikerült: ' + (x.code || x.message));
async function resetPage(code, rt) {
  const box = h => $('#main').innerHTML = `<section class="wrap narrow authbox"><div class="panel center">${h}</div></section>`;
  const dead = (why) => box(`<div class="big">⏱️</div><h1>A link nem érvényes</h1><p class="small">${why}</p><div class="row" style="justify-content:center"><a class="btn" href="/auth?mode=login">Új levél kérése</a></div>`);
  try {
    const email = await verifyPasswordResetCode(auth, code);
    const rq = await getDoc(doc(db, 'resetReqs', await sha(email)));
    const t = rq.exists() ? rq.data().t : 0;
    if (!rt || +rt !== t) return dead('Ennél újabb jelszó-levelet is kértél, csak a legutolsó működik.');
    if (Date.now() - t > RESET_MIN * 60000) return dead(`A link ${RESET_MIN} percig érvényes, ez már lejárt.`);
    box(`<h1>Új jelszó</h1><p class="small">${esc(email)}</p><div id="aerr"></div><form id="rf" style="text-align:left"><label for="n1">Új jelszó</label><input id="n1" type="password" minlength="6" required autocomplete="new-password"><label for="n2">Új jelszó újra</label><input id="n2" type="password" minlength="6" required autocomplete="new-password"><div style="margin-top:20px"><button class="btn" style="width:100%" type="submit">Jelszó mentése</button></div></form>`);
    $('#rf').onsubmit = async e => {
      e.preventDefault(); const a = $('#n1').value;
      if (a !== $('#n2').value) { $('#aerr').innerHTML = '<div class="flash err" style="margin:12px 0">A két jelszó nem egyezik.</div>'; return; }
      if (Date.now() - t > RESET_MIN * 60000) return dead(`A link ${RESET_MIN} percig érvényes, ez már lejárt.`);
      try { await confirmPasswordReset(auth, code, a); await setDoc(doc(db, 'resetReqs', await sha(email)), { t: 0 }); flashNext('Az új jelszavad beállítva, most már beléphetsz.'); location.href = '/auth?mode=login'; }
      catch (x) { $('#aerr').innerHTML = `<div class="flash err" style="margin:12px 0">${esc(x.code === 'auth/weak-password' ? 'A jelszó túl gyenge.' : 'Nem sikerült: ' + (x.code || x.message))}</div>`; }
    };
  } catch (x) { dead('A link hibás, lejárt vagy már felhasználták.'); }
}
async function verifyPage(code) {
  let ok = true; try { await applyActionCode(auth, code); } catch (x) { ok = false; }
  flashNext(ok ? 'Az e-mail címed megerősítve.' : 'A megerősítő link hibás vagy lejárt.', ok ? 'ok' : 'err');
  location.replace('/tippek');
}

function authPage() {
  if (params.get('mode') === 'resetPassword' && params.get('oobCode')) { let rt = ''; try { rt = new URL(params.get('continueUrl') || '').searchParams.get('rt') || ''; } catch (e) { } return resetPage(params.get('oobCode'), rt); }
  if (params.get('mode') === 'verifyEmail' && params.get('oobCode')) return verifyPage(params.get('oobCode'));
  const mode = params.get('mode') === 'register' ? 'register' : 'login';
  const nextRaw = params.get('next') || '/tippek';
  const next = ['/tippek', '/', '/elerhetosegek', '/beallitasok'].includes(nextRaw) ? nextRaw : '/tippek';
  if (user) { location.replace(next); return; }
  const reg = mode === 'register';
  $('#main').innerHTML = `<section class="wrap narrow authbox"><div class="panel">
  <div class="tabs"><a class="${!reg ? 'on' : ''}" href="/auth?mode=login&next=${next}">Belépés</a><a class="${reg ? 'on' : ''}" href="/auth?mode=register&next=${next}">Regisztráció</a></div>
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
    try { await sendReset(mail); toast('Ha ez az e-mail cím regisztrálva van, elküldtük a levelet. 5 percig érvényes, nézd meg a spam mappát is.'); }
    catch (x) { err(resetErr(x)); }
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
        await sendEmailVerification(c.user).catch(() => { });
        await signOut(auth).catch(() => { });   // regisztráció után nem léptetjük be: előbb meg kell erősíteni az e-mailt
        flashNext('Sikeres regisztráció! Küldtünk egy megerősítő levelet, kattints a benne lévő linkre (nézd meg a spam mappát is), utána tudsz belépni.');
        location.href = '/auth?mode=login&next=' + next;
        return;
      } else {
        const c = await signInWithEmailAndPassword(auth, email, pass);
        let adm = false; try { adm = (await getDoc(doc(db, 'admins', c.user.uid))).exists(); } catch (e) { }
        if (!c.user.emailVerified && !adm) {
          await sendEmailVerification(c.user).catch(() => { });
          await signOut(auth).catch(() => { });
          throw { m: 'Az e-mail címed még nincs megerősítve. Újra elküldtük a megerősítő levelet: kattints a benne lévő linkre (nézd meg a spam mappát is), utána tudsz belépni.' };
        }
        try { await updateDoc(doc(db, 'users', c.user.uid), { verified: true }); } catch (e) { }   // megerősített e-mail: innentől megjelenik a tagok között
        flashNext('Üdv újra!');
      }
      location.href = next;
    } catch (x) {
      const c = x.code || '';
      err(x.m || (c.includes('email-already') ? 'Ezzel az e-mail címmel már van regisztráció.' : c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found') ? 'Hibás e-mail cím vagy jelszó. Ellenőrizd, és próbáld újra.' : c.includes('invalid-email') ? 'Az e-mail cím formátuma hibás.' : c.includes('weak-password') ? 'A jelszó túl gyenge.' : c.includes('too-many') ? 'Túl sok próbálkozás, várj egy kicsit.' : c.includes('operation-not-allowed') ? 'A Firebase-ben nincs bekapcsolva az Email/Password belépés.' : 'Hiba: ' + (x.message || c)));
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
  const sync = () => history.replaceState(null, '', `/tippek?s=${st.s}&v=${st.v}${st.v === 'date' ? '&d=' + st.d : ''}`);
  const curDate = () => st.v === 'tomorrow' ? tomorrow : st.v === 'date' ? st.d : today;

  root.innerHTML = `<section class="wrap" style="padding-top:26px">
  <div class="row" style="justify-content:space-between;margin-bottom:12px"><h1 style="margin:0">Tippek</h1>${admin ? '<button class="btn sm" id="newBtn">+ Új tipp</button>' : ''}</div>
  <div class="tabs" id="sTabs"></div>
  <div class="tabs vtabs" id="vTabs"></div>
  <div class="row" id="dRow" style="margin:-6px 0 14px" hidden><input id="dpick" type="date" style="max-width:200px" aria-label="Dátum választása"></div>
  <div id="formBox"></div>
  <div class="sbar" id="sbar"></div>
  <div class="tlog"><div class="tlh"><span>Tippek és eredmények</span><small id="tlSub"></small></div><div id="rbox"></div><div id="tsum"></div><div id="tlist"><div class="empty">Betöltés…</div></div></div>
  </section>`;
  showStoredFlash();

  let rts = [], unR = null, rKey = '', rErr = false;
  const dayDate = () => st.v === 'all' ? today : curDate();
  const rstat = (d, sp) => { let n = 0, sum = 0, mine = 0; rts.forEach(r => { if (r.date === d && r.sport === sp) { const v = +r.stars; if (v >= 1 && v <= 5) { n++; sum += v; if (user && r.uid === user.uid) mine = v; } } }); return { n, avg: n ? sum / n : 0, mine }; };
  function rateHtml(d, sp, hasTips, mini) {
    const r = rstat(d, sp), future = d > today;
    const can = !admin && !future && hasTips && !rErr;
    const note = rErr ? (admin ? 'Az értékelés nincs bekapcsolva: add hozzá a „ratings” Firestore szabályt.' : '') : admin ? 'Tippadóként nem értékelhetsz.' : future ? 'Ezt a napot még nem lehet értékelni.' : !hasTips ? 'Nincs mit értékelni.' : r.mine ? `Értékelésed: ${r.mine} ★ (kattints rá újra a törléshez)` : 'Kattints a csillagokra az értékeléshez.';
    const stars = [5, 4, 3, 2, 1].map(i => `<button type="button" class="star ${i <= r.mine ? 'on' : ''}" data-v="${i}" aria-label="${i} csillag" ${can ? '' : 'disabled'}>★</button>`).join('');
    const avg = r.n ? `<span class="ravg"><span class="avs" style="--p:${(r.avg / 5 * 100).toFixed(0)}%" aria-hidden="true">★★★★★</span><b>${fmtAvg(r.avg)}</b> · ${r.n} értékelés</span>` : '<span class="ravg">Még nincs értékelés</span>';
    return `<div class="rate${mini ? ' mini' : ''}" data-rd="${esc(d)}" data-rs="${esc(sp)}"><span class="rt">${mini ? 'Értékelés' : 'Hogy sikerültek az aznapi tippek?'}</span><span class="rstars${can ? '' : ' off'}" role="group" aria-label="Értékelés 1–5 csillag">${stars}</span>${avg}${mini ? '' : `<span class="rnote">${note}</span>`}</div>`;
  }
  function rate() {
    if (st.v === 'all') { list(); return; }
    const hasTips = all.some(t => sportOf(t) === st.s && t.date === curDate());
    $('#rbox').innerHTML = loaded ? rateHtml(curDate(), st.s, hasTips, false) : '';
  }
  function watchR() {
    const k = st.v === 'all' ? 'all' : curDate(); if (k === rKey) return; rKey = k; if (unR) unR(); rErr = false; rts = [];
    const q = k === 'all' ? query(collection(db, 'ratings'), orderBy('date', 'desc'), limit(2000)) : query(collection(db, 'ratings'), where('date', '==', k));
    unR = onSnapshot(q, sn => { rErr = false; rts = sn.docs.map(d => d.data()); rate(); }, () => { rErr = true; rts = []; rate(); });
  }
  async function vote(d, sp, v) {
    if (!user || admin || d > today) return;
    const id = `${d}_${sp}_${user.uid}`, cur = rstat(d, sp).mine;
    try {
      if (cur === v) await deleteDoc(doc(db, 'ratings', id));
      else await setDoc(doc(db, 'ratings', id), { date: d, sport: sp, uid: user.uid, name: (profile && profile.name) || '', stars: v, ts: Date.now() });
      toast(cur === v ? 'Az értékelésed törölve.' : `Köszi! ${v} ★ értékelést adtál.`);
    } catch (x) { toast('Az értékelés nem sikerült: ' + (x.code || x.message), 'err'); }
  }
  $('.tlog').addEventListener('click', e => {
    const b = e.target.closest('.star'); if (!b || b.disabled) return;
    const r = b.closest('.rate'); vote(r.dataset.rd, r.dataset.rs, +b.dataset.v);
  });
  function scores() {
    const l = matches(), d = dayDate(), inDay = x => x.date === d, inSp = x => sportOf(x) === st.s;
    const nm = SPORTS.find(x => x[0] === st.s), sn = nm ? nm[1] : '';
    const dl = st.v === 'tomorrow' ? 'Holnap' : st.v === 'date' ? 'Napi' : 'Ma';
    const bx = (lab, c) => { const dec = c.n - c.p, loss = dec - c.w; return `<div class="sbx2"><small>${lab}</small>${scH(c)}<div class="bar"><u style="width:${dec ? Math.round(c.w / dec * 100) : 0}%"></u></div><em>${dec ? Math.round(c.w / dec * 100) + '% találat' : 'még nincs lezárt tipp'}${c.p ? ' · ' + c.p + ' függőben' : ''}</em></div>`; };
    $('#sbar').innerHTML = bx(`${dl} · ${esc(sn)}`, cnt(all.filter(x => inDay(x) && inSp(x)))) + bx(`${dl} · összes sportág`, cnt(all.filter(inDay))) + bx(`Összes nap · ${esc(sn)}`, cnt(all.filter(inSp))) + bx('Összes nap · mind', cnt(all));
    $('#tlSub').innerHTML = (st.v === 'all' ? 'összes nap' : huDate(curDate())) + ' · ' + l.length + ' tipp · ' + scH(cnt(l));
  }
  const matches = () => {
    let l = all.filter(t => sportOf(t) === st.s);
    if (st.v !== 'all') l = l.filter(t => t.date === curDate());
    const tk = t => t.time || '99:99';   // a korábbi kezdés van elöl, az idő nélküliek a végén
    return l.sort(st.v === 'all' ? (a, b) => b.date.localeCompare(a.date) || tk(a).localeCompare(tk(b)) : (a, b) => tk(a).localeCompare(tk(b)));
  };
  function tabs() {
    $('#sTabs').innerHTML = SPORTS.map(([k, n, e]) => `<a href="#" data-s="${k}" class="${st.s === k ? 'on' : ''}">${e} ${n} <small>${scH(cnt(all.filter(t => sportOf(t) === k && (st.v === 'all' || t.date === curDate()))))}</small></a>`).join('');
    $('#vTabs').innerHTML = [['today', 'Mai'], ['tomorrow', 'Holnapi'], ['date', 'Dátum szerint'], ['all', 'Összes']].map(([k, n]) => `<a href="#" data-v="${k}" class="${st.v === k ? 'on' : ''}">${n}</a>`).join('');
    $('#dRow').hidden = st.v !== 'date'; $('#dpick').value = st.d;
    $('#sTabs').querySelectorAll('[data-s]').forEach(a => a.onclick = e => { e.preventDefault(); st.s = a.dataset.s; sync(); tabs(); list(); });
    $('#vTabs').querySelectorAll('[data-v]').forEach(a => a.onclick = e => { e.preventDefault(); st.v = a.dataset.v; sync(); tabs(); list(); });
    watchR(); rate();
  }
  function list() {
    if (!loaded) return;
    const ae = document.activeElement;
    if (ae && ae.classList && ae.classList.contains('rb') && $('#tlist').contains(ae)) { pending = true; return; }   // gépelés közben nem frissítjük
    pending = false;
    const l = matches();
    $('#tsum').innerHTML = summary(l);
    scores();
    if (st.v !== 'all') $('#rbox').innerHTML = rateHtml(curDate(), st.s, l.length > 0, false);
    let lastD = '';
    $('#tlist').innerHTML = l.length ? l.map(t => {
      let dh = '';
      if (st.v === 'all' && t.date !== lastD) { lastD = t.date; dh = `<div class="dayh"><span>${huDate(t.date)}</span>${scH(cnt(l.filter(x => x.date === t.date)))}${rateHtml(t.date, st.s, true, true)}</div>`; }
      const s = effStatus(t), ot = sportOf(t) === 'jegkorong' && otFlag(t.result);
      const odds = t.odds > 1 ? ` <span class="od">@${Number(t.odds).toFixed(2)}</span>` : '';
      const who = t.tipster || '?';
      return dh + `<div class="tl st-${s}" data-id="${t.id}"><div class="tlm"><div class="tn">${esc(t.home)} – ${esc(t.away)} ${esc(t.date)}</div>
      <div class="ts">${t.league ? `<span class="lg">${esc(t.league)}</span> · ` : ''}${t.time ? esc(t.time) + ' · ' : ''}Tipp: <b>${esc(t.pick)}</b>${odds} · Tippadó: <b class="tp">${esc(who)}</b>${isAdminName(who) ? ' <i class="tag">Admin</i>' : ''}</div></div>
      <div class="tlr">${admin ? `<input class="rb" data-id="${t.id}" value="${esc(t.result || '')}" placeholder="3-2" maxlength="20" aria-label="Végeredmény">` : `<span class="rb ro ${t.result ? '' : 'e'}">${esc(t.result || '3-2')}</span>`}
      ${admin ? `<button class="icb" data-cy="${t.id}" title="Állapot váltása (eredmény alapján automatikus)">${ICON[s]}</button>` : ICON[s]}${ot ? '<span class="ic ot" title="Hosszabbítás / szétlövés">🏒</span>' : ''}
      ${admin ? `<a href="#" class="ra" data-edit="${t.id}">Szerkesztés</a> · <a href="#" class="ra" data-del="${t.id}">Törlés</a>` : ''}</div></div>`;
    }).join('') : `<div class="empty">Ehhez a sportághoz erre a napra még nincs tipp.${admin ? ' A „+ Új tipp” gombbal tölthetsz fel egyet.' : ' Nézz vissza később!'}</div>`;
    if (!admin) return;
    $('#tlist').querySelectorAll('.rb').forEach(i => {
      i._saved = (all.find(x => x.id === i.dataset.id) || {}).result || '';
      const save = async () => {
        clearTimeout(i._tm);
        const t = all.find(x => x.id === i.dataset.id), val = i.value.trim();
        if (!t || val === i._saved) return;
        const upd = { result: val };
        { const r = val ? evalTip({ ...t, sport: sportOf(t), result: val }) : null; if (!val) upd.status = 'pend'; else if (r) upd.status = r; else if (t.mk) upd.status = 'pend'; }   // az eredményből eldönti: nyert / vesztett / érvénytelen
        i._saved = val;
        try { await updateDoc(doc(db, 'tips', t.id), upd); } catch (x) { i._saved = ''; toast('Nem sikerült: ' + (x.code || x.message), 'err'); }
      };
      i.oninput = () => {   // gépelés közben azonnal frissül a sor (zöld / piros), mentés kis késéssel
        const t = all.find(x => x.id === i.dataset.id); if (!t) return;
        const val = i.value.trim();
        t.result = val;
        { const r = val ? evalTip({ ...t, sport: sportOf(t), result: val }) : null; if (!val) t.status = 'pend'; else if (r) t.status = r; else if (t.mk) t.status = 'pend'; }
        const row = i.closest('.tl'), s = effStatus(t);
        row.className = 'tl st-' + s;
        const ib = row.querySelector('.icb'); if (ib) ib.innerHTML = ICON[s];
        $('#tsum').innerHTML = summary(matches()); scores(); tabs();
        clearTimeout(i._tm); i._tm = setTimeout(save, 600);
      };
      i.onkeydown = e => { if (e.key === 'Enter') i.blur(); };
      i.onblur = async () => { await save(); if (pending) setTimeout(list, 0); };
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
      if (row.result) { const r = evalTip(row); if (r) row.status = r; }
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
    box.innerHTML = `<p class="small" style="font-size:.95rem">Üzenetet csak regisztrált, belépett tag küldhet. A neved automatikusan a regisztrált felhasználóneved lesz.</p><div class="row"><a class="btn" href="/auth?mode=login&next=/elerhetosegek">Belépés</a><a class="btn ghost" href="/auth?mode=register&next=/elerhetosegek">Regisztráció</a></div>`;
  } else if (gate()) {
    box.innerHTML = '<p class="small" style="font-size:.95rem">Üzenetet csak megerősített e-mail címmel rendelkező, engedélyezett tag küldhet. Nyisd meg a <a href="/tippek">Tippek</a> oldalt a megerősítéshez.</p>';
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

/* ---------- kapcsolatvétel / Gold csoport ---------- */
function joinPage() {
  const PEOPLE = [['mustafayolo', 'ChristianJr'], ['usnerly_', '_Notryn']];
  const box = $('#joinbox'); if (!box) return;
  box.innerHTML = `<div class="card" style="margin-bottom:22px"><span class="eyebrow">Kapcsolatvétel</span>
  <h2 style="font-size:1.5rem;margin-top:14px">Gold csoport <span class="g">csatlakozás</span></h2>
  <p class="small" style="font-size:1rem;max-width:620px;margin-bottom:18px">Szeretnél csatlakozni a VikingGOLD Gold csoporthoz? Vedd fel a kapcsolatot Discordon az alábbi személyek valamelyikével, ők segítenek a csatlakozásban.</p>
  <div class="people">${PEOPLE.map(([u, n]) => `<div class="person reveal"><div class="pav">${esc(n.replace(/^_/, '').charAt(0).toUpperCase())}</div><div class="pin"><small>Discord</small><b>${esc(u)}</b><span>${esc(n)}</span></div><button class="btn sm ghost" data-copy="${esc(u)}">Másolás</button></div>`).join('')}</div>
  <p class="small" style="margin:14px 0 0">Discordon keresd a felhasználónevet, és írj nekik egy rövid üzenetet.</p></div>`;
  $('#main').querySelectorAll('[data-copy]').forEach(b => b.onclick = async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Másolva ✔'; setTimeout(() => { b.textContent = 'Másolás'; }, 1800); }
    catch (x) { toast('A másolás nem engedélyezett, jelöld ki és másold kézzel: ' + b.dataset.copy, 'err'); }
  });
  document.querySelectorAll('.reveal').forEach(e => e.classList.add('in'));
}

/* ---------- beállítások / tagkezelés ---------- */
function settingsPage() {
  const root = $('#main');
  if (!user) { root.innerHTML = lockView(); return; }
  if (!profile || profile.disabled) { const g = gate(); root.innerHTML = g; gateEvents(); return; }
  const admin = isAdmin();
  const NAME_RE = /^[A-Za-z0-9_.\-]{3,20}$/;
  root.innerHTML = `<section class="wrap" style="padding-top:26px"><h1>Beállítások</h1>
  <div class="card" id="picCard"><h2>Profilkép</h2>
    <div class="row" style="gap:18px;align-items:center">
      <div id="picPrev" style="flex:none;width:96px;height:96px;border-radius:50%;overflow:hidden;display:grid;place-items:center;font-weight:800;font-size:2.2rem;color:#1a1204;background:linear-gradient(135deg,#ffe29a,#d99a1c);border:2px solid rgba(246,196,83,.5)"></div>
      <div style="flex:1;min-width:220px"><p class="small" style="margin:0 0 10px">Ezt a képet látja mindenki a chatben, a tagok listáján és a kezdőlapon. Bármilyen képet választhatsz, a közepét négyzetre vágjuk és lekicsinyítjük.</p>
      <div class="row"><label class="btn sm ghost" for="picFile" style="margin:0;cursor:pointer">Kép kiválasztása</label><input id="picFile" type="file" accept="image/*" hidden>
      <button class="btn sm" id="picSave" type="button" disabled>Mentés</button><button class="btn sm danger" id="picDel" type="button">Eltávolítás</button></div></div></div></div>
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
    <div class="tbl"><table><thead><tr><th>Név</th><th>E-mail</th><th>Regisztrált</th><th>Állapot</th><th>Aktivitás</th><th>Műveletek</th></tr></thead><tbody id="mBody"><tr><td colspan="6">Betöltés…</td></tr></tbody></table></div>
    <p class="hint" style="margin:12px 0 0">A „Név” gomb átírja a tag felhasználónevét. Más jelszavát biztonsági okból nem lehet közvetlenül beállítani: a „Jelszó-mail” gomb levelet küld a tagnak, amiben ő választ újat (a link 5 percig érvényes, és csak a legutóbb kért levél működik). A „Törlés” eltávolítja a profilját és letiltja a hozzáférését (a neve felszabadul). A bejelentkezési adata a Firebase Console → Authentication → Users listán egy kattintással véglegesen is törölhető.</p></div>` : ''}
  </section>`;
  showStoredFlash();

  /* profilkép */
  let newPic = '';
  const drawPrev = src => { const p = $('#picPrev'); p.innerHTML = src ? `<img src="${src}" alt="" style="width:100%;height:100%;object-fit:cover">` : esc((profile.name || '?').replace(/^[_.\-]+/, '').charAt(0).toUpperCase()); };
  drawPrev(picOf(profile)); if (!picOf(profile)) $('#picDel').hidden = true;
  const toSquare = file => new Promise((ok, no) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onerror = () => { URL.revokeObjectURL(url); no(new Error('A fájl nem olvasható képként.')); };
    im.onload = () => {
      URL.revokeObjectURL(url);
      const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S;
      const side = Math.min(im.naturalWidth, im.naturalHeight), sx = (im.naturalWidth - side) / 2, sy = (im.naturalHeight - side) / 2;
      const cx = cv.getContext('2d'); cx.fillStyle = '#0a0d15'; cx.fillRect(0, 0, S, S); cx.imageSmoothingQuality = 'high'; cx.drawImage(im, sx, sy, side, side, 0, 0, S, S);
      let out = cv.toDataURL('image/webp', .85); if (!out.startsWith('data:image/webp')) out = cv.toDataURL('image/jpeg', .85);
      for (let q = .75; out.length > 40000 && q > .3; q -= .15) out = cv.toDataURL('image/jpeg', q);
      out.length > 60000 ? no(new Error('A kép túl nagy, válassz másikat.')) : ok(out);
    };
    im.src = url;
  });
  $('#picFile').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    if (!/^image\//.test(f.type)) { toast('Csak képet választhatsz.', 'err'); return; }
    if (f.size > 15e6) { toast('A kép túl nagy (max 15 MB).', 'err'); return; }
    try { newPic = await toSquare(f); drawPrev(newPic); $('#picSave').disabled = false; } catch (x) { toast(x.message, 'err'); }
  };
  $('#picSave').onclick = async () => {
    if (!newPic) return; $('#picSave').disabled = true;
    try { await updateDoc(doc(db, 'users', user.uid), { avatar: newPic }); flashNext('A profilképed mentve.'); location.reload(); }
    catch (x) { toast('Nem sikerült: ' + (x.code || x.message), 'err'); $('#picSave').disabled = false; }
  };
  $('#picDel').onclick = async () => {
    if (!confirm('Eltávolítod a profilképed?')) return;
    try { await updateDoc(doc(db, 'users', user.uid), { avatar: '' }); flashNext('A profilképed eltávolítva.'); location.reload(); }
    catch (x) { toast('Nem sikerült: ' + (x.code || x.message), 'err'); }
  };

  $('#nameForm').onsubmit = async e => {
    e.preventDefault();
    const nn = $('#nn').value.trim(), lcNew = nn.toLowerCase(), lcOld = profile.name.toLowerCase(), btn = e.submitter || e.target.querySelector('[type=submit]');
    if (!NAME_RE.test(nn)) { toast('A felhasználónév 3–20 karakter lehet (angol betű, szám, _ . -).', 'err'); return; }
    if (nn === profile.name) { toast('Ez már a jelenlegi neved.', 'err'); return; }
    btn.disabled = true;
    try {
      let oldExists = false;
      if (lcNew !== lcOld) {
        const ex = await getDoc(doc(db, 'usernames', lcNew));
        if (ex.exists() && ex.data().uid !== user.uid) throw { m: 'Ez a felhasználónév már foglalt.' };
        if (!ex.exists() && isReserved(lcNew) && !isAdmin()) throw { m: 'Ez a név az adminoknak van fenntartva.' };
        const oe = await getDoc(doc(db, 'usernames', lcOld)); oldExists = oe.exists() && oe.data().uid === user.uid;
      }
      const b = writeBatch(db);
      if (lcNew !== lcOld) { b.set(doc(db, 'usernames', lcNew), { uid: user.uid }); if (oldExists && !isReserved(lcOld)) b.delete(doc(db, 'usernames', lcOld)); }
      b.update(doc(db, 'users', user.uid), { name: nn });
      if (isAdmin()) b.set(doc(db, 'admins', user.uid), { name: nn, uid: user.uid }, { merge: true });
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
  $('#selfReset').onclick = async () => { try { await sendReset(user.email); toast('Elküldtük a levelet: ' + user.email + ' (5 percig érvényes).'); } catch (x) { toast(resetErr(x), 'err'); } };

  if (!admin) return;
  let users = [], mails = {}, filter = '';
  let pres = {};
  const ON_MS = 150000;
  const actOf = u => {
    const t = u.id === user.uid ? Date.now() : pres[u.id];
    if (!t) return '<span class="small" title="Még nincs adat">–</span>';
    if (Date.now() - t < ON_MS) return '<span style="display:inline-flex;align-items:center;gap:6px;color:#86efac;font-weight:700;font-size:.82rem"><i style="width:8px;height:8px;border-radius:50%;background:#22c55e;box-shadow:0 0 8px #22c55e"></i>Online</span>';
    const d = new Date(t), hm = pad(d.getHours()) + ':' + pad(d.getMinutes()), day = ymd(d);
    const lab = day === ymd(new Date()) ? 'ma ' + hm : day === ymd(new Date(Date.now() - 864e5)) ? 'tegnap ' + hm : pad(d.getMonth() + 1) + '.' + pad(d.getDate()) + '. ' + hm;
    return `<span class="small" title="${esc(d.toLocaleString('hu-HU'))}" style="white-space:nowrap">${lab}</span>`;
  };
  const draw = () => {
    const l = users.filter(u => !filter || (u.name || '').toLowerCase().includes(filter) || (mails[u.id] || '').toLowerCase().includes(filter))
      .sort((a, b) => (isAdminName(b.name) - isAdminName(a.name)) || (a.created || 0) - (b.created || 0));
    $('#mCount').textContent = '(' + users.length + ' · online: ' + users.filter(u => u.id === user.uid || (pres[u.id] && Date.now() - pres[u.id] < ON_MS)).length + ')';
    $('#mBody').innerHTML = l.length ? l.map(u => {
      const adm = isAdminName(u.name), me = u.id === user.uid;
      const stt = adm ? '<span class="pill v">Admin</span>' : u.disabled ? '<span class="pill r">Letiltva</span>' : u.verified !== true ? '<span class="pill y">Nincs megerősítve</span>' : '<span class="pill g">Aktív</span>';
      return `<tr><td><b>${esc(u.name || '?')}</b>${me ? ' <span class="small">(te)</span>' : ''}</td><td>${esc(mails[u.id] || '–')}</td><td>${u.created ? new Date(u.created).toLocaleDateString('hu-HU') : '–'}</td><td>${stt}</td><td>${actOf(u)}</td>
      <td class="acts"><button class="btn sm ghost" data-rs="${u.id}">Jelszó-mail</button>${adm ? '' : `<button class="btn sm ghost" data-nm="${u.id}">Név</button><button class="btn sm ghost" data-dis="${u.id}">${u.disabled ? 'Feloldás' : 'Letiltás'}</button><button class="btn sm danger" data-rm="${u.id}">Törlés</button>`}</td></tr>`;
    }).join('') : '<tr><td colspan="6">Nincs találat.</td></tr>';
    const U = id => users.find(x => x.id === id);
    $('#mBody').querySelectorAll('[data-rs]').forEach(b => b.onclick = async () => {
      const em = mails[b.dataset.rs]; if (!em) { toast('Ennek a tagnak nincs ismert e-mail címe.', 'err'); return; }
      if (!confirm('Jelszó-visszaállító levelet küldesz ide: ' + em + ' ?')) return;
      try { await sendReset(em); toast('A jelszó-levél elment: ' + em + ' (5 percig érvényes).'); } catch (x) { toast(resetErr(x), 'err'); }
    });
    $('#mBody').querySelectorAll('[data-nm]').forEach(b => b.onclick = async () => {
      const u = U(b.dataset.nm), nn = (prompt('Új felhasználónév ennek a tagnak: ' + u.name, u.name) || '').trim();
      if (!nn || nn === u.name) return;
      if (!NAME_RE.test(nn)) { toast('A felhasználónév 3–20 karakter lehet (angol betű, szám, _ . -).', 'err'); return; }
      const lcN = nn.toLowerCase(), lcO = String(u.name || '').toLowerCase();
      try {
        if (lcN !== lcO) { const ex = await getDoc(doc(db, 'usernames', lcN)); if (ex.exists() && ex.data().uid !== u.id) { toast('Ez a név már foglalt.', 'err'); return; } if (isReserved(lcN)) { toast('Ez a név védett.', 'err'); return; } }
        const oe = await getDoc(doc(db, 'usernames', lcO));
        const bt = writeBatch(db);
        if (lcN !== lcO) { bt.set(doc(db, 'usernames', lcN), { uid: u.id }); if (oe.exists()) bt.delete(doc(db, 'usernames', lcO)); }
        bt.update(doc(db, 'users', u.id), { name: nn });
        await bt.commit(); toast('Név módosítva: ' + nn);
      } catch (x) { toast('Nem sikerült: ' + (x.code || x.message), 'err'); }
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
  onSnapshot(collection(db, 'users'), sn => { users = sn.docs.map(d => ({ id: d.id, ...d.data() })); draw(); }, x => { $('#mBody').innerHTML = `<tr><td colspan="6">Nem tölthető be: ${esc(x.code || x.message)}</td></tr>`; });
  onSnapshot(collection(db, 'presence'), sn => { pres = {}; sn.docs.forEach(d => { pres[d.id] = (d.data() || {}).t || 0; }); draw(); }, () => { });
  setInterval(draw, 60000);
  onSnapshot(collection(db, 'userEmails'), sn => { mails = {}; sn.docs.forEach(d => mails[d.id] = d.data().email); draw(); }, () => { });
}

/* ---------- Updates / Chat (külön modul) + "új update" jelvény ---------- */
async function loadCommunity() {
  try {
    const m = await import('./community.js');
    const ctx = { db, auth, user, profile, isAdmin: isAdmin(), esc, $, toast, huDate, ymd, gate, gateEvents, adminName: isAdminName };
    if (page === 'updates') m.updatesPage(ctx); else m.chatPage(ctx);
  } catch (e) { $('#main').innerHTML = infoView('⚠️', 'Betöltési hiba', esc(String((e && e.message) || e))); }
}
async function loadNotify() {
  try { const m = await import('./notify.js'); m.init({ app, db, auth, user, profile, esc, $, page }); } catch (e) { }
}

/* ---------- indítás ---------- */
async function start(u) {
  user = u; profile = null; adminFlag = false;
  if (u) {
    try {
      const [p, a] = await Promise.all([getDoc(doc(db, 'users', u.uid)), getDoc(doc(db, 'admins', u.uid))]);
      profile = p.exists() ? p.data() : null; adminFlag = a.exists();
      if (profile && profile.verified !== true && (u.emailVerified || adminFlag)) { updateDoc(doc(db, 'users', u.uid), { verified: true }).catch(() => { }); profile.verified = true; }
    } catch (e) { }
  }
  layout();
  if (page === 'auth') authPage();
  else if (page === 'tippek') tippekPage();
  else if (page === 'contact') { contactPage(); joinPage(); }
  else if (page === 'home') homePage();
  else if (page === 'settings') settingsPage();
  else if (page === 'updates' || page === 'chat') loadCommunity();
  if (user && profile && !profile.disabled && (user.emailVerified || isAdmin())) {
    loadNotify();
    const beat = () => { if (!document.hidden) setDoc(doc(db, 'presence', user.uid), { name: profile.name || '', t: Date.now() }).catch(() => { }); };
    beat(); setInterval(beat, 60000); document.addEventListener('visibilitychange', beat);
  }
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
