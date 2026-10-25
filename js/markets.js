/* VikingGOLD – fogadási piacok, tipp-szöveg építés és automatikus kiértékelés */
const range = (a, b, st = 1) => { const r = []; for (let x = a; x <= b + 1e-9; x += st) r.push(Math.round(x * 100) / 100); return r; };
const UNIT = { labdarugas: 'gól', jegkorong: 'gól', kezilabda: 'gól', kosarlabda: 'pont', tenisz: 'gém' };
const HOME = 'Hazai', AWAY = 'Vendég';

const BASE = {
  '1x2': { l: 'Mérkőzés végeredmény (1X2)', s: [['h', 'Hazai nyer'], ['x', 'Döntetlen'], ['a', 'Vendég nyer']] },
  dc: { l: 'Kettős esély', s: [['1x', 'Hazai vagy döntetlen (1X)'], ['x2', 'Vendég vagy döntetlen (X2)'], ['12', 'Nincs döntetlen (12)']] },
  dnb: { l: 'Döntetlen esetén nincs tét', s: [['h', 'Hazai nyer'], ['a', 'Vendég nyer']] },
  ml: { l: 'Győztes', s: [['h', 'Hazai nyer'], ['a', 'Vendég nyer']] },
  hcp: { l: 'Hendikep', s: [['h', 'Hazai'], ['a', 'Vendég']], line: 'signed' },
  tot: { l: 'Összes gól', s: [['o', 'Felett'], ['u', 'Alatt']], line: 'pos' },
  tth: { l: 'Hazai csapat gólja', s: [['o', 'Felett'], ['u', 'Alatt']], line: 'pos' },
  tta: { l: 'Vendég csapat gólja', s: [['o', 'Felett'], ['u', 'Alatt']], line: 'pos' },
  btts: { l: 'Mindkét csapat szerez gólt', s: [['y', 'Igen'], ['n', 'Nem']] },
  oe: { l: 'Összes gól páros / páratlan', s: [['odd', 'Páratlan'], ['even', 'Páros']] },
  shcp: { l: 'Szett hendikep', s: [['h', 'Hazai'], ['a', 'Vendég']], line: 'signed' },
  stot: { l: 'Összes szett', s: [['o', 'Felett'], ['u', 'Alatt']], line: 'pos' },
  ghcp: { l: 'Gém hendikep', s: [['h', 'Hazai'], ['a', 'Vendég']], line: 'signed' },
  gtot: { l: 'Összes gém', s: [['o', 'Felett'], ['u', 'Alatt']], line: 'pos' },
  free: { l: 'Egyéb (saját szöveg)', s: [], free: true }
};
const ORDER = {
  labdarugas: ['1x2', 'dc', 'dnb', 'hcp', 'tot', 'tth', 'tta', 'btts', 'oe', 'free'],
  jegkorong: ['1x2', 'dc', 'ml', 'dnb', 'hcp', 'tot', 'tth', 'tta', 'btts', 'oe', 'free'],
  kezilabda: ['1x2', 'dc', 'dnb', 'hcp', 'tot', 'tth', 'tta', 'oe', 'free'],
  kosarlabda: ['ml', 'hcp', 'tot', 'tth', 'tta', 'oe', 'free'],
  tenisz: ['ml', 'shcp', 'stot', 'ghcp', 'gtot', 'free']
};
const LABEL = {
  jegkorong: { ml: 'Győztes (hosszabbítással, szétlövéssel)', '1x2': 'Végeredmény 60 percre (1X2)', dc: 'Kettős esély (60 perc)', dnb: 'Döntetlen esetén nincs tét (60 perc)', hcp: 'Hendikep (60 perc)', tot: 'Összes gól (60 perc)' },
  kosarlabda: { ml: 'Győztes (hosszabbítással)', hcp: 'Hendikep', tot: 'Összes pont', tth: 'Hazai csapat pontja', tta: 'Vendég csapat pontja', oe: 'Összes pont páros / páratlan' },
  tenisz: { ml: 'Mérkőzés győztese' }
};
const LINES = {
  labdarugas: { hcp: range(-3, 3, .5), tot: range(.5, 6.5), tth: range(.5, 3.5), tta: range(.5, 3.5) },
  jegkorong: { hcp: range(-3.5, 3.5, .5), tot: range(2.5, 9.5), tth: range(.5, 5.5), tta: range(.5, 5.5) },
  kezilabda: { hcp: range(-12.5, 12.5, 1), tot: range(48.5, 66.5), tth: range(22.5, 36.5), tta: range(22.5, 36.5) },
  kosarlabda: { hcp: range(-20.5, 20.5, 1), tot: range(140.5, 240.5, 1), tth: range(60.5, 125.5, 1), tta: range(60.5, 125.5, 1) },
  tenisz: { shcp: [-2.5, -1.5, 1.5, 2.5], stot: [2.5, 3.5, 4.5], ghcp: range(-8.5, 8.5, 1), gtot: range(17.5, 40.5, 1) }
};

export function mktList(sport) {
  const o = ORDER[sport] || ORDER.labdarugas;
  return o.map(k => ({ k, ...BASE[k], l: (LABEL[sport] && LABEL[sport][k]) || BASE[k].l }));
}
export const mktDef = (sport, k) => mktList(sport).find(m => m.k === k);
export const lineSuggest = (sport, k) => ((LINES[sport] || {})[k]) || [];
const unitOf = (sport, k) => k === 'stot' || k === 'shcp' ? 'szett' : k === 'ghcp' || k === 'gtot' ? 'gém' : UNIT[sport] || 'gól';
const sg = n => (n > 0 ? '+' : n < 0 ? '−' : '') + String(Math.abs(n)).replace('.', ',');
const ps = n => String(n).replace('.', ',');

export function buildPick({ sport, mk, sd, ln, home, away, free }) {
  const h = (home || '').trim() || HOME, a = (away || '').trim() || AWAY;
  const nm = s => s === 'h' ? h : a, u = unitOf(sport, mk);
  switch (mk) {
    case '1x2': return sd === 'h' ? `${h} nyer` : sd === 'a' ? `${a} nyer` : 'Döntetlen';
    case 'dc': return sd === '1x' ? `${h} vagy döntetlen` : sd === 'x2' ? `${a} vagy döntetlen` : `${h} vagy ${a} (nincs döntetlen)`;
    case 'dnb': return `${nm(sd)} nyer (döntetlen esetén nincs tét)`;
    case 'ml': return `${nm(sd)} nyer` + (sport === 'jegkorong' ? ' (hosszabbítással is)' : '');
    case 'hcp': case 'shcp': case 'ghcp': return `${nm(sd)} ${sg(ln)} ${mk === 'shcp' ? 'szett ' : mk === 'ghcp' ? 'gém ' : ''}hendikep`;
    case 'tot': case 'stot': case 'gtot': return `Összesen ${ps(ln)} ${u} ${sd === 'o' ? 'felett' : 'alatt'}`;
    case 'tth': return `${h}: ${ps(ln)} ${u} ${sd === 'o' ? 'felett' : 'alatt'}`;
    case 'tta': return `${a}: ${ps(ln)} ${u} ${sd === 'o' ? 'felett' : 'alatt'}`;
    case 'btts': return `Mindkét csapat szerez gólt: ${sd === 'y' ? 'igen' : 'nem'}`;
    case 'oe': return `Összes ${u === 'gém' ? 'pont' : u}: ${sd === 'odd' ? 'páratlan' : 'páros'}`;
    default: return (free || '').trim();
  }
}

/* ---- eredmény értelmezése ---- */
function parseResult(sport, str) {
  const s = String(str || '');
  const all = [...s.matchAll(/(\d+)\s*[-–:]\s*(\d+)/g)].map(m => [+m[1], +m[2]]);
  if (!all.length) return null;
  if (sport === 'tenisz') {
    const setScores = all.length >= 2 || Math.max(...all[0]) > 3;
    if (setScores) {
      let sh = 0, sa = 0, gh = 0, ga = 0;
      all.forEach(([x, y]) => { if (x > y) sh++; else if (y > x) sa++; gh += x; ga += y; });
      return { h: sh, a: sa, gh, ga };
    }
    return { h: all[0][0], a: all[0][1], gh: null, ga: null };
  }
  return { h: all[0][0], a: all[0][1] };
}
const cmp = (v, line, over) => v === line ? 'void' : ((v > line) === over ? 'win' : 'loss');


/* Ha a tipp nem a piac-választóval készült (régi vagy szabad szöveg), a tipp szövegéből próbáljuk kitalálni a piacot:
   "Összesen 4,5 gól felett", "X nyer", "Döntetlen", "Mindkét csapat szerez gólt: igen" stb. */
export function inferTip(t) {
  const p = String(t.pick || '').trim(); if (!p) return null;
  const sport = t.sport || 'jegkorong', low = x => String(x || '').trim().toLowerCase();
  const num = x => parseFloat(String(x).replace(',', '.'));
  let m;
  if ((m = p.match(/^mindkét csapat szerez gólt:?\s*(igen|nem)/i))) return { mk: 'btts', sd: low(m[1]) === 'igen' ? 'y' : 'n' };
  if ((m = p.match(/^(over|under|felett|alatt)\s*(\d+(?:[.,]\d+)?)/i))) return { mk: 'tot', sd: /^(over|felett)/i.test(m[1]) ? 'o' : 'u', ln: num(m[2]) };
  if ((m = p.match(/(\d+(?:[.,]\d+)?)\s*(?:gól|pont|gém|szett)?\s*(felett|alatt)/i))) {
    const before = p.slice(0, m.index).trim().replace(/[:\-–]\s*$/, '').trim().toLowerCase();
    const o = m[2].toLowerCase() === 'felett' ? 'o' : 'u', ln = num(m[1]);
    if (!before || before === 'összesen' || before === 'összes') return { mk: 'tot', sd: o, ln };
    if (before === low(t.home) || before === 'hazai') return { mk: 'tth', sd: o, ln };
    if (before === low(t.away) || before === 'vendég') return { mk: 'tta', sd: o, ln };
    return { mk: 'tot', sd: o, ln };
  }
  if (/^döntetlen$/i.test(p)) return { mk: '1x2', sd: 'x' };
  if ((m = p.match(/^(.+?)\s+nyer\b(.*)$/i))) {
    const n = low(m[1]), side = n === low(t.home) || n === 'hazai' ? 'h' : n === low(t.away) || n === 'vendég' ? 'a' : null;
    if (!side) return null;
    if (/döntetlen esetén nincs tét/i.test(m[2])) return { mk: 'dnb', sd: side };
    if (sport === 'kosarlabda' || sport === 'tenisz') return { mk: 'ml', sd: side };
    if (sport === 'jegkorong') return /hosszab/i.test(m[2]) ? { mk: 'ml', sd: side } : { mk: '1x2', sd: side };
    return { mk: '1x2', sd: side };
  }
  return null;
}

/* jégkorong: hosszabbítás / szétlövés jelölése az eredményben, pl. "4-3 ot" vagy "3-2 so" */
export const otFlag = s => /(?:^|[^a-zA-Z])(ot|so|sp|szl|hn|hosszab\w*|szétl\w*)(?![a-zA-Z])/i.test(String(s || ''));

/* win | loss | void | null (nem eldönthető automatikusan)
   Jégkorongnál a "Győztes" piac a végeredményt nézi, a többi (1X2, hendikep, gól stb.) a 60 perces állást:
   ha az eredmény mellé írod, hogy ot / so, a 60 perces állás döntetlen. */
export function evalTip(t) {
  if (!t) return null;
  if (!t.mk || !t.sd) { const g = inferTip(t); if (!g) return null; t = { ...t, ...g }; }
  const sport = t.sport || 'jegkorong';
  const r = parseResult(sport, t.result); if (!r) return null;
  const ln = Number(t.ln), over = t.sd === 'o';
  const fh = r.h, fa = r.a;
  const reg = sport === 'jegkorong' && otFlag(t.result) && fh !== fa;
  const h = reg ? Math.min(fh, fa) : fh, a = reg ? Math.min(fh, fa) : fa, sum = h + a;
  switch (t.mk) {
    case '1x2': return (t.sd === 'h' ? h > a : t.sd === 'a' ? a > h : h === a) ? 'win' : 'loss';
    case 'dc': return (t.sd === '1x' ? h >= a : t.sd === 'x2' ? a >= h : h !== a) ? 'win' : 'loss';
    case 'dnb': return h === a ? 'void' : ((t.sd === 'h') === (h > a) ? 'win' : 'loss');
    case 'ml': return fh === fa ? null : ((t.sd === 'h') === (fh > fa) ? 'win' : 'loss');
    case 'hcp': case 'shcp': { const d = t.sd === 'h' ? h + ln - a : a + ln - h; return d > 0 ? 'win' : d < 0 ? 'loss' : 'void'; }
    case 'ghcp': { if (r.gh == null) return null; const d = t.sd === 'h' ? r.gh + ln - r.ga : r.ga + ln - r.gh; return d > 0 ? 'win' : d < 0 ? 'loss' : 'void'; }
    case 'tot': case 'stot': return cmp(sum, ln, over);
    case 'gtot': return r.gh == null ? null : cmp(r.gh + r.ga, ln, over);
    case 'tth': return cmp(h, ln, over);
    case 'tta': return cmp(a, ln, over);
    case 'btts': return ((h > 0 && a > 0) === (t.sd === 'y')) ? 'win' : 'loss';
    case 'oe': return ((sum % 2 === 1) === (t.sd === 'odd')) ? 'win' : 'loss';
    default: return null;
  }
}
