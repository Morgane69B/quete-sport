(function () {
  'use strict';
  const D = window.GameData;
  const KEY = 'quete-sport-v1';
  const $app = document.getElementById('app');
  const $modal = document.getElementById('modal');
  const $toasts = document.getElementById('toasts');

  // ---------- Utilitaires ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Math.round(n).toLocaleString('fr-FR');
  const pad = (n) => String(n).padStart(2, '0');
  const dkey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseK = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const today = () => dkey(new Date());
  const addDays = (k, n) => { const d = parseK(k); d.setDate(d.getDate() + n); return dkey(d); };
  const weekKey = (k) => { const d = parseK(k); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return dkey(d); };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const exById = Object.fromEntries(D.EXERCISES.map((e) => [e.id, e]));
  const itemById = Object.fromEntries(D.ITEMS.map((i) => [i.id, i]));
  const cardById = Object.fromEntries(D.CARDS.map((c) => [c.id, c]));
  const clsById = Object.fromEntries(D.CLASSES.map((c) => [c.id, c]));
  const dayLabel = (k) => parseK(k).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const shortDay = (k) => parseK(k).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
  const timeOf = (ts) => new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  // ---------- État ----------
  let S = null;
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('⚠️ Impossible d’enregistrer'); } };
  let UI = { tab: 'home', sub: null, cat: 'all', q: '', shop: 'arme' };
  let OB = { step: 0, d: { name: '', g: 'f', look: { skin: 0, hair: 0, style: 'long' }, cls: null, goalType: 'ex', goalEx: 'tractions', goalTarget: 10, goalText: '', level: 'debut', why: '', theme: 'sombre', hard: false } };
  const drafts = {};
  const pendingModals = [];

  function newState(d) {
    const t = today();
    return {
      v: 1, created: t, lastCheck: t,
      hero: { name: d.name.trim() || 'Aventurière', g: d.g, look: d.look, cls: d.cls, level: d.level, why: d.why.trim(),
        goal: d.goalType === 'ex' ? { type: 'ex', ex: d.goalEx, target: Math.max(1, +d.goalTarget || 1) } : { type: 'free', text: d.goalText.trim() || 'Mon objectif' },
        goalReached: false, since: t },
      classHistory: [],
      xp: 0, wallet: 0,
      stats: { force: 0, endurance: 0, agilite: 0, vitalite: 0, discipline: 0, sagesse: 0 },
      sets: [], quests: D.DEFAULT_QUESTS.map((q) => ({ ...q })), qdone: {}, qbonus: {}, rest: {},
      owned: ['w_baton', 'o_tunique'], equip: { arme: 'w_baton', tenue: 'o_tunique', familier: null, compagnon: null },
      cards: {}, daily: {}, bosses: {}, bossWins: 0, journal: [], sore: [], penalties: [], lastW: {}, bestStreak: 0,
      settings: { theme: d.theme, hard: d.hard, hardSince: t },
    };
  }

  const F = () => S.hero.g === 'f';
  const g = (f, m) => (F() ? f : m);

  // ---------- Niveaux, XP ----------
  function levelInfo(xp) {
    let lvl = 1, need = 100, cur = xp;
    while (cur >= need) { cur -= need; lvl++; need = 100 + (lvl - 1) * 50; }
    return { lvl, cur, need };
  }
  const cls = () => clsById[S.hero.cls];
  function title() {
    const { lvl } = levelInfo(S.xp);
    const t = cls().titles[Math.min(5, Math.floor((lvl - 1) / 5))];
    return F() ? t[0] : t[1];
  }
  function classMult(ex) {
    const b = cls().bonus; let m = b.all || 1;
    for (const t of ex.tags) if (b[t]) m = Math.max(m, b[t]);
    return m;
  }
  function itemBonus() { return Object.values(S.equip).reduce((a, id) => a + (id ? itemById[id].bonus : 0), 0); }

  function addXp(n) {
    const before = levelInfo(S.xp).lvl;
    S.xp = Math.max(0, S.xp + n); S.wallet = Math.max(0, S.wallet + n);
    const after = levelInfo(S.xp).lvl;
    if (after > before) pendingModals.push(() => levelUpModal(after));
  }
  const statLevel = (pts) => 1 + Math.floor(pts / 25);

  // ---------- Séries ----------
  const daySets = (k) => S.sets.filter((s) => s.d === k);
  function best(exId, k) {
    let b = null;
    for (const s of S.sets) if (s.ex === exId && s.d === k && (b === null || s.reps > b)) b = s.reps;
    return b;
  }
  function record(exId) {
    let r = null;
    for (const s of S.sets) if (s.ex === exId && (!r || s.reps > r.reps || (s.reps === r.reps && s.w > r.w))) r = s;
    return r;
  }
  function pct(a, b) { if (a == null || b == null || b === 0) return null; return Math.round(((a - b) / b) * 100); }
  function pctPill(p, label) {
    if (p === null) return `<span class="pill muted">${label} —</span>`;
    const c = p > 0 ? 'up' : p < 0 ? 'down' : 'eq';
    return `<span class="pill ${c}">${label} ${p > 0 ? '▲ +' : p < 0 ? '▼ ' : '= '}${p}%</span>`;
  }
  function setXp(ex, reps, w) {
    let base = ex.unit === 'sec' ? 5 + reps / 4 : 5 + reps + (w * reps) / 15;
    base = Math.min(90, base);
    return Math.max(1, Math.round(base * classMult(ex) * (1 + itemBonus() / 100)));
  }
  function damageOf(s) { const ex = exById[s.ex]; return ex && ex.unit === 'sec' ? Math.round(s.reps / 3) : s.reps; }

  function logSet(exId, reps, w) {
    const ex = exById[exId];
    const xp = setXp(ex, reps, w);
    const pts = Math.max(1, Math.round((ex.unit === 'sec' ? reps / 15 : reps / 5) + w / 10));
    const st = {};
    ex.stats.forEach((k, i) => { const v = i === 0 ? pts : Math.max(1, Math.round(pts / 2)); st[k] = v; S.stats[k] += v; });
    S.stats.discipline += 1; st.discipline = (st.discipline || 0) + 1;
    const set = { id: uid(), d: today(), ts: Date.now(), ex: exId, reps, w, xp, st };
    S.sets.push(set);
    S.lastW[exId] = w;
    addXp(xp);
    checkBoss();
    checkGoal(exId, reps);
    save();
    return set;
  }
  function deleteSet(id) {
    const i = S.sets.findIndex((s) => s.id === id); if (i < 0) return;
    const s = S.sets[i];
    S.sets.splice(i, 1);
    S.xp = Math.max(0, S.xp - s.xp); S.wallet = Math.max(0, S.wallet - s.xp);
    for (const k in s.st) S.stats[k] = Math.max(0, S.stats[k] - s.st[k]);
    save();
  }

  // ---------- Objectif & classe ----------
  function goalProgress() {
    const gl = S.hero.goal;
    if (gl.type !== 'ex') return null;
    let b = 0;
    for (const s of S.sets) if (s.ex === gl.ex && s.ts >= 0 && s.d >= S.hero.since && s.reps > b) b = s.reps;
    return { best: b, target: gl.target, ratio: Math.min(1, b / gl.target) };
  }
  function goalText() {
    const gl = S.hero.goal;
    if (gl.type === 'ex') { const ex = exById[gl.ex]; return `${gl.target} ${ex.unit === 'sec' ? 'secondes' : 'répétitions'} en une série — ${ex.name}`; }
    return gl.text;
  }
  function checkGoal(exId, reps) {
    const gl = S.hero.goal;
    if (S.hero.goalReached || gl.type !== 'ex' || gl.ex !== exId || reps < gl.target) return;
    reachGoal();
  }
  function reachGoal() {
    S.hero.goalReached = true;
    addXp(300);
    pendingModals.unshift(() => goalModal());
    save();
  }

  // ---------- Boss ----------
  function bossBase() { return { debut: 250, inter: 450, avance: 700 }[S.hero.level] || 300; }
  function bossFor(wk) {
    const n = Math.floor(parseK(wk).getTime() / (7 * 864e5));
    const b = D.BOSSES[((n % D.BOSSES.length) + D.BOSSES.length) % D.BOSSES.length];
    const rec = S.bosses[wk];
    const hp = rec && rec.hp ? rec.hp : Math.round((bossBase() * Math.min(2, 1 + 0.1 * S.bossWins)) / 10) * 10;
    return { ...b, hp };
  }
  function weekDamage(wk) {
    const end = addDays(wk, 7);
    return S.sets.reduce((a, s) => (s.d >= wk && s.d < end ? a + damageOf(s) : a), 0);
  }
  function checkBoss() {
    const wk = weekKey(today());
    const boss = bossFor(wk);
    if (!S.bosses[wk]) S.bosses[wk] = { hp: boss.hp, id: boss.id };
    const rec = S.bosses[wk];
    if (rec.defeated) return;
    if (weekDamage(wk) >= rec.hp) {
      rec.defeated = true; rec.at = Date.now();
      S.bossWins++;
      addXp(200);
      const card = drawCard(true);
      pendingModals.unshift(() => bossWinModal(boss, card));
    }
  }

  // ---------- Cartes ----------
  function drawCard(silent) {
    const roll = Math.random() * 100;
    const rar = roll < 2 ? 'l' : roll < 12 ? 'e' : roll < 40 ? 'r' : 'c';
    const pool = D.CARDS.filter((c) => c.rarity === rar);
    const c = pool[Math.floor(Math.random() * pool.length)];
    const dup = !!S.cards[c.id];
    S.cards[c.id] = (S.cards[c.id] || 0) + 1;
    if (dup) addXp(20);
    return { card: c, dup };
  }

  // ---------- Quêtes, séries de jours, mode difficile ----------
  const qDone = (k) => S.qdone[k] || [];
  const validated = (k) => S.sets.some((s) => s.d === k) || qDone(k).length >= 2 || !!S.rest[k];
  function streak() {
    let k = today();
    if (!validated(k)) k = addDays(k, -1);
    let n = 0;
    while (validated(k) && n < 3650) { n++; k = addDays(k, -1); }
    if (n > S.bestStreak) { S.bestStreak = n; }
    return n;
  }
  function restCountWeek(k) { const wk = weekKey(k); return Object.keys(S.rest).filter((d) => S.rest[d] && weekKey(d) === wk).length; }
  function toggleQuest(id) {
    const k = today(); const done = qDone(k); const q = S.quests.find((x) => x.id === id); if (!q) return;
    const mult = cls().questBonus || 1;
    const xp = Math.round(q.xp * mult * (1 + itemBonus() / 100));
    if (done.includes(id)) {
      S.qdone[k] = done.filter((x) => x !== id);
      const v = (S.qxp && S.qxp[k + id]) || xp;
      S.xp = Math.max(0, S.xp - v); S.wallet = Math.max(0, S.wallet - v);
      S.stats[q.stat] = Math.max(0, S.stats[q.stat] - 2);
    } else {
      S.qdone[k] = [...done, id];
      S.qxp = S.qxp || {}; S.qxp[k + id] = xp;
      addXp(xp); S.stats[q.stat] += 2;
      toast(`${q.icon} +${xp} XP`, true);
      if (S.qdone[k].length === S.quests.length && !S.qbonus[k]) {
        S.qbonus[k] = true; addXp(30);
        const c = drawCard(true);
        pendingModals.push(() => cardModal(c, 'Toutes les quêtes du jour ! +30 XP bonus'));
      }
    }
    save();
  }
  function dailyChecks() {
    const t = today(); const y = addDays(t, -1);
    if (S.lastCheck >= y) return;
    let k = addDays(S.lastCheck, 1); let lost = 0, days = 0, guard = 0;
    while (k <= y && guard++ < 90) {
      if (S.settings.hard && k >= S.settings.hardSince && !validated(k)) { lost += 40; days++; S.penalties.push({ d: k, xp: 40 }); }
      k = addDays(k, 1);
    }
    S.lastCheck = y;
    if (lost) {
      S.xp = Math.max(0, S.xp - lost); S.wallet = Math.max(0, S.wallet - lost);
      pendingModals.push(() => openModal(`<div class="modal-card center"><div class="big-emoji shake">💔</div><h2>Mode difficile</h2><p>Tu as manqué <b>${days} jour${days > 1 ? 's' : ''}</b>.</p><p class="penalty">−${lost} XP</p><p class="muted">Aujourd’hui est une nouvelle chance. Une seule série suffit pour valider la journée.</p><button class="btn primary" data-a="close">Je repars au combat</button></div>`));
    }
    save();
  }

  // ---------- Toasts & modales ----------
  function toast(msg, xp) {
    const el = document.createElement('div');
    el.className = 'toast' + (xp ? ' xp' : '');
    el.innerHTML = msg;
    $toasts.appendChild(el);
    setTimeout(() => el.classList.add('out'), 1900);
    setTimeout(() => el.remove(), 2400);
  }
  function openModal(html, cls2 = '') {
    $modal.innerHTML = `<div class="overlay ${cls2}" data-a="overlay">${html}</div>`;
    $modal.classList.add('open');
  }
  function closeModal() {
    $modal.classList.remove('open'); $modal.innerHTML = '';
    UI.sheet = null;
    flushModals();
  }
  function flushModals() {
    if ($modal.classList.contains('open')) return;
    const m = pendingModals.shift();
    if (m) m();
    else if (UI.reopen) { const id = UI.reopen; UI.reopen = null; exSheet(id); }
  }
  function confetti() {
    const colors = ['#f5c451', '#8b5cf6', '#ff5d8f', '#3ec6ff', '#30a46c'];
    let s = '<div class="confetti">';
    for (let i = 0; i < 40; i++) s += `<i style="left:${Math.random() * 100}%;background:${colors[i % 5]};animation-delay:${Math.random() * 0.6}s;animation-duration:${1.6 + Math.random()}s"></i>`;
    return s + '</div>';
  }
  function levelUpModal(lvl) {
    openModal(`<div class="modal-card center glow">${confetti()}<div class="lvl-badge big">${lvl}</div><h2>Niveau supérieur !</h2><p>Tu es maintenant <b>${esc(title())}</b>.</p><p class="muted">Continue comme ça, ${esc(S.hero.name)}.</p><button class="btn primary" data-a="close">En avant !</button></div>`);
  }
  function goalModal() {
    openModal(`<div class="modal-card center glow">${confetti()}<div class="big-emoji">🏆</div><h2>Objectif atteint !</h2><p>${esc(goalText())}</p><p class="gain">+300 XP</p><p>Tu peux maintenant <b>changer de classe</b> et te fixer un nouveau défi, ou rester ${esc(g('une', 'un'))} ${esc(cls()[S.hero.g])} et viser plus haut.</p><button class="btn primary" data-a="open-class">Choisir la suite</button><button class="btn ghost" data-a="close">Plus tard</button></div>`);
  }
  function bossWinModal(boss, c) {
    openModal(`<div class="modal-card center glow">${confetti()}<div class="big-emoji defeated">${boss.emoji}</div><h2>${esc(boss.name)} est ${g('vaincu', 'vaincu')} !</h2><p class="gain">+200 XP</p><p>Butin : une carte de motivation.</p><button class="btn primary" data-a="show-card" data-id="${c.card.id}" data-dup="${c.dup ? 1 : 0}">Voir le butin</button></div>`);
  }
  function cardHtml(c, big) {
    const cat = D.CARD_CATS[c.cat];
    return `<div class="tcard r-${c.rarity}${big ? ' big' : ''}" style="--cc:${cat.color}"><div class="tc-top"><span>${cat.icon} ${cat.name}</span><span class="gem">${D.RARITY[c.rarity]}</span></div><div class="tc-art">${cat.icon}</div><div class="tc-title">${esc(c.title)}</div><div class="tc-text">${esc(c.text)}</div></div>`;
  }
  function cardModal(res, header) {
    openModal(`<div class="modal-card center card-reveal">${header ? `<p class="gain small">${esc(header)}</p>` : ''}<div class="flip"><div class="flip-in"><div class="flip-back">✦</div><div class="flip-front">${cardHtml(res.card, true)}</div></div></div>${res.dup ? '<p class="muted">Déjà dans ta collection : +20 XP</p>' : '<p class="gain small">Nouvelle carte !</p>'}<button class="btn primary" data-a="close">Garder</button></div>`);
  }

  // ---------- Thème ----------
  function applyTheme() {
    const th = S ? S.settings.theme : OB.d.theme;
    document.documentElement.dataset.theme = th;
    const m = document.querySelector('meta[name=theme-color]');
    if (m) m.content = { sombre: '#0f1020', colore: '#ff5d8f', medieval: '#3b2a1a' }[th] || '#0f1020';
  }

  // ---------- Rendu : en-tête & navigation ----------
  function header() {
    const li = levelInfo(S.xp);
    return `<header class="top"><div class="top-l" data-a="tab" data-t="home"><div class="lvl-badge">${li.lvl}</div><div><div class="hname">${esc(S.hero.name)}</div><div class="htitle">${esc(title())}</div></div></div><div class="top-r"><span class="chip streak" data-a="tab" data-t="quests">🔥 ${streak()}</span><span class="chip wallet" data-a="tab" data-t="shop">✨ ${fmt(S.wallet)}</span></div><div class="xpbar" title="XP"><i style="width:${(li.cur / li.need) * 100}%"></i><span>${fmt(li.cur)} / ${fmt(li.need)} XP</span></div></header>`;
  }
  function nav() {
    const tabs = [['home', '🏰', 'Héros'], ['train', '⚔️', 'Entraînement'], ['quests', '📜', 'Quêtes'], ['shop', '🛒', 'Boutique'], ['more', '✨', 'Plus']];
    return `<nav class="nav">${tabs.map(([id, ic, l]) => `<button class="${UI.tab === id ? 'on' : ''}" data-a="tab" data-t="${id}"><span>${ic}</span><small>${l}</small></button>`).join('')}</nav>`;
  }

  function heroStage(small) {
    const w = itemById[S.equip.arme], o = itemById[S.equip.tenue];
    const pet = S.equip.familier ? itemById[S.equip.familier] : null;
    const comp = S.equip.compagnon ? itemById[S.equip.compagnon] : null;
    return `<div class="stage${small ? ' small' : ''}" data-a="${small ? '' : 'equip'}"><div class="stage-sky"></div><div class="stage-ground"></div><div class="stage-hero">${Hero.render(S.hero.look, w, o)}</div>${comp ? `<div class="comp" title="${esc(comp.name)}">${comp.emoji}</div>` : ''}${pet ? `<div class="pet" title="${esc(pet.name)}">${pet.emoji}</div>` : ''}</div>`;
  }

  // ---------- Écran Héros ----------
  function viewHome() {
    const t = today();
    const sets = daySets(t);
    const reps = sets.reduce((a, s) => a + (exById[s.ex].unit === 'reps' ? s.reps : 0), 0);
    const xpToday = sets.reduce((a, s) => a + s.xp, 0);
    const c = cls();
    const gp = goalProgress();
    const wk = weekKey(t); const boss = bossFor(wk); const dmg = weekDamage(wk);
    const hp = (S.bosses[wk] && S.bosses[wk].hp) || boss.hp; const defeated = S.bosses[wk] && S.bosses[wk].defeated;
    const daysLeft = 7 - ((parseK(t).getDay() + 6) % 7);
    const doneEx = [...new Set(sets.map((s) => s.ex))];
    const qd = qDone(t).length;
    const dailyCard = S.daily[t];

    let h = heroStage();
    h += `<section class="card class-card" style="--cc:${c.color}" data-a="sub" data-s="class"><div class="cc-icon">${c.icon}</div><div class="grow"><div class="label">Classe · ${esc(c.goal)}</div><div class="cc-name">${esc(c[S.hero.g])}</div><div class="goal">🎯 ${esc(goalText())}</div>${gp ? `<div class="bar"><i style="width:${gp.ratio * 100}%"></i></div><div class="tiny">${gp.best} / ${gp.target}${S.hero.goalReached ? ' · atteint ✓' : ''}</div>` : `<div class="tiny">${S.hero.goalReached ? 'Atteint ✓' : 'Touche ici quand tu l’as atteint'}</div>`}</div></section>`;

    if (!dailyCard) h += `<button class="card daily-cta" data-a="daily"><span class="dc-ico">🃏</span><span><b>Carte du jour</b><br><small>Tire ta carte de motivation</small></span><span class="go">›</span></button>`;

    h += `<section class="card boss-mini${defeated ? ' won' : ''}" data-a="sub" data-s="boss"><div class="boss-emoji">${boss.emoji}</div><div class="grow"><div class="label">Boss de la semaine · ${daysLeft} j restant${daysLeft > 1 ? 's' : ''}</div><div class="bname">${esc(boss.name)}</div><div class="hp"><i style="width:${Math.max(0, 100 - (dmg / hp) * 100)}%"></i><span>${defeated ? g('Vaincu !', 'Vaincu !') : `${fmt(Math.max(0, hp - dmg))} PV`}</span></div></div></section>`;

    h += `<section class="card"><div class="row-between"><h3>Aujourd’hui</h3><span class="muted small">${dayLabel(t)}</span></div><div class="kpis"><div><b>${sets.length}</b><small>séries</small></div><div><b>${fmt(reps)}</b><small>répétitions</small></div><div><b>+${fmt(xpToday)}</b><small>XP</small></div><div><b>${qd}/${S.quests.length}</b><small>quêtes</small></div></div>`;
    if (doneEx.length) {
      h += '<div class="prog-list">';
      for (const id of doneEx) {
        const ex = exById[id]; const b = best(id, t);
        h += `<div class="prog-row" data-a="ex" data-id="${id}"><div class="pr-name">${esc(ex.name)}<small>max ${b} ${ex.unit === 'sec' ? 's' : 'reps'}</small></div><div class="pr-pills">${pctPill(pct(b, best(id, addDays(t, -1))), 'vs hier')}${pctPill(pct(b, best(id, addDays(t, -7))), 'vs sem. dern.')}</div></div>`;
      }
      h += '</div>';
    } else h += `<p class="muted center">Aucune série pour l’instant. <a data-a="tab" data-t="train">Lance ta première ⚔️</a></p>`;
    h += '</section>';

    h += `<section class="card"><h3>Statistiques</h3><div class="stats">${Object.entries(D.STATS).map(([k, st]) => { const p = S.stats[k]; const lv = statLevel(p); return `<div class="stat"><span class="st-ic">${st.icon}</span><span class="st-n">${st.name}</span><span class="st-bar"><i style="width:${((p % 25) / 25) * 100}%;background:${st.color}"></i></span><b>${lv}</b></div>`; }).join('')}</div></section>`;
    if (dailyCard) h += `<section class="card daily-done" data-a="show-card" data-id="${dailyCard}" data-plain="1"><span class="muted small">Carte du jour</span><div class="dd-t">« ${esc(cardById[dailyCard].text)} »</div></section>`;
    return h;
  }

  // ---------- Écran Entraînement ----------
  function viewTrain() {
    const t = today();
    const q = UI.q.trim().toLowerCase();
    let list = D.EXERCISES.filter((e) => (UI.cat === 'all' || (UI.cat === 'today' ? best(e.id, t) !== null : e.cat === UI.cat)) && (!q || e.name.toLowerCase().includes(q)));
    let h = `<div class="page-h"><h2>Entraînement</h2><p class="muted">Une série à la fois : note-la, reviens plus tard pour la suivante.</p></div>`;
    h += `<input class="search" type="search" placeholder="Rechercher un exercice…" value="${esc(UI.q)}" data-in="q">`;
    h += `<div class="chips">${[['all', 'Tous'], ['today', 'Faits aujourd’hui'], ...Object.entries(D.CATS).map(([k, c]) => [k, c.icon + ' ' + c.name])].map(([k, l]) => `<button class="chipbtn ${UI.cat === k ? 'on' : ''}" data-a="cat" data-c="${k}">${l}</button>`).join('')}</div>`;
    h += '<div class="ex-list">';
    for (const ex of list) {
      const b = best(ex.id, t); const n = S.sets.filter((s) => s.ex === ex.id && s.d === t).length;
      const bonus = classMult(ex) > 1;
      h += `<button class="ex-item" data-a="ex" data-id="${ex.id}"><div class="ex-thumb">${Figure.render(ex, false)}</div><div class="grow"><div class="ex-name">${esc(ex.name)}${bonus ? ' <span class="bonus-dot" title="Bonus de classe">★</span>' : ''}</div><div class="ex-sub">${D.CATS[ex.cat].icon} ${ex.unit === 'sec' ? 'En secondes' : 'Répétitions'} · ${ex.stats.map((s) => D.STATS[s].icon).join(' ')}</div>${n ? `<div class="ex-today">✓ ${n} série${n > 1 ? 's' : ''} · max ${b}${ex.unit === 'sec' ? ' s' : ''} ${pctPill(pct(b, best(ex.id, addDays(t, -1))), 'vs hier')}</div>` : ''}</div><span class="go">›</span></button>`;
    }
    if (!list.length) h += '<p class="muted center">Aucun exercice trouvé.</p>';
    return h + '</div>';
  }

  function exSheet(id) {
    UI.sheet = id;
    const ex = exById[id]; const t = today();
    const sec = ex.unit === 'sec';
    const showW = !sec && ex.cat !== 'souplesse';
    if (!drafts[id]) drafts[id] = { reps: sec ? 30 : (best(id, t) || record(id)?.reps || 10), w: S.lastW[id] ?? (ex.cat === 'halteres' ? 5 : 0) };
    const dr = drafts[id];
    const sets = S.sets.filter((s) => s.ex === id && s.d === t).sort((a, b) => a.ts - b.ts);
    const bt = best(id, t), by = best(id, addDays(t, -1)), bw = best(id, addDays(t, -7));
    const rec = record(id); const mult = classMult(ex);
    const u = sec ? 's' : '';
    const tile = (lbl, v, p) => `<div class="ptile"><small>${lbl}</small><b>${v == null ? '—' : v + u}</b>${p !== undefined ? (p === null ? '<em class="muted">—</em>' : `<em class="${p > 0 ? 'up' : p < 0 ? 'down' : ''}">${p > 0 ? '+' : ''}${p}%</em>`) : ''}</div>`;
    const preview = setXp(ex, dr.reps, showW ? dr.w : 0);
    openModal(`<div class="sheet"><div class="sheet-h"><button class="icon-btn" data-a="close" aria-label="Fermer">✕</button><div><div class="label">${D.CATS[ex.cat].icon} ${D.CATS[ex.cat].name}</div><h2>${esc(ex.name)}</h2></div></div>
      <div class="sheet-body"><div class="ex-anim">${Figure.render(ex, true)}</div>
      <p class="tip">💡 ${esc(ex.tip)}</p>
      <div class="chips static">${ex.stats.map((s) => `<span class="chipbtn">${D.STATS[s].icon} ${D.STATS[s].name}</span>`).join('')}${mult > 1 ? `<span class="chipbtn gold">★ Bonus de classe ×${mult}</span>` : ''}</div>
      <h3>Progression <small class="muted">(plus grosse série)</small></h3>
      <div class="ptiles">${tile('Aujourd’hui', bt)}${tile('Hier', by, pct(bt, by))}${tile('Il y a 7 jours', bw, pct(bt, bw))}</div>
      ${rec ? `<p class="muted small center">🏅 Record : ${rec.reps}${u}${rec.w ? ` à ${rec.w} kg` : ''} (${shortDay(rec.d)})</p>` : ''}
      <div class="logger card"><h3>Nouvelle série</h3>
        <div class="stepper"><span class="st-l">${sec ? 'Durée (secondes)' : 'Répétitions'}</span><div class="st-c"><button data-a="step" data-f="reps" data-v="${sec ? -5 : -1}">−</button><input inputmode="numeric" data-in="reps" value="${dr.reps}"><button data-a="step" data-f="reps" data-v="${sec ? 5 : 1}">+</button></div></div>
        ${showW ? `<div class="stepper"><span class="st-l">${ex.cat === 'halteres' ? 'Poids par haltère (kg)' : 'Lest (kg) · 0 = poids du corps'}</span><div class="st-c"><button data-a="step" data-f="w" data-v="-0.5">−</button><input inputmode="decimal" data-in="w" value="${dr.w}"><button data-a="step" data-f="w" data-v="0.5">+</button></div></div>` : ''}
        <button class="btn primary big" data-a="log" data-id="${id}">⚔️ Valider la série <span class="xp-prev">+${preview} XP</span></button>
        <button class="btn ghost small" data-a="rest-timer">⏱️ Minuteur de repos</button>
      </div>
      <h3>Séries du jour</h3>
      ${sets.length ? `<div class="setlist">${sets.map((s, i) => `<div class="set-row"><span class="set-n">${i + 1}</span><span class="grow"><b>${s.reps}${u}</b>${s.w ? ` × ${s.w} kg` : ''}<small class="muted"> · ${timeOf(s.ts)}</small></span><span class="xp-s">+${s.xp}</span><button class="icon-btn small" data-a="del-set" data-id="${s.id}" aria-label="Supprimer">🗑️</button></div>`).join('')}</div>` : '<p class="muted center small">Pas encore de série aujourd’hui.</p>'}
      </div></div>`, 'sheet-wrap');
  }

  // ---------- Écran Quêtes ----------
  function viewQuests() {
    const t = today(); const done = qDone(t); const st = streak();
    const rested = !!S.rest[t]; const val = validated(t);
    let h = `<div class="page-h"><h2>Quêtes du jour</h2><p class="muted">${dayLabel(t)}</p></div>`;
    h += `<section class="card streak-card"><div class="flame${val ? ' lit' : ''}">🔥</div><div class="grow"><div class="big-n">${st} jour${st > 1 ? 's' : ''}</div><div class="muted small">Record : ${S.bestStreak} · ${val ? 'Journée validée ✓' : 'Une série ou 2 quêtes pour valider la journée'}</div></div></section>`;
    if (S.settings.hard) h += `<div class="banner danger">☠️ Mode difficile : une journée non validée = <b>−40 XP</b>.</div>`;
    h += '<div class="quests">';
    for (const q of S.quests) {
      const ok = done.includes(q.id);
      h += `<button class="quest${ok ? ' done' : ''}" data-a="quest" data-id="${q.id}"><span class="q-ic">${q.icon}</span><span class="grow"><span class="q-n">${esc(q.name)}</span><small>${D.STATS[q.stat].icon} ${D.STATS[q.stat].name} · +${q.xp} XP</small></span><span class="q-check">${ok ? '✓' : ''}</span></button>`;
    }
    h += '</div>';
    h += `<p class="muted small center">Toutes les quêtes validées = <b>+30 XP</b> et une carte de motivation.</p>`;
    h += `<div class="btn-row"><button class="btn ghost" data-a="edit-quests">✏️ Gérer mes quêtes</button>${!val && !rested ? `<button class="btn ghost" data-a="rest-day">😌 Jour de repos (${2 - restCountWeek(t)} restant${2 - restCountWeek(t) > 1 ? 's' : ''})</button>` : ''}${rested ? '<span class="chip">😌 Jour de repos posé</span>' : ''}</div>`;
    return h;
  }
  function editQuestsModal() {
    const icons = D.QUEST_ICONS;
    openModal(`<div class="modal-card"><div class="row-between"><h2>Mes quêtes</h2><button class="icon-btn" data-a="close">✕</button></div>
      <div class="qedit">${S.quests.map((q) => `<div class="qe-row"><span>${q.icon}</span><span class="grow">${esc(q.name)} <small class="muted">+${q.xp} XP</small></span><button class="icon-btn small" data-a="del-quest" data-id="${q.id}">🗑️</button></div>`).join('')}</div>
      <h3>Ajouter une quête</h3>
      <input id="nq-name" class="input" maxlength="40" placeholder="Ex : Pas de soda, 8 000 pas…">
      <div class="icon-pick" id="nq-icons">${icons.map((ic, i) => `<button class="${i === 0 ? 'on' : ''}" data-a="pick-ic" data-v="${ic}">${ic}</button>`).join('')}</div>
      <div class="row2"><label>XP <select id="nq-xp" class="input">${[10, 15, 20, 25, 30].map((x) => `<option ${x === 15 ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <label>Stat <select id="nq-stat" class="input">${Object.entries(D.STATS).map(([k, s]) => `<option value="${k}" ${k === 'vitalite' ? 'selected' : ''}>${s.icon} ${s.name}</option>`).join('')}</select></label></div>
      <button class="btn primary" data-a="add-quest">Ajouter</button></div>`);
  }

  // ---------- Écran Boutique ----------
  function itemPreview(it) {
    if (it.slot === 'arme') return `<svg viewBox="-62 -98 124 124" class="wprev">${weaponOnly(it)}</svg>`;
    if (it.slot === 'tenue') return Hero.render(S.hero.look, itemById[S.equip.arme], it);
    return `<span class="emo">${it.emoji}</span>`;
  }
  function weaponOnly(it) {
    // réutilise le rendu du héros : extrait le groupe de l'arme
    const svg = Hero.render(S.hero.look, it, itemById['o_tunique']);
    const m = svg.match(/<g transform="translate\(34\.5 98\)">([\s\S]*?)<\/g><circle cx="34.5"/);
    const defs = svg.match(/<filter id="glow"[\s\S]*?<\/filter>/);
    return (defs ? `<defs>${defs[0]}</defs>` : '') + (m ? `<g transform="rotate(40 0 -36)">${m[1]}</g>` : '');
  }
  function viewShop() {
    let h = `<div class="page-h"><h2>Boutique</h2><p class="muted">Dépense ton XP pour équiper ${g('ton héroïne', 'ton héros')}. Chaque objet donne un bonus d’XP.</p></div>`;
    h += `<section class="card wallet-card"><div><small class="muted">XP à dépenser</small><div class="big-n">✨ ${fmt(S.wallet)}</div></div><div class="right"><small class="muted">Bonus équipé</small><div class="big-n gold">+${itemBonus()}%</div></div></section>`;
    h += `<div class="chips">${Object.entries(D.SLOTS).map(([k, s]) => `<button class="chipbtn ${UI.shop === k ? 'on' : ''}" data-a="shoptab" data-s="${k}">${s.icon} ${s.name}</button>`).join('')}</div>`;
    h += '<div class="shop-grid">';
    for (const it of D.ITEMS.filter((i) => i.slot === UI.shop)) {
      const owned = S.owned.includes(it.id); const eq = S.equip[it.slot] === it.id;
      let btn;
      if (eq) btn = it.slot === 'familier' || it.slot === 'compagnon' ? `<button class="btn small ghost" data-a="unequip" data-s="${it.slot}">Retirer</button>` : '<span class="tag-eq">Équipé ✓</span>';
      else if (owned) btn = `<button class="btn small" data-a="equip-item" data-id="${it.id}">Équiper</button>`;
      else btn = `<button class="btn small ${S.wallet >= it.price ? 'primary' : 'locked'}" data-a="buy" data-id="${it.id}">✨ ${fmt(it.price)}</button>`;
      h += `<div class="shop-item${eq ? ' eq' : ''}${owned ? ' owned' : ''}"><div class="si-prev ${it.slot}">${itemPreview(it)}</div><div class="si-name">${esc(it.name)}</div><div class="si-desc">${esc(it.desc)}</div><div class="si-bonus">${it.bonus ? `+${it.bonus}% XP` : 'Départ'}</div>${btn}</div>`;
    }
    return h + '</div>';
  }

  // ---------- Écran Plus ----------
  function viewMore() {
    if (UI.sub) return subView(UI.sub);
    const n = Object.keys(S.cards).length;
    const tiles = [['boss', '🐲', 'Boss de la semaine'], ['cards', '🃏', `Cartes ${n}/${D.CARDS.length}`], ['timer', '⏱️', 'Minuteur'], ['journal', '📖', 'Journal'], ['sore', '🩹', 'Courbatures'], ['motiv', '💫', 'Motivation'], ['history', '📈', 'Historique'], ['class', g('🎖️', '🎖️'), 'Classe & objectif'], ['settings', '⚙️', 'Réglages']];
    return `<div class="page-h"><h2>Plus</h2></div><div class="tiles">${tiles.map(([k, ic, l]) => `<button class="tile" data-a="sub" data-s="${k}"><span>${ic}</span><small>${l}</small></button>`).join('')}</div>`;
  }
  const back = (t) => `<div class="sub-h"><button class="icon-btn" data-a="back">‹</button><h2>${t}</h2></div>`;

  function subView(s) {
    switch (s) {
      case 'boss': return viewBoss();
      case 'cards': return viewCards();
      case 'timer': return viewTimer();
      case 'journal': return viewJournal();
      case 'sore': return viewSore();
      case 'motiv': return viewMotiv();
      case 'history': return viewHistory();
      case 'class': return viewClass();
      case 'settings': return viewSettings();
    }
    return '';
  }

  function viewBoss() {
    const t = today(); const wk = weekKey(t); checkBoss(); const rec = S.bosses[wk]; const boss = bossFor(wk);
    const dmg = weekDamage(wk); const left = Math.max(0, rec.hp - dmg);
    const daysLeft = 7 - ((parseK(t).getDay() + 6) % 7);
    let h = back('Boss de la semaine');
    h += `<section class="card boss-big${rec.defeated ? ' won' : ''}"><div class="aura"></div><div class="boss-art">${boss.emoji}</div><h2>${esc(boss.name)}</h2><p class="muted">${esc(boss.lore)}</p><div class="hp big"><i style="width:${Math.max(0, 100 - (dmg / rec.hp) * 100)}%"></i><span>${rec.defeated ? g('Vaincu !', 'Vaincu !') : `${fmt(left)} / ${fmt(rec.hp)} PV`}</span></div><p>${rec.defeated ? '🏆 Victoire ! Un nouveau boss arrive lundi.' : `Chaque répétition inflige 1 dégât (1 dégât pour 3 secondes de gainage). Il reste <b>${daysLeft} jour${daysLeft > 1 ? 's' : ''}</b>.`}</p><p class="muted small">Récompense : +200 XP et une carte</p></section>`;
    const past = Object.keys(S.bosses).filter((k) => k < wk).sort().reverse().slice(0, 12);
    if (past.length) {
      h += `<section class="card"><h3>Tableau de chasse</h3>${past.map((k) => { const b = D.BOSSES.find((x) => x.id === S.bosses[k].id) || bossFor(k); const r = S.bosses[k]; return `<div class="hist-row"><span>${b.emoji}</span><span class="grow">${esc(b.name)}<small class="muted"> · semaine du ${shortDay(k)}</small></span><span>${r.defeated ? '🏆' : '💨 enfui'}</span></div>`; }).join('')}</section>`;
    }
    h += `<p class="muted small center">${S.bossWins} boss vaincu${S.bossWins > 1 ? 's' : ''} au total. Les boss deviennent plus coriaces à chaque victoire.</p>`;
    return h;
  }

  function viewCards() {
    const n = Object.keys(S.cards).length;
    let h = back(`Cartes · ${n}/${D.CARDS.length}`);
    h += `<p class="muted">Gagne des cartes avec la carte du jour, les boss vaincus et les journées où toutes tes quêtes sont faites.</p>`;
    for (const [k, cat] of Object.entries(D.CARD_CATS)) {
      const cs = D.CARDS.filter((c) => c.cat === k);
      h += `<h3 style="color:${cat.color}">${cat.icon} ${cat.name} <small class="muted">${cs.filter((c) => S.cards[c.id]).length}/${cs.length}</small></h3><div class="card-grid">`;
      for (const c of cs) h += S.cards[c.id] ? `<button class="mini-card r-${c.rarity}" style="--cc:${cat.color}" data-a="show-card" data-id="${c.id}" data-plain="1"><span>${cat.icon}</span><small>${esc(c.title)}</small>${S.cards[c.id] > 1 ? `<em>×${S.cards[c.id]}</em>` : ''}</button>` : `<div class="mini-card locked"><span>?</span><small>${D.RARITY[c.rarity]}</small></div>`;
      h += '</div>';
    }
    return h;
  }

  // Minuteur (état global pour continuer en arrière-plan de l'interface)
  const T = { mode: 'timer', dur: 60, end: 0, left: 60, running: false, chronoStart: 0, chronoAcc: 0 };
  function timerLeft() { return T.running ? Math.max(0, (T.end - Date.now()) / 1000) : T.left; }
  function chronoNow() { return T.chronoAcc + (T.running && T.mode === 'chrono' ? Date.now() - T.chronoStart : 0); }
  function mmss(sec) { sec = Math.ceil(sec); return `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`; }
  function viewTimer() {
    let h = back('Minuteur');
    h += `<div class="chips"><button class="chipbtn ${T.mode === 'timer' ? 'on' : ''}" data-a="tmode" data-m="timer">⏳ Compte à rebours</button><button class="chipbtn ${T.mode === 'chrono' ? 'on' : ''}" data-a="tmode" data-m="chrono">⏱️ Chrono</button></div>`;
    h += `<div class="timer-wrap"><svg viewBox="0 0 120 120" class="ring"><circle cx="60" cy="60" r="52" class="ring-bg"/><circle cx="60" cy="60" r="52" class="ring-fg" id="ring" stroke-dasharray="326.7" stroke-dashoffset="0"/></svg><div class="timer-n" id="tnum">--:--</div></div>`;
    if (T.mode === 'timer') {
      h += `<div class="chips center">${[30, 45, 60, 90, 120, 180].map((s) => `<button class="chipbtn ${T.dur === s ? 'on' : ''}" data-a="tpreset" data-v="${s}">${s < 60 ? s + ' s' : s / 60 + ' min'}</button>`).join('')}</div>`;
      h += `<div class="btn-row center"><button class="btn ghost" data-a="tadj" data-v="-15">−15 s</button><button class="btn primary big" data-a="tgo">${T.running ? '⏸ Pause' : '▶ Démarrer'}</button><button class="btn ghost" data-a="tadj" data-v="15">+15 s</button></div><div class="center"><button class="btn ghost small" data-a="treset">↺ Réinitialiser</button></div>`;
    } else {
      h += `<div class="btn-row center"><button class="btn primary big" data-a="tgo">${T.running ? '⏸ Pause' : '▶ Démarrer'}</button><button class="btn ghost" data-a="treset">↺ Remise à zéro</button></div>`;
    }
    h += `<p class="muted small center">Une alarme sonne et le téléphone vibre à la fin du compte à rebours (garde l’app ouverte).</p>`;
    return h;
  }
  function updateTimerUI() {
    const n = document.getElementById('tnum'); const r = document.getElementById('ring');
    if (!n) return;
    if (T.mode === 'timer') { const l = timerLeft(); n.textContent = mmss(l); r.setAttribute('stroke-dashoffset', String(326.7 * (1 - l / T.dur))); }
    else { const ms = chronoNow(); const s = Math.floor(ms / 1000); n.textContent = `${pad(Math.floor(s / 60))}:${pad(s % 60)}.${Math.floor((ms % 1000) / 100)}`; r.setAttribute('stroke-dashoffset', String(326.7 * (1 - (s % 60) / 60))); }
  }
  let actx = null;
  function beep() {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.35, 0.7].forEach((t0) => {
        const o = actx.createOscillator(), gn = actx.createGain();
        o.type = 'triangle'; o.frequency.value = 880; o.connect(gn); gn.connect(actx.destination);
        const t = actx.currentTime + t0; gn.gain.setValueAtTime(0.001, t); gn.gain.exponentialRampToValueAtTime(0.5, t + 0.02); gn.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        o.start(t); o.stop(t + 0.3);
      });
    } catch (e) { /* audio indisponible */ }
    if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 300]);
  }
  setInterval(() => {
    if (T.running && T.mode === 'timer' && Date.now() >= T.end) {
      T.running = false; T.left = T.dur; beep(); toast('⏰ Temps écoulé ! À toi de jouer.');
      if (UI.sub === 'timer' && UI.tab === 'more') render();
    }
    updateTimerUI();
  }, 200);

  function viewJournal() {
    let h = back('Journal');
    const moods = ['😄', '🙂', '😐', '😕', '😫'];
    h += `<section class="card"><h3>Comment te sens-tu aujourd’hui ?</h3><div class="moods" id="moods">${moods.map((m, i) => `<button class="${i === 1 ? 'on' : ''}" data-a="mood" data-v="${m}">${m}</button>`).join('')}</div><textarea id="jtext" class="input" rows="4" placeholder="Ta séance, ton énergie, une victoire du jour…"></textarea><button class="btn primary" data-a="add-journal">Écrire dans le journal</button><p class="muted small">Première entrée du jour : +10 XP et +2 Sagesse.</p></section>`;
    for (const j of [...S.journal].reverse().slice(0, 60)) h += `<section class="card jentry"><div class="row-between"><span class="jm">${j.mood}</span><small class="muted">${dayLabel(j.d)} · ${timeOf(j.ts)}</small><button class="icon-btn small" data-a="del-journal" data-id="${j.id}">🗑️</button></div><p>${esc(j.text).replace(/\n/g, '<br>')}</p></section>`;
    return h;
  }

  function viewSore() {
    let h = back('Courbatures');
    h += `<section class="card"><h3>Où as-tu des courbatures ?</h3><div class="chips wrap" id="zones">${D.ZONES.map((z) => `<button class="chipbtn" data-a="zone" data-v="${z}">${z}</button>`).join('')}</div>
      <label class="lbl">Intensité : <b id="lvlv">2</b> / 5</label><input type="range" min="1" max="5" value="2" id="slvl" class="range" data-in="slvl">
      <textarea id="snote" class="input" rows="2" placeholder="Note (facultatif)"></textarea><button class="btn primary" data-a="add-sore">Enregistrer</button></section>`;
    const lvl = ['', 'Légères', 'Gênantes', 'Moyennes', 'Fortes', 'Très fortes'];
    for (const s of [...S.sore].reverse().slice(0, 60)) h += `<section class="card"><div class="row-between"><b class="sore-l l${s.lvl}">${lvl[s.lvl]}</b><small class="muted">${dayLabel(s.d)}</small><button class="icon-btn small" data-a="del-sore" data-id="${s.id}">🗑️</button></div><div class="chips static">${s.zones.map((z) => `<span class="chipbtn">${esc(z)}</span>`).join('')}</div>${s.note ? `<p class="muted">${esc(s.note)}</p>` : ''}</section>`;
    if (!S.sore.length) h += '<p class="muted center small">Note tes courbatures pour repérer les muscles qui ont besoin de repos.</p>';
    return h;
  }

  function viewMotiv() {
    const t = today(); const owned = Object.keys(S.cards);
    let h = back('Motivation');
    if (S.hero.why) h += `<section class="card why"><small class="muted">Ton pourquoi</small><p class="why-t">« ${esc(S.hero.why)} »</p></section>`;
    h += S.daily[t] ? `<h3>Carte du jour</h3>${cardHtml(cardById[S.daily[t]], true)}` : `<button class="card daily-cta" data-a="daily"><span class="dc-ico">🃏</span><span><b>Carte du jour</b><br><small>Tire ta carte de motivation</small></span><span class="go">›</span></button>`;
    if (owned.length) h += `<div class="center"><button class="btn ghost" data-a="random-card">🔀 Relire une carte de ma collection</button></div>`;
    const st = streak(); const tot = S.sets.length;
    h += `<section class="card"><h3>Ton parcours</h3><div class="kpis"><div><b>${tot}</b><small>séries</small></div><div><b>${fmt(S.sets.reduce((a, s) => a + damageOf(s), 0))}</b><small>répétitions</small></div><div><b>${S.bossWins}</b><small>boss</small></div><div><b>${st}</b><small>jours de suite</small></div></div></section>`;
    return h;
  }

  function viewHistory() {
    const t = today();
    let h = back('Historique');
    const days = []; for (let i = 13; i >= 0; i--) days.push(addDays(t, -i));
    const vals = days.map((k) => daySets(k).reduce((a, s) => a + damageOf(s), 0));
    const max = Math.max(10, ...vals);
    h += `<section class="card"><h3>Répétitions · 14 derniers jours</h3><div class="bars">${days.map((k, i) => `<div class="bcol${k === t ? ' today' : ''}"><span class="bv">${vals[i] || ''}</span><i style="height:${(vals[i] / max) * 100}%"></i><small>${parseK(k).toLocaleDateString('fr-FR', { weekday: 'narrow' })}</small></div>`).join('')}</div></section>`;
    const recs = D.EXERCISES.map((e) => [e, record(e.id)]).filter((x) => x[1]);
    if (recs.length) h += `<section class="card"><h3>🏅 Records</h3>${recs.map(([e, r]) => `<div class="hist-row" data-a="ex" data-id="${e.id}"><span class="grow">${esc(e.name)}</span><b>${r.reps}${e.unit === 'sec' ? ' s' : ''}${r.w ? ` · ${r.w} kg` : ''}</b><small class="muted">${shortDay(r.d)}</small></div>`).join('')}</section>`;
    const byDay = {}; for (const s of S.sets) (byDay[s.d] = byDay[s.d] || []).push(s);
    const ks = Object.keys(byDay).sort().reverse().slice(0, 30);
    for (const k of ks) {
      const ss = byDay[k].sort((a, b) => a.ts - b.ts);
      h += `<details class="card day-det"><summary><b>${dayLabel(k)}</b><span class="muted small"> · ${ss.length} série${ss.length > 1 ? 's' : ''} · +${ss.reduce((a, s) => a + s.xp, 0)} XP</span></summary>${ss.map((s) => `<div class="hist-row"><small class="muted">${timeOf(s.ts)}</small><span class="grow">${esc(exById[s.ex].name)}</span><b>${s.reps}${exById[s.ex].unit === 'sec' ? ' s' : ''}${s.w ? ` × ${s.w} kg` : ''}</b></div>`).join('')}</details>`;
    }
    if (!ks.length) h += '<p class="muted center">Ton historique apparaîtra ici après tes premières séries.</p>';
    return h;
  }

  function viewClass() {
    const c = cls(); const gp = goalProgress();
    let h = back('Classe & objectif');
    h += `<section class="card class-card big" style="--cc:${c.color}"><div class="cc-icon">${c.icon}</div><div class="grow"><div class="label">${esc(c.goal)}</div><div class="cc-name">${esc(c[S.hero.g])}</div><p class="small">${esc(c.desc)}</p></div></section>`;
    h += `<section class="card"><h3>🎯 Objectif personnel</h3><p>${esc(goalText())}</p>${gp ? `<div class="bar"><i style="width:${gp.ratio * 100}%"></i></div><p class="small muted">Meilleure série depuis le début de cet objectif : ${gp.best} / ${gp.target}</p>` : ''}
      ${S.hero.goalReached ? `<p class="gain small">Objectif atteint ✓</p><button class="btn primary" data-a="change-class">🔄 Changer de classe / nouvel objectif</button>` : `${S.hero.goal.type === 'free' ? `<button class="btn primary" data-a="goal-done">🏆 J’ai atteint mon objectif !</button>` : '<p class="muted small">Il sera validé automatiquement dès que tu feras cette série.</p>'}<button class="btn ghost small" data-a="change-class" data-edit="1">Modifier mon objectif</button>`}</section>`;
    if (S.classHistory.length) h += `<section class="card"><h3>🏆 Trophées</h3>${S.classHistory.map((x) => `<div class="hist-row"><span>${clsById[x.cls].icon}</span><span class="grow">${esc(x.goal)}<small class="muted"> · ${esc(clsById[x.cls][S.hero.g])}</small></span><small class="muted">${shortDay(x.to)}</small></div>`).join('')}</section>`;
    return h;
  }

  function classPicker(cur, editOnly) {
    return `<div class="class-grid">${D.CLASSES.map((c) => `<button class="class-opt${cur === c.id ? ' on' : ''}" style="--cc:${c.color}" data-a="pick-class" data-id="${c.id}" ${editOnly && c.id !== cur ? 'disabled' : ''}><span class="co-ic">${c.icon}</span><b>${esc(c.goal)}</b><small>${esc(OB.d.g === 'f' || (S && S.hero.g === 'f') ? c.f : c.m)}</small></button>`).join('')}</div>`;
  }
  function goalFields(d) {
    const opts = D.EXERCISES.filter((e) => e.cat !== 'souplesse' || e.unit === 'reps').concat(D.EXERCISES.filter((e) => e.cat === 'souplesse' && e.unit === 'sec'));
    return `<div class="chips"><button class="chipbtn ${d.goalType === 'ex' ? 'on' : ''}" data-a="gtype" data-v="ex">💪 Sur un exercice</button><button class="chipbtn ${d.goalType === 'free' ? 'on' : ''}" data-a="gtype" data-v="free">✍️ Autre objectif</button></div>
      ${d.goalType === 'ex' ? `<label class="lbl">Exercice</label><select class="input" data-in="goalEx">${opts.map((e) => `<option value="${e.id}" ${d.goalEx === e.id ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select><label class="lbl">${exById[d.goalEx].unit === 'sec' ? 'Secondes à tenir' : 'Répétitions'} en une seule série</label><input class="input" inputmode="numeric" data-in="goalTarget" value="${d.goalTarget}"><p class="muted small">Validé automatiquement dès que tu réussis cette série.</p>`
        : `<label class="lbl">Ton objectif</label><input class="input" maxlength="60" data-in="goalText" value="${esc(d.goalText)}" placeholder="Ex : −3 kg, toucher mes pieds, courir 5 km…"><p class="muted small">Tu le valideras toi-même quand tu l’auras atteint.</p>`}`;
  }
  let CC = null; // brouillon de changement de classe
  function changeClassModal(editOnly) {
    if (!CC) { const gl = S.hero.goal; CC = { editOnly, cls: S.hero.cls, goalType: gl.type, goalEx: gl.ex || 'tractions', goalTarget: gl.target || 10, goalText: gl.text || '' }; }
    openModal(`<div class="modal-card"><div class="row-between"><h2>${CC.editOnly ? 'Modifier mon objectif' : 'Nouvelle classe'}</h2><button class="icon-btn" data-a="close-cc">✕</button></div>
      ${CC.editOnly ? '' : `<p class="muted">Choisis ta nouvelle voie. Ton niveau, ton XP et ton équipement sont conservés.</p>${classPicker(CC.cls)}`}
      <h3>Objectif personnel</h3>${goalFields(CC)}
      <button class="btn primary" data-a="save-cc">Valider</button></div>`);
  }

  function viewSettings() {
    let h = back('Réglages');
    h += `<section class="card"><h3>${g('Ton héroïne', 'Ton héros')}</h3><label class="lbl">Nom</label><input class="input" maxlength="20" data-in="sname" value="${esc(S.hero.name)}">
      <label class="lbl">Accords</label><div class="chips"><button class="chipbtn ${F() ? 'on' : ''}" data-a="sg" data-v="f">Féminin</button><button class="chipbtn ${!F() ? 'on' : ''}" data-a="sg" data-v="m">Masculin</button></div>
      <button class="btn ghost" data-a="edit-look">🎨 Modifier l’apparence</button></section>`;
    h += `<section class="card"><h3>Thème</h3><div class="theme-pick">${[['sombre', '🌙', 'Sombre'], ['colore', '🌈', 'Coloré'], ['medieval', '🏰', 'Médiéval']].map(([k, ic, l]) => `<button class="${S.settings.theme === k ? 'on' : ''} th-${k}" data-a="theme" data-v="${k}"><span>${ic}</span>${l}</button>`).join('')}</div></section>`;
    h += `<section class="card"><div class="row-between"><div><h3>☠️ Mode difficile</h3><p class="muted small">Chaque journée non validée (aucune série, moins de 2 quêtes, pas de jour de repos) fait perdre 40 XP.</p></div><button class="switch ${S.settings.hard ? 'on' : ''}" data-a="hard" aria-label="Mode difficile"><i></i></button></div></section>`;
    h += `<section class="card"><h3>Niveau des boss</h3><div class="chips">${[['debut', 'Débutant·e'], ['inter', 'Intermédiaire'], ['avance', 'Confirmé·e']].map(([k, l]) => `<button class="chipbtn ${S.hero.level === k ? 'on' : ''}" data-a="slevel" data-v="${k}">${l}</button>`).join('')}</div><p class="muted small">S’applique à partir du prochain boss.</p></section>`;
    h += `<section class="card"><h3>Pourquoi je fais ça</h3><textarea class="input" rows="2" data-in="swhy" placeholder="Ta motivation profonde">${esc(S.hero.why)}</textarea></section>`;
    h += `<section class="card"><h3>Données</h3><p class="muted small">Tout est enregistré uniquement sur ce téléphone, dans le navigateur. Désinstaller l’app ou effacer les données du navigateur efface ta progression.</p><button class="btn danger" data-a="reset">Tout effacer et recommencer</button></section>`;
    h += `<p class="muted small center">Quête Sport · v1</p>`;
    return h;
  }
  function lookEditor(look) {
    return `<div class="look-ed"><div class="look-prev">${Hero.render(look, itemById[S ? S.equip.arme : 'w_baton'], itemById[S ? S.equip.tenue : 'o_tunique'])}</div><div class="grow">
      <label class="lbl">Peau</label><div class="swatches">${Hero.SKINS.map((c, i) => `<button style="background:${c}" class="${look.skin === i ? 'on' : ''}" data-a="look" data-k="skin" data-v="${i}"></button>`).join('')}</div>
      <label class="lbl">Cheveux</label><div class="swatches">${Hero.HAIRS.map((c, i) => `<button style="background:${c}" class="${look.hair === i ? 'on' : ''}" data-a="look" data-k="hair" data-v="${i}"></button>`).join('')}</div>
      <label class="lbl">Coiffure</label><div class="chips wrap">${Object.entries(Hero.STYLES).map(([k, l]) => `<button class="chipbtn ${look.style === k ? 'on' : ''}" data-a="look" data-k="style" data-v="${k}">${l}</button>`).join('')}</div></div></div>`;
  }
  let LOOK = null;
  function lookModal() {
    LOOK = LOOK || { ...S.hero.look };
    openModal(`<div class="modal-card"><div class="row-between"><h2>Apparence</h2><button class="icon-btn" data-a="close-look">✕</button></div>${lookEditor(LOOK)}<button class="btn primary" data-a="save-look">Enregistrer</button></div>`);
  }
  function equipModal() {
    const slots = Object.entries(D.SLOTS);
    openModal(`<div class="modal-card"><div class="row-between"><h2>Équipement</h2><button class="icon-btn" data-a="close">✕</button></div>${slots.map(([k, s]) => { const owned = S.owned.filter((id) => itemById[id].slot === k); return `<h3>${s.icon} ${s.name}</h3><div class="chips wrap">${owned.length ? owned.map((id) => `<button class="chipbtn ${S.equip[k] === id ? 'on' : ''}" data-a="equip-item" data-id="${id}" data-stay="1">${itemById[id].emoji || ''} ${esc(itemById[id].name)}</button>`).join('') : '<span class="muted small">Rien pour l’instant — passe à la boutique !</span>'}${(k === 'familier' || k === 'compagnon') && S.equip[k] ? `<button class="chipbtn" data-a="unequip" data-s="${k}" data-stay="1">Aucun</button>` : ''}</div>`; }).join('')}<button class="btn primary" data-a="goshop">🛒 Aller à la boutique</button></div>`);
  }

  // ---------- Questionnaire de départ ----------
  function viewOnboarding() {
    const d = OB.d; const st = OB.step; const total = 7;
    const dots = `<div class="ob-dots">${Array.from({ length: total }, (_, i) => `<i class="${i <= st ? 'on' : ''}"></i>`).join('')}</div>`;
    const nextBtn = (lbl = 'Continuer', dis = false) => `<button class="btn primary big" data-a="ob-next" ${dis ? 'disabled' : ''}>${lbl}</button>`;
    const prev = st > 0 ? '<button class="btn ghost" data-a="ob-prev">Retour</button>' : '';
    let body = '';
    const fem = d.g === 'f';
    switch (st) {
      case 0:
        body = `<div class="ob-hero"><div class="ob-logo">⚔️</div><h1>Quête Sport</h1><p>Chaque série te rend plus forte. Chaque jour te fait monter de niveau.</p><p class="muted">Réponds à quelques questions pour créer ton personnage.</p></div>${nextBtn('Commencer l’aventure')}`; break;
      case 1:
        body = `<h2>Qui es-tu, ${fem ? 'aventurière' : 'aventurier'} ?</h2><label class="lbl">Nom de ${fem ? 'ton héroïne' : 'ton héros'}</label><input class="input big" maxlength="20" data-in="ob-name" value="${esc(d.name)}" placeholder="Ex : Morgane"><label class="lbl">Comment je m’adresse à toi ?</label><div class="chips"><button class="chipbtn ${fem ? 'on' : ''}" data-a="ob-g" data-v="f">Au féminin</button><button class="chipbtn ${!fem ? 'on' : ''}" data-a="ob-g" data-v="m">Au masculin</button></div>${nextBtn('Continuer', !d.name.trim())}${prev}`; break;
      case 2:
        body = `<h2>Ton apparence</h2>${lookEditor(d.look)}${nextBtn()}${prev}`; break;
      case 3:
        body = `<h2>Quel est ton objectif principal ?</h2><p class="muted">Il détermine ta classe et ses bonus d’XP. Tu pourras en changer une fois ton objectif atteint.</p>${classPicker(d.cls)}${d.cls ? `<p class="small cls-desc">${esc(clsById[d.cls].desc)}</p>` : ''}${nextBtn('Continuer', !d.cls)}${prev}`; break;
      case 4:
        body = `<h2>Ton objectif personnel</h2><p class="muted">Un défi concret à relever. Exemple : 10 tractions d’affilée.</p>${goalFields(d)}${nextBtn('Continuer', d.goalType === 'free' && !d.goalText.trim())}${prev}`; break;
      case 5:
        body = `<h2>Où en es-tu ?</h2><p class="muted">Ça règle la difficulté des boss hebdomadaires.</p><div class="opts">${[['debut', '🌱', fem ? 'Débutante' : 'Débutant', 'Je (re)commence le sport'], ['inter', '🌿', 'Intermédiaire', 'Je m’entraîne de temps en temps'], ['avance', '🌳', fem ? 'Confirmée' : 'Confirmé', 'Je m’entraîne régulièrement']].map(([k, ic, l, s]) => `<button class="opt ${d.level === k ? 'on' : ''}" data-a="ob-level" data-v="${k}"><span>${ic}</span><span><b>${l}</b><small>${s}</small></span></button>`).join('')}</div><label class="lbl">Pourquoi tu fais ça ? (facultatif)</label><textarea class="input" rows="2" data-in="ob-why" placeholder="Ex : me sentir forte et fière de moi">${esc(d.why)}</textarea>${nextBtn()}${prev}`; break;
      case 6:
        body = `<h2>Derniers réglages</h2><label class="lbl">Thème</label><div class="theme-pick">${[['sombre', '🌙', 'Sombre'], ['colore', '🌈', 'Coloré'], ['medieval', '🏰', 'Médiéval']].map(([k, ic, l]) => `<button class="${d.theme === k ? 'on' : ''} th-${k}" data-a="ob-theme" data-v="${k}"><span>${ic}</span>${l}</button>`).join('')}</div>
          <div class="card row-between"><div><b>☠️ Mode difficile</b><p class="muted small">Une journée sans série ni quêtes = −40 XP. Pour les plus ${fem ? 'motivées' : 'motivés'} !</p></div><button class="switch ${d.hard ? 'on' : ''}" data-a="ob-hard"><i></i></button></div>${nextBtn('⚔️ Créer mon personnage')}${prev}`; break;
    }
    return `<div class="ob">${dots}<div class="ob-body">${body}</div></div>`;
  }

  // ---------- Rendu principal ----------
  function render() {
    applyTheme();
    if (!S) { $app.innerHTML = viewOnboarding(); return; }
    let v = '';
    switch (UI.tab) {
      case 'home': v = viewHome(); break;
      case 'train': v = viewTrain(); break;
      case 'quests': v = viewQuests(); break;
      case 'shop': v = viewShop(); break;
      case 'more': v = viewMore(); break;
    }
    const sy = window.scrollY;
    $app.innerHTML = header() + `<main class="main">${v}</main>` + nav();
    if (UI.keepScroll) window.scrollTo(0, sy);
    UI.keepScroll = false;
    updateTimerUI();
    flushModals();
  }
  const rerender = () => { UI.keepScroll = true; render(); };

  // ---------- Actions ----------
  const A = {
    tab: (el) => { UI.tab = el.dataset.t; UI.sub = null; window.scrollTo(0, 0); render(); },
    sub: (el) => { UI.tab = 'more'; UI.sub = el.dataset.s; window.scrollTo(0, 0); render(); },
    back: () => { UI.sub = null; render(); },
    overlay: (el, e) => { if (e.target === el) { if (UI.sheet) { UI.sheet = null; } CC = null; LOOK = null; closeModal(); rerender(); } },
    close: () => { closeModal(); rerender(); },
    cat: (el) => { UI.cat = el.dataset.c; render(); },
    ex: (el) => exSheet(el.dataset.id),
    step: (el) => {
      const id = UI.sheet; const d = drafts[id]; const f = el.dataset.f; const v = parseFloat(el.dataset.v);
      d[f] = Math.max(f === 'reps' ? 1 : 0, Math.round((d[f] + v) * 10) / 10);
      const sc = $modal.querySelector('.sheet-body').scrollTop;
      exSheet(id); $modal.querySelector('.sheet-body').scrollTop = sc;
    },
    log: (el) => {
      const id = el.dataset.id; const d = drafts[id]; const ex = exById[id];
      const reps = Math.round(+d.reps); if (!(reps > 0)) { toast('Indique un nombre valide'); return; }
      const w = ex.unit === 'sec' || ex.cat === 'souplesse' ? 0 : Math.max(0, +d.w || 0);
      const set = logSet(id, reps, w);
      const sts = Object.entries(set.st).filter(([k]) => k !== 'discipline').map(([k, v]) => `${D.STATS[k].icon}+${v}`).join(' ');
      toast(`⚔️ +${set.xp} XP <small>${sts}</small>`, true);
      const p = pct(best(id, today()), best(id, addDays(today(), -1)));
      if (p !== null && p > 0 && reps === best(id, today())) setTimeout(() => toast(`📈 +${p}% par rapport à hier !`), 500);
      const sc = $modal.querySelector('.sheet-body').scrollTop;
      if (pendingModals.length) { UI.reopen = id; closeModal(); rerender2(); } else { exSheet(id); $modal.querySelector('.sheet-body').scrollTop = sc; rerender2(); }
    },
    'del-set': (el) => {
      const btn = el;
      if (btn.dataset.confirm !== '1') { btn.dataset.confirm = '1'; btn.textContent = 'Suppr. ?'; btn.classList.add('warn'); setTimeout(() => { if (btn.isConnected) { btn.dataset.confirm = ''; btn.textContent = '🗑️'; btn.classList.remove('warn'); } }, 2500); return; }
      deleteSet(el.dataset.id); const id = UI.sheet; const sc = $modal.querySelector('.sheet-body').scrollTop; exSheet(id); $modal.querySelector('.sheet-body').scrollTop = sc; rerender2();
    },
    'rest-timer': () => { closeModal(); UI.tab = 'more'; UI.sub = 'timer'; T.mode = 'timer'; if (!T.running) { T.dur = 60; T.left = 60; } render(); },
    quest: (el) => { toggleQuest(el.dataset.id); rerender(); },
    'edit-quests': () => editQuestsModal(),
    'pick-ic': (el) => { el.parentNode.querySelectorAll('button').forEach((b) => b.classList.remove('on')); el.classList.add('on'); },
    'add-quest': () => {
      const name = document.getElementById('nq-name').value.trim(); if (!name) { toast('Donne un nom à ta quête'); return; }
      const ic = document.querySelector('#nq-icons .on')?.dataset.v || '⭐';
      S.quests.push({ id: 'q_' + uid(), name, icon: ic, xp: +document.getElementById('nq-xp').value, stat: document.getElementById('nq-stat').value });
      save(); editQuestsModal(); rerender2();
    },
    'del-quest': (el) => {
      if (S.quests.length <= 1) { toast('Garde au moins une quête'); return; }
      if (el.dataset.confirm !== '1') { el.dataset.confirm = '1'; el.textContent = 'Suppr. ?'; el.classList.add('warn'); return; }
      S.quests = S.quests.filter((q) => q.id !== el.dataset.id); save(); editQuestsModal(); rerender2();
    },
    'rest-day': () => {
      const t = today(); if (restCountWeek(t) >= 2) { toast('Déjà 2 jours de repos cette semaine'); return; }
      openModal(`<div class="modal-card center"><div class="big-emoji">😌</div><h2>Jour de repos ?</h2><p>Le repos fait partie de l’entraînement. Ta série de jours est préservée${S.settings.hard ? ' et le mode difficile ne te pénalise pas' : ''}. Maximum 2 par semaine.</p><button class="btn primary" data-a="rest-ok">Poser un jour de repos</button><button class="btn ghost" data-a="close">Annuler</button></div>`);
    },
    'rest-ok': () => { S.rest[today()] = true; save(); closeModal(); toast('😌 Bon repos, ' + esc(S.hero.name)); rerender(); },
    shoptab: (el) => { UI.shop = el.dataset.s; render(); },
    buy: (el) => {
      const it = itemById[el.dataset.id];
      if (S.wallet < it.price) { toast(`Il te manque ✨ ${fmt(it.price - S.wallet)} XP`); return; }
      openModal(`<div class="modal-card center"><div class="si-prev big ${it.slot}">${itemPreview(it)}</div><h2>${esc(it.name)}</h2><p class="muted">${esc(it.desc)}</p><p>Bonus : <b>+${it.bonus}% XP</b></p><button class="btn primary" data-a="buy-ok" data-id="${it.id}">Acheter pour ✨ ${fmt(it.price)}</button><button class="btn ghost" data-a="close">Annuler</button></div>`);
    },
    'buy-ok': (el) => {
      const it = itemById[el.dataset.id]; if (S.wallet < it.price || S.owned.includes(it.id)) { closeModal(); return; }
      S.wallet -= it.price; S.owned.push(it.id); S.equip[it.slot] = it.id; save();
      openModal(`<div class="modal-card center glow">${confetti()}<div class="si-prev big ${it.slot}">${itemPreview(it)}</div><h2>${esc(it.name)}</h2><p class="gain small">Acheté et équipé !</p><button class="btn primary" data-a="close">Super</button></div>`);
    },
    'equip-item': (el) => { const it = itemById[el.dataset.id]; S.equip[it.slot] = it.id; save(); if (el.dataset.stay) equipModal(); rerender(); },
    unequip: (el) => { S.equip[el.dataset.s] = null; save(); if (el.dataset.stay) equipModal(); rerender(); },
    equip: () => equipModal(),
    goshop: () => { closeModal(); UI.tab = 'shop'; UI.sub = null; render(); },
    daily: () => {
      const t = today(); if (S.daily[t]) return;
      const res = drawCard(); S.daily[t] = res.card.id; save(); cardModal(res, 'Carte du jour'); rerender2();
    },
    'show-card': (el) => {
      const c = cardById[el.dataset.id];
      if (el.dataset.plain) openModal(`<div class="modal-card center">${cardHtml(c, true)}<button class="btn primary" data-a="close">Fermer</button></div>`);
      else cardModal({ card: c, dup: el.dataset.dup === '1' });
    },
    'random-card': () => { const ids = Object.keys(S.cards); const c = cardById[ids[Math.floor(Math.random() * ids.length)]]; openModal(`<div class="modal-card center">${cardHtml(c, true)}<button class="btn ghost" data-a="random-card">🔀 Une autre</button><button class="btn primary" data-a="close">Fermer</button></div>`); },
    tmode: (el) => { T.mode = el.dataset.m; T.running = false; T.left = T.dur; T.chronoAcc = 0; render(); },
    tpreset: (el) => { T.dur = +el.dataset.v; T.left = T.dur; T.running = false; render(); },
    tadj: (el) => { const v = +el.dataset.v; if (T.running) { T.end += v * 1000; T.dur = Math.max(5, T.dur + v); } else { T.dur = Math.max(5, T.dur + v); T.left = T.dur; } render(); },
    tgo: () => {
      try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); } catch (e) { /* */ }
      if (T.mode === 'timer') { if (T.running) { T.left = timerLeft(); T.running = false; } else { if (T.left <= 0) T.left = T.dur; T.end = Date.now() + T.left * 1000; T.running = true; } }
      else { if (T.running) { T.chronoAcc += Date.now() - T.chronoStart; T.running = false; } else { T.chronoStart = Date.now(); T.running = true; } }
      render();
    },
    treset: () => { T.running = false; T.left = T.dur; T.chronoAcc = 0; render(); },
    mood: (el) => { el.parentNode.querySelectorAll('button').forEach((b) => b.classList.remove('on')); el.classList.add('on'); },
    'add-journal': () => {
      const text = document.getElementById('jtext').value.trim(); if (!text) { toast('Écris quelques mots 🙂'); return; }
      const mood = document.querySelector('#moods .on')?.dataset.v || '🙂'; const t = today();
      const first = !S.journal.some((j) => j.d === t);
      S.journal.push({ id: uid(), d: t, ts: Date.now(), mood, text });
      if (first) { addXp(10); S.stats.sagesse += 2; toast('📖 +10 XP · 🔮+2', true); }
      save(); render();
    },
    'del-journal': (el) => { if (el.dataset.confirm !== '1') { el.dataset.confirm = '1'; el.textContent = 'Suppr. ?'; el.classList.add('warn'); return; } S.journal = S.journal.filter((j) => j.id !== el.dataset.id); save(); rerender(); },
    zone: (el) => el.classList.toggle('on'),
    'add-sore': () => {
      const zones = [...document.querySelectorAll('#zones .on')].map((b) => b.dataset.v); if (!zones.length) { toast('Choisis au moins une zone'); return; }
      S.sore.push({ id: uid(), d: today(), ts: Date.now(), zones, lvl: +document.getElementById('slvl').value, note: document.getElementById('snote').value.trim() });
      save(); toast('🩹 Noté. Pense à bien récupérer.'); render();
    },
    'del-sore': (el) => { if (el.dataset.confirm !== '1') { el.dataset.confirm = '1'; el.textContent = 'Suppr. ?'; el.classList.add('warn'); return; } S.sore = S.sore.filter((j) => j.id !== el.dataset.id); save(); rerender(); },
    'goal-done': () => { reachGoal(); rerender(); },
    'open-class': () => { closeModal(); UI.tab = 'more'; UI.sub = 'class'; render(); },
    'change-class': (el) => { CC = null; changeClassModal(!!el.dataset.edit); },
    'close-cc': () => { CC = null; closeModal(); rerender(); },
    'pick-class': (el) => { if (CC && $modal.classList.contains('open')) { CC.cls = el.dataset.id; changeClassModal(CC.editOnly); } else { OB.d.cls = el.dataset.id; render(); } },
    gtype: (el) => { const tgt = CC && $modal.classList.contains('open') ? CC : OB.d; tgt.goalType = el.dataset.v; CC && $modal.classList.contains('open') ? changeClassModal(CC.editOnly) : render(); },
    'save-cc': () => {
      const c = CC; if (c.goalType === 'free' && !c.goalText.trim()) { toast('Écris ton objectif'); return; }
      const t = today();
      if (!c.editOnly) S.classHistory.push({ cls: S.hero.cls, goal: goalText(), from: S.hero.since, to: t });
      if (!c.editOnly) { S.hero.cls = c.cls; S.hero.since = t; S.hero.goalReached = false; }
      S.hero.goal = c.goalType === 'ex' ? { type: 'ex', ex: c.goalEx, target: Math.max(1, +c.goalTarget || 1) } : { type: 'free', text: c.goalText.trim() };
      if (c.editOnly) { S.hero.goalReached = false; S.hero.since = S.hero.since || t; }
      save(); CC = null; closeModal(); toast(c.editOnly ? '🎯 Objectif mis à jour' : `${cls().icon} Tu es maintenant ${esc(cls()[S.hero.g])} !`); render();
    },
    sg: (el) => { S.hero.g = el.dataset.v; save(); rerender(); },
    'edit-look': () => { LOOK = null; lookModal(); },
    look: (el) => {
      const k = el.dataset.k; const v = k === 'style' ? el.dataset.v : +el.dataset.v;
      if (!S) { OB.d.look[k] = v; render(); } else { LOOK[k] = v; lookModal(); }
    },
    'close-look': () => { LOOK = null; closeModal(); },
    'save-look': () => { S.hero.look = { ...LOOK }; LOOK = null; save(); closeModal(); rerender(); },
    theme: (el) => { S.settings.theme = el.dataset.v; save(); rerender(); },
    hard: () => { S.settings.hard = !S.settings.hard; if (S.settings.hard) S.settings.hardSince = today(); save(); toast(S.settings.hard ? '☠️ Mode difficile activé' : 'Mode difficile désactivé'); rerender(); },
    slevel: (el) => { S.hero.level = el.dataset.v; save(); rerender(); },
    reset: () => openModal(`<div class="modal-card center"><div class="big-emoji">⚠️</div><h2>Tout effacer ?</h2><p>Ta progression, ton équipement, tes cartes et ton historique seront définitivement supprimés.</p><button class="btn danger" data-a="reset-ok">Oui, tout effacer</button><button class="btn ghost" data-a="close">Annuler</button></div>`),
    'reset-ok': () => { localStorage.removeItem(KEY); S = null; OB.step = 0; closeModal(); UI = { tab: 'home', sub: null, cat: 'all', q: '', shop: 'arme' }; render(); },
    // questionnaire
    'ob-next': () => {
      if (OB.step < 6) { OB.step++; window.scrollTo(0, 0); render(); return; }
      S = newState(OB.d); UI.tab = 'home'; save();
      const res = drawCard(); S.daily[today()] = res.card.id; addXp(50); save();
      pendingModals.push(() => openModal(`<div class="modal-card center glow">${confetti()}<div class="big-emoji">⚔️</div><h2>Bienvenue, ${esc(S.hero.name)} !</h2><p>Tu es ${g('une', 'un')} <b>${esc(cls()[S.hero.g])}</b> de niveau 1.</p><p class="gain small">Cadeau de départ : +50 XP et ta première carte</p><button class="btn primary" data-a="show-card" data-id="${res.card.id}">Découvrir ma carte</button></div>`));
      render();
    },
    'ob-prev': () => { OB.step = Math.max(0, OB.step - 1); render(); },
    'ob-g': (el) => { OB.d.g = el.dataset.v; render(); },
    'ob-level': (el) => { OB.d.level = el.dataset.v; render(); },
    'ob-theme': (el) => { OB.d.theme = el.dataset.v; render(); },
    'ob-hard': () => { OB.d.hard = !OB.d.hard; render(); },
  };
  function rerender2() { // met à jour l'écran derrière une modale sans la fermer
    const sy = window.scrollY;
    const v = { home: viewHome, train: viewTrain, quests: viewQuests, shop: viewShop, more: viewMore }[UI.tab]();
    $app.innerHTML = header() + `<main class="main">${v}</main>` + nav();
    window.scrollTo(0, sy);
  }

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-a]');
    if (!el || el.disabled) return;
    const fn = A[el.dataset.a]; if (!fn) return;
    fn(el, e);
  });
  document.addEventListener('input', (e) => {
    const el = e.target; const k = el.dataset && el.dataset.in; if (!k) return;
    const v = el.value;
    const tgtGoal = CC && $modal.classList.contains('open') ? CC : OB.d;
    switch (k) {
      case 'q': UI.q = v; { const pos = el.selectionStart; render(); const n = document.querySelector('[data-in=q]'); n.focus(); n.setSelectionRange(pos, pos); } break;
      case 'reps': drafts[UI.sheet].reps = Math.max(0, parseInt(v, 10) || 0); updatePreview(); break;
      case 'w': drafts[UI.sheet].w = Math.max(0, parseFloat(v.replace(',', '.')) || 0); updatePreview(); break;
      case 'ob-name': { const had = !!OB.d.name.trim(); OB.d.name = v; if (had !== !!v.trim()) { const b = document.querySelector('[data-a=ob-next]'); if (b) b.disabled = !v.trim(); } } break;
      case 'ob-why': OB.d.why = v; break;
      case 'goalText': tgtGoal.goalText = v; if (!S) { const b = document.querySelector('[data-a=ob-next]'); if (b) b.disabled = !v.trim(); } break;
      case 'goalTarget': tgtGoal.goalTarget = parseInt(v, 10) || 1; break;
      case 'sname': S.hero.name = v.trim() || S.hero.name; save(); break;
      case 'swhy': S.hero.why = v; save(); break;
      case 'slvl': document.getElementById('lvlv').textContent = v; break;
    }
  });
  document.addEventListener('change', (e) => {
    const el = e.target; const k = el.dataset && el.dataset.in;
    if (k === 'goalEx') { const tgt = CC && $modal.classList.contains('open') ? CC : OB.d; tgt.goalEx = el.value; CC && $modal.classList.contains('open') ? changeClassModal(CC.editOnly) : render(); }
    if (k === 'sname') rerender();
  });
  function updatePreview() {
    const id = UI.sheet; const ex = exById[id]; const d = drafts[id]; const el = $modal.querySelector('.xp-prev');
    if (el) el.textContent = `+${setXp(ex, d.reps || 0, ex.unit === 'sec' || ex.cat === 'souplesse' ? 0 : d.w)} XP`;
  }

  // Nouveau jour pendant que l'app est ouverte
  let lastDay = today();
  function onResume() {
    if (!S) return;
    if (today() !== lastDay) { lastDay = today(); dailyChecks(); render(); }
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) onResume(); });
  setInterval(onResume, 60000);

  // Démarrage
  if (S) { dailyChecks(); checkBoss(); save(); }
  render();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
