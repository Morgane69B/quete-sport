// Figurine animée des exercices : squelette 2D en vue de profil, résolu par cinématique inverse.
// Chaque pose : { p:[x,y] hanche, t: angle du buste (0 = droit, + = penché en avant),
//   h:[[x,y],[x,y]] mains, f:[[x,y],[x,y]] pieds, eb:[s,s] sens des coudes, kb:[s,s] sens des genoux, ht: inclinaison tête }
(function () {
  const L = { torso: 24, ua: 12, fa: 12, th: 16, sh: 16, head: 5.6 };
  const rad = (d) => (d * Math.PI) / 180;

  function ik(root, target, a, b, s) {
    let dx = target[0] - root[0], dy = target[1] - root[1];
    let d = Math.hypot(dx, dy);
    const max = a + b - 0.01;
    if (d > max) { dx *= max / d; dy *= max / d; d = max; }
    if (d < 0.5) d = 0.5;
    const phi = Math.atan2(dy, dx);
    const c = Math.min(1, Math.max(-1, (a * a + d * d - b * b) / (2 * a * d)));
    const alpha = Math.acos(c) * s;
    const j = [root[0] + a * Math.cos(phi + alpha), root[1] + a * Math.sin(phi + alpha)];
    const end = [root[0] + dx, root[1] + dy];
    return [j, end];
  }

  function solve(pose) {
    const t = rad(pose.t || 0);
    const u = [Math.sin(t), -Math.cos(t)];
    const p = pose.p;
    const neck = [p[0] + L.torso * u[0], p[1] + L.torso * u[1]];
    const sh = [neck[0] - 2.2 * u[0], neck[1] - 2.2 * u[1]];
    const ht = t + rad(pose.ht || 0);
    const head = [neck[0] + 6.4 * Math.sin(ht), neck[1] - 6.4 * Math.cos(ht)];
    const eb = pose.eb || [1, 1], kb = pose.kb || [-1, -1];
    const h = pose.h, f = pose.f;
    const a1 = ik(sh, h[0], L.ua, L.fa, eb[0]);
    const a2 = ik(sh, h[1], L.ua, L.fa, eb[1]);
    const l1 = ik(p, f[0], L.th, L.sh, kb[0]);
    const l2 = ik(p, f[1], L.th, L.sh, kb[1]);
    return { p, neck, sh, head, e1: a1[0], w1: a1[1], e2: a2[0], w2: a2[1], k1: l1[0], a1: l1[1], k2: l2[0], a2: l2[1] };
  }

  const r1 = (n) => Math.round(n * 10) / 10;

  // Éléments dessinés : fonction(squelette) -> attributs
  function elements(eq) {
    const els = [];
    const seg = (a, b, w, cls) => ({ tag: 'line', cls, w, f: (s) => ({ x1: s[a][0], y1: s[a][1], x2: s[b][0], y2: s[b][1] }) });
    // membres arrière (plus foncés)
    els.push(seg('p', 'k2', 7.4, 'fb'), seg('k2', 'a2', 6.4, 'fb'));
    els.push({ tag: 'line', cls: 'fb', w: 4, f: (s) => foot(s.k2, s.a2) });
    els.push(seg('sh', 'e2', 6, 'fb'), seg('e2', 'w2', 5.2, 'fb'));
    if (eq.includes('db')) els.push(...dumbbell('w2', 'eqb'));
    // buste
    els.push(seg('p', 'neck', 10.5, 'ff'));
    els.push({ tag: 'circle', cls: 'ff', f: (s) => ({ cx: s.head[0], cy: s.head[1], r: L.head }) });
    // membres avant
    els.push(seg('p', 'k1', 7.6, 'ff'), seg('k1', 'a1', 6.6, 'ff'));
    els.push({ tag: 'line', cls: 'ff', w: 4.2, f: (s) => foot(s.k1, s.a1) });
    els.push(seg('sh', 'e1', 6.2, 'ff'), seg('e1', 'w1', 5.4, 'ff'));
    if (eq.includes('db')) els.push(...dumbbell('w1', 'eq'));
    if (eq.includes('dbHip')) els.push(...dumbbell('p', 'eq', -5));
    return els;
  }

  function foot(k, a) {
    // pied perpendiculaire au tibia, orienté vers l'avant
    const dx = a[0] - k[0], dy = a[1] - k[1];
    const n = Math.hypot(dx, dy) || 1;
    let px = -dy / n, py = dx / n;
    if (px < 0) { px = -px; py = -py; }
    return { x1: a[0], y1: a[1], x2: a[0] + px * 5, y2: a[1] + py * 5 };
  }

  function dumbbell(j, cls, oy = 0) {
    return [
      { tag: 'line', cls: cls + ' h', w: 2, f: (s) => ({ x1: s[j][0] - 5, y1: s[j][1] + oy, x2: s[j][0] + 5, y2: s[j][1] + oy }) },
      { tag: 'rect', cls, f: (s) => ({ x: s[j][0] - 7, y: s[j][1] + oy - 3.2, width: 3, height: 6.4 }) },
      { tag: 'rect', cls, f: (s) => ({ x: s[j][0] + 4, y: s[j][1] + oy - 3.2, width: 3, height: 6.4 }) },
    ];
  }

  function scenery(eq, ex) {
    let s = '';
    if (eq.includes('bar')) s += '<line class="eq h" x1="12" y1="11" x2="88" y2="11" stroke-width="2.6"/><line class="eqb h" x1="14" y1="11" x2="14" y2="4" stroke-width="2"/><line class="eqb h" x1="86" y1="11" x2="86" y2="4" stroke-width="2"/>';
    if (eq.includes('chair')) s += '<path class="eqb h" fill="none" stroke-width="2.4" d="M22 92 V66 M40 92 V66 M18 64 H42 M22 64 V36" />';
    if (eq.includes('wall')) s += '<rect class="eqb" x="20" y="10" width="6" height="82" opacity=".55"/>';
    if (eq.includes('mat')) s += '<rect class="mat" x="10" y="91.5" width="80" height="2.5" rx="1.2"/>';
    return s;
  }

  function attrStr(o) { return Object.entries(o).map(([k, v]) => `${k}="${typeof v === 'number' ? r1(v) : v}"`).join(' '); }

  function render(ex, animate) {
    const frames = ex.poses.map(solve);
    const eq = ex.eq || [];
    const dur = ex.dur || 2.6;
    let body = '';
    for (const el of elements(eq)) {
      const vals = frames.map(el.f);
      const base = vals[0];
      const style = el.tag === 'line' ? ` stroke-width="${el.w}"` : '';
      let anim = '';
      if (animate && frames.length > 1) {
        for (const k of Object.keys(base)) {
          const seq = vals.map((v) => r1(v[k]));
          if (seq.every((v) => v === seq[0])) continue;
          seq.push(seq[0]);
          const n = seq.length - 1;
          const kt = seq.map((_, i) => r1(i / n).toString()).join(';');
          const ks = Array(n).fill('.45 0 .55 1').join(';');
          anim += `<animate attributeName="${k}" values="${seq.join(';')}" keyTimes="${kt}" dur="${dur}s" repeatCount="indefinite" calcMode="spline" keySplines="${ks}"/>`;
        }
      }
      body += `<${el.tag} class="${el.cls}"${style} ${attrStr(base)}>${anim}</${el.tag}>`;
    }
    return `<svg class="fig" viewBox="0 0 100 100" aria-hidden="true"><ellipse class="shadow" cx="50" cy="93" rx="34" ry="2.6"/>${scenery(eq, ex)}${body}</svg>`;
  }

  window.Figure = { render, solve };
})();
