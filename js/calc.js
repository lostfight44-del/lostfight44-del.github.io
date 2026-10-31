/* VikingGOLD – tétkezelő kalkulátor. Minden számítás a böngészőben fut, semmi nem kerül elküldésre. */
(function () {
  'use strict';
  var $ = function (s) { return document.getElementById(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var num = function (v) { var n = parseFloat(String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.')); return isFinite(n) ? n : null; };
  var ft = function (n) { return Math.round(n).toLocaleString('hu-HU').replace(/ /g, ' ') + ' Ft'; };
  var d2 = function (n) { return n.toFixed(2).replace('.', ','); };
  var pc = function (n, k) { return n.toFixed(k == null ? 1 : k).replace('.', ',') + '%'; };
  var row = function (l, v, cls) { return '<div class="cr"><span>' + l + '</span><b' + (cls ? ' class="' + cls + '"' : '') + '>' + v + '</b></div>'; };
  var msg = function (t) { return '<p class="small" style="margin:0">' + t + '</p>'; };
  var on = function (ids, fn) { ids.forEach(function (i) { var e = $(i); if (e) e.addEventListener('input', fn); }); };

  /* ---------- 1) tét-javaslat ---------- */
  function stake() {
    var bank = num($('sBank').value), o = num($('sOdds').value), p = num($('sProb').value), fx = num($('sPct').value), out = $('oStake');
    if (!(bank > 0) || !(o > 1) || p == null || p <= 0 || p >= 100) { out.innerHTML = msg('Adj meg érvényes bankrollt, 1-nél nagyobb szorzót és 0–100% közötti esélyt.'); return; }
    var q = p / 100, b = o - 1, ev = q * o - 1, kelly = (b * q - (1 - q)) / b, html = '';
    html += row('Az iroda által beárazott esély', pc(100 / o));
    html += row('Várható érték (1 Ft tétre)', (ev >= 0 ? '+' : '−') + d2(Math.abs(ev)) + ' Ft', ev > 0 ? 'pos' : ev < 0 ? 'neg' : '');
    if (kelly > 0) {
      html += row('Kelly-tét (teljes)', pc(kelly * 100, 2) + ' = ' + ft(bank * kelly));
      html += row('Fél Kelly <i>(ajánlott óvatosabb)</i>', pc(kelly * 50, 2) + ' = ' + ft(bank * kelly / 2));
      html += row('Negyed Kelly', pc(kelly * 25, 2) + ' = ' + ft(bank * kelly / 4));
    } else {
      html += row('Kelly-tét', 'nincs érték – ne tegyél', 'neg');
    }
    if (fx > 0 && fx <= 100) html += row('Fix tét (' + pc(fx, 1) + ')', ft(bank * fx / 100));
    if (fx > 0 && fx <= 100) html += row('Nyerés esetén nyereség / vesztésnél veszteség', '+' + ft(bank * fx / 100 * b) + ' / −' + ft(bank * fx / 100));
    html += '<p class="small" style="margin:10px 0 0">A saját becslésed pontossága dönti el, hogy a Kelly-tét mennyire használható. Ha túlbecsülöd az esélyt, a javasolt tét is túl nagy lesz.</p>';
    out.innerHTML = html;
  }

  /* ---------- 2) szorzó <-> valószínűség ---------- */
  var lastConv = 'odds';
  function conv() {
    var out = $('oConv'), o = num($('oOdds').value), p = num($('oPct').value);
    if (lastConv === 'pct' && p > 0 && p < 100) { o = 100 / p; }
    if (!(o > 1)) { out.innerHTML = msg('Adj meg 1-nél nagyobb szorzót vagy 0–100% közötti esélyt.'); return; }
    out.innerHTML = row('Szorzó', d2(o)) + row('Beárazott esély', pc(100 / o, 2)) + row('Fair (árrés nélküli) szorzó ennél az esélynél', d2(o));
  }
  function margin() {
    var out = $('oMargin'), v = ['mA', 'mB', 'mC'].map(function (i) { return num($(i).value); }).filter(function (x) { return x > 1; });
    if (v.length < 2) { out.innerHTML = msg('Legalább két érvényes szorzó kell (1-nél nagyobb).'); return; }
    var s = v.reduce(function (a, x) { return a + 1 / x; }, 0), m = (s - 1) * 100;
    var h = row('Beárazott esélyek összege', pc(s * 100, 1)) + row('Iroda-árrés', pc(m, 1), m > 8 ? 'neg' : '');
    if (m < 0) h += msg('Negatív árrés: ellenőrizd, hogy az összes kimenetelt megadtad-e, és jók-e a szorzók.');
    else h += v.map(function (x, i) { return row('Kimenetel ' + (i + 1) + ' „tiszta” esélye', pc(1 / x / s * 100, 1)); }).join('');
    out.innerHTML = h;
  }

  /* ---------- 3) kombi ---------- */
  var combo = ['1,80', '1,65', '2,05'];
  function comboDraw() {
    $('cmList').innerHTML = combo.map(function (v, i) {
      return '<div class="cmrow"><span class="cmn">' + (i + 1) + '.</span><input inputmode="decimal" data-i="' + i + '" value="' + esc(v) + '" aria-label="' + (i + 1) + '. tipp szorzója" autocomplete="off"><button type="button" class="icb" data-rm="' + i + '" aria-label="Eltávolítás" title="Eltávolítás">✕</button></div>';
    }).join('');
    comboCalc();
  }
  function comboCalc() {
    var out = $('oCombo'), os = combo.map(num).filter(function (x) { return x > 1; }), st = num($('cmStake').value), p = num($('cmP').value);
    if (!os.length) { out.innerHTML = msg('Adj meg legalább egy érvényes szorzót.'); return; }
    var tot = os.reduce(function (a, x) { return a * x; }, 1), h = row('Tippek száma', String(os.length)) + row('Összesített szorzó', d2(tot));
    if (st > 0) h += row('Lehetséges kifizetés', ft(st * tot)) + row('Lehetséges nyereség', '+' + ft(st * (tot - 1)), 'pos');
    var imp = 1 / tot * 100;
    h += row('Az iroda szerint a kombi esélye', pc(imp, 2));
    if (p > 0 && p < 100) {
      var real = Math.pow(p / 100, os.length) * 100;
      h += row('A saját becslésed szerint (' + os.length + ' × ' + pc(p, 0) + ')', pc(real, 2), real >= imp ? 'pos' : 'neg');
    }
    if (os.length >= 4) h += '<p class="small" style="margin:10px 0 0">Minél több tipp van a szelvényen, annál kisebb az együttes esély – a nagy szorzó ezt kompenzálja, de a hosszú távú várható érték ettől még általában romlik.</p>';
    out.innerHTML = h;
  }

  /* ---------- 4) bankroll-napló ---------- */
  var KEY = 'vg_bank', store = { start: 100000, rows: [] };
  function load() { try { var d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d && Array.isArray(d.rows)) { store = d; } } catch (e) { } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { } }
  function bankDraw() {
    var start = num($('bStart').value), out = $('oBank'), bal = start > 0 ? start : 0, staked = 0, profit = 0, w = 0, l = 0;
    store.rows.forEach(function (r) {
      if (r.res === 'win') { var g = r.stake * (r.odds - 1); profit += g; bal += g; staked += r.stake; w++; }
      else if (r.res === 'loss') { profit -= r.stake; bal -= r.stake; staked += r.stake; l++; }
    });
    if (!store.rows.length) { out.innerHTML = msg('Még nincs bejegyzés. Add hozzá az első tétedet.'); $('bList').innerHTML = ''; return; }
    var roi = staked ? profit / staked * 100 : 0;
    out.innerHTML = row('Jelenlegi bankroll', ft(bal), bal >= start ? 'pos' : 'neg') + row('Eredmény', (profit >= 0 ? '+' : '−') + ft(Math.abs(profit)), profit > 0 ? 'pos' : profit < 0 ? 'neg' : '') +
      row('ROI', (roi >= 0 ? '+' : '−') + pc(Math.abs(roi), 1), roi > 0 ? 'pos' : roi < 0 ? 'neg' : '') + row('Találat', w + ' | ' + (w + l) + (w + l ? ' (' + pc(w / (w + l) * 100, 0) + ')' : ''));
    var lab = { win: 'Nyert', loss: 'Vesztett', void: 'Érvénytelen' };
    $('bList').innerHTML = '<div class="blist">' + store.rows.slice().reverse().map(function (r, ri) {
      var i = store.rows.length - 1 - ri, pl = r.res === 'win' ? '+' + ft(r.stake * (r.odds - 1)) : r.res === 'loss' ? '−' + ft(r.stake) : '0 Ft';
      return '<div class="bli st-' + r.res + '"><div><b>' + esc(r.note || 'Tét') + '</b><small>' + esc(r.date) + ' · ' + ft(r.stake) + ' @' + d2(r.odds) + ' · ' + lab[r.res] + '</small></div><span class="' + (r.res === 'win' ? 'pos' : r.res === 'loss' ? 'neg' : '') + '">' + pl + '</span><button type="button" class="icb" data-bd="' + i + '" aria-label="Törlés" title="Törlés">✕</button></div>';
    }).join('') + '</div>';
  }
  function bankAdd() {
    var st = num($('bStake').value), o = num($('bOdds').value), res = $('bRes').value;
    if (!(st > 0) || !(o > 1)) { alert('Adj meg pozitív tétet és 1-nél nagyobb szorzót.'); return; }
    var d = new Date(), pad = function (n) { return String(n).padStart(2, '0'); };
    store.rows.push({ date: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()), note: $('bNote').value.trim().slice(0, 60), stake: st, odds: o, res: res });
    store.rows = store.rows.slice(-500);
    $('bNote').value = ''; $('bStake').value = ''; $('bOdds').value = '';
    save(); bankDraw();
  }
  function bankCsv() {
    if (!store.rows.length) return;
    var cell = function (v) { var x = String(v == null ? '' : v); if (/^[=+\-@\t]/.test(x)) x = "'" + x; return '"' + x.replace(/"/g, '""') + '"'; };
    var rows = [['Dátum', 'Megjegyzés', 'Tét (Ft)', 'Szorzó', 'Eredmény']].concat(store.rows.map(function (r) { return [r.date, r.note, r.stake, d2(r.odds), r.res === 'win' ? 'Nyert' : r.res === 'loss' ? 'Vesztett' : 'Érvénytelen']; }));
    var blob = new Blob(['﻿' + rows.map(function (r) { return r.map(cell).join(';'); }).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'vikinggold-bankroll-naplo.csv';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }

  /* ---------- indítás ---------- */
  function init() {
    if (!$('cStake')) return;
    load();
    if (store.start > 0) $('bStart').value = String(store.start);
    on(['sBank', 'sOdds', 'sProb', 'sPct'], stake);
    on(['oOdds'], function () { lastConv = 'odds'; $('oPct').value = ''; conv(); });
    on(['oPct'], function () { lastConv = 'pct'; conv(); });
    on(['mA', 'mB', 'mC'], margin);
    on(['cmStake', 'cmP'], comboCalc);
    $('cmList').addEventListener('input', function (e) { var i = e.target.getAttribute('data-i'); if (i != null) { combo[+i] = e.target.value; comboCalc(); } });
    $('cmList').addEventListener('click', function (e) { var b = e.target.closest('[data-rm]'); if (!b) return; combo.splice(+b.getAttribute('data-rm'), 1); if (!combo.length) combo.push(''); comboDraw(); });
    $('cmAdd').onclick = function () { if (combo.length < 20) { combo.push(''); comboDraw(); var ins = $('cmList').querySelectorAll('input'); if (ins.length) ins[ins.length - 1].focus(); } };
    $('cmClr').onclick = function () { combo = ['']; comboDraw(); };
    on(['bStart'], function () { var s = num($('bStart').value); if (s > 0) { store.start = s; save(); } bankDraw(); });
    $('bAdd').onclick = bankAdd;
    $('bCsv').onclick = bankCsv;
    $('bClr').onclick = function () { if (store.rows.length && confirm('Biztosan törlöd a teljes naplót?')) { store.rows = []; save(); bankDraw(); } };
    $('bList').addEventListener('click', function (e) { var b = e.target.closest('[data-bd]'); if (!b) return; store.rows.splice(+b.getAttribute('data-bd'), 1); save(); bankDraw(); });
    stake(); conv(); margin(); comboDraw(); bankDraw();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
