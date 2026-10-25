/* VikingGOLD – jégkorong elemző (statisztika + forma + kockázati szűrő) */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var num = function (id) { var e = $(id); if (!e) return NaN; var s = String(e.value).replace(',', '.').trim(); return s === '' ? NaN : parseFloat(s); };
  var has = function (id) { return !isNaN(num(id)); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var clip = function (x, a, b) { a = a === undefined ? -1 : a; b = b === undefined ? 1 : b; return Math.max(a, Math.min(b, x)); };
  var clamp01 = function (x) { return Math.max(0, Math.min(1, x)); };
  var pad2 = function (n) { return String(n).padStart(2, '0'); };
  var sg = function (x) { return (x >= 0 ? '+' : '') + x.toFixed(2); };
  var fmt = function (x) { return x.toFixed(2); };
  var K = 13;
  var LINE = 6.5;

  function pv(l) { var r = new Array(K), p = Math.exp(-l); r[0] = p; for (var i = 1; i < K; i++) { p *= l / i; r[i] = p; } return r; }
  function shareH(a, b) { return 0.5 + 0.6 * (a / (a + b) - 0.5); } // hosszabbítás: ki nyer, ha 60 perc után döntetlen
  /* [hazai 60p, döntetlen 60p, vendég 60p, hazai továbbjut, over] */
  function m3(a, b) {
    var A = pv(a), B = pv(b), ph = 0, pd = 0, pa = 0, po = 0, i, j, p;
    for (i = 0; i < K; i++) for (j = 0; j < K; j++) {
      p = A[i] * B[j];
      if (i > j) ph += p; else if (i === j) pd += p; else pa += p;
      if (i + j + (i === j ? 1 : 0) > LINE) po += p;
    }
    var t = ph + pd + pa; ph /= t; pd /= t; pa /= t; po /= t;
    return [ph, pd, pa, ph + pd * shareH(a, b), po];
  }

  function formScore(id) {
    var s = String($(id).value || '').toUpperCase().replace(/GY/g, 'G').replace(/[^GWVLDX]/g, '').slice(0, 5);
    if (s.length < 3) return null;
    var p = 0; for (var k = 0; k < s.length; k++) { var c = s[k]; p += (c === 'G' || c === 'W') ? 1 : (c === 'D' || c === 'X') ? 0.5 : 0; }
    return p / s.length;
  }
  function wavg(a) { var tw = 0, s = 0; a.forEach(function (c) { tw += c.w; s += c.v * c.w; }); return s / tw; }
  function consF(a, dir, thr) { var tw = 0, s = 0; a.forEach(function (c) { tw += c.w; if (c.v * dir > thr) s += c.w; }); return s / tw; }
  function loo(arr, fn) { if (arr.length < 3) return 100; var m = 100; arr.forEach(function (_, i) { m = Math.min(m, fn(arr.filter(function (_, k) { return k !== i; }))); }); return m; }

  function sigTable(arr, dir) {
    return '<div class="tbl"><table><tr><th>Jelzés</th><th>Adat</th><th>Súly</th><th>Támogatja?</th></tr>' + arr.map(function (c) {
      var x = c.v * dir;
      return '<tr><td>' + esc(c.k) + '</td><td>' + esc(c.t) + '</td><td>' + c.w + '</td><td class="' + (x > .1 ? 'pos' : x < -.1 ? 'neg' : '') + '">' + (x > .1 ? '✔' : x < -.1 ? '✖' : '➖') + '</td></tr>';
    }).join('') + '</table></div>';
  }
  function sTbl(S) {
    return '<div class="tbl"><table><tr><th>Jelzés</th><th>Adat</th><th>Súly</th><th>Kockázat</th></tr>' + S.map(function (x) {
      return '<tr><td>' + esc(x.k) + '</td><td>' + esc(x.t) + '</td><td>' + x.w + '</td><td><div class="bar"><i data-w="' + Math.round(x.s * 100) + '%"></i></div></td></tr>';
    }).join('') + '</table></div>';
  }

  /* ---------- fő számítás ---------- */
  function run() {
    var req = ['hp', 'hm', 'hw', 'hgf', 'hga', 'hs', 'hc', 'ap', 'am', 'aw', 'agf', 'aga', 'as', 'ac', 'nt', 'la'];
    document.querySelectorAll('.f').forEach(function (i) { i.style.outline = ''; });
    var miss = req.filter(function (i) { return !has(i); });
    if (miss.length) {
      var NM = { hp: 'Hazai: tabellahelyezés', hm: 'Hazai: lejátszott meccs', hw: 'Hazai: győzelmek', hgf: 'Hazai: idény lőtt gól', hga: 'Hazai: idény kapott gól', hs: 'Hazai: utolsó 5 hazai lőtt', hc: 'Hazai: utolsó 5 hazai kapott', ap: 'Vendég: tabellahelyezés', am: 'Vendég: lejátszott meccs', aw: 'Vendég: győzelmek', agf: 'Vendég: idény lőtt gól', aga: 'Vendég: idény kapott gól', as: 'Vendég: utolsó 5 idegen lőtt', ac: 'Vendég: utolsó 5 idegen kapott', nt: 'Csapatok száma a ligában', la: 'Liga gólátlag' };
      miss.forEach(function (i) { $(i).style.outline = '2px solid #fb7185'; });
      $('out').innerHTML = '<div class="card neg"><b>Hiányzó kötelező mezők (pirossal jelölve):</b><br>' + miss.map(function (i) { return esc(NM[i]); }).join('<br>') + '</div>';
      $('status').textContent = '⚠️ Hiányzik ' + miss.length + ' kötelező mező.';
      return null;
    }
    LINE = parseFloat($('line').value) || 6.5;
    var HN = $('hn').value || 'Hazai', AN = $('an').value || 'Vendég', N = num('nt'), L = num('la');
    var mH = Math.max(1, num('hm')), mA = Math.max(1, num('am'));
    var hGF = num('hgf') / mH, hGA = num('hga') / mH, aGF = num('agf') / mA, aGA = num('aga') / mA;
    var h5s = num('hs') / 5, h5c = num('hc') / 5, a5s = num('as') / 5, a5c = num('ac') / 5;
    var hWR = num('hw') / mH, aWR = num('aw') / mA;
    var hF = formScore('hform'), aF = formScore('aform');
    var h2w = has('h2w') ? num('h2w') : 0, h2l = has('h2l') ? num('h2l') : 0, h2n = h2w + h2l, hasH2 = h2n > 0;
    var h2o = has('h2o') ? num('h2o') : null;
    var hBack = $('hg').value === '1', aBack = $('ag').value === '1';
    var hSv = has('hsv') ? num('hsv') - (hBack ? 1 : 0) : null, aSv = has('asv') ? num('asv') - (aBack ? 1 : 0) : null;
    var stOK = has('hpp') && has('hpk') && has('apx') && has('apk');
    var stH = stOK ? num('hpp') + num('hpk') : 0, stA = stOK ? num('apx') + num('apk') : 0;
    var avgA = function (a) { var b = a.filter(function (x) { return x !== null && !isNaN(x); }); return b.length ? b.reduce(function (s, x) { return s + x; }, 0) / b.length : 0; };

    /* 1) gólvárakozás */
    var TA = Math.max(1.5, L / 2);
    var mix = function (r5, gf, m) { return 0.4 * (r5 / 5) + 0.6 * (gf / Math.max(1, m)); };
    var hAtt = mix(num('hs'), num('hgf'), mH), hDef = mix(num('hc'), num('hga'), mH);
    var aAtt = mix(num('as'), num('agf'), mA), aDef = mix(num('ac'), num('aga'), mA);
    var comb = function (att, def) { return 0.5 * (att * def / TA) + 0.5 * ((att + def) / 2); };
    var pf = function (p) { return 1 + ((N + 1 - 2 * p) / Math.max(1, N - 1)) * 0.05; };
    var wf = function (r) { return 1 + ((r - 0.5) / 0.5) * 0.08; };
    var lh = comb(hAtt, aDef) * 1.04 * pf(num('hp')) / pf(num('ap')) * wf(hWR) / wf(aWR);
    var la = comb(aAtt, hDef) / 1.04 * pf(num('ap')) / pf(num('hp')) * wf(aWR) / wf(hWR);
    if (hSv !== null && aSv !== null) {
      lh *= clip(1 + 0.3 * ((100 - aSv) / 9.5 - 1), 0.85, 1.15);
      la *= clip(1 + 0.3 * ((100 - hSv) / 9.5 - 1), 0.85, 1.15);
    }
    if (stOK) { var st = clip((stH - stA) / 100, -.3, .3); lh *= 1 + 0.2 * st; la *= 1 - 0.2 * st; }
    if (hasH2) { var r = (h2w - h2l) / h2n; lh *= 1 + 0.04 * r; la *= 1 - 0.04 * r; }
    if ($('hb').value === '1') { lh *= 0.97; la *= 1.02; }
    if ($('ab').value === '1') { la *= 0.97; lh *= 1.02; }
    lh = 0.8 * lh + 0.2 * L * 0.52; la = 0.8 * la + 0.2 * L * 0.48;
    var crossS = (hGF + aGA) / 2 + (aGF + hGA) / 2, crossF = (h5s + a5c) / 2 + (a5s + h5c) / 2, statTotal = 0.55 * crossS + 0.45 * crossF;
    { var T = lh + la, kk = (0.65 * T + 0.35 * statTotal) / T; lh *= kk; la *= kk; }
    lh = Math.max(.3, lh); la = Math.max(.3, la);

    var PRE = m3(lh, la), mktPill = '';
    var o1 = num('o1'), ox = num('ox'), o2 = num('o2'), om1 = num('om1'), om2 = num('om2'), oov = num('oov'), oun = num('oun');
    var have1x2 = o1 > 1 && ox > 1 && o2 > 1, haveML = om1 > 1 && om2 > 1, haveOU = oov > 1 && oun > 1;
    var t1 = 0, tx = 0, t2 = 0, tml = 0, tou = 0;
    if (have1x2) { var sm = 1 / o1 + 1 / ox + 1 / o2; t1 = 1 / o1 / sm; tx = 1 / ox / sm; t2 = 1 / o2 / sm; }
    if (haveML) tml = (1 / om1) / (1 / om1 + 1 / om2);
    if (haveOU) tou = (1 / oov) / (1 / oov + 1 / oun);
    if ((have1x2 || haveML) && $('cal').value === '1') {
      var bst = [lh, la], be = 1e9;
      var cost = function (a, b) {
        var q = m3(a, b), e = 0;
        if (have1x2) e += Math.pow(q[0] - t1, 2) + Math.pow(q[1] - tx, 2) + Math.pow(q[2] - t2, 2);
        if (haveML) e += Math.pow(q[3] - tml, 2);
        if (haveOU) e += Math.pow(q[4] - tou, 2);
        return e;
      };
      var a, b, c0;
      for (a = 0.5; a <= 5; a += 0.1) for (b = 0.5; b <= 5; b += 0.1) { c0 = cost(a, b); if (c0 < be) { be = c0; bst = [a, b]; } }
      var cb = bst.slice();
      for (a = cb[0] - .1; a <= cb[0] + .1; a += 0.02) for (b = cb[1] - .1; b <= cb[1] + .1; b += 0.02) { if (a < .3 || b < .3) continue; c0 = cost(a, b); if (c0 < be) { be = c0; bst = [a, b]; } }
      var gap0 = haveML ? Math.abs(PRE[3] - tml) : Math.abs(PRE[0] - t1) + Math.abs(PRE[2] - t2);
      lh = Math.pow(lh, .5) * Math.pow(bst[0], .5); la = Math.pow(la, .5) * Math.pow(bst[1], .5);
      mktPill = '<span class="pill">Piaci szorzókkal kalibrálva</span>' + (gap0 > 0.3 ? '<span class="pill r">⚠ Nagy az eltérés a modell és a piac között – ellenőrizd az adatokat (hazai/vendég csere?)</span>' : '');
    }

    /* közös eloszlás (60 perces rács + hosszabbítás szétosztva) */
    var A = pv(lh), B = pv(la), M = [], tot = 0, i, j;
    for (i = 0; i < K; i++) { M[i] = []; for (j = 0; j < K; j++) { var mm = 0;[[.9, .25], [1, .5], [1.1, .25]].forEach(function (z) { mm += z[1] * pv(lh * z[0])[i] * pv(la * z[0])[j]; }); M[i][j] = mm; tot += mm; } }
    var shh = shareH(lh, la), F = [], sc = [];
    for (i = 0; i <= K; i++) { F[i] = []; for (j = 0; j <= K; j++) F[i][j] = 0; }
    var H = 0, D = 0, Aw = 0;
    for (i = 0; i < K; i++) for (j = 0; j < K; j++) {
      var p = M[i][j] / tot;
      if (i > j) { H += p; F[i][j] += p; } else if (i < j) { Aw += p; F[i][j] += p; } else { D += p; F[i + 1][j] += p * shh; F[i][j + 1] += p * (1 - shh); }
    }
    var MLH = H + D * shh, MLA = Aw + D * (1 - shh), OV = 0, BT = 0;
    for (i = 0; i <= K; i++) for (j = 0; j <= K; j++) { var pq = F[i][j]; if (!pq) continue; if (i + j > LINE) OV += pq; if (i > 0 && j > 0) BT += pq; sc.push([i + '-' + j, pq, i, j]); }
    sc.sort(function (x, y) { return y[1] - x[1]; });
    var PM = { o1: H, ox: D, o2: Aw, o1x: H + D, ox2: D + Aw, om1: MLH, om2: MLA, oov: OV, oun: 1 - OV };
    var lineTxt = String(LINE).replace('.', ',');
    var NAME = { o1: '1 – ' + HN + ' (60 perc)', ox: 'X – Döntetlen (60 perc)', o2: '2 – ' + AN + ' (60 perc)', o1x: '1X (60 perc)', ox2: 'X2 (60 perc)', om1: HN + ' továbbjut (hosszabbítással)', om2: AN + ' továbbjut (hosszabbítással)', oov: lineTxt + ' gól felett', oun: lineTxt + ' gól alatt' };
    var ODDID = { o1: 'o1', ox: 'ox', o2: 'o2', om1: 'om1', om2: 'om2', oov: 'oov', oun: 'oun' };

    /* 2) FŐTIPP – jelzések */
    var rc = [];
    rc.push({ k: 'Győzelmi arány', v: clip((hWR - aWR) / .5), w: .25, t: Math.round(hWR * 100) + '% vs ' + Math.round(aWR * 100) + '%' });
    if (hF !== null && aF !== null) rc.push({ k: 'Forma (utolsó 5)', v: clip((hF - aF) / .6), w: .2, t: Math.round(hF * 100) + '% vs ' + Math.round(aF * 100) + '%' });
    rc.push({ k: 'Utolsó 5 hazai / idegen gólkülönbség', v: clip(((h5s - h5c) - (a5s - a5c)) / 1.5), w: .2, t: sg(h5s - h5c) + ' vs ' + sg(a5s - a5c) });
    rc.push({ k: 'Idény gólkülönbség / meccs', v: clip(((hGF - hGA) - (aGF - aGA)) / 1.2), w: .15, t: sg(hGF - hGA) + ' vs ' + sg(aGF - aGA) });
    rc.push({ k: 'Tabellahelyezés', v: clip((num('ap') - num('hp')) / Math.max(1, N - 1) * 1.6), w: .1, t: num('hp') + '. vs ' + num('ap') + '.' });
    if (hasH2) rc.push({ k: 'H2H mérleg (hazai–vendég)', v: clip((h2w - h2l) / h2n), w: .15, t: h2w + '–' + h2l });
    if (hSv !== null && aSv !== null) rc.push({ k: 'Kapusok védési százaléka', v: clip((hSv - aSv) / 1.5), w: .15, t: hSv.toFixed(1) + '% vs ' + aSv.toFixed(1) + '%' });
    if (stOK) rc.push({ k: 'Különleges egységek (EE% + EH%)', v: clip((stH - stA) / 25), w: .1, t: stH.toFixed(0) + ' vs ' + stA.toFixed(0) });
    var adj = ($('hb').value === '1' ? -.08 : 0) + ($('ab').value === '1' ? .08 : 0) + ({ h: -.1, a: .1, b: 0, '0': 0 }[$('nw').value] || 0);
    var dOf = function (arr) { return clip(wavg(arr) + .05 + adj); };
    var Dd = dOf(rc), lean = Dd >= .2 ? 'h' : Dd <= -.2 ? 'a' : null;

    var gs = [];
    gs.push({ k: 'Idény: gólátlagok keresztezve', v: clip((crossS - LINE) / 1.0), w: 2, t: crossS.toFixed(2) + ' gól/meccs' });
    gs.push({ k: 'Forma: utolsó 5 keresztezve', v: clip((crossF - LINE) / 1.2), w: 2, t: crossF.toFixed(2) + ' gól/meccs' });
    var ro = [has('ho') ? num('ho') / 5 : null, has('ao') ? num('ao') / 5 : null].filter(function (x) { return x !== null; });
    if (ro.length) { var rr = avgA(ro); gs.push({ k: 'Gólvonal felett az utolsó 5-ből', v: clip((rr - .5) / .3), w: 2.5, t: Math.round(rr * 100) + '%' }); }
    if (hasH2 && h2o !== null) gs.push({ k: 'H2H: gólvonal felett', v: clip((h2o / h2n - .5) / .3), w: 1.2, t: h2o + ' / ' + h2n });
    gs.push({ k: 'Liga gólátlag', v: clip((L - LINE) / .8), w: .4, t: L.toFixed(1) });
    if (hSv !== null && aSv !== null) gs.push({ k: 'Kapusok (gyengébb védés → több gól)', v: clip((90.7 - (hSv + aSv) / 2) / 1.2), w: 1, t: ((hSv + aSv) / 2).toFixed(1) + '% átlag' });
    var kDir = ro.length ? 1 : .75, Vg = wavg(gs), sO = 50 + 50 * clip(Vg / .8) * kDir, sU = 100 - sO;

    var cO = consF(gs, 1, .1), cU = consF(gs, -1, .1);
    var mk = function (id, s, c, ok, why, sig, dir, pri) { return { id: id, n: NAME[id], s: s, c: c, ok: ok, why: ok ? '' : why, sig: sig, dir: dir, pri: pri }; };
    var sML1 = 50 + 50 * clip(Dd / .5), sML2 = 50 - 50 * clip(Dd / .5);
    var sR1 = 50 + 50 * clip((Dd - .1) / .5), sR2 = 50 - 50 * clip((Dd + .1) / .5);
    var s1x = 50 + 50 * clip((Dd + .15) / .5), sx2 = 50 + 50 * clip((-Dd + .15) / .5);
    var cc1 = consF(rc, 1, .1), cc2 = consF(rc, -1, .1), c1x = consF(rc, 1, -.1), cx2 = consF(rc, -1, -.1);
    var mM = [
      mk('om1', sML1, cc1, Dd >= .15 && sML1 >= 68 && cc1 >= .55, Dd < .15 ? 'kicsi a hazai erőfölény' : 'kevés jelzés támogatja', rc, 1, true),
      mk('om2', sML2, cc2, Dd <= -.2 && sML2 >= 72 && cc2 >= .6, Dd > -.2 ? 'nincs elég vendég-fölény (idegenben szigorúbb)' : 'kevés jelzés támogatja', rc, -1, true),
      mk('o1', sR1, cc1, Dd >= .3 && sR1 >= 75 && cc1 >= .65, '60 percben nem elég nagy a fölény', rc, 1, true),
      mk('o2', sR2, cc2, Dd <= -.4 && sR2 >= 78 && cc2 >= .7, '60 percben nem elég nagy a vendég-fölény', rc, -1, true),
      mk('oov', sO, cO, sO >= 68 && cO >= .65, sO < 68 ? 'nincs elég gólgazdag jelzés' : 'a jelzések nem egyeznek', gs, 1, true),
      mk('oun', sU, cU, sU >= 68 && cU >= .65, sU < 68 ? 'nincs elég gólszegény jelzés' : 'a jelzések nem egyeznek', gs, -1, true),
      mk('o1x', s1x, c1x, s1x >= 72 && c1x >= .7, 'a hazai nem elég biztos', rc, 1, false),
      mk('ox2', sx2, cx2, sx2 >= 72 && cx2 >= .7, 'a vendég nem elég biztos', rc, -1, false)
    ];
    var rb = {
      om1: loo(rc, function (a) { return 50 + 50 * clip(dOf(a) / .5); }),
      om2: loo(rc, function (a) { return 50 - 50 * clip(dOf(a) / .5); }),
      oov: loo(gs, function (a) { return 50 + 50 * clip(wavg(a) / .8) * kDir; }),
      oun: loo(gs, function (a) { return 50 - 50 * clip(wavg(a) / .8) * kDir; })
    };
    var mp = function (id) {
      if ((id === 'o1' || id === 'o2') && have1x2) return t1 !== undefined ? (id === 'o1' ? t1 : t2) : null;
      if ((id === 'om1' || id === 'om2') && haveML) return id === 'om1' ? tml : 1 - tml;
      if ((id === 'oov' || id === 'oun') && haveOU) return id === 'oov' ? tou : 1 - tou;
      return null;
    };
    mM.forEach(function (m) {
      var p = mp(m.id);
      if (m.ok && rb[m.id] !== undefined && rb[m.id] < 62) { m.ok = false; m.why = 'törékeny: egyetlen jelzés kiesésével gyengül'; }
      if (m.ok && p !== null && p < .42) { m.ok = false; m.why = 'a piac erősen ellentmond (' + (p * 100).toFixed(0) + '%)'; }
    });
    var prim = mM.filter(function (m) { return m.pri && m.ok; }).sort(function (x, y) { return y.s - x.s || y.c - x.c; });
    var dcs = mM.filter(function (m) { return !m.pri && m.ok; }).sort(function (x, y) { return y.s - x.s; });
    var pk = prim[0] || dcs[0] || null, alt = prim[0] ? prim[1] : null;
    var best = mM.slice().sort(function (x, y) { return y.s - x.s; })[0];
    var lvl = pk ? (pk.s >= 80 ? 'Erős' : pk.s >= 74 ? 'Közepes' : 'Gyenge') : '–';
    var pkOdd = pk && ODDID[pk.id] ? num(ODDID[pk.id]) : NaN;

    /* 3) pontos végeredmény – top 2 */
    var PRx = { o1: function (i, j) { return i > j; }, o2: function (i, j) { return i < j; }, om1: function (i, j) { return i > j; }, om2: function (i, j) { return i < j; }, o1x: function (i, j) { return i >= j; }, ox2: function (i, j) { return i <= j; }, oov: function (i, j) { return i + j > LINE; }, oun: function (i, j) { return i + j < LINE; } };
    var tipset = pk ? sc.filter(function (z) { return PRx[pk.id](z[2], z[3]); }) : sc;
    var tipSum = tipset.reduce(function (q, z) { return q + z[1]; }, 0);
    var inLean = function (z) { return !lean || (lean === 'h' ? z[2] > z[3] : z[3] > z[2]); };
    var first = tipset.find(inLean) || tipset[0];
    var second = tipset.find(function (z) { return z !== first; }) || sc.find(function (z) { return z !== first; });
    var top2 = [first, second].filter(Boolean), t2set = top2.map(function (z) { return z[0]; });
    var t2sum = top2.reduce(function (q, z) { return q + z[1]; }, 0);

    /* 4) kockázati (bunda) szűrő */
    var S = [], add = function (k, s, w, t) { S.push({ k: k, s: clamp01(s), w: w, t: t }); };
    var news = $('nw').value, newsF = news === '0' ? 1 : .6;
    var gapMkt = null;
    if (haveML) gapMkt = Math.abs(PRE[3] - tml); else if (have1x2) gapMkt = Math.abs(PRE[0] - t1) + Math.abs(PRE[2] - t2);
    if (gapMkt !== null) add('Piac–statisztika eltérés', ((gapMkt - .12) / .3) * newsF, 3, 'eltérés: ' + (gapMkt * 100).toFixed(0) + ' százalékpont' + (news !== '0' ? ' (hiányzók miatt enyhítve)' : ''));
    var n1 = num('n1'), n2 = num('n2');
    if (haveML && n1 > 1 && n2 > 1) {
      var d1 = om1 / n1 - 1, d2 = om2 / n2 - 1, mx = Math.max(Math.abs(d1), Math.abs(d2)), s = mx < .07 ? 0 : (mx - .07) / .2;
      var contra = (lean === 'h' && (d1 > .08 || d2 < -.08)) || (lean === 'a' && (d2 > .08 || d1 < -.08));
      if (s > 0) s = contra ? Math.min(1, s * 1.35 + .1) : s * .5;
      add('Szorzó-mozgás (nyitó → mostani)', s, 2.5, 'hazai: ' + n1.toFixed(2) + '→' + om1.toFixed(2) + ', vendég: ' + n2.toFixed(2) + '→' + om2.toFixed(2) + (contra ? ' – a statisztikával ellentétes irány' : ''));
    }
    var pFav = haveML ? Math.max(tml, 1 - tml) : have1x2 ? Math.max(t1, t2) : null;
    if (pFav !== null) {
      if (pFav > .62) { var sup = (haveML ? (tml >= .5 ? Dd : -Dd) : (t1 >= t2 ? Dd : -Dd)); add('Nagy piaci favorit, gyenge statisztikai támasz', (.25 - sup) / .5, 2, 'piaci favorit ' + (pFav * 100).toFixed(0) + '%, statisztikai erőfölény ' + sup.toFixed(2)); }
      var mn = Math.min.apply(null, [om1, om2, o1, o2].filter(function (x) { return x > 1; }));
      if (isFinite(mn) && mn < 1.12) add('Extrém alacsony szorzó', .7, 1, mn.toFixed(2));
    }
    if (haveOU) { var gOU = Math.abs(PRE[4] - tou); add('Gólpiac eltérése a modelltől', ((gOU - .15) / .25) * newsF, 1.5, 'modell ' + (PRE[4] * 100).toFixed(0) + '% vs piac ' + (tou * 100).toFixed(0) + '%'); }
    var unc = (hBack || aBack ? .6 : 0) + ($('hb').value === '1' ? .25 : 0) + ($('ab').value === '1' ? .25 : 0);
    add('Kapus- és fáradtsági bizonytalanság', unc, 1.5, (hBack ? 'hazai tartalék kapus; ' : '') + (aBack ? 'vendég tartalék kapus; ' : '') + ($('hb').value === '1' ? 'hazai back-to-back; ' : '') + ($('ab').value === '1' ? 'vendég back-to-back; ' : '') + (unc ? '' : 'nincs ismert probléma'));
    var mt = $('mt').value;
    add('Meccstípus', mt === 'a' ? .8 : 0, 1.5, { b: 'alapszakasz', p: 'rájátszás', a: 'barátságos / előszezon' }[mt]);
    var tw = S.reduce(function (q, x) { return q + x.w; }, 0), base = 100 * S.reduce(function (q, x) { return q + x.s * x.w; }, 0) / tw;
    var peak = Math.max.apply(null, [0].concat(S.filter(function (x) { return x.w >= 1.5; }).map(function (x) { return x.s * 100; })));
    var bScore = Math.round(Math.min(100, .6 * base * 1.25 + .4 * peak)), shift = $('sens').value === 's' ? -8 : $('sens').value === 'e' ? 8 : 0;
    var bLevel = bScore < 30 + shift ? 0 : bScore < 50 + shift ? 1 : bScore < 65 + shift ? 2 : 3;
    var bName = ['Tiszta', 'Figyelj', 'Emelt kockázat', 'Bunda-gyanús'][bLevel], bCls = ['g', 'y', 'y', 'r'][bLevel];
    var bTop = S.filter(function (x) { return x.s >= .5; }).sort(function (x, y) { return y.s * y.w - x.s * x.w; });
    var hasMkt = gapMkt !== null;

    /* 5) összesítő ítélet */
    var st2 = 'JÓ', vc = 'ok', why = [];
    if (!pk) { st2 = 'KIHAGY'; vc = 'bad'; why.push('nincs elég erős, egyező jelzés egyik piacon sem'); }
    if (bLevel >= 3) { st2 = 'KIHAGY'; vc = 'bad'; why.push('magas bunda-kockázat (' + bScore + '/100): ' + (bTop[0] ? bTop[0].k : 'több gyanús jelzés')); }
    else if (bLevel === 2 && st2 !== 'KIHAGY') { st2 = 'ÓVATOSAN'; vc = 'warn'; why.push('emelt bunda-kockázat (' + bScore + '/100)'); }
    if (pk && lvl === 'Gyenge' && st2 === 'JÓ') { st2 = 'ÓVATOSAN'; vc = 'warn'; why.push('a tipp bizonyossága gyenge'); }
    if (pk && ((pk.dir === 1 && hBack && /^o(m)?1/.test(pk.id)) || (pk.dir === -1 && aBack && /^o(m)?2/.test(pk.id)))) { if (st2 === 'JÓ') { st2 = 'ÓVATOSAN'; vc = 'warn'; } why.push('a tippelt csapat tartalék kapussal áll ki'); }
    if (pk && pkOdd > 1 && PM[pk.id] !== undefined) { var ev = PM[pk.id] * pkOdd - 1; if (ev < -.08) { if (st2 === 'JÓ') { st2 = 'ÓVATOSAN'; vc = 'warn'; } why.push('a szorzó (' + fmt(pkOdd) + ') alacsonynak tűnik a modellhez képest (EV ' + (ev * 100).toFixed(0) + '%)'); } }
    if (!hasMkt) why.push('szorzók nélkül a bunda-szűrő korlátozottan működik');
    if (st2 === 'JÓ') why.push('a szűrők nem találtak komoly kockázatot');
    var vcls = 'v-' + vc;

    /* 6) kiírás */
    var bcol = ['#34d399', '#fbbf24', '#fb923c', '#fb7185'][bLevel];
    var d = $('dt').value, tm = $('tm').value, ts = d ? new Date(d + 'T' + (tm || '12:00')).getTime() : NaN;
    var kick = isNaN(ts) ? '<span class="pill y">Nincs kezdési idő megadva</span>' : '<span class="pill">⏱ ' + esc(new Date(ts).toLocaleString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour: tm ? '2-digit' : undefined, minute: tm ? '2-digit' : undefined })) + '</span><span class="pill v" data-ts="' + ts + '"></span>';
    var verdictCard = '<div class="card pick verdict ' + vcls + '"><h2>Összesítő – szűrők eredménye</h2><div class="vrow"><div class="vbadge ' + vcls + '">' + st2 + '</div><div class="vwhy"><b>' + esc(HN) + ' – ' + esc(AN) + '</b><ul>' + why.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul></div></div>' +
      '<div class="gwrap"><div class="gbox"><div class="gauge" data-p="' + (pk ? Math.round(pk.s) : 0) + '" style="--gc:#38bdf8"><b>' + (pk ? Math.round(pk.s) : 0) + '</b></div>Tipp-pontszám</div><div class="gbox"><div class="gauge" data-p="' + bScore + '" style="--gc:' + bcol + '"><b>' + bScore + '</b></div>Bunda-kockázat</div></div><div style="margin-top:12px">' + kick + '</div></div>';
    var pickCard = pk ? '<div class="card pick"><h2>Fő tipp – statisztika és forma alapján</h2><div style="font-size:1.5rem;font-weight:800">' + esc(pk.n) + '</div><p style="margin:6px 0 0">Forma-pontszám: <b>' + pk.s.toFixed(0) + '/100</b> · Konszenzus: <b>' + (pk.c * 100).toFixed(0) + '%</b> a jelzésekből' + (pkOdd > 1 ? ' · Szorzó: <b>' + fmt(pkOdd) + '</b>' : '') + '</p><span class="pill">Bizonyosság: ' + lvl + '</span>' + (pk.pri ? '' : '<span class="pill">Biztonsági tipp</span>') + (alt ? '<span class="pill">Másik erős: ' + esc(alt.n) + ' (' + alt.s.toFixed(0) + ' pont)</span>' : '') + '<span class="pill">Modell szerint (tájékoztató): ' + (PM[pk.id] * 100).toFixed(0) + '%</span></div>'
      : '<div class="card pick"><h2>Nincs értékelhető tipp – kihagyás ajánlott</h2><p style="margin:0">A jelzések nem egyeznek elég erősen egyik piacon sem. Legjobb jelzés: <b>' + esc(best.n) + '</b> (' + best.s.toFixed(0) + ' pont, ' + esc(best.why || '') + ').</p></div>';
    var top2Card = '<div class="card pick"><h2>Pontos végeredmény – Top 2</h2><div class="big">' + top2.map(function (z, k) { return '<div><b>' + z[0] + '</b><span>' + (k + 1) + '. tipp · ' + (z[1] * 100).toFixed(1) + '%</span></div>'; }).join('') + '</div><p class="warn" style="margin:10px 0 0">A két eredmény együtt ' + (t2sum * 100).toFixed(0) + '% eséllyel jön be' + (pk && tipSum ? ', ami a(z) „' + esc(pk.n) + '” tipp lehetséges eseteinek ' + (t2sum / tipSum * 100).toFixed(0) + '%-a' : '') + '. A hosszabbításos / szétlövéses meccsek a győztes javára +1 góllal szerepelnek.</p></div>';
    var whyCard = pk ? '<div class="card"><h2>Miért ez a tipp?</h2>' + sigTable(pk.sig, pk.dir) + '<p class="warn" style="margin-top:8px">A tipp csak akkor marad, ha bármelyik jelzés kiesése után is erős, és a piac sem mond neki élesen ellent.</p></div>' : '';
    var topTxt = bTop.length ? '<ul>' + bTop.slice(0, 4).map(function (x) { return '<li><b>' + esc(x.k) + '</b>: ' + esc(x.t) + '</li>'; }).join('') + '</ul>' : '<p style="margin:6px 0 0">Egyetlen jelzés sem lépte át a gyanús szintet.</p>';
    var bundaCard = '<div class="card"><h2>Kockázati szűrő (gyanús meccs)</h2><div class="vrow"><div class="gauge" data-p="' + bScore + '" style="--gc:' + bcol + '"><b>' + bScore + '</b></div><div class="vwhy"><span class="pill ' + bCls + '">' + bName + '</span>' + topTxt + '</div></div>' + (!hasMkt ? '<p class="warn" style="margin:8px 0 0">⚠ Add meg a szorzókat (és a nyitó szorzókat is), különben a legfontosabb jelzések hiányoznak.</p>' : '') + sTbl(S) + '<p class="warn" style="margin-top:8px">Ez statisztikai kockázati jelző, nem bizonyíték: a szokatlan szorzó-, kapus- és időzítési mintákat jelzi. A magas érték „kihagyás ajánlott”, nem vád.</p></div>';
    var rankRows = mM.slice().sort(function (x, y) { return y.s - x.s; }).map(function (m) { return '<tr><td>' + esc(m.n) + '</td><td>' + m.s.toFixed(0) + '</td><td>' + (m.c * 100).toFixed(0) + '%</td><td>' + (m.ok ? '<span class="pos">megfelel</span>' : '<span class="neg">' + esc(m.why) + '</span>') + '</td></tr>'; }).join('');
    var rankCard = '<div class="card"><h2>Tipp-rangsor (forma-pontszám)</h2><div class="tbl"><table><tr><th>Piac</th><th>Pont</th><th>Konszenzus</th><th>Állapot</th></tr>' + rankRows + '</table></div></div>';
    var rows = '', ids = ['o1', 'ox', 'o2', 'o1x', 'ox2', 'om1', 'om2', 'oov', 'oun'];
    ids.forEach(function (id) {
      var p = PM[id], odd = ODDID[id] ? num(ODDID[id]) : NaN, imp = '–', ev2 = '–';
      if (odd > 1) { imp = (100 / odd).toFixed(1) + '%'; var e2 = (p * odd - 1) * 100; ev2 = '<span class="' + (e2 > 0 ? 'pos' : 'neg') + '">' + (e2 > 0 ? '+' : '') + e2.toFixed(1) + '%</span>'; }
      rows += '<tr><td>' + esc(NAME[id]) + '<div class="bar"><i data-w="' + (p * 100).toFixed(0) + '%"></i></div></td><td>' + (p * 100).toFixed(1) + '%</td><td>' + fmt(1 / p) + '</td><td>' + (odd > 1 ? fmt(odd) : '–') + '</td><td>' + imp + '</td><td>' + ev2 + '</td></tr>';
    });
    var marg = have1x2 ? '<span class="pill">1X2 irodai árrés: ' + ((1 / o1 + 1 / ox + 1 / o2 - 1) * 100).toFixed(1) + '%</span>' : '';
    var optN = [hF !== null, aF !== null, has('ho'), has('ao'), hasH2, h2o !== null, hSv !== null && aSv !== null, stOK].filter(Boolean).length, q = Math.round(60 + 40 * optN / 8);
    var overview = '<div class="card"><h2>' + esc(HN) + ' – ' + esc(AN) + (d ? ' · ' + esc(d) : '') + '</h2><div class="big"><div><b>' + (MLH * 100).toFixed(0) + '%</b><span>' + esc(HN) + ' továbbjut</span></div><div><b>' + (D * 100).toFixed(0) + '%</b><span>60 perc döntetlen</span></div><div><b>' + (MLA * 100).toFixed(0) + '%</b><span>' + esc(AN) + ' továbbjut</span></div></div><p style="margin:12px 0 4px">Várható gólok (60 perc): <b>' + fmt(lh) + '</b> – <b>' + fmt(la) + '</b> (össz. ' + fmt(lh + la) + ') · Top 2 végeredmény: <b>' + t2set.join(' / ') + '</b></p><span class="pill">Adatminőség: ' + q + '%</span><span class="pill">Liga átlag: ' + L.toFixed(1) + ' gól</span><span class="pill">Gólvonal: ' + lineTxt + '</span>' + marg + mktPill + '</div>';
    var allCard = '<div class="card"><h2>Összes piac <span class="opt" style="text-transform:none">(modell – csak tájékoztató)</span></h2><div class="tbl"><table><tr><th>Piac</th><th>Valószín.</th><th>Fair</th><th>Szorzó</th><th>Implikált</th><th>Érték (EV)</th></tr>' + rows + '</table></div></div>';
    var avg = function (x, y) { return (x / Math.max(1, y)).toFixed(2); };
    var stats = '<div class="card"><h2>Statisztikai alap</h2><div class="tbl"><table><tr><th></th><th>' + esc(HN) + '</th><th>' + esc(AN) + '</th></tr>' +
      '<tr><td>Tabellahelyezés</td><td>' + num('hp') + '.</td><td>' + num('ap') + '.</td></tr>' +
      '<tr><td>Győzelmi arány</td><td>' + Math.round(hWR * 100) + '%</td><td>' + Math.round(aWR * 100) + '%</td></tr>' +
      '<tr><td>Forma, utolsó 5</td><td>' + (hF !== null ? Math.round(hF * 100) + '%' : '–') + '</td><td>' + (aF !== null ? Math.round(aF * 100) + '%' : '–') + '</td></tr>' +
      '<tr><td>Idény: lőtt / meccs</td><td>' + avg(num('hgf'), mH) + '</td><td>' + avg(num('agf'), mA) + '</td></tr>' +
      '<tr><td>Idény: kapott / meccs</td><td>' + avg(num('hga'), mH) + '</td><td>' + avg(num('aga'), mA) + '</td></tr>' +
      '<tr><td>Utolsó 5: lőtt / meccs</td><td>' + h5s.toFixed(2) + '</td><td>' + a5s.toFixed(2) + '</td></tr>' +
      '<tr><td>Utolsó 5: kapott / meccs</td><td>' + h5c.toFixed(2) + '</td><td>' + a5c.toFixed(2) + '</td></tr>' +
      '<tr><td>H2H (hazai – vendég győzelem)</td><td colspan="2">' + (hasH2 ? h2w + ' – ' + h2l : 'nincs megadva') + '</td></tr>' +
      '<tr><td>Várható összgól: statisztikai / modell</td><td colspan="2">' + statTotal.toFixed(2) + ' / ' + fmt(lh + la) + '</td></tr>' +
      '<tr><td>Várható gól (modell, 60 perc)</td><td><b>' + fmt(lh) + '</b></td><td><b>' + fmt(la) + '</b></td></tr></table></div></div>';
    var mxp = 0; for (i = 0; i <= 9; i++) for (j = 0; j <= 9; j++) mxp = Math.max(mxp, F[i][j]);
    var hmp = '<tr><th>Hazai↓ Vendég→</th>' + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (x) { return '<th>' + x + '</th>'; }).join('') + '</tr>';
    for (i = 0; i <= 9; i++) { hmp += '<tr><th>' + i + '</th>'; for (j = 0; j <= 9; j++) { var pr = F[i][j], bd = t2set.indexOf(i + '-' + j) >= 0 ? 'outline:2px solid #a78bfa;font-weight:800;' : ''; hmp += '<td style="text-align:center;padding:5px 3px;background:rgba(99,102,241,' + (pr / mxp * 0.6).toFixed(2) + ');' + bd + '">' + (pr * 100).toFixed(1) + '</td>'; } hmp += '</tr>'; }
    var top20 = sc.slice(0, 20).map(function (z, k) { return '<tr><td>' + (k + 1) + '.</td><td>' + z[0] + '</td><td>' + (z[1] * 100).toFixed(1) + '%</td><td>' + fmt(1 / z[1]) + '</td></tr>'; }).join('');
    var mapCard = '<div class="card"><h2>Végeredmény-térkép (%)</h2><div class="tbl"><table style="font-size:.78rem">' + hmp + '</table></div><h2 style="margin-top:16px">Top 20 pontos végeredmény</h2><div class="tbl"><table><tr><th>#</th><th>Eredmény</th><th>Valószín.</th><th>Fair szorzó</th></tr>' + top20 + '</table></div></div>';

    $('out').innerHTML = verdictCard + pickCard + top2Card + whyCard + bundaCard + overview + rankCard + allCard + stats + mapCard;
    window.__last = HN + ' – ' + AN + '\nFő tipp: ' + (pk ? pk.n + ' (' + pk.s.toFixed(0) + ' pont, ' + lvl + ')' : 'nincs értékelhető tipp – kihagyás') + '\nPontos végeredmény (top 2): ' + t2set.join(' / ') + '\nVárható gólok: ' + fmt(lh) + ' – ' + fmt(la) + '\nBunda-szűrő: ' + bScore + '/100 (' + bName + ')\nÍtélet: ' + st2;
    var tl = $('bTip');
    if (pk) {
      var u = new URLSearchParams({ new: '1', h: HN, a: AN, m: pk.n, o: pkOdd > 1 ? String(pkOdd) : '', l: ($('ls').value || '').split('|')[0], n: 'Modell: ' + (PM[pk.id] * 100).toFixed(0) + '% · várható végeredmény: ' + t2set.join(' / ') });
      if (d) u.set('d', d);
      tl.href = 'tippek.html?' + u.toString(); tl.hidden = false;
    } else tl.hidden = true;
    return { bad: st2 === 'KIHAGY' };
  }

  /* ---------- megjelenítés ---------- */
  function countUp(el) {
    var m = el.textContent.match(/^(\d+)(%?)$/); if (!m || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var to = +m[1], suf = m[2], t0 = performance.now(); el.textContent = '0' + suf;
    (function f(t) { var k = Math.min(1, (t - t0) / 1200), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(to * e) + suf; if (k < 1) requestAnimationFrame(f); })(t0);
  }
  function post(res) {
    var out = $('out');
    out.querySelectorAll(':scope>.card').forEach(function (c, i) { c.style.animationDelay = (i * 70) + 'ms'; });
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      out.querySelectorAll('.bar i[data-w]').forEach(function (e) { e.style.width = e.dataset.w; });
      out.querySelectorAll('.gauge').forEach(function (g) { g.style.setProperty('--p', g.dataset.p); });
    }); });
    out.querySelectorAll('.big b,.gauge b').forEach(countUp);
    tick();
    if (res.bad) { var vc = out.querySelector('.verdict'); if (vc) vc.classList.add('vib'); }
    try { if (navigator.vibrate) navigator.vibrate(res.bad ? [80, 50, 80, 50, 140] : [40]); } catch (e) { }
  }
  function cd(ts) {
    var df = ts - Date.now();
    if (df > 0) { var dd = Math.floor(df / 864e5), h = Math.floor(df % 864e5 / 36e5), m = Math.floor(df % 36e5 / 6e4), s = Math.floor(df % 6e4 / 1e3); return (dd ? dd + ' nap ' : '') + pad2(h) + ':' + pad2(m) + ':' + pad2(s) + ' a kezdésig'; }
    var el = Math.floor(-df / 6e4); return el < 180 ? 'a meccs már elkezdődött' : 'a meccs véget ért';
  }
  function tick() { document.querySelectorAll('[data-ts]').forEach(function (e) { var t = +e.dataset.ts; if (t) e.textContent = cd(t); }); }
  setInterval(tick, 1000);

  function safeRun() {
    $('status').textContent = '⏳ Számolok...';
    try {
      var res = run();
      if (res) { post(res); $('status').textContent = '✅ Kész, az eredmény lent van.'; $('out').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      else $('out').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) { $('out').innerHTML = '<div class="card neg">Hiba: ' + esc(e.message) + '</div>'; $('status').textContent = ''; }
  }

  /* piszkozat (böngészőben marad) */
  var DK = 'vg_hockey_draft';
  function save() { try { var d = {}; document.querySelectorAll('.f').forEach(function (i) { d[i.id] = i.value; }); localStorage.setItem(DK, JSON.stringify(d)); } catch (e) { } }
  function restore() { try { var d = JSON.parse(localStorage.getItem(DK) || 'null'); if (d) for (var k in d) if ($(k)) $(k).value = d[k]; } catch (e) { } }
  var tmr; document.addEventListener('input', function (e) { if (e.target.classList && e.target.classList.contains('f')) { clearTimeout(tmr); tmr = setTimeout(save, 400); } });
  document.addEventListener('change', function (e) { if (e.target.classList && e.target.classList.contains('f')) save(); });

  $('ls').addEventListener('change', function () { var p = $('ls').value.split('|'); if (p.length < 3) return; $('nt').value = p[1]; $('la').value = p[2]; save(); });
  $('bRun').addEventListener('click', safeRun);
  $('bReset').addEventListener('click', function () {
    document.querySelectorAll('.f').forEach(function (i) { if (i.tagName === 'SELECT') { i.selectedIndex = i.id === 'line' ? 2 : 0; } else i.value = ''; });
    $('out').innerHTML = ''; $('status').textContent = ''; $('bTip').hidden = true; try { localStorage.removeItem(DK); } catch (e) { }
  });
  $('bCopy').addEventListener('click', function () {
    var t = window.__last || ''; if (!t) { $('status').textContent = 'Előbb készíts elemzést.'; return; }
    try { navigator.clipboard.writeText(t).then(function () { $('status').textContent = '✅ Másolva.'; }, function () { $('status').textContent = 'A másolás nem engedélyezett.'; }); } catch (e) { $('status').textContent = 'A másolás nem engedélyezett.'; }
  });
  restore();
})();
