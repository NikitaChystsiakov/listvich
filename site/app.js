/* Листвич: конструктор, каталог, заявка. Данные каталога — window.LISTVICH_PRODUCTS (data.js). */
import { createShed, PAINTS } from './shed3d.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const PRODUCTS = window.LISTVICH_PRODUCTS || [];
const PHONE = '+375298059997';
const fmtN = (n) => Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ');
const byn = (n) => fmtN(n) + ' BYN';
const m = (v) => String(+(+v).toFixed(2)).replace('.', ',');
const r50 = (v) => Math.round(v / 50) * 50;

/* ---------- цены (на проверку Артуру, см. .art-director/pricing.md) ---------- */
// Базовый хозблок по площади — точки из карточек listvich.by
const AREA_PTS = [[6, 3500], [8.4, 3850], [10.5, 4400], [13.8, 4950], [18, 5900], [21, 6650]];
function basePrice(a) {
  if (a <= AREA_PTS[0][0]) return AREA_PTS[0][1] - (AREA_PTS[0][0] - a) * 250;
  for (let i = 1; i < AREA_PTS.length; i++) {
    const [a0, p0] = AREA_PTS[i - 1], [a1, p1] = AREA_PTS[i];
    if (a <= a1) return p0 + (p1 - p0) * (a - a0) / (a1 - a0);
  }
  const [aN, pN] = AREA_PTS[AREA_PTS.length - 1];
  return pN + (a - aN) * 300;
}
const WIDTHS = [2, 2.1, 2.3, 3];
const BASE_SRC = { '3x2': 'Хозблок 3×2 м', '4x2.1': 'Хозблок 4×2,1 м без отделки', '5x2.1': 'Хозблок 5×2,1 м', '6x2.3': 'Хозблок 6×2,3 м с крыльцом', '6x3': 'Хозблок 6×3 м с крыльцом' };
const TERRACES = [0, 2, 3, 4];

const st = { kind: 'hoz', L: 4, W: 3, terrace: 2, drovnik: 0, rooms: 1, windows: 1, pvc: 0, doors: 0, piles: 0, gkl: 0, gutter: 0, paint: 'natural' };

function quote(s = st) {
  const area = s.L * s.W, totalLen = s.L + s.terrace + (s.drovnik ? 1.2 : 0), foot = totalLen * s.W;
  const rows = [];
  const base = r50(basePrice(area));
  const src = BASE_SRC[`${s.L}x${s.W}`];
  rows.push([`${s.kind === 'dom' ? 'Дачный домик' : 'Хозблок'} ${m(s.L)}×${m(s.W)} м${src ? `, как «${src}» в каталоге` : ', базовая комплектация'}`, base]);
  if (s.kind === 'dom') rows.push(['Утепление 100 мм, отделка вагонкой, чистовой пол', r50(330 * area + 1000)]);
  if (s.terrace) rows.push([`Терраса ${m(s.terrace)} м под общей крышей`, r50(220 * s.terrace * s.W)]);
  if (s.drovnik) rows.push(['Дровник с торца', r50(150 * 1.2 * s.W)]);
  if (s.rooms > 1) rows.push([`Отдельных помещений: ${s.rooms}`, 350 * (s.rooms - 1)]);
  if (s.windows > 1) rows.push([`Дополнительные окна: ${s.windows - 1}`, 250 * (s.windows - 1)]);
  if (s.windows === 0) rows.push(['Без окна', 0]);
  if (s.pvc && s.windows) rows.push([`Окна ПВХ вместо деревянных: ${s.windows}`, 300 * s.windows]);
  if (s.doors) rows.push(['Распашные двери под технику', 250]);
  if (s.piles) rows.push(['Винтовые сваи вместо блоков', foot <= 6 ? 800 : foot <= 21 ? 1200 : 1600]);
  if (s.gkl && s.kind === 'hoz') rows.push(['Влагостойкий гипсокартон внутри', r50(75 * area)]);
  if (s.gutter) rows.push(['Водосток', totalLen <= 5 ? 500 : 700]);
  if (s.paint !== 'natural') rows.push([`Покраска Vidaron, «${PAINTS[s.paint].name}»`, r50(45 * foot)]);
  return { rows, total: rows.reduce((a, r) => a + r[1], 0) };
}
const optPrice = {
  drv: () => '+' + fmtN(r50(150 * 1.2 * st.W)),
  pvc: () => '+' + fmtN(300 * Math.max(1, st.windows)),
  dbl: () => '+250',
  pil: () => { const f = (st.L + st.terrace + (st.drovnik ? 1.2 : 0)) * st.W; return '+' + fmtN(f <= 6 ? 800 : f <= 21 ? 1200 : 1600); },
  gkl: () => '+' + fmtN(r50(75 * st.L * st.W)),
  gut: () => '+' + fmtN((st.L + st.terrace + (st.drovnik ? 1.2 : 0)) <= 5 ? 500 : 700),
};
function titleOf(s = st) { return `${s.kind === 'dom' ? 'Дачный домик' : 'Хозблок'} ${m(s.L)}×${m(s.W)}`; }
function leadText() {
  const q = quote(); const lines = q.rows.map(([t, p]) => `— ${t}: ${p ? fmtN(p) + ' BYN' : 'вкл.'}`);
  return `Заявка с сайта listvich.by\n${titleOf()}${st.terrace ? ` + терраса ${m(st.terrace)} м` : ''}${st.drovnik ? ' + дровник' : ''}\n${lines.join('\n')}\nОриентировочно: ${byn(q.total)}`;
}

/* ---------- 3D ---------- */
const stage = $('#stage');
const isMobile = () => matchMedia('(max-width:860px)').matches;
let shed = null;
try {
  shed = createShed(stage, { zoom: isMobile() ? 1.02 : 1.08, lookY: 1, shift: isMobile() ? [0, -0.36] : [0.12, -0.26] });
  addEventListener('resize', () => { /* сдвиг кадра зависит от раскладки */ });
} catch (e) {
  stage.classList.add('no-3d'); console.warn('3D недоступно', e);
}
const toShed = () => shed && shed.set({ L: st.L, W: st.W, terrace: st.terrace, drovnik: st.drovnik, rooms: st.rooms, windows: st.windows, pvc: st.pvc, doors: st.doors ? 'double' : 'std', piles: st.piles, gutter: st.gutter, paint: st.paint });
stage.addEventListener('pointerdown', () => stage.setAttribute('data-touched', ''), { once: true });

/* ---------- панель ---------- */
function radioGroup(box, items, get, set, cls = 'chip') {
  box.innerHTML = '';
  for (const [v, label] of items) {
    const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.setAttribute('role', 'radio'); b.dataset.v = v; b.innerHTML = label;
    b.addEventListener('click', () => { set(v); sync(); });
    box.append(b);
  }
  box._sync = () => $$('[role=radio]', box).forEach((b) => b.setAttribute('aria-checked', String(String(get()) === b.dataset.v)));
  return box;
}
const widBox = radioGroup($('#wid'), WIDTHS.map((w) => [w, m(w) + ' м']), () => st.W, (v) => (st.W = +v));
const terBox = radioGroup($('#ter'), TERRACES.map((t) => [t, t ? t + ' м' : 'нет']), () => st.terrace, (v) => (st.terrace = +v));
const paintBox = radioGroup($('#paint'), Object.keys(PAINTS).map((k) => [k, `<span class="sr-only">${PAINTS[k].name}</span>`]), () => st.paint, (v) => (st.paint = v), 'swatch');
$$('.swatch', paintBox).forEach((b) => { b.style.background = PAINTS[b.dataset.v].base; b.title = PAINTS[b.dataset.v].name; b.setAttribute('aria-label', PAINTS[b.dataset.v].name); b.innerHTML = ''; });
$$('#kind [role=radio]').forEach((b) => b.addEventListener('click', () => { st.kind = b.dataset.v; if (st.kind === 'dom') st.gkl = 0; sync(); }));

const len = $('#len');
len.addEventListener('input', () => { st.L = +len.value; sync(); });
const tg = { drv: 'drovnik', pvc: 'pvc', dbl: 'doors', pil: 'piles', gkl: 'gkl', gut: 'gutter' };
for (const [id, key] of Object.entries(tg)) $('#' + id).addEventListener('change', (e) => { st[key] = e.target.checked ? 1 : 0; sync(); });
$$('.step').forEach((s) => {
  const k = s.dataset.k, [minus, plus] = $$('button', s), lim = { rooms: [1, 3], windows: [0, 4] }[k];
  minus.addEventListener('click', () => { st[k] = Math.max(lim[0], st[k] - 1); sync(); });
  plus.addEventListener('click', () => { st[k] = Math.min(lim[1], st[k] + 1); sync(); });
  s._sync = () => { $('output', s).textContent = st[k]; minus.disabled = st[k] <= lim[0]; plus.disabled = st[k] >= lim[1]; };
});
const moreBtn = $('#moreBtn'), sumList = $('#sumList');
moreBtn.addEventListener('click', () => { const open = sumList.hidden; sumList.hidden = !open; moreBtn.setAttribute('aria-expanded', String(open)); moreBtn.textContent = open ? 'Свернуть' : 'Из чего цена'; });

let shownTotal = 0, rollRaf = 0;
function rollTo(v) {
  const els = [$('#sum'), $('#mSum'), $('#tagSum')];
  if (reduce || !shownTotal) { shownTotal = v; els.forEach((e) => (e.textContent = byn(v))); return; }
  const from = shownTotal, t0 = performance.now(); cancelAnimationFrame(rollRaf);
  if (from !== v) { $('#sum').classList.remove('bump'); void $('#sum').offsetWidth; $('#sum').classList.add('bump'); }
  const step = (now) => { const k = Math.min(1, (now - t0) / 450), e = 1 - Math.pow(1 - k, 3); shownTotal = from + (v - from) * e; els.forEach((el) => (el.textContent = byn(r50(shownTotal)))); if (k < 1) rollRaf = requestAnimationFrame(step); else { shownTotal = v; els.forEach((el) => (el.textContent = byn(v))); } };
  rollRaf = requestAnimationFrame(step);
}

function sync() {
  $$('#kind [role=radio]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.v === st.kind)));
  $('#cfg-h').innerHTML = st.kind === 'dom' ? 'Соберите дачный домик&nbsp;—<br><em>цена считается сразу</em>' : 'Соберите хозблок&nbsp;—<br><em>цена считается сразу</em>';
  len.value = st.L; $('#lenOut').textContent = m(st.L) + ' м';
  len.style.setProperty('--p', ((st.L - 3) / 5 * 100) + '%');
  widBox._sync(); terBox._sync(); paintBox._sync();
  $('#paintOut').textContent = PAINTS[st.paint].name;
  for (const [id, key] of Object.entries(tg)) $('#' + id).checked = !!st[key];
  $('#gklRow').classList.toggle('is-off', st.kind === 'dom');
  $$('.step').forEach((s) => s._sync());
  $$('[data-p]').forEach((el) => (el.textContent = optPrice[el.dataset.p]?.() + ' BYN'));
  const q = quote();
  rollTo(q.total);
  sumList.innerHTML = q.rows.map(([t, p]) => `<li><span>${t}</span><b>${p ? fmtN(p) : 'вкл.'}</b></li>`).join('');
  // бирка
  $('#tagName').textContent = titleOf();
  $('#tagList').innerHTML = q.rows.map(([t, p], i) => `<li><span>${i ? t : 'База'}</span><b>${i ? '+' : ''}${fmtN(p)}</b></li>`).join('') + (q.rows.length < 2 ? '<li class="tag-empty"><span>Без доп. опций — <a href="#cfg">добавить террасу, сваи, покраску</a></span></li>' : '');
  const nOpt = q.rows.length - 1; $('#optCount').textContent = nOpt ? `Выбрано опций: ${nOpt}` : 'Опции не выбраны';
  toShed(); similar();
}

/* ---------- похожие из каталога ---------- */
function feats(p) {
  const t = p.title.toLowerCase();
  return { ter: /террас|веранд|беседк/.test(t), drv: /дровник/.test(t), dom: p.cat === 'domik' || /утепл/.test(t), rooms: /двумя|помещени/.test(t) };
}
let likeKey = '';
function similar() {
  const box = $('#like'); const tot = st.L + st.terrace + (st.drovnik ? 1.2 : 0);
  const scored = PRODUCTS.filter((p) => ['hozblok', 'domik', 'besedka', 'pristroyka'].includes(p.cat) && p.L).map((p) => {
    const f = feats(p);
    const s = Math.abs(p.L - tot) + Math.abs(p.W - st.W) * 2 + (f.ter !== !!st.terrace) * 2.5 + (f.drv !== !!st.drovnik) * 2 + (f.dom !== (st.kind === 'dom')) * 4 + (f.rooms !== st.rooms > 1) * 1;
    return [s, p];
  }).sort((a, b) => a[0] - b[0]).slice(0, 5).map((x) => x[1]);
  const key = scored.map((p) => p.id).join(',');
  if (key === likeKey) return; likeKey = key;
  box.innerHTML = '<span>Мы строили похожие — откройте:</span>' + scored.map((p, i) => `<button type="button" data-id="${p.id}" style="animation-delay:${i * 50}ms" aria-label="${p.title}"><img src="img/${p.img[0]}-s.webp" alt="" loading="lazy"><b>${m(p.L)}×${m(p.W)}</b><i>${fmtN(p.price)}</i></button>`).join('');
  $$('button', box).forEach((b) => b.addEventListener('click', () => openProduct(+b.dataset.id)));
}

/* ---------- каталог ---------- */
const CATS = [['all', 'Все'], ['hozblok', 'Хозблоки'], ['domik', 'Дачные домики'], ['banya', 'Бани'], ['besedka', 'Беседки и террасы'], ['volier', 'Вольеры'], ['pristroyka', 'Пристройки']];
const COVER = { 29: 'p29-2', 27: 'p27-1', 24: 'p24-0' };
const BIG = new Set();
const LIMIT = 12; let expanded = false, curFilter = 'all';
const wall = $('#wall');
const order = [...PRODUCTS].sort((a, b) => (BIG.has(b.id) - BIG.has(a.id)) || 0);
wall.innerHTML = PRODUCTS.map((p) => {
  const cover = COVER[p.id] || p.img[0];
  return `<button type="button" class="card rv${BIG.has(p.id) ? ' is-big' : ''}" data-id="${p.id}" data-cat="${p.cat}">
    <div class="card-img"><img src="img/${cover}${BIG.has(p.id) ? '' : '-s'}.webp" alt="${p.title}" loading="lazy">${p.L ? `<span class="card-size">${m(p.L)}×${m(p.W)}</span>` : ''}</div>
    <div class="card-b"><h3>${p.title}</h3><div class="card-p">${byn(p.price)}${p.old ? `<s>${fmtN(p.old)}</s>` : ''}</div></div></button>`;
}).join('');
void order;
const filters = $('#filters');
filters.innerHTML = CATS.map(([k, t]) => { const n = k === 'all' ? PRODUCTS.length : PRODUCTS.filter((p) => p.cat === k || (k === 'volier' && /вольер/i.test(p.title))).length; return n ? `<button type="button" role="tab" data-f="${k}" aria-selected="${k === 'all'}">${t}<sup>${n}</sup></button>` : ''; }).join('');
let filterT = 0;
function setFilter(k) {
  curFilter = k;
  $$('button', filters).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.f === k)));
  const match = (c) => k === 'all' || c.dataset.cat === k || (k === 'volier' && /вольер/i.test(c.querySelector('h3').textContent));
  const cards = $$('.card', wall);
  clearTimeout(filterT);
  cards.forEach((c) => { const ok = match(c); if (!ok && !c.classList.contains('hide')) c.classList.add('dim'); });
  filterT = setTimeout(() => {
    let n = 0;
    cards.forEach((c) => { const ok = match(c); const vis = ok && (expanded || n < LIMIT); if (ok) n++; c.classList.toggle('hide', !vis); c.classList.remove('dim'); });
    const shown = cards.filter((c) => !c.classList.contains('hide'));
    const rest = n - shown.length; moreCards.hidden = rest <= 0; moreCards.textContent = `Показать ещё ${rest}`;
    $('#catCount').textContent = n;
    shown.forEach((c, i) => { if (reduce) return; c.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: Math.min(i, 10) * 35, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' }); });
  }, reduce ? 0 : 380);
}
const moreCards = document.createElement('button'); moreCards.type = 'button'; moreCards.className = 'btn btn-ghost more-cards'; wall.after(moreCards);
moreCards.addEventListener('click', () => { expanded = true; setFilter(curFilter); });
filters.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setFilter(b.dataset.f); });
$$('[data-filter]').forEach((a) => a.addEventListener('click', () => { setFilter(a.dataset.filter); closeMenu(); }));
wall.addEventListener('click', (e) => { const c = e.target.closest('.card'); if (c) openProduct(+c.dataset.id); });

/* ---------- карточка постройки ---------- */
const pd = $('#pd'); let cur = null;
function openProduct(id) {
  const p = PRODUCTS.find((x) => x.id === id); if (!p) return; cur = p;
  $('#pdTitle').textContent = p.title;
  $('#pdPrice').innerHTML = byn(p.price) + (p.old ? ` <s>${byn(p.old)}</s>` : '');
  $('#pdSpec').innerHTML = p.spec.slice(0, 16).map((s) => `<li>${s.replace(/^[–—-]\s*/, '')}</li>`).join('');
  const setImg = (k) => { $('#pdImg').src = `img/${p.img[k]}.webp`; $('#pdImg').alt = p.title; $$('#pdThumbs button').forEach((b, i) => b.setAttribute('aria-current', String(i === k))); };
  $('#pdThumbs').innerHTML = p.img.map((f, i) => `<button type="button" aria-label="Фото ${i + 1}"><img src="img/${f}-s.webp" alt="" loading="lazy"></button>`).join('');
  $$('#pdThumbs button').forEach((b, i) => b.addEventListener('click', () => setImg(i)));
  setImg(0);
  const canCfg = ['hozblok', 'domik', 'besedka', 'pristroyka'].includes(p.cat) && p.L;
  $('#pdCfg').hidden = !canCfg;
  pd.showModal();
}
pd.addEventListener('click', (e) => { if (e.target === pd || e.target.closest('[data-close]')) pd.close(); });
$('#pdCfg').addEventListener('click', () => { if (!cur) return; Object.assign(st, cfgFromProduct(cur)); pd.close(); sync(); toast(`В конструкторе: ${titleOf()}. Цена — за базовые материалы, у образца они могут отличаться`); $('#cfg').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); });
$('#pdLead').addEventListener('click', () => { if (!cur) return; Object.assign(st, cfgFromProduct(cur)); pd.close(); sync(); $('textarea[name=note]').value = `Хочу как «${cur.title}» (${byn(cur.price)} на сайте)`; $('#contacts').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); });

function cfgFromProduct(p) {
  const t = p.title.toLowerCase(), f = feats(p);
  let L = p.L, T = 0, drv = 0;
  if (f.ter) { T = L >= 6 ? 3 : 2; L = L - T; }
  if (f.drv) { drv = 1; L = L - 1; }
  L = Math.min(8, Math.max(3, Math.round(L * 2) / 2));
  const W = WIDTHS.reduce((a, w) => (Math.abs(w - p.W) < Math.abs(a - p.W) ? w : a), WIDTHS[0]);
  const rooms = /3 отдельн/.test(t) ? 3 : /санузел|душ|уборн/.test(t) ? 3 : /двумя/.test(t) ? 2 : 1;
  const spec = p.spec.join(' ').toLowerCase();
  const win = /2\s*шт|\(2шт\)/.test(spec) || /окна [^—]* и \d/.test(spec) ? 2 : 1;
  return { kind: f.dom ? 'dom' : 'hoz', L, W, terrace: T, drovnik: drv, rooms, windows: win, pvc: /пвх/.test(t) || /окн[оа][^—]*пвх/.test(spec) ? 1 : 0, doors: /распашн/.test(spec) ? 1 : 0, piles: 0, gkl: /гипсокартон/.test(t) ? 1 : 0, gutter: 0, paint: 'natural' };
}

/* ---------- что входит: разрез ---------- */
const sec = $('#section');
$$('.ly', sec).forEach((g) => (g.style.transitionDelay = `${(+g.dataset.l === 7 ? 6.5 : +g.dataset.l) * 0.12}s`));
const lit = (l) => { sec.classList.toggle('has-on', !!l); $$('[data-l]', sec).forEach((g) => g.classList.toggle('on', g.dataset.l === l)); $$('#incList div').forEach((d) => d.classList.toggle('on', d.dataset.l === l)); };
$$('#incList div').forEach((d) => { d.tabIndex = 0; d.addEventListener('mouseenter', () => lit(d.dataset.l)); d.addEventListener('focus', () => lit(d.dataset.l)); d.addEventListener('click', () => lit(d.dataset.l)); });
$('#incList').addEventListener('mouseleave', () => lit(null));
$$('.nums g', sec).forEach((g) => g.addEventListener('mouseenter', () => lit(g.dataset.l)));

/* ---------- отзывы ---------- */
const REVS = [
  ['rev-09', 'Заказывали беседку + хозблок под одной крышей, чтобы сэкономить. Показала Артуру фото из интернета, объяснила, как я это вижу… Ребята приезжали рано утром, уезжали поздно вечером. Работа не размазывалась на недели, а была сделана за 3 дня.', 'clay_swallow', 'Беседка с хозблоком'],
  ['rev-07', 'Спасибо за работу, за оперативность. Отдельное спасибо водителю Николаю (когда увидела машину, решила, что заехать просто нереально).', 'valentina.met', 'Хозблок с дровником'],
  ['rev-05', 'Спасибо за хозблок для моей мамы! Откликнулись на мою просьбу из России построить пожилой маме сарайчик и не подвели! Очень порядочные!', 'elmira_marusenko', 'Хозблок'],
  ['rev-00', 'Работа выполнена хорошо и быстро, а главное — аккуратно, не повредив окружающие растения.', 'Андрей Ильич, СТ «Мотор»', 'Хозблок'],
  ['rev-02', 'Весной покрасили, и будет совсем красавица. Ваша работа! Спасибо!', 'клиент в Instagram', 'Хозблок с дровником, покраска'],
  ['rev-12', 'Очень хорошо и чётко поставлена работа. За три дня сделали хозблок качественно. Спасибо фирме Листвич.', 'клиент в Instagram', 'Хозблок'],
];
const rt = $('#revTrack');
rt.innerHTML = REVS.map(([img, q, who, what]) => `<article class="rev"><div class="rev-shot"><img src="img/${img}.webp" alt="Скриншот переписки: ${who}" loading="lazy"></div><div><q>${q}</q><div class="rev-who"><b>${who}</b></div><span class="rev-tag">${what}</span></div></article>`).join('');
$$('.arr').forEach((b) => b.addEventListener('click', () => rt.scrollBy({ left: +b.dataset.dir * (rt.querySelector('.rev').offsetWidth + 20), behavior: reduce ? 'auto' : 'smooth' })));
// перетаскивание мышью
let dx = null; rt.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; dx = [e.clientX, rt.scrollLeft]; rt.style.scrollSnapType = 'none'; });
addEventListener('pointermove', (e) => { if (dx) rt.scrollLeft = dx[1] - (e.clientX - dx[0]); });
addEventListener('pointerup', () => { if (dx) { dx = null; rt.style.scrollSnapType = ''; } });

/* ---------- заявка ---------- */
let when = '';
$$('#when .chip').forEach((b) => { b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false'); b.addEventListener('click', () => { when = b.dataset.v; $$('#when .chip').forEach((x) => x.setAttribute('aria-checked', String(x === b))); }); });
const phone = $('input[name=phone]');
phone.addEventListener('focus', () => { if (!phone.value) phone.value = '+375 '; });
phone.addEventListener('input', () => {
  let d = phone.value.replace(/\D/g, ''); if (!d.startsWith('375')) d = '375' + d.replace(/^80?/, ''); d = d.slice(0, 12);
  const p = [d.slice(0, 3), d.slice(3, 5), d.slice(5, 8), d.slice(8, 10), d.slice(10, 12)];
  phone.value = '+' + p[0] + (p[1] ? ` (${p[1]}` : '') + (p[1].length === 2 ? ')' : '') + (p[2] ? ' ' + p[2] : '') + (p[3] ? '-' + p[3] : '') + (p[4] ? '-' + p[4] : '');
  phone.removeAttribute('aria-invalid'); $('#leadErr').textContent = '';
});
$('#leadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (phone.value.replace(/\D/g, '').length < 12) { phone.setAttribute('aria-invalid', 'true'); $('#leadErr').textContent = 'Оставьте номер телефона — без него не перезвоним.'; phone.focus(); return; }
  const fd = new FormData(e.target);
  const text = `${leadText()}\n\nИмя: ${fd.get('name') || '—'}\nТелефон: ${fd.get('phone')}\nКуда: ${fd.get('place') || '—'}\nКогда: ${when || '—'}\nКомментарий: ${fd.get('note') || '—'}`;
  try { await navigator.clipboard.writeText(text); } catch {}
  window.dataLayer = window.dataLayer || []; window.dataLayer.push({ event: 'lead_submit', value: quote().total });
  e.target.hidden = true; $('#leadOk').hidden = false; $('#leadOk').scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
});
$$('[data-open-lead]').forEach((b) => b.addEventListener('click', () => { $('#contacts').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); setTimeout(() => swingTag(), reduce ? 0 : 600); }));
$$('[data-viber]').forEach((a) => a.addEventListener('click', async () => { try { await navigator.clipboard.writeText(leadText()); toast('Комплектация скопирована — вставьте её в чат Viber'); } catch {} }));
function swingTag() { const t = $('#tagw'); t.classList.remove('swing'); void t.offsetWidth; t.classList.add('swing'); }

/* ---------- шапка, меню, тост ---------- */
const hdr = $('#hdr'), burger = $('#burger'), nav = $('#nav');
const onScroll = () => hdr.classList.toggle('is-scrolled', scrollY > 10);
addEventListener('scroll', onScroll, { passive: true }); onScroll();
burger.addEventListener('click', () => { const o = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', String(o)); });
function closeMenu() { nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }
$$('a', nav).forEach((a) => a.addEventListener('click', closeMenu));
let toastT = 0; function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 3200); }

/* ---------- проявление и скролл ---------- */
const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -10% 0px' });
$$('.reveal').forEach((el) => io.observe(el));
const cardIO = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { const el = en.target; $$('.card', wall).forEach((c) => { if (+c.dataset.i < +el.dataset.i - 4) c.classList.add('in'); }); el.style.transitionDelay = (+el.dataset.i % 4) * 60 + 'ms'; el.classList.add('in'); cardIO.unobserve(el); setTimeout(() => (el.style.transitionDelay = ''), 900); } }), { rootMargin: '0px 0px -6% 0px' });
$$('.card', wall).forEach((c, i) => { c.dataset.i = i; cardIO.observe(c); });
setFilter('all');
new IntersectionObserver(([en], o) => { if (en.isIntersecting) { sec.classList.add('built'); o.disconnect(); } }, { threshold: 0.35 }).observe(sec);
new IntersectionObserver(([en], o) => { if (en.isIntersecting) { swingTag(); o.disconnect(); } }, { threshold: 0.5 }).observe($('#leadTagBox'));

const track = $('#cal') || document.body;
const mbar = $('#mbar'), totalBox = $('#total'), cfgSec = $('#cfg');
function onScrollFx() {
  const vh = innerHeight;
  if (isMobile()) {
    const c = cfgSec.getBoundingClientRect(), t = totalBox.getBoundingClientRect();
    mbar.classList.toggle('on', c.top < -120 && c.bottom > vh * 0.3 && (t.top > vh || t.bottom < 0));
  }
}
addEventListener('scroll', onScrollFx, { passive: true }); addEventListener('resize', onScrollFx); onScrollFx();

/* ---------- когда будет готово: рабочие дни от сегодня ---------- */
function buildCal() {
  const box = $('#cal'); if (!box) return;
  const MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const DOW = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const d0 = new Date(); d0.setHours(12, 0, 0, 0);
  const days = []; let work = 0;
  for (let i = 0; days.length < 35; i++) {
    const d = new Date(d0); d.setDate(d0.getDate() + i);
    const we = d.getDay() === 0 || d.getDay() === 6;
    if (i > 0 && !we) work++;
    days.push({ d, we, work: i > 0 && !we ? work : 0 });
  }
  // начинаем с понедельника текущей недели, чтобы сетка была по дням недели
  const lead = (d0.getDay() + 6) % 7;
  let html = ''; for (let i = 0; i < lead; i++) html += '<i class="cd pad"></i>';
  const callDay = days.find((x) => x.work === 1);
  days.forEach((x, i) => {
    let cls = 'cd', tag = '';
    if (i === 0) { cls += ' is-today'; tag = 'заявка'; }
    else if (x === callDay) { cls += ' is-call'; tag = 'звонок'; }
    else if (x.work >= 2 && x.work < 15) cls += ' is-make';
    else if (x.work >= 15 && x.work <= 20) { cls += ' is-ready'; if (x.work === 15) tag = 'готово'; }
    if (x.we) cls += ' is-we';
    html += `<i class="${cls}" style="--i:${i}"><b>${x.d.getDate()}</b><small${tag ? '' : ' class="dw"'}>${tag || DOW[x.d.getDay()]}</small></i>`;
  });
  box.innerHTML = html;
  const r0 = days.find((x) => x.work === 15).d, r1 = days.find((x) => x.work === 20).d;
  const fmt = (d) => `${d.getDate()}\u00a0${MON[d.getMonth()]}`;
  $('#calRange').textContent = r0.getMonth() === r1.getMonth() ? `с\u00a0${r0.getDate()} по\u00a0${fmt(r1)}` : `с\u00a0${fmt(r0)} по\u00a0${fmt(r1)}`;
  new IntersectionObserver(([en], o) => { if (en.isIntersecting) { box.classList.add('go'); o.disconnect(); } }, { threshold: 0.3 }).observe(box);
  const setRoad = (v) => {
    $$('#road [role=radio]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.v === v)));
    $('#roadTxt').innerHTML = v === 'yes' ? 'Соберём на производстве и <b>привезём готовым</b> на машине.' : 'Привезём материал и <b>соберём прямо на участке</b>: там, куда готовый не завезти.';
    $$('#cal .is-ready small').forEach((s) => { s.textContent = v === 'yes' ? 'привезём' : 'сборка'; s.className = ''; });
  };
  $$('#road [role=radio]').forEach((b) => b.addEventListener('click', () => setRoad(b.dataset.v)));
  setRoad('yes');
}

buildCal();
sync();
