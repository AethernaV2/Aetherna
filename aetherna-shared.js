// aetherna-shared.js - Funcionalidad común y unificada para Aetherna V2
(function () {
  const $ = id => document.getElementById(id);

  // ===== SPA NAVIGATION & LAYOUT WRAPPER =====
  let mainContent = $('main-content');
  if (!mainContent) {
    const wrapper = document.createElement('div');
    wrapper.id = 'main-content';
    const header = $('navbar'), footer = document.querySelector('footer'), player = $('music-player-capsule');
    let node = header?.nextElementSibling;
    while (node && node !== footer && node !== player) {
      const next = node.nextElementSibling;
      wrapper.appendChild(node);
      node = next;
    }
    header?.insertAdjacentElement('afterend', wrapper);
    mainContent = wrapper;
  }

  // ===== ACTIVE NAV HELPER (CONVERSION A MINÚSCULAS PARA EVITAR FALLOS) =====
  function updateActiveNav(url) {
    const navbar = $('navbar');
    if (!navbar) return;

    const getKey = (u) => {
      if (!u) return 'inicio';
      try {
        const parsed = new URL(u, window.location.origin);
        let path = parsed.pathname.replace(/^\//, '').replace(/\.html$/, '').toLowerCase();
        return path === '' ? 'inicio' : path;
      } catch {
        let path = u.replace(/^\.?\//, '').replace(/\.html$/, '').split('#')[0].toLowerCase();
        return path === '' ? 'inicio' : path;
      }
    };

    const current = getKey(url || window.location.href);

    // Desktop & Mobile links highlighting
    navbar.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('#') || href.includes('discord.gg')) return;
      
      const targetKey = getKey(href);
      const isActive = targetKey === current || (current === 'inicio' && (targetKey === '' || targetKey === 'inicio'));

      if (a.closest('#mobile-menu')) {
        a.classList.toggle('text-aetherna-goldLight', isActive);
        a.classList.toggle('text-aetherna-textSoft', !isActive);
      } else if (a.closest('nav')) {
        a.classList.toggle('text-aetherna-goldLight', isActive);
        a.classList.toggle('font-bold', isActive);
        a.classList.toggle('border-b-2', isActive);
        a.classList.toggle('border-aetherna-goldMain', isActive);
        a.classList.toggle('text-aetherna-textSoft', !isActive);
      }
    });
  }

  async function navigate(url, push = true) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Network error');
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');

      const newMain = doc.getElementById('main-content') ||
        Array.from(doc.querySelectorAll('main, section, [id^="razas"], [id^="clases"], [id^="noticias"], [id^="discord"], [id^="inicio"], [id^="ruta"]'))
          .reduce((frag, el) => { frag.appendChild(el.cloneNode(true)); return frag; }, document.createDocumentFragment());

      const newTitle = doc.querySelector('title');
      if (newTitle) document.title = newTitle.textContent;

      mainContent.style.opacity = '0';
      await new Promise(r => setTimeout(r, 80));
      mainContent.innerHTML = '';
      mainContent.appendChild(newMain);
      mainContent.style.opacity = '1';

      initRevealObservers();
      initStaggerGroups();
      initSearchAndMobile();
      initPageSpecificScripts();

      const cleanUrl = url.replace(/\.html$/, '');
      if (push) history.pushState({ url: cleanUrl }, '', cleanUrl);
      window.scrollTo(0, 0);

      updateActiveNav(cleanUrl);
    } catch (e) {
      console.error('SPA navigate failed:', e);
      window.location.href = url;
    }
  }

  // Interceptar clics de navegación con cierre automático del menú móvil
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.includes('discord.gg') || a.target === '_blank') return;
    
    if (href.startsWith('#')) return;

    e.preventDefault();

    // Cerrar menú móvil al navegar
    const mobileMenu = $('mobile-menu');
    if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
      mobileMenu.classList.add('hidden');
    }

    navigate(href);
  });

  window.addEventListener('popstate', e => { if (e.state?.url) navigate(e.state.url, false); });
  history.replaceState({ url: location.href }, '', location.href);

  // Actualizar nav activo en carga inicial
  updateActiveNav(location.href);

  // ===== REVEAL / STAGGER =====
  function initRevealObservers() {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle('active', entry.isIntersecting));
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
  }
  function initStaggerGroups() {
    document.querySelectorAll('.stagger-group').forEach(group => {
      group.querySelectorAll('.reveal').forEach((item, i) => item.style.transitionDelay = `${i * 55}ms`);
    });
  }

  // ===== SEARCH & MOBILE (CORREGIDO Y ROBUSTO) =====
  function initSearchAndMobile() {
    const sBtn = $('search-btn');
    const sModal = $('search-modal');
    const cSearch = $('close-search');
    const mBtn = $('mobile-menu-btn');
    const mMenu = $('mobile-menu');

    if (sBtn && sModal) {
      const newSBtn = sBtn.cloneNode(true);
      sBtn.replaceWith(newSBtn);
      newSBtn.addEventListener('click', () => sModal.classList.remove('hidden'));
    }
    if (cSearch && sModal) {
      const newCSearch = cSearch.cloneNode(true);
      cSearch.replaceWith(newCSearch);
      newCSearch.addEventListener('click', () => sModal.classList.add('hidden'));
    }
    if (mBtn && mMenu) {
      const newMBtn = mBtn.cloneNode(true);
      mBtn.replaceWith(newMBtn);
      newMBtn.addEventListener('click', () => mMenu.classList.toggle('hidden'));
    }
  }

  // ===== HASH ROUTING (Razas / Clases) =====
  function initPageSpecificScripts() {
    if ($('razaList')) {
      const RAZAS = ["engendro","mecarionte","bestia","abisal","profundos","celestial","trasgoide","enanos","infernal","elfo","humano"];
      function route() {
        const k = location.hash.slice(1), ok = RAZAS.includes(k);
        $('razaList').hidden = ok;
        document.querySelectorAll('.raza-det').forEach(d => d.hidden = !(ok && d.id === 'det-' + k));
        window.scrollTo({ top: 0 }); initRevealObservers();
      }
      window.addEventListener('hashchange', route); route();
    }
    if ($('clsList')) {
      const CLASES = ["barbaro","bardo","luchador","monje","explorador","artificiero","picaro","hechicero","brujo","clerigo","paladin","psionico"];
      function routeCls() {
        const k = location.hash.slice(1), ok = CLASES.includes(k);
        $('clsList').hidden = ok;
        document.querySelectorAll('.clase-det').forEach(d => d.hidden = !(ok && d.id === 'det-' + k));
        window.scrollTo({ top: 0 }); initRevealObservers();
      }
      window.addEventListener('hashchange', routeCls); routeCls();
    }
  }

  initRevealObservers();
  initStaggerGroups();
  initSearchAndMobile();
  initPageSpecificScripts();

  // ===== PERSISTENT AUDIO PLAYER =====
  const audio = $('bg-audio'), cap = $('music-player-capsule');
  if (!audio || !cap) return;

  if (!audio.dataset.initialized) {
    audio.volume = 0.3; audio.loop = false; audio.preload = 'metadata'; audio.dataset.initialized = 'true';
  }

  const TRACKS = [
    { src: 'audio/Epopee Cathedrale - aleyda.mp3', title: 'Epopee Cathedrale', artist: 'Aleyda' },
    { src: 'audio/The Last Stand of the Hero - aleyda.mp3', title: 'The Last Stand of the Hero', artist: 'Aleyda' }
  ];

  const disc = $('player-disc'), playBtn = $('capsule-play-btn'), playIcon = $('capsule-play-icon');
  const muteBtn = $('mp-mute-btn'), skipBtn = $('mp-skip-btn'), iconOn = $('mp-icon-on'), iconOff = $('mp-icon-off');
  const timeEl = $('mp-time'), titleEl = $('mp-title');
  const PLAY = '<path d="M8 5v14l11-7z"/>', PAUSE = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
  const KEY = 'aetherna_player';
  const st = { collapsed: false, muted: false, playing: false, time: 0, track: 0 };

  try { Object.assign(st, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
  if (!(st.track >= 0 && st.track < TRACKS.length)) { st.track = 0; st.time = 0; }

  const save = () => { try { st.time = audio.currentTime || 0; localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  const fmt = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

  function paint() {
    cap.classList.toggle('mp-collapsed', st.collapsed);
    cap.classList.toggle('mp-playing', !audio.paused);
    disc.setAttribute('aria-expanded', String(!st.collapsed));
    playIcon.innerHTML = audio.paused ? PLAY : PAUSE;
    playBtn.setAttribute('aria-label', audio.paused ? 'Reproducir' : 'Pausar');
    iconOn.classList.toggle('hidden', audio.muted);
    iconOff.classList.toggle('hidden', !audio.muted);
    muteBtn.setAttribute('aria-label', audio.muted ? 'Activar sonido' : 'Silenciar');
    titleEl.textContent = TRACKS[st.track].title;
    titleEl.title = TRACKS[st.track].title;
  }

  function loadTrack(i) {
    st.track = (i + TRACKS.length) % TRACKS.length;
    if (audio.src !== TRACKS[st.track].src) { audio.src = TRACKS[st.track].src; timeEl.textContent = '0:00'; }
    paint();
  }

  function skip() { loadTrack(st.track + 1); st.time = 0; audio.play().then(() => { st.playing = true; paint(); save(); }).catch(() => { paint(); save(); }); }

  playBtn.addEventListener('click', () => {
    if (audio.paused) { audio.play().then(() => { st.playing = true; paint(); save(); }).catch(() => {}); }
    else { audio.pause(); st.playing = false; paint(); save(); }
  });
  skipBtn.addEventListener('click', skip);
  muteBtn.addEventListener('click', () => { audio.muted = !audio.muted; st.muted = audio.muted; paint(); save(); });
  disc.addEventListener('click', () => { st.collapsed = !st.collapsed; paint(); save(); });

  audio.addEventListener('play', paint);
  audio.addEventListener('pause', paint);
  audio.addEventListener('ended', skip);

  let lastSave = 0;
  audio.addEventListener('timeupdate', () => {
    timeEl.textContent = fmt(audio.currentTime);
    if (Date.now() - lastSave > 1000) { lastSave = Date.now(); save(); }
  });

  if (!window.__aethernaAudioRestored) {
    window.__aethernaAudioRestored = true;
    audio.muted = !!st.muted;
    const resumeAt = st.time;
    loadTrack(st.track);
    const seek = () => { if (resumeAt > 0 && isFinite(audio.duration) && resumeAt < audio.duration) audio.currentTime = resumeAt; };
    if (audio.readyState >= 1) seek(); else audio.addEventListener('loadedmetadata', seek, { once: true });
    if (st.playing) {
      const attemptPlay = () => audio.play().catch(() => {});
      ['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, attemptPlay, { once: true, passive: true }));
      attemptPlay();
    }
  }
})();

// ===== COSMIC BACKGROUND & EMBER CANVAS =====
(function () {
  function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
  function makeNoise(seed){
    const rnd=mulberry32(seed),N=256,perm=new Uint8Array(N*2),g=new Float32Array(N);
    for(let i=0;i<N;i++){g[i]=rnd();perm[i]=i;}
    for(let i=N-1;i>0;i--){const j=(rnd()*(i+1))|0;const t=perm[i];perm[i]=perm[j];perm[j]=t;}
    for(let i=0;i<N;i++)perm[i+N]=perm[i];
    const f=t=>t*t*t*(t*(t*6-15)+10);
    return (x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,X=xi&255,Y=yi&255;const a=g[perm[perm[X]+Y]],b=g[perm[perm[X+1]+Y]],c=g[perm[perm[X]+Y+1]],d=g[perm[perm[X+1]+Y+1]];const u=f(xf),v=f(yf);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;};
  }
  function fbm(n,x,y,oct){let s=0,a=.5,sum=0;for(let i=0;i<oct;i++){s+=a*n(x,y);sum+=a;a*=.5;const nx=x*1.6-y*1.2+5.3,ny=x*1.2+y*1.6+2.1;x=nx;y=ny;}return s/sum;}
  let _N;
  function buildNebula(w,h,t,out){t=t||0;const N=_N||(_N=[makeNoise(11),makeNoise(29),makeNoise(47)]),n1=N[0],n2=N[1],n3=N[2];out=out||new Uint8ClampedArray(w*h*4);const ox=t*.035,oy=t*.024;const ss=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};const G=(u,v,cx,cy,sx,sy)=>Math.exp(-(((u-cx)/sx)**2+((v-cy)/sy)**2));const asp=w/h;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const u=x/w,v=y/h,px=u*asp,py=v;const wx=fbm(n1,px*1.5+3.1+ox*1.6,py*1.5+1.7-oy*1.2,4),wy=fbm(n1,px*1.5+8.3-ox*1.1,py*1.5+5.2+oy*1.5,4);const qx=px*1.8+wx*1.3+ox,qy=py*1.8+wy*1.3-oy*.6;const c1=fbm(n2,qx,qy,6),c2=fbm(n3,qx*1.1+5.2-ox*.8,qy*1.1+1.3+oy*.7,6);const m1=Math.max(G(u,v,.48,.40,.55,.40),.8*G(u,v,.82,.28,.28,.28),.6*G(u,v,.15,.45,.25,.30));const purple=ss(.30,.72,c1)*(.30+.70*m1);const bright=ss(.55,.82,c1)*m1;const haze=ss(.30,.70,c1)*.5;const gold=Math.min(1,1.45*ss(.30,.66,c2))*ss(.48,.92,v)*(.65+.35*G(u,v,.42,1,.75,.38));const goldB=ss(.55,.85,c2)*gold;const pink=ss(.50,.85,c1)*G(u,v,.58,.84,.22,.15);const dx=u-.5,dy=v-.5,vig=1-.45*Math.min(1,Math.sqrt(dx*dx*1.1+dy*dy*1.4)*1.15);const top=.78+.22*ss(0,.28,v),k=vig*top,i=(y*w+x)*4;const ar=(4+14*haze+92*purple*.95+178*bright*.55)*k, ag=(2+8*haze+30*purple*.95+70*bright*.55)*k, ab=(12+34*haze+140*purple*.95+190*bright*.55)*k;const br=(175*gold*.85+224*goldB*.55+230*pink*.35)*k, bg=(128*gold*.85+176*goldB*.55+140*pink*.35)*k, bb=(62*gold*.85+98*goldB*.55+190*pink*.35)*k;out[i]=ar+br-ar*br/255;out[i+1]=ag+bg-ag*bg/255;out[i+2]=ab+bb-ab*bb/255;out[i+3]=255;}return out;}
  const cv = document.getElementById('cosmos-bg'), sc = document.getElementById('cosmos-stars');
  if (!cv || !sc) return;
  const NW = cv.width, NH = cv.height;
  const nctx = cv.getContext('2d');
  const nbuf = new Uint8ClampedArray(NW * NH * 4), nimg = new ImageData(nbuf, NW, NH);
  function paintNebula(t) { buildNebula(NW, NH, t, nbuf); nctx.putImageData(nimg, 0, 0); }
  try { paintNebula(0); } catch (e) {}
  const ctx = sc.getContext('2d');
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, dpr = 1, stars = [], shoot = null, nextShoot = 0;
  const rnd = mulberry32(2026);
  const TINTS = ['255,255,255', '255,244,224', '226,214,255', '255,222,190'];
  function setup() { dpr = Math.min(window.devicePixelRatio || 1, 2); W = sc.width = Math.round(window.innerWidth * dpr); H = sc.height = Math.round(window.innerHeight * dpr); const n = Math.round((W * H) / (dpr * dpr) / 7500); stars = []; for (let i = 0; i < n; i++) { const big = rnd() < .05, spark = rnd() < .018; stars.push({ x: rnd() * W, y: rnd() * H, r: (big ? 1.1 + rnd() * .8 : .35 + rnd() * .75) * dpr, a: .35 + rnd() * .65, sp: .6 + rnd() * 1.8, ph: rnd() * 6.28, c: TINTS[(rnd() * TINTS.length) | 0], big, spark }); } }
  function draw(t) { ctx.clearRect(0, 0, W, H); for (const s of stars) { const tw = reduce ? 1 : .68 + .32 * Math.sin(t * s.sp + s.ph), a = s.a * tw; ctx.fillStyle = 'rgba(' + s.c + ',' + a.toFixed(3) + ')'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.2832); ctx.fill(); if (s.big) { ctx.fillStyle = 'rgba(' + s.c + ',' + (a * .14).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 3.4, 0, 6.2832); ctx.fill(); } } if (!reduce) { if (!shoot && t > nextShoot) { shoot = { x: W * (.1 + rnd() * .5), y: H * (.05 + rnd() * .3), vx: W * .55, vy: H * .28, life: 0 }; } if (shoot) { shoot.life += 1 / 30; const k = shoot.life / 1.1, px = shoot.x + shoot.vx * shoot.life, py = shoot.y + shoot.vy * shoot.life; if (k >= 1) { shoot = null; nextShoot = t + 10 + rnd() * 14; } else { const g = ctx.createLinearGradient(px - shoot.vx * .22, py - shoot.vy * .22, px, py), al = Math.sin(k * Math.PI); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,244,224,' + (al * .9).toFixed(3) + ')'); ctx.strokeStyle = g; ctx.lineWidth = 1.4 * dpr; ctx.beginPath(); ctx.moveTo(px - shoot.vx * .22, py - shoot.vy * .22); ctx.lineTo(px, py); ctx.stroke(); } } } }
  setup(); draw(0); nextShoot = 6 + rnd() * 6; const speed = reduce ? .35 : 1.4; let lastStars = 0, lastNeb = 0, nebCost = 0, tNeb = 0, prevTs = 0; function loop(ts) { if (!document.hidden) { if (!reduce && ts - lastStars > 66) { lastStars = ts; draw(ts / 1000); } if (ts - lastNeb > Math.max(80, nebCost * 8)) { tNeb += Math.min(.4, (ts - (prevTs || ts)) / 1000) * speed; const t0 = performance.now(); try { paintNebula(tNeb); } catch (e) {} nebCost = performance.now() - t0; lastNeb = ts; prevTs = ts; } } requestAnimationFrame(loop); } requestAnimationFrame(loop); let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { setup(); draw(lastStars / 1000); }, 150); });
})();

// ===== EMBER CANVAS =====
(function () {
  const canvas = document.getElementById('ember-canvas'); if (!canvas) return;
  const ctx = canvas.getContext('2d');
  function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resizeCanvas(); window.addEventListener('resize', resizeCanvas);
  const embers = Array.from({ length: 30 }, () => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, size: Math.random() * 2 + 1, alpha: Math.random(), speedY: Math.random() * 0.4 + 0.2, speedX: (Math.random() - 0.5) * 0.2 }));
  function animateEmbers() { ctx.clearRect(0, 0, canvas.width, canvas.height); embers.forEach(e => { e.y -= e.speedY; e.x += e.speedX + Math.sin(e.y * 0.02) * 0.2; if (e.y < 0) { e.y = canvas.height + 10; e.x = Math.random() * canvas.width; } ctx.beginPath(); ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2); ctx.fillStyle = `rgba(196,160,255, ${0.6 * Math.sin(e.y * 0.01)})`; ctx.shadowBlur = 8; ctx.shadowColor = '#B48CFF'; ctx.fill(); ctx.shadowBlur = 0; }); requestAnimationFrame(animateEmbers); }
  if (document.readyState === 'complete') animateEmbers(); else window.addEventListener('load', animateEmbers, { once: true });
})();
