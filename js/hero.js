// Portrait du personnage, vue de face, style peint : proportions réalistes, ombres, reflets métal.
(function () {
  const SKINS = ['#f3cfb4', '#e0ad87', '#bf8459', '#87553a'];
  const HAIRS = ['#2a1c15', '#5e3621', '#a8692c', '#d9bb72', '#9e3324', '#cfcfd6', '#523388'];
  const STYLES = { long: 'Longs', court: 'Courts', tresse: 'Tresse', chignon: 'Chignon' };

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const c = (v) => Math.max(0, Math.min(255, v + amt));
    return '#' + ((c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, '0');
  }

  // Dégradés partagés (préfixés par un identifiant unique)
  function defs(u, skin, hair, main, extra = '') {
    return `<defs>
      <radialGradient id="${u}sk" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="${shade(skin, 18)}"/><stop offset=".6" stop-color="${skin}"/><stop offset="1" stop-color="${shade(skin, -38)}"/></radialGradient>
      <linearGradient id="${u}skl" x1="0" x2="1"><stop offset="0" stop-color="${shade(skin, 10)}"/><stop offset=".55" stop-color="${skin}"/><stop offset="1" stop-color="${shade(skin, -40)}"/></linearGradient>
      <linearGradient id="${u}cl" x1="0" x2="1"><stop offset="0" stop-color="${shade(main, 34)}"/><stop offset=".45" stop-color="${main}"/><stop offset="1" stop-color="${shade(main, -55)}"/></linearGradient>
      <linearGradient id="${u}dk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>
      <linearGradient id="${u}m" x1="0" x2="1"><stop offset="0" stop-color="#6c7682"/><stop offset=".22" stop-color="#eef2f6"/><stop offset=".45" stop-color="#9aa5b1"/><stop offset=".7" stop-color="#d6dde4"/><stop offset="1" stop-color="#4b545e"/></linearGradient>
      <linearGradient id="${u}g" x1="0" x2="1"><stop offset="0" stop-color="#8a5f0a"/><stop offset=".35" stop-color="#ffe08a"/><stop offset=".6" stop-color="#d4a017"/><stop offset="1" stop-color="#7a5208"/></linearGradient>
      <linearGradient id="${u}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(hair, 30)}"/><stop offset=".5" stop-color="${hair}"/><stop offset="1" stop-color="${shade(hair, -30)}"/></linearGradient>
      <linearGradient id="${u}lt" x1="0" x2="1"><stop offset="0" stop-color="#7a4a26"/><stop offset=".5" stop-color="#9c6234"/><stop offset="1" stop-color="#4a2a14"/></linearGradient>
      <filter id="${u}glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="${u}soft"><feGaussianBlur stdDeviation=".6"/></filter>
      ${extra}
    </defs>`;
  }

  // ---------- Armes (dessinées autour de la main en 0,0, pointe vers le haut) ----------
  function weaponSvg(it, u) {
    const c = it.color, dk = shade(c, -60), lt = shade(c, 60);
    const glow = it.glow ? ` filter="url(#${u}glow)"` : '';
    const blade = `<linearGradient id="${u}bl" x1="0" x2="1"><stop offset="0" stop-color="${shade(c, -40)}"/><stop offset=".48" stop-color="${lt}"/><stop offset=".52" stop-color="${shade(c, -10)}"/><stop offset="1" stop-color="${shade(c, -70)}"/></linearGradient>`;
    const wood = `<linearGradient id="${u}wd" x1="0" x2="1"><stop offset="0" stop-color="#5b3a1e"/><stop offset=".4" stop-color="#8a5a30"/><stop offset="1" stop-color="#3a2410"/></linearGradient>`;
    const grip = (y1, y2) => { let s = `<rect x="-2.4" y="${y1}" width="4.8" height="${y2 - y1}" rx="1.6" fill="#3b2414"/>`; for (let y = y1 + 1.5; y < y2; y += 2.6) s += `<path d="M-2.4 ${y} L2.4 ${y + 1.6}" stroke="#6b4426" stroke-width="1"/>`; return s; };
    switch (it.weapon) {
      case 'staff': return `<defs>${wood}</defs><g><path d="M-1.6 52 Q-3 10 -1.2 -30 Q-2.8 -50 -0.6 -70 L2 -70 Q2.4 -50 2.2 -30 Q3.2 10 2 52 Z" fill="url(#${u}wd)"/><path d="M-0.4 -60 Q-1 -30 0 0 Q-0.6 30 0.2 50" stroke="#a8784a" stroke-width=".6" fill="none" opacity=".7"/><path d="M-3.5 -66 Q-6 -76 0 -82 Q6 -76 3.5 -66 Z" fill="#4a2e16"/><circle cx="0" cy="-74" r="3.4" fill="#7fd1ff" filter="url(#${u}glow)"/><circle cx="-1" cy="-75.2" r="1" fill="#fff"/></g>`;
      case 'dagger': return `<defs>${blade}</defs><g${glow}><path d="M-3.2 -7 L-2.6 -30 L0 -38 L2.6 -30 L3.2 -7 Z" fill="url(#${u}bl)" stroke="${dk}" stroke-width=".5"/><path d="M0 -36 V-8" stroke="${shade(c, -50)}" stroke-width=".5"/><path d="M-8 -8 Q-4 -5 0 -6.4 Q4 -5 8 -8 L8.4 -5.4 Q4 -2.6 0 -3.6 Q-4 -2.6 -8.4 -5.4 Z" fill="url(#${u}g)"/>${grip(-4, 6)}<circle cx="0" cy="8" r="2.4" fill="url(#${u}g)"/></g>`;
      case 'sword': return `<defs>${blade}</defs><g${glow}><path d="M-3.6 -9 L-3.2 -62 L0 -72 L3.2 -62 L3.6 -9 Z" fill="url(#${u}bl)" stroke="${dk}" stroke-width=".5"/><path d="M-0.8 -60 L-0.8 -12 L0.8 -12 L0.8 -60 Z" fill="${shade(c, -45)}" opacity=".55"/><path d="M-3 -62 L-0.5 -70" stroke="#fff" stroke-width=".6" opacity=".7"/><path d="M-13 -11 Q-7 -6 0 -8 Q7 -6 13 -11 Q14 -8.6 12 -7.6 Q7 -3.4 0 -4.6 Q-7 -3.4 -12 -7.6 Q-14 -8.6 -13 -11 Z" fill="url(#${u}g)" stroke="#6b4a08" stroke-width=".4"/><circle cx="0" cy="-6.6" r="1.8" fill="#c0283c"/>${grip(-4.6, 7)}<path d="M-3.2 7 Q0 13 3.2 7 Q0 9 -3.2 7 Z" fill="url(#${u}g)"/><circle cx="0" cy="9.4" r="2.6" fill="url(#${u}g)"/></g>`;
      case 'bow': return `<defs>${wood}</defs><g transform="translate(-3 0)"><path d="M3 -56 Q-4 -50 -9 -32 Q-14 -6 -9 18 Q-4 36 3 44" fill="none" stroke="url(#${u}wd)" stroke-width="4" stroke-linecap="round"/><path d="M3 -56 Q-4 -50 -9 -32 Q-14 -6 -9 18 Q-4 36 3 44" fill="none" stroke="${lt}" stroke-width=".8" opacity=".6"/><path d="M3 -56 Q6 -60 4 -63 M3 44 Q6 48 4 51" stroke="${c}" stroke-width="2.4" fill="none" stroke-linecap="round"/><line x1="3.6" y1="-58" x2="3.6" y2="46" stroke="#eee8d8" stroke-width=".6"/><rect x="-14" y="-6" width="7" height="12" rx="2.4" fill="#3b2414"/><path d="M-13.5 -4 h6 M-13.5 -1 h6 M-13.5 2 h6" stroke="#6b4426" stroke-width=".7"/></g>`;
      case 'axe': return `<defs>${wood}${blade}</defs><g${glow} transform="scale(-1 1)"><path d="M-2 26 L-2.2 -58 Q0 -62 2.2 -58 L2 26 Z" fill="url(#${u}wd)"/><path d="M2 -56 Q14 -62 23 -58 Q19 -46 20 -34 Q22 -24 26 -18 Q14 -20 2 -30 Z" fill="url(#${u}bl)" stroke="${dk}" stroke-width=".6"/><path d="M23 -57 Q18 -44 19.6 -33 Q21 -24 25 -19" fill="none" stroke="#fff" stroke-width=".9" opacity=".8"/><path d="M-2 -52 Q-10 -50 -11 -44 Q-10 -38 -2 -37 Z" fill="${shade(c, -45)}"/><rect x="-3" y="-60" width="6" height="6" rx="1" fill="url(#${u}g)"/>${grip(4, 18)}</g>`;
      case 'spear': return `<defs>${wood}${blade}</defs><g${glow}><path d="M-1.8 50 L-1.8 -76 L1.8 -76 L1.8 50 Z" fill="url(#${u}wd)"/><path d="M0 -100 Q7 -88 4.4 -78 L0 -74 L-4.4 -78 Q-7 -88 0 -100 Z" fill="url(#${u}bl)" stroke="${dk}" stroke-width=".6"/><path d="M0 -98 V-76" stroke="${shade(c, -40)}" stroke-width=".6"/><rect x="-2.6" y="-78" width="5.2" height="5" rx="1" fill="url(#${u}g)"/><path d="M-2 -72 Q-8 -66 -6 -56 M2 -72 Q8 -66 6 -56" stroke="#a31f2b" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>`;
      case 'hammer': return `<defs>${wood}<linearGradient id="${u}hm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lt}"/><stop offset=".4" stop-color="${shade(c, -20)}"/><stop offset="1" stop-color="${shade(c, -80)}"/></linearGradient></defs><g><path d="M-2.2 26 L-2.2 -46 L2.2 -46 L2.2 26 Z" fill="url(#${u}wd)"/><path d="M-15 -62 Q-16 -54 -15 -46 L15 -46 Q16 -54 15 -62 Z" fill="url(#${u}hm)" stroke="${shade(c, -90)}" stroke-width=".7"/><rect x="-16.4" y="-63" width="4" height="18" rx="1.2" fill="url(#${u}g)"/><rect x="12.4" y="-63" width="4" height="18" rx="1.2" fill="url(#${u}g)"/><path d="M-6 -58 L-3 -50 L0 -58 L3 -50 L6 -58" fill="none" stroke="#9fe7ff" stroke-width="1.4" filter="url(#${u}glow)"/><rect x="-3" y="-46" width="6" height="5" fill="url(#${u}g)"/>${grip(4, 20)}</g>`;
    }
    return '';
  }

  // ---------- Cheveux ----------
  function hairBack(style, u) {
    const f = `url(#${u}h)`;
    if (style === 'long') return `<path d="M48.5 20 Q47 6 60 5.5 Q73 6 71.5 20 L74 52 Q76 70 72 82 Q66 78 60 79 Q54 78 48 82 Q44 70 46 52 Z" fill="${f}"/>`;
    if (style === 'tresse') return `<path d="M50 18 Q50 7 60 7 Q70 7 70 18 Z" fill="${f}"/>${[0, 1, 2, 3, 4].map((i) => `<ellipse cx="${70.5 + i * 0.6}" cy="${44 + i * 8}" rx="${4 - i * 0.35}" ry="${4.8 - i * 0.3}" fill="${f}" stroke="rgba(0,0,0,.25)" stroke-width=".5"/>`).join('')}<rect x="70.6" y="81" width="5" height="2.4" rx="1" fill="url(#${u}g)"/>`;
    if (style === 'chignon') return `<circle cx="60" cy="6" r="6.5" fill="${f}"/><path d="M55 5 Q60 1 65 5" stroke="rgba(255,255,255,.25)" stroke-width=".8" fill="none"/>`;
    return '';
  }
  function hairFront(style, hair, u) {
    const f = `url(#${u}h)`, hl = shade(hair, 55);
    const strands = `<path d="M54 9 Q58 7.4 63 8.4 M52.5 12 Q56 9.6 60 10" stroke="${hl}" stroke-width=".7" fill="none" opacity=".55"/>`;
    if (style === 'court') return `<path d="M50 24 Q48.6 8 60 7.6 Q71.4 8 70 24 Q69 16 64 14.4 Q59 17 53.6 15.4 Q51 18 50 24 Z" fill="${f}"/>${strands}`;
    let s = `<path d="M50.2 26 Q48 7.5 60 7.2 Q72 7.5 69.8 26 Q68.6 17 63.6 14 Q60.6 19 54 17.6 Q51.2 20.6 50.2 26 Z" fill="${f}"/>`;
    if (style === 'long') s += `<path d="M50.4 20 Q48.6 36 50 50 L46.6 52 Q45 36 48 20 Z M69.6 20 Q71.4 36 70 50 L73.4 52 Q75 36 72 20 Z" fill="${f}"/>`;
    return s + strands;
  }

  // ---------- Visage ----------
  function face(skin, hair, u) {
    const dk = shade(skin, -45), brow = shade(hair, -5);
    const eye = (cx, m) => `<path d="M${cx - 3.4 * m} 25.6 Q${cx} 23.4 ${cx + 3.4 * m} 25.4 Q${cx} 28.3 ${cx - 3.4 * m} 25.6 Z" fill="#f6f1ea"/><circle cx="${cx + 0.2 * m}" cy="25.5" r="1.8" fill="#5b3b22"/><circle cx="${cx + 0.2 * m}" cy="25.5" r=".85" fill="#140d08"/><circle cx="${cx - 0.3 * m}" cy="25" r=".45" fill="#fff"/><path d="M${cx - 3.6 * m} 25.5 Q${cx} 22.9 ${cx + 3.6 * m} 25.3" stroke="#2a1a12" stroke-width=".7" fill="none" stroke-linecap="round"/><path d="M${cx - 3 * m} 26.8 Q${cx} 27.9 ${cx + 2.8 * m} 26.6" stroke="${dk}" stroke-width=".35" fill="none" opacity=".6"/>`;
    return `<g>
      <path d="M50.8 23 Q50.4 12.5 60 12 Q69.6 12.5 69.2 23 L68.8 29.5 Q67.6 36.6 60 39.6 Q52.4 36.6 51.2 29.5 Z" fill="url(#${u}sk)"/>
      <path d="M64 13 Q69.6 14 69.2 23 L68.8 29.5 Q67.6 36.6 60 39.6 Q66 34 66.6 26 Q67 17 64 13 Z" fill="${dk}" opacity=".28"/>
      <ellipse cx="50.6" cy="26.5" rx="1.5" ry="2.8" fill="${shade(skin, -20)}"/><ellipse cx="69.4" cy="26.5" rx="1.5" ry="2.8" fill="${shade(skin, -38)}"/>
      ${eye(55.6, 1)}${eye(64.4, -1)}
      <path d="M52.2 21.8 Q55.4 20.2 58.6 21.4" stroke="${brow}" stroke-width="1.05" fill="none" stroke-linecap="round"/><path d="M61.4 21.4 Q64.6 20.2 67.8 21.8" stroke="${brow}" stroke-width="1.05" fill="none" stroke-linecap="round"/>
      <path d="M60.4 26.5 Q60.2 30 61.4 31.6 Q60.4 32.4 59 32" stroke="${dk}" stroke-width=".6" fill="none" opacity=".75"/>
      <path d="M57 34.8 Q58.6 34 60 34.5 Q61.4 34 63 34.8 Q61.6 35.4 60 35.3 Q58.4 35.4 57 34.8 Z" fill="#b0605a"/>
      <path d="M57.2 34.9 Q60 37.4 62.8 34.9 Q60 36 57.2 34.9 Z" fill="#c9776e"/>
      <ellipse cx="54" cy="31" rx="2.4" ry="1.3" fill="#e88a80" opacity=".22"/><ellipse cx="66" cy="31" rx="2.4" ry="1.3" fill="#e88a80" opacity=".18"/>
    </g>`;
  }

  // ---------- Rendu principal ----------
  function render(look, weaponItem, outfitItem) {
    const skin = SKINS[look.skin ?? 0], hair = HAIRS[look.hair ?? 0], style = look.style || 'long';
    const o = outfitItem.outfit;
    const main = o.main, trim = o.trim;
    const u = 'h' + Math.random().toString(36).slice(2, 7);
    const capeG = o.cape ? `<linearGradient id="${u}cp" x1="0" x2="1"><stop offset="0" stop-color="${shade(o.cape, -50)}"/><stop offset=".3" stop-color="${o.cape}"/><stop offset=".7" stop-color="${shade(o.cape, -20)}"/><stop offset="1" stop-color="${shade(o.cape, -70)}"/></linearGradient>` : '';
    const chain = `<pattern id="${u}ch" width="2.6" height="2.2" patternUnits="userSpaceOnUse"><path d="M0 1.1 Q1.3 -.4 2.6 1.1 Q1.3 2.6 0 1.1" fill="none" stroke="#3d454f" stroke-width=".45"/></pattern>`;
    let s = `<svg class="hero-svg" viewBox="0 0 120 200" aria-label="Ton personnage">${defs(u, skin, hair, main, capeG + chain)}`;
    s += `<ellipse cx="60" cy="192" rx="32" ry="5" fill="rgba(0,0,0,.3)"/>`;
    // cape
    if (o.cape) s += `<path d="M39 46 Q60 40 81 46 Q90 110 98 186 Q78 194 60 190 Q42 194 22 186 Q30 110 39 46 Z" fill="url(#${u}cp)"/><path d="M46 60 Q42 120 36 186 M74 60 Q78 120 84 186 M60 52 Q61 120 60 190" stroke="rgba(0,0,0,.22)" stroke-width="1.2" fill="none"/>`;
    s += hairBack(style, u);
    // jambes
    const pants = o.pants;
    s += `<path d="M46.6 106 Q45 134 45 166 L55.4 166 Q56.4 134 59.4 108 Z" fill="${pants}"/><path d="M73.4 106 Q75 134 75 166 L64.6 166 Q63.6 134 60.6 108 Z" fill="${shade(pants, -18)}"/>`;
    s += `<path d="M46.6 106 Q45 134 45 166 L48 166 Q48 134 49.6 107 Z" fill="#fff" opacity=".1"/><path d="M50 140 Q52 142 55 140" stroke="rgba(0,0,0,.25)" stroke-width=".7" fill="none"/>`;
    if (o.plate) s += `<path d="M44.6 136 Q50 133 55.8 136 L55.4 150 Q50 152 44.8 150 Z" fill="url(#${u}m)"/><path d="M64.2 136 Q70 133 75.4 136 L75.2 150 Q70 152 64.6 150 Z" fill="url(#${u}m)"/><ellipse cx="50" cy="141" rx="3" ry="2.2" fill="url(#${u}g)"/><ellipse cx="70" cy="141" rx="3" ry="2.2" fill="url(#${u}g)"/>`;
    // bottes
    const bt = o.boots;
    s += `<path d="M43.6 160 L56.4 160 L56.8 184 Q56.8 188.4 52.4 188.4 L40.6 188.4 Q38 188.4 38.8 185.6 L43 178 Z" fill="${bt}"/><path d="M76.4 160 L63.6 160 L63.2 184 Q63.2 188.4 67.6 188.4 L79.4 188.4 Q82 188.4 81.2 185.6 L77 178 Z" fill="${shade(bt, -15)}"/>`;
    s += `<path d="M43 158.6 h14 v4.4 h-14 z M63 158.6 h14 v4.4 h-14 z" fill="${shade(bt, 22)}"/><path d="M44.6 166 Q46 176 43.4 182" stroke="#fff" stroke-width=".8" opacity=".15" fill="none"/>`;
    // bras (manches)
    const slv = o.plate ? `url(#${u}m)` : `url(#${u}cl)`;
    s += `<path d="M42 47 Q34.4 50 33 64 L30.4 84 Q29 96 30 108 L36 108.6 Q36.6 96 38.2 86 L42 66 Q44.6 56 46 52 Z" fill="${slv}"/><path d="M42 47 Q34.4 50 33 64 L30.4 84" stroke="rgba(0,0,0,.25)" stroke-width=".8" fill="none"/>`;
    s += `<path d="M78 47 Q85.6 50 87 64 L89.6 84 Q91 96 90 108 L84 108.6 Q83.4 96 81.8 86 L78 66 Q75.4 56 74 52 Z" fill="${slv}"/><path d="M78 47 Q85.6 50 87 64 L89.6 84 Q91 96 90 108" stroke="rgba(0,0,0,.3)" stroke-width="1" fill="none"/>`;
    if (!o.plate && !o.robe) s += `<path d="M29.6 100 h7 v4.6 h-7 z M83.4 100 h7 v4.6 h-7 z" fill="${o.straps ? '#3a2416' : shade(trim, -10)}"/>`;
    // cou
    s += `<path d="M55.6 34 L64.4 34 L64.8 46 Q60 49 55.2 46 Z" fill="url(#${u}skl)"/><path d="M55.6 37 Q60 41 64.4 37 L64.4 40 Q60 43 55.6 40 Z" fill="rgba(0,0,0,.18)"/>`;
    // buste
    if (o.robe) s += `<path d="M40 47 Q60 41.6 80 47 L78 70 Q74 88 75 98 L84 140 L93 182 Q60 192 27 182 L36 140 L45 98 Q46 88 42 70 Z" fill="url(#${u}cl)"/><path d="M27 182 Q60 192 93 182 L93 182 Q60 186 27 182 Z" fill="url(#${u}g)"/><path d="M28 180 Q60 189 92 180" stroke="url(#${u}g)" stroke-width="2.2" fill="none"/><path d="M60 48 V190" stroke="url(#${u}g)" stroke-width="1.6"/><path d="M50 110 Q46 150 40 182 M70 110 Q74 150 80 182" stroke="rgba(0,0,0,.25)" stroke-width="1" fill="none"/><path d="M27 182 Q60 192 93 182 L84 140 Q60 146 36 140 Z" fill="url(#${u}dk)"/>`;
    else s += `<path d="M40 47 Q60 41.6 80 47 L78 70 Q74 88 74.4 96 L77.6 114 Q60 120 42.4 114 L45.6 96 Q46 88 42 70 Z" fill="url(#${u}cl)"/><path d="M42.4 114 Q60 120 77.6 114 L76.6 108 Q60 113 43.4 108 Z" fill="${trim}"/><path d="M42.4 114 Q60 120 77.6 114 L76 100 Q60 104 44 100 Z" fill="url(#${u}dk)"/>`;
    if (o.chain) s += `<path d="M40 47 Q60 41.6 80 47 L78 70 Q74 88 74.4 96 L77.6 114 Q60 120 42.4 114 L45.6 96 Q46 88 42 70 Z" fill="url(#${u}ch)" opacity=".9"/><path d="M42 47 Q34.4 50 33 64 L30.4 84 L36 86 L42 66 Z M78 47 Q85.6 50 87 64 L89.6 84 L84 86 L78 66 Z" fill="url(#${u}ch)" opacity=".8"/>`;
    // col en V
    s += `<path d="M53 45 L60 57 L67 45" stroke="${o.plate ? `url(#${u}g)` : trim}" stroke-width="1.8" fill="none"/>`;
    if (o.straps) s += `<path d="M44 52 L77 96" stroke="#3a2416" stroke-width="4.4"/><path d="M44 52 L77 96" stroke="#6b4426" stroke-width=".7" stroke-dasharray="1.4 1.4"/><rect x="58" y="70" width="5" height="5" rx="1" fill="url(#${u}g)" transform="rotate(53 60.5 72.5)"/><path d="M47 62 Q60 66 73 62 M46 80 Q60 84 74 80" stroke="rgba(0,0,0,.35)" stroke-width=".6" stroke-dasharray="1.2 1" fill="none"/>`;
    if (o.plate) s += `<path d="M45 52 Q60 46 75 52 L74 76 Q72 90 60 96 Q48 90 46 76 Z" fill="url(#${u}m)" stroke="#3d454f" stroke-width=".5"/><path d="M60 50 V95" stroke="#4b545e" stroke-width=".8"/><path d="M60 50 V95" stroke="#fff" stroke-width=".4" transform="translate(-1 0)" opacity=".6"/><path d="M48 70 Q60 75 72 70" stroke="url(#${u}g)" stroke-width="1.4" fill="none"/><path d="M50 84 Q60 89 70 84" stroke="#4b545e" stroke-width=".7" fill="none"/>`;
    if (o.ember) s += `<path d="M52 60 Q56 66 54 74 M68 60 Q64 66 66 74" stroke="#ff9f1c" stroke-width=".9" fill="none" opacity=".8" filter="url(#${u}glow)"/>`;
    // ceinture
    s += `<path d="M43.6 98 Q60 102.4 76.4 98 L76.8 104.6 Q60 109 43.2 104.6 Z" fill="url(#${u}lt)"/><rect x="56.4" y="98.8" width="7.2" height="7.2" rx="1.4" fill="none" stroke="url(#${u}g)" stroke-width="1.6"/><path d="M68 104 q0 7 4 7 q4 0 4 -6" fill="#5a3418" stroke="#3a2010" stroke-width=".5"/>`;
    // épaulières
    if (o.plate) s += `<path d="M31 56 Q32 44 43 44 Q51 45 51 52 Q46 58 31 56 Z" fill="url(#${u}m)" stroke="#3d454f" stroke-width=".5"/><path d="M32.4 60 Q34 52 44 52 Q49 54 49 57 Q42 62 32.4 60 Z" fill="url(#${u}m)" stroke="#3d454f" stroke-width=".5"/><path d="M89 56 Q88 44 77 44 Q69 45 69 52 Q74 58 89 56 Z" fill="url(#${u}m)" stroke="#3d454f" stroke-width=".5"/><path d="M87.6 60 Q86 52 76 52 Q71 54 71 57 Q78 62 87.6 60 Z" fill="url(#${u}m)" stroke="#3d454f" stroke-width=".5"/><path d="M33 55 Q42 57.6 50 51.6 M87 55 Q78 57.6 70 51.6" stroke="url(#${u}g)" stroke-width="1" fill="none"/>`;
    else if (o.straps || o.chain) s += `<path d="M33 55 Q34 46 43 45.4 Q49 46 49.6 51 Q44 56 33 55 Z" fill="url(#${u}lt)"/><path d="M87 55 Q86 46 77 45.4 Q71 46 70.4 51 Q76 56 87 55 Z" fill="url(#${u}lt)"/>`;
    else s += `<path d="M35 54 Q40 46.4 49 48.4 M85 54 Q80 46.4 71 48.4" stroke="${trim}" stroke-width="1.6" fill="none"/>`;
    // arme + mains
    s += `<g transform="translate(33 112)">${weaponSvg(weaponItem, u)}</g>`;
    const hand = (x, flip) => `<path d="M${x - 3.6} 107 Q${x - 4.4} 113 ${x - 2} 116 Q${x + 1} 117.6 ${x + 3.6} 115 Q${x + 4.6} 110 ${x + 3.4} 107 Z" fill="url(#${u}sk)"/><path d="M${x - 3} 111 h6 M${x - 3} 113.2 h6" stroke="${shade(skin, -45)}" stroke-width=".35" opacity=".7"/>`;
    s += hand(33) + hand(87);
    // tête
    s += face(skin, hair, u) + hairFront(style, hair, u);
    if (o.hood) s += `<path d="M47 30 Q44.4 2 60 1.6 Q75.6 2 73 30 L75 50 Q68 47 70 30 Q70 12 60 12 Q50 12 50 30 Q52 47 45 50 Z" fill="${o.hood}"/><path d="M47 30 Q44.4 2 60 1.6 Q75.6 2 73 30 L75 50 Q72 49 71 47 Q73 26 70 14 Q66 8 60 8" fill="rgba(0,0,0,.25)"/><path d="M50.6 28 Q50 13 60 12 Q70 13 69.4 28" stroke="${shade(o.hood, 40)}" stroke-width=".6" fill="none"/>`;
    if (o.crown) s += `<path d="M50.4 13 L51.6 3.4 L55.6 8.6 L60 0.6 L64.4 8.6 L68.4 3.4 L69.6 13 Q60 10.6 50.4 13 Z" fill="url(#${u}g)" stroke="#6b4a08" stroke-width=".5"/><circle cx="60" cy="8.6" r="1.5" fill="#c0283c"/><circle cx="54.6" cy="10.6" r=".9" fill="#2a6fdb"/><circle cx="65.4" cy="10.6" r=".9" fill="#2a6fdb"/>`;
    if (o.robe && !o.crown && !o.hood) s += `<path d="M50.6 15.4 Q60 11.6 69.4 15.4" stroke="url(#${u}g)" stroke-width="1.2" fill="none"/><path d="M60 11.4 l1.6 2.2 -1.6 2.2 -1.6 -2.2 z" fill="#7fd1ff" filter="url(#${u}glow)"/>`;
    if (o.ember) s += `<g fill="#ffb347">${[0, 1, 2, 3, 4].map((i) => `<circle cx="${30 + i * 15}" cy="186" r="1.2"><animate attributeName="cy" values="186;80" dur="${2.4 + i * 0.5}s" repeatCount="indefinite" begin="${i * 0.4}s"/><animate attributeName="opacity" values="1;0" dur="${2.4 + i * 0.5}s" repeatCount="indefinite" begin="${i * 0.4}s"/></circle>`).join('')}</g>`;
    return s + '</svg>';
  }

  // Arme seule (aperçu boutique), inclinée
  function weapon(it) {
    const u = 'w' + Math.random().toString(36).slice(2, 7);
    return `<svg viewBox="-62 -104 124 124" class="wprev">${defs(u, '#e0ad87', '#000000', '#3b6ea5')}<g transform="rotate(40 0 -40)">${weaponSvg(it, u)}</g></svg>`;
  }

  window.Hero = { render, weapon, SKINS, HAIRS, STYLES };
})();
