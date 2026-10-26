/* VikingGOLD – Közösség modul: Updates (fejlesztési napló) + Chat (Discord-stílus)
   Az app.js tölti be, csak az /updates és /chat oldalakon. */
import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot,
  query, orderBy, limit, serverTimestamp, arrayUnion, arrayRemove
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const URL_RE = /(https?:\/\/[^\s<>"']+)/g;
const pad2 = n => String(n).padStart(2, '0');
const hhmm = t => { const d = new Date(t); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); };

/* ============================================================
   UPDATES
   ============================================================ */
const TAGS = {
  new: ['Új funkció', 't-new'],
  imp: ['Fejlesztés', 't-imp'],
  fix: ['Javítás', 't-fix'],
  ann: ['Bejelentés', 't-ann']
};

export function updatesPage(c) {
  const { db, esc, $, huDate, ymd, toast, isAdmin: admin } = c;
  const root = $('#main');
  const seenBefore = +localStorage.getItem('vg_upd_seen') || 0;
  let items = [], lim = 15, filter = 'all', editId = null, formOpen = false, unsub = null, maxCreated = 0;

  const inline = s => String(s).split(URL_RE).map((p, i) => i % 2
    ? `<a href="${esc(p)}" target="_blank" rel="noopener noreferrer nofollow">${esc(p)}</a>`
    : esc(p).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')).join('');
  function fmtBody(t) {
    let out = '', list = false;
    String(t || '').split('\n').forEach(l => {
      const m = l.match(/^\s*[-*•]\s+(.*)/);
      if (m) { if (!list) { out += '<ul>'; list = true; } out += '<li>' + inline(m[1]) + '</li>'; return; }
      if (list) { out += '</ul>'; list = false; }
      if (/^##\s+/.test(l)) out += '<h3>' + inline(l.replace(/^##\s+/, '')) + '</h3>';
      else if (!l.trim()) out += '<div class="gap"></div>';
      else out += '<p>' + inline(l) + '</p>';
    });
    return out + (list ? '</ul>' : '');
  }

  root.innerHTML = `<section class="wrap upd">
    <div class="upd-head"><div><span class="eyebrow">Fejlesztési napló</span><h1>Updates</h1>
    <p class="small" style="max-width:560px">Itt követheted, mi változott a VikingGOLD oldalon: új funkciók, javítások és bejelentések, dátummal.</p></div>
    ${admin ? '<button class="btn" id="uNew">+ Új bejegyzés</button>' : ''}</div>
    <div class="upd-tags" id="uTags"></div>
    <div id="uForm"></div>
    <div id="uList"><div class="upd-empty">Betöltés…</div></div>
    <div class="center" style="margin:10px 0 30px"><button class="btn ghost" id="uMore" hidden>Régebbi bejegyzések</button></div>
  </section>`;

  function tagsBar() {
    $('#uTags').innerHTML = [['all', 'Összes'], ...Object.entries(TAGS).map(([k, v]) => [k, v[0]])]
      .map(([k, l]) => `<button class="utag ${filter === k ? 'on' : ''}" data-f="${k}">${l}</button>`).join('');
    $('#uTags').querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filter = b.dataset.f; tagsBar(); list(); });
  }

  function form() {
    const box = $('#uForm');
    if (!admin || !formOpen) { box.innerHTML = ''; return; }
    const cur = editId ? items.find(x => x.id === editId) : null;
    const v = cur || { title: '', body: '', tag: 'new', date: ymd(new Date()), ver: '', pinned: false };
    box.innerHTML = `<div class="card upd-form"><h2>${cur ? 'Bejegyzés szerkesztése' : 'Új bejegyzés'}</h2>
      <div class="g2"><div><label>Cím</label><input id="u_t" maxlength="120" value="${esc(v.title)}" placeholder="pl. Megérkezett a Chat"></div>
      <div><label>Verzió <span class="opt">(nem kötelező)</span></label><input id="u_v" maxlength="20" value="${esc(v.ver || '')}" placeholder="pl. 1.4"></div></div>
      <div class="g2"><div><label>Típus</label><select id="u_g">${Object.entries(TAGS).map(([k, t]) => `<option value="${k}" ${v.tag === k ? 'selected' : ''}>${t[0]}</option>`).join('')}</select></div>
      <div><label>Dátum</label><input id="u_d" type="date" value="${esc(v.date)}"></div></div>
      <label>Leírás</label><textarea id="u_b" rows="8" maxlength="4000" placeholder="Írd le, mi változott…">${esc(v.body)}</textarea>
      <p class="small" style="margin:6px 0 0">Formázás: <code>- </code> felsorolás, <code>## </code> alcím, <code>**félkövér**</code>, linkek automatikusan kattinthatók.</p>
      <label class="chk"><input type="checkbox" id="u_p" ${v.pinned ? 'checked' : ''}> Kitűzés (mindig legfelül marad)</label>
      <div class="row" style="margin-top:16px"><button class="btn" id="u_s">${cur ? 'Mentés' : 'Közzététel'}</button><button class="btn ghost" id="u_c">Mégse</button></div></div>`;
    $('#u_c').onclick = () => { formOpen = false; editId = null; form(); };
    $('#u_s').onclick = async e => {
      const title = $('#u_t').value.trim(), body = $('#u_b').value.trim(), date = $('#u_d').value;
      if (title.length < 3) { toast('Adj meg egy címet.', 'err'); return; }
      if (body.length < 3) { toast('A leírás túl rövid.', 'err'); return; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { toast('Válassz dátumot.', 'err'); return; }
      const data = { title: title.slice(0, 120), body: body.slice(0, 4000), tag: $('#u_g').value, date, ver: $('#u_v').value.trim().slice(0, 20), pinned: $('#u_p').checked };
      e.target.disabled = true;
      try {
        if (cur) await updateDoc(doc(db, 'updates', cur.id), { ...data, edited: Date.now() });
        else await addDoc(collection(db, 'updates'), { ...data, created: Date.now(), author: c.profile.name || 'Admin', authorUid: c.user.uid });
        formOpen = false; editId = null; form(); toast(cur ? 'Bejegyzés mentve.' : 'Bejegyzés közzétéve.');
      } catch (x) { toast('Nem sikerült: ' + (x.code || x.message), 'err'); e.target.disabled = false; }
    };
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function list() {
    const L = $('#uList');
    let rows = items.filter(x => filter === 'all' || x.tag === filter);
    rows.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || String(b.date).localeCompare(String(a.date)) || (b.created || 0) - (a.created || 0));
    if (!rows.length) { L.innerHTML = `<div class="upd-empty">${items.length ? 'Ebben a kategóriában még nincs bejegyzés.' : 'Még nincs bejegyzés.' + (admin ? ' Az „Új bejegyzés” gombbal írhatsz az elsőt.' : '')}</div>`; return; }
    L.innerHTML = `<div class="upd-tl">${rows.map(x => {
      const t = TAGS[x.tag] || TAGS.imp, isNew = (x.created || 0) > seenBefore;
      return `<article class="upd-c ${x.pinned ? 'pin' : ''}" id="u_${x.id}">
        <span class="upd-dot"></span>
        <div class="upd-meta"><span class="tag ${t[1]}">${t[0]}</span>${x.ver ? `<span class="ver">v${esc(x.ver)}</span>` : ''}${x.pinned ? '<span class="pinb">📌 Kitűzve</span>' : ''}${isNew ? '<i class="newb">ÚJ</i>' : ''}<time>${esc(huDate(x.date))}</time></div>
        <h2>${esc(x.title)}</h2><div class="upd-b">${fmtBody(x.body)}</div>
        <div class="upd-f"><span class="small">${esc(x.author || 'Admin')}${x.edited ? ' · szerkesztve' : ''}</span>
        ${admin ? `<span class="upd-adm"><button class="btn sm ghost" data-e="${x.id}">Szerkesztés</button><button class="btn sm danger" data-d="${x.id}">Törlés</button></span>` : ''}</div></article>`;
    }).join('')}</div>`;
    L.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { editId = b.dataset.e; formOpen = true; form(); });
    L.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => {
      if (!confirm('Biztosan törlöd ezt a bejegyzést?')) return;
      try { await deleteDoc(doc(db, 'updates', b.dataset.d)); toast('Bejegyzés törölve.'); } catch (x) { toast('Nem sikerült: ' + (x.code || x.message), 'err'); }
    });
  }

  function sub() {
    if (unsub) unsub();
    unsub = onSnapshot(query(collection(db, 'updates'), orderBy('date', 'desc'), limit(lim)), sn => {
      items = sn.docs.map(d => ({ id: d.id, ...d.data() }));
      $('#uMore').hidden = sn.size < lim;
      items.forEach(x => { if ((x.created || 0) > maxCreated) maxCreated = x.created; });
      list();
      if (maxCreated) localStorage.setItem('vg_upd_seen', Math.max(maxCreated, +localStorage.getItem('vg_upd_seen') || 0));
      window.dispatchEvent(new Event('vg-read'));
    }, e => { $('#uList').innerHTML = `<div class="upd-empty">A bejegyzések nem tölthetők be: ${esc(e.code || e.message)}</div>`; });
  }
  $('#uMore').onclick = () => { lim += 15; sub(); };
  if (admin) $('#uNew').onclick = () => { editId = null; formOpen = true; form(); };
  tagsBar(); sub();
}

/* ============================================================
   CHAT
   ============================================================ */
const ROOMS = [
  ['altalanos', 'általános', '💬', 'Beszélgess a közösséggel'],
  ['tippek', 'tipp-beszélgetés', '🎯', 'Tippek, meccsek, elemzések'],
  ['bejelentesek', 'bejelentések', '📢', 'Csak adminok írhatnak ide', true],
  ['offtopic', 'offtopic', '🎲', 'Bármi, ami nem a tippekről szól']
];
const RX = [['up', '👍'], ['fire', '🔥'], ['heart', '❤️'], ['laugh', '😂'], ['win', '✅']];
const EMOJIS = ['😀', '😂', '🤣', '😉', '😎', '🤔', '😅', '🙌', '👏', '👍', '🔥', '💰', '🏆', '⚽', '🏒', '🎾', '🏀', '🤾', '✅', '❌', '🍀', '💪', '😭', '😡'];

export function chatPage(c) {
  const { db, user, profile, esc, $, huDate, ymd, toast } = c;
  const root = $('#main');
  const g = c.gate(); if (g) { root.innerHTML = g; c.gateEvents(); return; }
  const admin = c.isAdmin;
  const me = { uid: user.uid, name: (profile && profile.name) || user.displayName || user.email.split('@')[0] };
  const hashRoom = (location.hash || '').slice(1), saved = localStorage.getItem('vg_room');
  let room = [hashRoom, saved].find(r => ROOMS.some(x => x[0] === r)) || 'altalanos';
  let lim = 60, msgs = [], unsub = null, hasMore = false, replyTo = null, editing = null, editDraft = '';
  let adminUids = new Set(admin ? [me.uid] : []), mutes = {}, myMute = 0, users = [], pres = {};
  let stick = true, lastSend = 0, lastTopId = null, sending = false;

  const isAdm = (uid, name) => adminUids.has(uid) || (name && c.adminName(name));
  const col = n => { let h = 0; for (const ch of String(n)) h = (h * 31 + ch.charCodeAt(0)) % 360; return `hsl(${h},58%,52%)`; };
  const uMap = {};
  const picOf = uid => { const a = uid === me.uid ? (uMap[uid] && uMap[uid].avatar) || profile.avatar : uMap[uid] && uMap[uid].avatar; return typeof a === 'string' && a.startsWith('data:image/') ? a : ''; };
  const av = (n, adm, uid) => { const p = picOf(uid); return p ? `<div class="av pic"><img src="${p}" alt="" loading="lazy"></div>` : `<div class="av" style="background:${adm ? 'linear-gradient(135deg,#ffe29a,#d99a1c)' : col(n)};${adm ? 'color:#1a1204' : ''}">${esc(String(n).replace(/^[_.\-]+/, '').charAt(0).toUpperCase() || '?')}</div>`; };
  const roomOf = k => ROOMS.find(r => r[0] === k);
  const dayLabel = d => { const t = ymd(new Date()), y = ymd(new Date(Date.now() - 864e5)); return d === t ? 'Ma' : d === y ? 'Tegnap' : huDate(d); };
  const fmt = t => String(t).split(URL_RE).map((p, i) => i % 2
    ? `<a href="${esc(p)}" target="_blank" rel="noopener noreferrer nofollow">${esc(p)}</a>`
    : esc(p).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^\w@])@([A-Za-z0-9_.\-]{3,20})/g, (m, a, n) => `${a}<span class="mn ${n.toLowerCase() === me.name.toLowerCase() ? 'me' : ''}">@${n}</span>`)
  ).join('').replace(/\n/g, '<br>');
  const blockedReason = () => {
    const r = roomOf(room);
    if (r[4] && !admin) return 'Ebbe a csatornába csak adminok írhatnak.';
    if (myMute > Date.now()) return myMute > 8e15 ? 'Az admin végleg némított, nem írhatsz üzenetet.' : 'Némítva vagy eddig: ' + new Date(myMute).toLocaleString('hu-HU');
    return '';
  };

  root.innerHTML = `<section class="wrap chat-wrap"><div class="dc" id="dc">
    <aside class="dc-side">
      <div class="dc-h">VikingGOLD közösség</div>
      <div class="dc-ch" id="chList"></div>
      <div class="dc-me">${av(me.name, admin, me.uid)}<div><b>${esc(me.name)}</b><small>${admin ? 'Admin' : 'Tag'}</small></div></div>
    </aside>
    <div class="dc-main">
      <div class="dc-top"><b id="chName"></b><span class="dc-desc" id="chDesc"></span><button class="dc-ic" id="mbBtn" aria-label="Tagok" title="Tagok">👥 <span id="onCnt"></span></button></div>
      <div class="dc-pin" id="pinBar" hidden></div>
      <div class="dc-msgs" id="msgs"></div>
      <button class="dc-new" id="newBtn" hidden>Új üzenetek ↓</button>
      <div class="dc-reply" id="replyBar" hidden></div>
      <div class="dc-compw"><form class="dc-comp" id="comp" autocomplete="off">
        <button type="button" class="dc-ic" id="emBtn" aria-label="Emoji">😊</button>
        <textarea id="ta" rows="1" maxlength="1000" placeholder=""></textarea>
        <button class="btn sm" type="submit" id="sendBtn">Küldés</button>
        <div class="dc-emo" id="emoBox" hidden>${EMOJIS.map(e => `<button type="button" data-e="${e}">${e}</button>`).join('')}</div>
      </form></div>
    </div>
    <aside class="dc-mem" id="mem"></aside>
  </div></section>`;

  /* ---- csatornák ---- */
  function chList() {
    $('#chList').innerHTML = ROOMS.map(r => `<button class="dc-chb ${r[0] === room ? 'on' : ''}" data-r="${r[0]}"><span>${r[2]}</span>${esc(r[1])}</button>`).join('');
    $('#chList').querySelectorAll('[data-r]').forEach(b => b.onclick = () => switchRoom(b.dataset.r));
    const r = roomOf(room); $('#chName').textContent = r[2] + ' ' + r[1]; $('#chDesc').textContent = r[3];
  }
  function switchRoom(r) {
    if (r === room) return;
    room = r; window.vgChatRoom = r; lim = 60; replyTo = null; editing = null; stick = true; lastTopId = null;
    localStorage.setItem('vg_room', r); history.replaceState(null, '', '#' + r);
    chList(); composer(); replyBar(); sub();
  }

  /* ---- üzenetek ---- */
  function sub() {
    if (unsub) unsub();
    $('#msgs').innerHTML = '<div class="dc-empty">Betöltés…</div>';
    unsub = onSnapshot(query(collection(db, 'chatRooms', room, 'messages'), orderBy('ts', 'desc'), limit(lim)), sn => {
      hasMore = sn.size >= lim;
      msgs = sn.docs.map(d => { const x = d.data({ serverTimestamps: 'estimate' }); return { id: d.id, ...x, t: x.ts && x.ts.toMillis ? x.ts.toMillis() : Date.now() }; }).reverse();
      render();
    }, e => { $('#msgs').innerHTML = `<div class="dc-empty">Az üzenetek nem tölthetők be: ${esc(e.code || e.message)}<br><span class="small">Ellenőrizd, hogy a firestore-rules.txt szabályai fel vannak-e töltve.</span></div>`; });
  }

  function msgHtml(m, group) {
    const mine = m.uid === me.uid, adm = isAdm(m.uid, m.name);
    const ment = !mine && String(m.text).toLowerCase().includes('@' + me.name.toLowerCase());
    const rxs = RX.map(([k, e]) => { const a = (m.rx && m.rx[k]) || []; return a.length ? `<button class="rx ${a.includes(me.uid) ? 'on' : ''}" data-a="rx" data-k="${k}">${e} <b>${a.length}</b></button>` : ''; }).join('');
    const acts = `${RX.map(([k, e]) => `<button data-a="rx" data-k="${k}" title="Reakció">${e}</button>`).join('')}<i></i>
      <button data-a="reply" title="Válasz">↩</button>
      ${mine ? '<button data-a="edit" title="Szerkesztés">✎</button>' : ''}
      ${admin ? `<button data-a="pin" title="${m.pin ? 'Kitűzés levétele' : 'Kitűzés'}">📌</button>` : ''}
      ${admin && !mine && !adm ? '<button data-a="mute" title="Némítás">🔇</button>' : ''}
      ${mine || admin ? '<button data-a="del" title="Törlés">🗑</button>' : ''}`;
    const body = editing === m.id
      ? `<div class="dc-edit"><textarea id="edTa" maxlength="1000">${esc(editDraft)}</textarea><div class="row"><button class="btn sm" data-a="edsave">Mentés</button><button class="btn sm ghost" data-a="edcancel">Mégse</button><small>Enter: mentés · Esc: mégse</small></div></div>`
      : `<div class="dc-tx">${fmt(m.text)}${m.edited ? ' <small class="ed">(szerkesztve)</small>' : ''}</div>`;
    return `<div class="dc-m ${group ? 'grp' : ''} ${mine ? 'mine' : ''} ${ment ? 'ment' : ''} ${m.pin ? 'pinned' : ''}" data-id="${m.id}" data-uid="${esc(m.uid)}" data-name="${esc(m.name)}">
      ${group ? `<span class="dc-gt">${hhmm(m.t)}</span>` : av(m.name, adm, m.uid)}
      <div class="dc-b">
        ${group ? '' : `<div class="dc-hd"><b class="nm ${adm ? 'adm' : ''}">${esc(m.name)}</b>${adm ? '<i class="bdg">ADMIN</i>' : ''}<time>${hhmm(m.t)}</time>${m.pin ? '<span class="pn">📌</span>' : ''}</div>`}
        ${m.rp ? `<div class="dc-rq" data-a="goto" data-id="${esc(m.rp.id)}">↪ <b>${esc(m.rp.name)}</b> ${esc(m.rp.text)}</div>` : ''}
        ${body}${rxs ? `<div class="dc-rx">${rxs}</div>` : ''}
      </div>
      ${editing === m.id ? '' : `<div class="dc-act">${acts}</div>`}</div>`;
  }

  function render() {
    const box = $('#msgs');
    const near = box.scrollHeight - box.scrollTop - box.clientHeight < 90;
    const wantBottom = stick || near;
    const fromBottom = box.scrollHeight - box.scrollTop;
    let html = hasMore ? '<button class="dc-more" id="moreBtn">Korábbi üzenetek betöltése</button>' : '', last = null, lastDay = '';
    if (!msgs.length) html += `<div class="dc-empty"><div class="big">${roomOf(room)[2]}</div><b>#${esc(roomOf(room)[1])}</b><br>Itt még nincs üzenet. Írj elsőként!</div>`;
    msgs.forEach(m => {
      const day = ymd(new Date(m.t));
      if (day !== lastDay) { html += `<div class="dc-day"><span>${esc(dayLabel(day))}</span></div>`; lastDay = day; last = null; }
      const group = !!(last && last.uid === m.uid && m.t - last.t < 5 * 60e3 && !m.rp && editing !== m.id && !last.pin);
      html += msgHtml(m, group); last = m;
    });
    box.innerHTML = html;
    if (wantBottom) box.scrollTop = box.scrollHeight; else box.scrollTop = box.scrollHeight - fromBottom;
    const top = msgs.length ? msgs[msgs.length - 1].id : null;
    if (!wantBottom && top && top !== lastTopId && msgs[msgs.length - 1].uid !== me.uid) $('#newBtn').hidden = false;
    if (wantBottom) $('#newBtn').hidden = true;
    lastTopId = top; stick = false;
    const mb = $('#moreBtn'); if (mb) mb.onclick = () => { lim += 60; sub(); };
    const ed = $('#edTa'); if (ed) { ed.focus(); ed.setSelectionRange(ed.value.length, ed.value.length); ed.oninput = () => { editDraft = ed.value; }; ed.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); } if (e.key === 'Escape') { editing = null; render(); } }; }
    pinBar(); markRead();
  }

  function pinBar() {
    const p = [...msgs].reverse().find(m => m.pin), b = $('#pinBar');
    if (!p) { b.hidden = true; return; }
    b.hidden = false; b.innerHTML = `<span>📌</span><div><b>${esc(p.name)}</b> ${esc(String(p.text).slice(0, 140))}</div>`;
    b.onclick = () => { const el = $('#msgs').querySelector(`[data-id="${p.id}"]`); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1600); } };
  }

  async function saveEdit() {
    const t = editDraft.trim(), id = editing; if (!id) return;
    if (!t) { toast('Az üzenet nem lehet üres.', 'err'); return; }
    try { await updateDoc(doc(db, 'chatRooms', room, 'messages', id), { text: t.slice(0, 1000), edited: true }); editing = null; } catch (x) { toast('Nem sikerült: ' + (x.code || x.message), 'err'); }
  }

  $('#msgs').addEventListener('click', async e => {
    const bt = e.target.closest('[data-a]'), row = e.target.closest('.dc-m');
    if (!bt) { if (row && !e.target.closest('a,textarea')) { const was = row.classList.contains('sel'); $('#msgs').querySelectorAll('.dc-m.sel').forEach(x => x.classList.remove('sel')); if (!was) row.classList.add('sel'); } return; }
    const a = bt.dataset.a; if (a === 'goto') { const el = $('#msgs').querySelector(`[data-id="${bt.dataset.id}"]`); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1600); } return; }
    if (a === 'edsave') return saveEdit();
    if (a === 'edcancel') { editing = null; return render(); }
    if (!row) return;
    const m = msgs.find(x => x.id === row.dataset.id); if (!m) return;
    const ref = doc(db, 'chatRooms', room, 'messages', m.id);
    try {
      if (a === 'rx') { const has = ((m.rx && m.rx[bt.dataset.k]) || []).includes(me.uid); await updateDoc(ref, { ['rx.' + bt.dataset.k]: has ? arrayRemove(me.uid) : arrayUnion(me.uid) }); }
      else if (a === 'reply') { replyTo = { id: m.id, name: m.name, text: String(m.text).slice(0, 80) }; replyBar(); $('#ta').focus(); }
      else if (a === 'edit') { editing = m.id; editDraft = m.text; render(); }
      else if (a === 'pin') await updateDoc(ref, { pin: !m.pin });
      else if (a === 'del') { if (confirm('Biztosan törlöd az üzenetet?')) await deleteDoc(ref); }
      else if (a === 'mute') muteModal(m.uid, m.name);
    } catch (x) { toast('Nem sikerült: ' + (x.code || x.message), 'err'); }
  });
  $('#newBtn').onclick = () => { const b = $('#msgs'); b.scrollTop = b.scrollHeight; $('#newBtn').hidden = true; };
  $('#msgs').addEventListener('scroll', () => { const b = $('#msgs'); if (b.scrollHeight - b.scrollTop - b.clientHeight < 60) $('#newBtn').hidden = true; }, { passive: true });

  /* ---- olvasottnak jelölés (a menü számlálójához) ---- */
  function markRead() {
    if (document.visibilityState !== 'visible' || !msgs.length) return;
    const t = Math.max(...msgs.map(m => m.t));
    if (t > (+localStorage.getItem('vg_read_' + room) || 0)) { localStorage.setItem('vg_read_' + room, String(t)); window.dispatchEvent(new Event('vg-read')); }
  }
  document.addEventListener('visibilitychange', markRead); window.addEventListener('focus', markRead);

  /* ---- írás ---- */
  function replyBar() {
    const b = $('#replyBar');
    if (!replyTo) { b.hidden = true; return; }
    b.hidden = false; b.innerHTML = `<span>Válasz <b>${esc(replyTo.name)}</b> üzenetére: ${esc(replyTo.text)}</span><button type="button" id="rpX" aria-label="Mégse">✕</button>`;
    $('#rpX').onclick = () => { replyTo = null; replyBar(); };
  }
  function composer() {
    const why = blockedReason(), ta = $('#ta');
    ta.disabled = !!why; $('#sendBtn').disabled = !!why; $('#emBtn').disabled = !!why;
    ta.placeholder = why || 'Üzenet ide: #' + roomOf(room)[1];
  }
  const grow = () => { const t = $('#ta'); t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 140) + 'px'; };
  async function send() {
    const ta = $('#ta'), text = ta.value.trim();
    if (!text || sending || blockedReason()) return;
    if (Date.now() - lastSend < 1500) { toast('Lassabban, kérlek.', 'err'); return; }
    sending = true; $('#sendBtn').disabled = true;
    const data = { uid: me.uid, name: me.name, text: text.slice(0, 1000), ts: serverTimestamp(), rx: {} };
    if (replyTo) data.rp = replyTo;
    try {
      await addDoc(collection(db, 'chatRooms', room, 'messages'), data);
      lastSend = Date.now(); ta.value = ''; grow(); replyTo = null; replyBar(); stick = true;
    } catch (x) { toast(String(x.code || '').includes('permission') ? 'Nem küldhetsz üzenetet (némítva vagy, vagy a szabályok hiányoznak).' : 'Nem sikerült: ' + (x.code || x.message), 'err'); }
    sending = false; $('#sendBtn').disabled = !!blockedReason(); ta.focus();
  }
  $('#comp').onsubmit = e => { e.preventDefault(); send(); };
  $('#ta').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); } });
  $('#ta').addEventListener('input', grow);
  $('#emBtn').onclick = e => { e.stopPropagation(); $('#emoBox').hidden = !$('#emoBox').hidden; };
  $('#emoBox').onclick = e => { const b = e.target.closest('[data-e]'); if (!b) return; const t = $('#ta'), s = t.selectionStart || t.value.length; t.value = t.value.slice(0, s) + b.dataset.e + t.value.slice(t.selectionEnd || s); t.focus(); t.selectionStart = t.selectionEnd = s + b.dataset.e.length; grow(); };
  document.addEventListener('click', e => { const eb = $('#emoBox'); if (eb && !eb.hidden && !eb.contains(e.target) && e.target.id !== 'emBtn') eb.hidden = true; });

  /* ---- némítás (admin) ---- */
  function muteModal(uid, name) {
    const o = document.createElement('div'); o.className = 'dc-modal';
    o.innerHTML = `<div class="dc-mc"><h3>${esc(name)} némítása</h3><p class="small">Amíg némítva van, nem tud üzenetet írni. Az admin bármikor feloldhatja.</p>
      <div class="row">${[['10 perc', 10], ['1 óra', 60], ['24 óra', 1440], ['Végleges', 0]].map(([l, m]) => `<button class="btn sm ghost" data-m="${m}">${l}</button>`).join('')}</div>
      <div class="row" style="margin-top:14px"><button class="btn sm danger" id="mcX">Mégse</button></div></div>`;
    document.body.appendChild(o);
    o.onclick = async e => {
      if (e.target === o || e.target.id === 'mcX') { o.remove(); return; }
      const b = e.target.closest('[data-m]'); if (!b) return; const min = +b.dataset.m;
      try { await setDoc(doc(db, 'chatMutes', uid), { name, until: min ? Date.now() + min * 60000 : 9e15, by: me.name, ts: Date.now() }); toast(name + ' némítva.'); } catch (x) { toast('Nem sikerült: ' + (x.code || x.message), 'err'); }
      o.remove();
    };
  }

  /* ---- tagok ---- */
  function members() {
    const now = Date.now(), list = users.filter(u => !u.disabled);
    const online = u => u.id === me.uid || (pres[u.id] && now - pres[u.id] < 150000);
    const A = [], O = [], F = [];
    list.forEach(u => (isAdm(u.id, u.name) ? A : online(u) ? O : F).push(u));
    const s = (a, b) => String(a.name).localeCompare(String(b.name));
    const item = u => { const adm = isAdm(u.id, u.name), on = online(u), mu = mutes[u.id] && mutes[u.id] > now;
      return `<div class="mb ${on || adm && on ? '' : 'off'}"><div class="avw">${av(u.name || '?', adm, u.id)}<i class="st ${on ? 'on' : ''}"></i></div><span class="${adm ? 'adm' : ''}">${esc(u.name || '?')}</span>${mu ? '<em title="Némítva">🔇</em>' : ''}${admin && mu ? `<button class="mbx" data-um="${u.id}" title="Némítás feloldása">feloldás</button>` : ''}${admin && !mu && u.id !== me.uid && !adm ? `<button class="mbx" data-mt="${u.id}" data-n="${esc(u.name || '?')}" title="Némítás">🔇</button>` : ''}</div>`; };
    const grp = (t, a) => a.length ? `<div class="mg">${t} — ${a.length}</div>${a.sort(s).map(item).join('')}` : '';
    const adminsOn = A.filter(online), adminsOff = A.filter(u => !online(u));
    $('#mem').innerHTML = grp('Adminok', [...adminsOn.sort(s), ...adminsOff.sort(s)]) + grp('Online', O) + grp('Offline', F.slice(0, 200));
    $('#onCnt').textContent = list.filter(online).length;
    $('#mem').querySelectorAll('[data-um]').forEach(b => b.onclick = async () => { try { await deleteDoc(doc(db, 'chatMutes', b.dataset.um)); toast('Némítás feloldva.'); } catch (x) { toast('Nem sikerült: ' + (x.code || x.message), 'err'); } });
    $('#mem').querySelectorAll('[data-mt]').forEach(b => b.onclick = () => muteModal(b.dataset.mt, b.dataset.n));
  }
  $('#mbBtn').onclick = e => { e.stopPropagation(); $('#dc').classList.toggle('mem-open'); };
  $('#dc').querySelector('.dc-main').addEventListener('click', () => $('#dc').classList.remove('mem-open'));

  /* ---- élő adatok ---- */
  onSnapshot(collection(db, 'admins'), sn => { adminUids = new Set([...sn.docs.map(d => d.id), ...(admin ? [me.uid] : [])]); render(); members(); }, () => { });
  onSnapshot(collection(db, 'users'), sn => { users = sn.docs.map(d => ({ id: d.id, ...d.data() })); users.forEach(u => { uMap[u.id] = u; }); members(); render(); const mb = document.querySelector('.dc-me .av'); if (mb) mb.outerHTML = av(me.name, admin, me.uid); }, () => { });
  onSnapshot(collection(db, 'presence'), sn => { pres = {}; sn.docs.forEach(d => { pres[d.id] = (d.data() || {}).t || 0; }); members(); }, () => { });
  if (admin) onSnapshot(collection(db, 'chatMutes'), sn => { mutes = {}; sn.docs.forEach(d => { mutes[d.id] = d.data().until || 0; }); members(); }, () => { });
  else onSnapshot(doc(db, 'chatMutes', me.uid), s => { myMute = s.exists() ? (s.data().until || 0) : 0; composer(); }, () => { });
  const beat = () => { if (!document.hidden) setDoc(doc(db, 'presence', me.uid), { name: me.name, t: Date.now() }).catch(() => { }); };
  beat(); setInterval(beat, 60000); document.addEventListener('visibilitychange', beat);
  setInterval(members, 60000);
  setInterval(() => { if (myMute && myMute < Date.now() + 1000) composer(); }, 15000);

  window.vgChatRoom = room;
  chList(); composer(); replyBar(); sub();
}
