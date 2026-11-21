// Portrait du personnage, vue de face, composé de calques (cheveux, tenue, arme)
(function () {
  const SKINS = ['#f7d7c0', '#eab894', '#c98d62', '#8e5a3a'];
  const HAIRS = ['#2b1d16', '#6b3e26', '#b8742f', '#e3c77e', '#b23a2a', '#d4d4dc', '#5e3a96'];
  const STYLES = { long: 'Longs', court: 'Courts', tresse: 'Tresse', chignon: 'Chignon' };

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  function weaponSvg(w, color, glow) {
    const dark = shade(color, -50), light = shade(color, 50);
    const f = glow ? ' filter="url(#glow)"' : '';
    switch (w) {
      case 'staff': return `<g><line x1="0" y1="-62" x2="0" y2="40" stroke="${color}" stroke-width="4" stroke-linecap="round"/><line x1="-1" y1="-60" x2="-1" y2="38" stroke="${light}" stroke-width="1" opacity=".5"/><circle cx="0" cy="-64" r="5" fill="${dark}"/><circle cx="-1.5" cy="-65.5" r="1.6" fill="${light}"/></g>`;
      case 'dagger': return `<g${f}><path d="M-3 -6 L0 -34 L3 -6 Z" fill="${light}" stroke="${dark}" stroke-width=".8"/><line x1="0" y1="-32" x2="0" y2="-7" stroke="${dark}" stroke-width=".6"/><rect x="-7" y="-7" width="14" height="3" rx="1.5" fill="${dark}"/><rect x="-1.8" y="-4" width="3.6" height="10" rx="1.5" fill="#5a3a22"/></g>`;
      case 'sword': return `<g${f}><path d="M-3.4 -8 L-3 -58 L0 -64 L3 -58 L3.4 -8 Z" fill="${light}" stroke="${dark}" stroke-width=".8"/><line x1="0" y1="-60" x2="0" y2="-9" stroke="${dark}" stroke-width=".7"/><path d="M-11 -9 Q0 -4 11 -9 L11 -6 Q0 -1 -11 -6 Z" fill="#c9a227"/><rect x="-2" y="-6" width="4" height="12" rx="1.8" fill="#4a2f1b"/><circle cx="0" cy="8" r="3" fill="#c9a227"/></g>`;
      case 'bow': return `<g transform="translate(-6 0)"><path d="M4 -48 Q-22 -6 4 36" fill="none" stroke="${color}" stroke-width="3.6" stroke-linecap="round"/><path d="M4 -48 Q-22 -6 4 36" fill="none" stroke="${light}" stroke-width="1" opacity=".6"/><line x1="4" y1="-48" x2="4" y2="36" stroke="#eee" stroke-width=".7"/><rect x="-11" y="-6" width="6" height="10" rx="2" fill="#5a3a22"/></g>`;
      case 'axe': return `<g${f} transform="scale(-1 1)"><line x1="0" y1="-56" x2="0" y2="20" stroke="#6b4423" stroke-width="4" stroke-linecap="round"/><path d="M1 -54 Q20 -60 22 -40 Q20 -22 1 -30 Z" fill="${color}" stroke="${dark}" stroke-width="1"/><path d="M14 -52 Q20 -44 18 -32" fill="none" stroke="${light}" stroke-width="1.4"/><path d="M-1 -50 Q-12 -46 -12 -40 Q-12 -34 -1 -34 Z" fill="${dark}"/></g>`;
      case 'spear': return `<g${f}><line x1="0" y1="-74" x2="0" y2="40" stroke="#6b4423" stroke-width="3.4" stroke-linecap="round"/><path d="M0 -94 L6 -74 L0 -70 L-6 -74 Z" fill="${color}" stroke="${dark}" stroke-width=".8"/><path d="M-6 -72 L-10 -66 M6 -72 L10 -66" stroke="#b22222" stroke-width="2" stroke-linecap="round"/></g>`;
      case 'hammer': return `<g${f}><line x1="0" y1="-46" x2="0" y2="22" stroke="#4a2f1b" stroke-width="4" stroke-linecap="round"/><rect x="-13" y="-60" width="26" height="16" rx="2.5" fill="${shade(color, -30)}" stroke="${dark}" stroke-width="1"/><path d="M-6 -56 L-2 -48 L2 -56 L6 -48" fill="none" stroke="${light}" stroke-width="1.6"/><rect x="-13" y="-60" width="26" height="4" rx="2" fill="${light}" opacity=".4"/></g>`;
    }
    return '';
  }

  function hairBack(style, c) {
    if (style === 'long') return `<path d="M44 26 Q42 8 60 8 Q78 8 76 26 L80 66 Q72 72 60 70 Q48 72 40 66 Z" fill="${c}"/>`;
    if (style === 'tresse') return `<path d="M46 24 Q46 10 60 10 Q74 10 74 24 Z" fill="${c}"/><g fill="${shade(c, -15)}"><ellipse cx="74" cy="44" rx="4.4" ry="5.5"/><ellipse cx="75" cy="53" rx="4" ry="5"/><ellipse cx="75.5" cy="61.5" rx="3.6" ry="4.6"/><ellipse cx="76" cy="69" rx="3" ry="4"/></g><rect x="73.5" y="72" width="5" height="2.6" rx="1" fill="#c9a227"/>`;
    if (style === 'chignon') return `<circle cx="60" cy="9" r="8.5" fill="${shade(c, -10)}"/>`;
    return '';
  }
  function hairFront(style, c) {
    const hl = shade(c, 35);
    if (style === 'court') return `<path d="M46 30 Q44 12 60 12 Q77 12 74 30 Q70 20 62 20 Q54 22 50 20 Q47 24 46 30 Z" fill="${c}"/><path d="M52 15 Q60 12 68 15" stroke="${hl}" stroke-width="1.2" fill="none" opacity=".6"/>`;
    // long, tresse, chignon : frange + mèches
    let s = `<path d="M46 32 Q44 11 60 11 Q76 11 74 32 Q71 21 63 19 Q60 25 51 23 Q48 27 46 32 Z" fill="${c}"/>`;
    if (style === 'long') s += `<path d="M46 26 Q44 44 47 56 L44 58 Q40 44 44 26 Z M74 26 Q76 44 73 56 L76 58 Q80 44 76 26 Z" fill="${c}"/>`;
    s += `<path d="M52 14 Q60 11 68 14" stroke="${hl}" stroke-width="1.2" fill="none" opacity=".6"/>`;
    return s;
  }

  // equip: {weapon item, outfit item}, look: {skin, hair, style}
  function render(look, weaponItem, outfitItem, opts = {}) {
    const skin = SKINS[look.skin ?? 0], hair = HAIRS[look.hair ?? 0], style = look.style || 'long';
    const o = outfitItem.outfit;
    const main = o.main, trim = o.trim, dk = shade(main, -40), lt = shade(main, 30), skinDk = shade(skin, -28);
    const uid = 'h' + Math.random().toString(36).slice(2, 7);
    let s = `<svg class="hero-svg" viewBox="0 0 120 170" aria-label="Ton personnage"><defs>
      <linearGradient id="${uid}t" x1="0" x2="1"><stop offset="0" stop-color="${lt}"/><stop offset=".55" stop-color="${main}"/><stop offset="1" stop-color="${dk}"/></linearGradient>
      <linearGradient id="${uid}m" x1="0" x2="1"><stop offset="0" stop-color="#f4f6f8"/><stop offset=".5" stop-color="#aab4bf"/><stop offset="1" stop-color="#5d6773"/></linearGradient>
      <radialGradient id="${uid}s" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="${shade(skin, 12)}"/><stop offset="1" stop-color="${skinDk}"/></radialGradient>
      <pattern id="${uid}c" width="3" height="3" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.1" fill="none" stroke="${shade(main, -60)}" stroke-width=".5"/></pattern>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>`;
    s += `<ellipse cx="60" cy="158" rx="30" ry="5" fill="rgba(0,0,0,.28)"/>`;
    if (o.cape) s += `<path d="M40 54 Q60 46 80 54 L94 150 Q60 160 26 150 Z" fill="${shade(o.cape, -25)}"/><path d="M44 56 Q60 50 76 56 L86 148 Q60 154 34 148 Z" fill="${o.cape}" opacity=".9"/>`;
    s += hairBack(style, hair);
    // jambes
    const legLen = o.robe ? 0 : 1;
    s += `<path d="M47 98 L45 140 L54 140 L58 100 Z" fill="${o.pants}"/><path d="M73 98 L75 140 L66 140 L62 100 Z" fill="${shade(o.pants, -15)}"/>`;
    s += `<path d="M43 136 h12 v12 q0 3 -3 3 h-12 q-2 0 -1 -3 z" fill="${o.boots}"/><path d="M77 136 h-12 v12 q0 3 3 3 h12 q2 0 1 -3 z" fill="${shade(o.boots, -12)}"/>`;
    if (o.plate) s += `<path d="M44 112 h12 l-1 10 h-11 z M76 112 h-12 l1 10 h11 z" fill="url(#${uid}m)" opacity=".9"/>`;
    // bras (derrière le buste)
    s += `<path d="M42 56 Q34 60 33 76 L31 96 L38 97 L41 78 Q44 66 46 62 Z" fill="${shade(main, -20)}"/>`;
    s += `<path d="M78 56 Q86 60 87 76 L89 96 L82 97 L79 78 Q76 66 74 62 Z" fill="${shade(main, -30)}"/>`;
    // cou
    s += `<path d="M55 40 h10 v12 h-10 z" fill="${skinDk}"/>`;
    // buste / tunique
    if (o.robe) s += `<path d="M42 54 Q60 47 78 54 L84 96 L92 142 Q60 150 28 142 L36 96 Z" fill="url(#${uid}t)"/><path d="M60 52 V146" stroke="${trim}" stroke-width="2" opacity=".8"/><path d="M29 141 Q60 149 91 141" stroke="${trim}" stroke-width="2.4" fill="none"/>`;
    else s += `<path d="M42 54 Q60 47 78 54 L82 100 Q60 108 38 100 Z" fill="url(#${uid}t)"/><path d="M38.5 99 Q60 107 81.5 99" stroke="${trim}" stroke-width="2.2" fill="none"/>`;
    if (o.chain) s += `<path d="M42 54 Q60 47 78 54 L82 100 Q60 108 38 100 Z" fill="url(#${uid}c)" opacity=".8"/>`;
    s += `<path d="M53 50 L60 60 L67 50" stroke="${trim}" stroke-width="2" fill="none"/>`;
    if (o.straps) s += `<path d="M44 58 L76 90" stroke="${shade(main, -55)}" stroke-width="4"/><circle cx="60" cy="74" r="2.6" fill="${trim}"/>`;
    if (o.plate) s += `<path d="M46 58 Q60 52 74 58 L72 84 Q60 90 48 84 Z" fill="url(#${uid}m)" opacity=".95"/><path d="M60 56 V88" stroke="${shade('#aab4bf', -50)}" stroke-width="1"/><path d="M50 70 Q60 74 70 70" stroke="${trim}" stroke-width="1.6" fill="none"/>`;
    // ceinture
    s += `<rect x="39" y="86" width="42" height="6" rx="2" fill="#3a2516"/><rect x="56.5" y="85.5" width="7" height="7" rx="1.5" fill="none" stroke="${o.plate ? trim : '#c9a227'}" stroke-width="1.6"/>`;
    // épaulières
    if (o.plate) s += `<ellipse cx="42" cy="58" rx="9" ry="7" fill="url(#${uid}m)"/><ellipse cx="78" cy="58" rx="9" ry="7" fill="url(#${uid}m)"/><path d="M34 60 Q42 64 50 60 M70 60 Q78 64 86 60" stroke="${trim}" stroke-width="1.4" fill="none"/>`;
    else s += `<path d="M36 58 Q42 51 50 54" stroke="${trim}" stroke-width="2" fill="none"/><path d="M84 58 Q78 51 70 54" stroke="${trim}" stroke-width="2" fill="none"/>`;
    // arme + main droite (côté gauche de l'image)
    s += `<g transform="translate(34.5 98)">${weaponSvg(weaponItem.weapon, weaponItem.color, weaponItem.glow)}</g>`;
    s += `<circle cx="34.5" cy="98" r="4.4" fill="url(#${uid}s)"/><circle cx="85.5" cy="98" r="4.2" fill="url(#${uid}s)"/>`;
    // tête
    s += `<ellipse cx="60" cy="30" rx="13.5" ry="15.5" fill="url(#${uid}s)"/>`;
    s += `<ellipse cx="46.5" cy="31" rx="2.2" ry="3.4" fill="${skinDk}"/><ellipse cx="73.5" cy="31" rx="2.2" ry="3.4" fill="${skinDk}"/>`;
    s += `<g class="eyes"><ellipse cx="54.5" cy="31.5" rx="2" ry="2.5" fill="#1f1a2e"/><ellipse cx="65.5" cy="31.5" rx="2" ry="2.5" fill="#1f1a2e"/><circle cx="55.2" cy="30.6" r=".7" fill="#fff"/><circle cx="66.2" cy="30.6" r=".7" fill="#fff"/></g>`;
    s += `<path d="M51.5 26.5 Q54.5 25 57.5 26.4 M62.5 26.4 Q65.5 25 68.5 26.5" stroke="${shade(hair, -10)}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
    s += `<path d="M60 33 Q59 36.5 60.6 37" stroke="${skinDk}" stroke-width=".9" fill="none"/>`;
    s += `<path d="M56.5 40 Q60 42.6 63.5 40" stroke="#9c4a4a" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
    s += `<ellipse cx="51.5" cy="37" rx="2.4" ry="1.4" fill="#f08a8a" opacity=".35"/><ellipse cx="68.5" cy="37" rx="2.4" ry="1.4" fill="#f08a8a" opacity=".35"/>`;
    s += hairFront(style, hair);
    if (o.hood) s += `<path d="M42 34 Q40 6 60 5 Q80 6 78 34 L80 54 Q72 48 74 32 Q72 14 60 14 Q48 14 46 32 Q48 48 40 54 Z" fill="${o.hood}"/><path d="M60 5 Q80 6 78 34" stroke="${shade(o.hood, 30)}" stroke-width="1" fill="none"/>`;
    if (o.crown) s += `<path d="M48 16 L50 6 L55 12 L60 3 L65 12 L70 6 L72 16 Z" fill="#e8b923" stroke="#a37b0b" stroke-width=".8"/><circle cx="60" cy="10" r="1.6" fill="#d62f4b"/>`;
    if (o.robe && !o.crown && !o.hood) s += `<path d="M46 18 Q60 12 74 18" stroke="${trim}" stroke-width="1.6" fill="none"/><circle cx="60" cy="15" r="1.8" fill="${trim}"/>`;
    if (o.ember) s += `<g class="embers" fill="#ffb347">${[0, 1, 2, 3, 4].map((i) => `<circle cx="${30 + i * 15}" cy="150" r="1.3"><animate attributeName="cy" values="150;60" dur="${2.4 + i * 0.5}s" repeatCount="indefinite" begin="${i * 0.4}s"/><animate attributeName="opacity" values="1;0" dur="${2.4 + i * 0.5}s" repeatCount="indefinite" begin="${i * 0.4}s"/></circle>`).join('')}</g>`;
    s += '</svg>';
    return s;
  }

  window.Hero = { render, SKINS, HAIRS, STYLES };
})();
