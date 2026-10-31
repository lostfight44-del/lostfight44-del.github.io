/* VikingGOLD – Értesítések: olvasatlan-számlálók (Chat / Updates), böngészős és telefonos push.
   Az app.js tölti be, minden oldalon, belépett + megerősített tagnak. */
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, where, limit, Timestamp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

/* >>> A valódi (zárt oldal melletti) telefonos értesítéshez ide kell a Web Push kulcs:
   Firebase Console → Project settings → Cloud Messaging → Web Push certificates → Key pair.
   Amíg üres, az értesítés csak megnyitott oldal mellett működik. */
const VAPID_KEY = '';

const ROOMS = ['altalanos', 'tippek', 'bejelentesek', 'offtopic'];
const ROOM_NAME = { altalanos: 'általános', tippek: 'tipp-beszélgetés', bejelentesek: 'bejelentések', offtopic: 'offtopic' };
const DEF = { upd: true, ment: true, ann: true, all: false };
const readKey = r => 'vg_read_' + r;
const MSG_URL = 'https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js';

export function init(c) {
  const { db, user, profile, esc, page } = c;
  const me = { uid: user.uid, name: (profile && profile.name) || user.displayName || user.email.split('@')[0] };
  const baseTitle = document.title;
  let prefs = { ...DEF, ...(JSON.parse(localStorage.getItem('vg_np') || 'null') || {}) };
  const lastMsgs = {}; let updDocs = [];
  const sup = 'Notification' in window;
  const pushOn = () => localStorage.getItem('vg_push_on') === '1' && sup && Notification.permission === 'granted';

  ROOMS.forEach(r => { if (!localStorage.getItem(readKey(r))) localStorage.setItem(readKey(r), String(Date.now())); });
  if (!localStorage.getItem('vg_upd_seen')) localStorage.setItem('vg_upd_seen', String(Date.now()));
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(() => { });

  /* ---------- stílus ---------- */
  const st = document.createElement('style');
  st.textContent = `.nbadge{display:inline;margin-left:6px;color:#ff4d63!important;font-weight:800;font-size:.92em;font-style:normal;text-shadow:0 0 10px rgba(255,84,104,.5)}.nav a.on .nbadge{color:#9f1239!important;text-shadow:none}
  .vgt-w{position:fixed;right:16px;bottom:16px;z-index:300;display:flex;flex-direction:column;gap:10px;max-width:min(360px,calc(100vw - 32px))}
  .vgt{display:flex;gap:10px;padding:12px 14px;border-radius:14px;background:#141822;border:1px solid rgba(85,196,247,.4);box-shadow:0 18px 40px -12px #000;cursor:pointer;animation:vgtin .25s both;color:#eceef4;font-size:.88rem;line-height:1.35}
  .vgt b{display:block;color:#b8eaff;font-size:.86rem}.vgt span{color:#c3c8d6;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word}
  @keyframes vgtin{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
  .vgm{position:fixed;inset:0;z-index:310;background:rgba(0,0,0,.65);display:grid;place-items:center;padding:18px}
  .vgm>div{width:min(440px,100%);max-height:92vh;overflow:auto;padding:24px;border-radius:18px;background:#141822;border:1px solid rgba(255,255,255,.14);box-shadow:0 30px 80px -20px #000}
  .vgm h3{font-size:1.15rem;margin-bottom:6px}.vgm .tg{display:flex;align-items:flex-start;gap:12px;padding:11px 0;border-top:1px solid rgba(255,255,255,.08);cursor:pointer;font-size:.92rem;color:#eceef4;margin:0;letter-spacing:0;font-weight:500}
  .vgm .tg input{width:18px;height:18px;padding:0;margin-top:2px;flex:none}.vgm .tg small{display:block;color:#8a93a8;font-size:.8rem}
  .vgm .ok{color:#86efac;font-weight:700}.vgm .wn{color:#ffb3bd}.vgm .nt{background:rgba(85,196,247,.08);border:1px solid rgba(85,196,247,.3);border-radius:12px;padding:10px 12px;font-size:.84rem;color:#d7dbe6;margin:10px 0}`;
  document.head.appendChild(st);

  /* ---------- számlálók ---------- */
  function setBadge(href, n) {
    const a = document.querySelector(`#nav a[href="${href}"]`); if (!a) return;
    let b = a.querySelector('.nbadge');
    if (!n) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('b'); b.className = 'nbadge'; a.appendChild(b); }
    b.textContent = '(' + (n > 99 ? '99+' : n) + ')';
  }
  function recompute() {
    let chat = 0;
    ROOMS.forEach(r => { const rd = +localStorage.getItem(readKey(r)) || 0; chat += (lastMsgs[r] || []).filter(m => m.uid !== me.uid && m.t > rd).length; });
    const seen = +localStorage.getItem('vg_upd_seen') || 0;
    const upd = updDocs.filter(x => x.authorUid !== me.uid && (x.created || 0) > seen).length;
    setBadge('/chat', chat); setBadge('/updates', upd);
    const total = chat + upd; document.title = (total ? `(${total}) ` : '') + baseTitle;
  }
  window.addEventListener('vg-read', recompute);
  window.addEventListener('storage', recompute);

  /* ---------- megjelenítés: rendszerértesítés (rejtett fül) vagy kis felugró (látható oldal) ---------- */
  function toast(title, body, url) {
    let w = document.querySelector('.vgt-w'); if (!w) { w = document.createElement('div'); w.className = 'vgt-w'; document.body.appendChild(w); }
    const t = document.createElement('div'); t.className = 'vgt'; t.innerHTML = `<div><b>${esc(title)}</b><span>${esc(body)}</span></div>`;
    t.onclick = () => { location.href = url; }; w.appendChild(t);
    while (w.children.length > 3) w.firstChild.remove();
    setTimeout(() => t.remove(), 7000);
  }
  async function sys(title, body, url, tag) {
    if (!sup || Notification.permission !== 'granted') return;
    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (reg) await reg.showNotification(title, { body, icon: '/assets/icon-192.png', badge: '/assets/icon-192.png', tag, data: { link: url } });
      else new Notification(title, { body, tag, icon: '/assets/icon-192.png' });
    } catch (e) { }
  }
  function show(title, body, url, tag) {
    if (document.visibilityState === 'visible') toast(title, body, url);
    else if (!pushOn()) sys(title, body, url, tag);   // ha a szerveres push aktív, azt a service worker intézi
  }

  function onChat(r, x) {
    if (x.uid === me.uid) return;
    const low = String(x.text || '').toLowerCase(), nm = me.name.toLowerCase();
    const ment = low.includes('@' + nm), reply = x.rp && String(x.rp.name).toLowerCase() === nm;
    const want = prefs.all || ((ment || reply) && prefs.ment) || (r === 'bejelentesek' && prefs.ann);
    if (!want) return;
    if (page === 'chat' && window.vgChatRoom === r && document.visibilityState === 'visible') return;
    show(`💬 ${x.name} · #${ROOM_NAME[r]}`, String(x.text).slice(0, 140), '/chat#' + r, 'chat-' + r);
  }

  /* ---------- élő figyelők ---------- */
  ROOMS.forEach(r => {
    let first = true;
    // csak a legutóbbi olvasás óta érkezett üzeneteket kérjük le (nem az utolsó 15-öt minden oldalbetöltésnél)
    const since = Timestamp.fromMillis(Math.max(+localStorage.getItem(readKey(r)) || 0, Date.now() - 3 * 864e5));
    onSnapshot(query(collection(db, 'chatRooms', r, 'messages'), where('ts', '>', since), orderBy('ts', 'desc'), limit(20)), sn => {
      lastMsgs[r] = sn.docs.map(d => { const x = d.data({ serverTimestamps: 'estimate' }); return { uid: x.uid, t: x.ts && x.ts.toMillis ? x.ts.toMillis() : Date.now() }; });
      if (!first) sn.docChanges().forEach(ch => { if (ch.type === 'added' && !ch.doc.metadata.hasPendingWrites) onChat(r, ch.doc.data()); });
      first = false; recompute();
    }, () => { });
  });
  let firstU = true;
  onSnapshot(query(collection(db, 'updates'), where('created', '>', Math.max(+localStorage.getItem('vg_upd_seen') || 0, Date.now() - 14 * 864e5)), orderBy('created', 'desc'), limit(20)), sn => {
    updDocs = sn.docs.map(d => d.data());
    if (!firstU) sn.docChanges().forEach(ch => {
      const x = ch.doc.data();
      if (ch.type === 'added' && x.authorUid !== me.uid && prefs.upd && !(page === 'updates' && document.visibilityState === 'visible')) show('🆕 Új update: ' + x.title, String(x.body).replace(/[#*`]/g, '').slice(0, 140), '/updates', 'upd-' + ch.doc.id);
    });
    firstU = false; recompute();
  }, () => { });
  document.addEventListener('visibilitychange', recompute);

  /* ---------- push (zárt oldal mellett is) ---------- */
  async function saveToken(t) {
    await setDoc(doc(db, 'pushTokens', t), { uid: me.uid, name: me.name, prefs, t: Date.now(), ua: navigator.userAgent.slice(0, 120) });
    localStorage.setItem('vg_push_sync', String(Date.now()));
  }
  async function enable() {
    if (!sup) return 'Ez a böngésző nem támogatja az értesítéseket.';
    const p = await Notification.requestPermission();
    if (p !== 'granted') return 'Az értesítések le vannak tiltva a böngészőben.';
    if (!VAPID_KEY) return '';
    try {
      const { isSupported, getMessaging, getToken } = await import(MSG_URL);
      if (!(await isSupported())) return '';
      const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js'); await navigator.serviceWorker.ready;
      const tok = await getToken(getMessaging(c.app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
      if (tok) { localStorage.setItem('vg_push_tok', tok); localStorage.setItem('vg_push_on', '1'); await saveToken(tok); }
    } catch (e) { return 'A telefonos push most nem aktiválható: ' + (e.code || e.message); }
    return '';
  }
  async function disable() {
    const tok = localStorage.getItem('vg_push_tok');
    try { if (tok) { await deleteDoc(doc(db, 'pushTokens', tok)); const { getMessaging, deleteToken } = await import(MSG_URL); await deleteToken(getMessaging(c.app)); } } catch (e) { }
    localStorage.removeItem('vg_push_tok'); localStorage.removeItem('vg_push_on');
  }
  if (pushOn() && Date.now() - (+localStorage.getItem('vg_push_sync') || 0) > 12 * 3600e3) { const t = localStorage.getItem('vg_push_tok'); if (t) saveToken(t).catch(() => { }); }

  /* ---------- beállító ablak + harang ---------- */
  function openModal(msg) {
    const o = document.createElement('div'); o.className = 'vgm';
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent), standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    const perm = sup ? Notification.permission : 'unsupported';
    const tg = (k, t, s) => `<label class="tg"><input type="checkbox" data-k="${k}" ${prefs[k] ? 'checked' : ''}><span>${t}<small>${s}</small></span></label>`;
    let status;
    if (perm === 'unsupported') status = `<p class="wn">${ios && !standalone ? 'iPhone-on az értesítéshez előbb add hozzá az oldalt a kezdőképernyőhöz.' : 'Ez a böngésző nem támogatja az értesítéseket.'}</p>`;
    else if (perm === 'denied') status = '<p class="wn">Az értesítések le vannak tiltva. A böngésző / telefon beállításaiban engedélyezheted az oldalnak.</p>';
    else if (perm === 'default') status = '<button class="btn" id="nEn">Értesítések bekapcsolása</button>';
    else status = `<p class="ok">✔ Bekapcsolva</p><p class="small" style="margin:0 0 4px">${pushOn() ? 'Telefonra is küldünk értesítést, akkor is, ha az oldal be van zárva.' : 'Értesítést kapsz, amíg az oldal nyitva van (akár háttérben is).'}</p>`;
    o.innerHTML = `<div><h3>🔔 Értesítések</h3><p class="small" style="margin-bottom:12px">Válaszd ki, miről kérsz értesítést.</p>${msg ? `<p class="wn">${esc(msg)}</p>` : ''}${status}
      ${ios && !standalone ? '<div class="nt">📱 <b>iPhone:</b> Safari → Megosztás → <b>Hozzáadás a kezdőképernyőhöz</b>, majd onnan nyisd meg az oldalt és kapcsold be az értesítést.</div>' : ''}
      <div style="margin-top:8px">${tg('upd', 'Új update', 'Ha az admin új bejegyzést tesz közzé')}${tg('ment', '@említés és válasz', 'Ha a chaten megemlítenek vagy válaszolnak neked')}${tg('ann', 'Bejelentések csatorna', 'Minden új admin bejelentés')}${tg('all', 'Minden chat üzenet', 'Sok értesítés lehet')}</div>
      <div class="row" style="margin-top:16px">${perm === 'granted' && pushOn() ? '<button class="btn sm danger" id="nOff">Telefonos push kikapcsolása</button>' : ''}<button class="btn sm ghost" id="nX" style="margin-left:auto">Bezár</button></div></div>`;
    document.body.appendChild(o);
    const close = () => { o.remove(); bellState(); };
    o.onclick = e => { if (e.target === o) close(); };
    o.querySelector('#nX').onclick = close;
    o.querySelectorAll('[data-k]').forEach(i => i.onchange = () => { prefs[i.dataset.k] = i.checked; localStorage.setItem('vg_np', JSON.stringify(prefs)); const t = localStorage.getItem('vg_push_tok'); if (t && pushOn()) saveToken(t).catch(() => { }); });
    const en = o.querySelector('#nEn'); if (en) en.onclick = async () => { en.disabled = true; const m = await enable(); o.remove(); openModal(m); };
    const off = o.querySelector('#nOff'); if (off) off.onclick = async () => { await disable(); o.remove(); openModal(); };
  }
  const usr = document.querySelector('#usr'), uic = document.querySelector('#uic');
  let bell;
  function bellState() { if (!bell) return; const on = sup && Notification.permission === 'granted'; const d = bell.querySelector('.dot'); if (on && !d) bell.insertAdjacentHTML('beforeend', '<i class="dot"></i>'); if (!on && d) d.remove(); }
  if (usr && uic) {
    bell = document.createElement('button'); bell.className = 'uic'; bell.id = 'bell'; bell.setAttribute('aria-label', 'Értesítések'); bell.style.marginRight = '8px';
    bell.innerHTML = '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.300 21a1.900 1.900 0 0 0 3.400 0"/></svg>';
    usr.style.display = 'flex'; usr.style.alignItems = 'center'; usr.insertBefore(bell, uic);
    bell.onclick = e => { e.stopPropagation(); openModal(); }; bellState();
  }
}
