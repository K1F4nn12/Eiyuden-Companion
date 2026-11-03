/* Eiyuden Companion v2.0 — app logic */
const $ = s => document.querySelector(s);
const view = $('#view');
const store = {
  get(k,d){ try{ const v=localStorage.getItem('eiyu_'+k); return v?JSON.parse(v):d; }catch(e){ return d; } },
  set(k,v){ try{ localStorage.setItem('eiyu_'+k,JSON.stringify(v)); }catch(e){} }
};

// ---------- LANGUAGE ----------
let LANG = store.get('lang', 'id');
function T(){ return STRINGS[LANG] || STRINGS.id; }
function setLang(l){
  LANG = l; store.set('lang', l);
  document.querySelectorAll('.lang-btn').forEach(b=>b.classList.toggle('active', b.dataset.lang===l));
  const tab = document.querySelector('.tabbar button.active');
  render(tab ? tab.dataset.tab : 'home');
  const sub = document.querySelector('.app-header p');
  if(sub) sub.textContent = T().app_subtitle;
  updateTabLabels();
}
function updateTabLabels(){
  const t = T();
  const map = {home:t.tab_home, walk:t.tab_walkthrough, chars:t.tab_heroes,
    enemies:t.tab_enemies,
    minigames:t.tab_minigames, facilities:t.tab_facilities, misc:t.tab_misc,
    dlc:t.tab_dlc, rising:t.tab_rising};
  document.querySelectorAll('.tabbar button').forEach(b=>{
    if(map[b.dataset.tab]) b.title = map[b.dataset.tab];
  });
}

// ---------- TABS ----------
let navStack = [];
function pushNav(backFn){ navStack.push({fn: backFn, scroll: window.scrollY}); }
function goBack(){
  if(navStack.length){
    const {fn, scroll} = navStack.pop();
    try{
      // If fn is a showHeroDetail/showEnemyDetail/etc call, mark as fromBack
      // We wrap it to pass fromBack=true
      fn(true);
    }catch(e){
      try{ fn(); }catch(e2){}
    }
    requestAnimationFrame(()=>{
      if(window.scrollY === 0 && typeof scroll === 'number' && scroll > 0){
        window.scrollTo(0, scroll);
      }
    });
  }
}
function setupBackButton(){
  try{
    const Cap = window.Capacitor;
    const App = Cap && Cap.Plugins && Cap.Plugins.App;
    if(App && App.addListener){
      App.addListener('backButton', ()=>{
        // Close lightbox first if open
        const lb = document.getElementById('lightbox');
        if(lb && lb.style.display === 'flex'){
          lb.style.display = 'none';
          return;
        }
        if(navStack.length){ goBack(); }
        else { App.exitApp(); }
      });
    }
  }catch(e){}
}
document.querySelectorAll('.tabbar button').forEach(b=>{
  b.addEventListener('click',()=>{
    document.querySelectorAll('.tabbar button').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    navStack = [];
    if(typeof stopCarousel==='function') stopCarousel();
    render(b.dataset.tab);
  });
});
// Back-to-top button visibility
window.addEventListener('scroll', ()=>{
  const btn = document.getElementById('toTop');
  if(btn) btn.classList.toggle('show', window.scrollY > 600);
}, {passive:true});

function render(tab){
  if(tab==='home') return renderHome();
  if(tab==='walk') return renderWalk();
  if(tab==='chars') return renderChars();
  if(tab==='enemies') return renderEnemies();
  if(tab==='minigames') return renderMinigames();
  if(tab==='facilities') return renderFacilities();
  if(tab==='misc') return renderMisc();
  if(tab==='dlc') return renderDLC();
  if(tab==='rising') return renderRising();
}

function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function L(id,en){ return LANG==='en' ? (en||id) : id; }

// Distribute images evenly among text blocks (interleaved like the web, not stacked)
function interleaveImages(blocks, images, imgFn){
  if(!images || !images.length) return blocks.map(b=>b.html).join('');
  const n = blocks.length, m = images.length;
  let out = '';
  let imgIdx = 0;
  for(let i=0;i<n;i++){
    out += blocks[i].html;
    // Place image after this block if we've passed its slot
    while(imgIdx < m && (imgIdx+1)*(n+1)/(m+1) <= i+1){
      out += imgFn(images[imgIdx], imgIdx);
      imgIdx++;
    }
  }
  // Any remaining images at the end
  while(imgIdx < m){ out += imgFn(images[imgIdx], imgIdx); imgIdx++; }
  return out;
}
function bannerImg(src){
  return `<img src="${esc(src)}" class="detail-banner" alt="" loading="lazy" onclick="openLightbox('${esc(src)}')" onerror="this.style.display='none'">`;
}
// Image lightbox with pinch-to-zoom (tap to open/close, pinch to zoom)
let lbScale = 1, lbLastDist = 0;
function openLightbox(src){
  let lb = document.getElementById('lightbox');
  if(!lb){
    lb = document.createElement('div');
    lb.id = 'lightbox';
    lb.innerHTML = `<img id="lightboxImg" alt="">`;
    document.body.appendChild(lb);
    const img = lb.querySelector('img');
    // Tap to close (single tap)
    let tapTimer = null;
    lb.addEventListener('click', (e)=>{
      if(e.target === img && lbScale > 1){ lbScale = 1; img.style.transform = 'scale(1)'; return; }
      lb.style.display='none'; lbScale = 1; img.style.transform = 'scale(1)';
    });
    // Pinch to zoom
    lb.addEventListener('touchstart', (e)=>{
      if(e.touches.length === 2){
        lbLastDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      }
    }, {passive:true});
    lb.addEventListener('touchmove', (e)=>{
      if(e.touches.length === 2){
        e.preventDefault();
        const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        if(lbLastDist > 0){
          lbScale = Math.min(4, Math.max(1, lbScale * (dist / lbLastDist)));
          img.style.transform = `scale(${lbScale})`;
        }
        lbLastDist = dist;
      }
    }, {passive:false});
    lb.addEventListener('touchend', ()=>{ lbLastDist = 0; });
  }
  const img = document.getElementById('lightboxImg');
  img.src = src;
  lbScale = 1; img.style.transform = 'scale(1)';
  lb.style.display = 'flex';
}
// Find enemy location/enemy indices by name (handles "/Enemy" suffix variants)
function findEnemyIdx(name){
  if(typeof ENEMIES==='undefined') return null;
  const nl = String(name).toLowerCase();
  const variants = [nl, nl + '/enemy', nl.replace('/enemy','')];
  for(let li=0; li<ENEMIES.length; li++){
    const loc = ENEMIES[li];
    for(let ei=0; ei<(loc.enemies||[]).length; ei++){
      const en = loc.enemies[ei].name.toLowerCase();
      if(variants.includes(en)) return {li, ei};
    }
  }
  return null;
}
// Parse boss names from walkthrough chapter section headings
function getBossNames(ch){
  const bosses = new Set();
  (ch.sections||[]).forEach(s=>{
    const h = s.heading||'';
    const m = h.match(/boss\s+(?:fight|battle)\s*:\s*(.+)/i);
    if(m){
      m[1].split(/,|\band\b/).forEach(n=>{
        n=n.trim();
        if(n) bosses.add(n.toLowerCase());
      });
    }
  });
  return bosses;
}

/* ---------- BERANDA / HOME ---------- */
function renderHome(){
  const t = T();
  const got = store.get('heroes',[]);
  const pct = Math.round(got.length/120*100);

  view.innerHTML = `
  <div class="card center">
    <div style="font-size:48px">🏰</div>
    <h2>Eiyuden Chronicle:<br>Hundred Heroes</h2>
    <p>${L(
      'Suksesor spiritual Suikoden dari Rabbit & Bear Studios. Rekrut <b>120 hero</b>, bangun markas, menangkan perang Allraan melawan Kekaisaran Galdea.',
      'The spiritual successor to Suikoden from Rabbit & Bear Studios. Recruit <b>120 heroes</b>, build your HQ, and win the war of Allraan against the Galdean Empire.'
    )}</p>
    <div style="margin-top:10px">
      <span class="badge">🎮 JRPG</span><span class="badge">⚔️ 6+1 Party</span><span class="badge">🏰 HQ</span><span class="badge">🃏 Mini-Games</span>
    </div>
  </div>
  <div class="card">
    <h2>📊 ${L('Progres Rekrutmenmu','Your Recruitment Progress')}</h2>
    <div class="progress"><i style="width:${pct}%"></i></div>
    <p class="center"><b>${got.length}/120</b> hero (${pct}%)</p>
    <p class="small center">${L('Centang hero yang sudah direkrut di tab Karakter — tersimpan otomatis.','Check off recruited heroes in the Characters tab — saved automatically.')}</p>
    <p class="small center mt">${t.content_ver}: <b>v${DATA_VERSION}</b> • ${otaStatus}</p>
    <div class="center"><button class="btn ghost" onclick="manualOTA()">${t.ota_check}</button></div>
  </div>
  <div class="card">
    <h2>${t.missable_warn} ${L('Jangan Kelewatan!','Don\'t Miss These!')}</h2>
    <p><span class="badge warn">MISSABLE</span> <b>Aleior</b> — ${L('kerjakan quest-nya segera setelah Marisa bergabung, sebelum ia pindah ruangan.','do their quest right after Marisa joins, before she changes rooms.')}</p>
    <p class="mt"><span class="badge warn">MISSABLE</span> <b>Leene</b> — ${L('butuh 119 hero lain sebelum mengalahkan Dux Aldric.','requires the other 119 heroes before defeating Dux Aldric.')}</p>
    <p class="mt"><span class="badge ok">${L('TITIK AMAN','SAFE POINT')}</span> ${L('Setelah <b>Yulin</b> bergabung, rekrut semua yang tersisa sebelum lanjut cerita.','After <b>Yulin</b> joins, recruit everyone remaining before advancing the story.')}</p>
  </div>
  <div class="card" style="padding:0;overflow:hidden">
    <div id="homeCarousel" style="position:relative">
      <img id="carouselImg" src="img/bg/bg-elektra.png" alt="Showcase" style="width:100%;height:220px;object-fit:cover;object-position:top;display:block">
      <div style="position:absolute;bottom:8px;left:0;right:0;text-align:center">
        <span class="cdot active" data-i="0"></span><span class="cdot" data-i="1"></span><span class="cdot" data-i="2"></span><span class="cdot" data-i="3"></span>
      </div>
    </div>
  </div>`;
  startCarousel();
}

/* ---------- HOME CAROUSEL ---------- */
const CAROUSEL_IMGS = ['img/bg/bg-elektra.png','img/bg/bg-francesca.png','img/bg/bg-hildi.png','img/bg/bg-lilwn.png'];
let carouselIdx = 0, carouselTimer = null;
function startCarousel(){
  stopCarousel();
  carouselTimer = setInterval(()=>{
    carouselIdx = (carouselIdx + 1) % CAROUSEL_IMGS.length;
    const img = document.getElementById('carouselImg');
    if(img) img.src = CAROUSEL_IMGS[carouselIdx];
    document.querySelectorAll('.cdot').forEach((d,i)=>d.classList.toggle('active', i===carouselIdx));
  }, 4000);
}
function stopCarousel(){ if(carouselTimer){ clearInterval(carouselTimer); carouselTimer = null; } }

/* ---------- WALKTHROUGH ---------- */
function renderWalk(){
  const t = T();
  view.innerHTML = `
  <div class="card">
    <h2>🗺️ ${t.walkthrough_title}</h2>
    <p class="small">${t.walkthrough_sub} — ${WALKTHROUGH.length} ${t.chapters}</p>
  </div>
  <div class="item-list">
  ${WALKTHROUGH.map(c=>`
    <div class="item-row" onclick="showWalkDetail(${c.n})">
      <span class="chn">${c.n}</span>
      <span class="item-name">${esc(c.title)}</span>
      <span class="item-arrow">›</span>
    </div>`).join('')}
  </div>`;
}
function showWalkDetail(n){
  const t = T();
  const c = WALKTHROUGH.find(x=>x.n===n);
  if(!c) return;
  pushNav(renderWalk);
  const bosses = getBossNames(c);
  // Map + monsters box at top (clickable chips)
  let mapHtml = '';
  if(c.map || (c.monsters && c.monsters.length)){
    let monHtml = '';
    if(c.monsters && c.monsters.length){
      monHtml = `<div class="partner-grid">` + c.monsters.map(mn=>{
        let icon = 'img/enemies/placeholder.png';
        const idx = findEnemyIdx(mn);
        if(idx && typeof ENEMIES!=='undefined') icon = ENEMIES[idx.li].enemies[idx.ei].icon || icon;
        const isBoss = bosses.has(String(mn).toLowerCase());
        const bossBadge = isBoss ? `<span class="badge warn mini">BOSS</span>` : '';
        const click = idx ? `onclick="showEnemyDetail(${idx.li},${idx.ei},()=>showWalkDetail(${n}))"` : '';
        const cls = (idx ? 'partner-chip' : 'partner-chip noimg') + (isBoss ? ' boss' : '');
        return `<div class="${cls}" ${click}><img src="${esc(icon)}" alt="${esc(mn)}" loading="lazy" onerror="this.src='img/enemies/placeholder.png'"><span>${isBoss?'👑 ':''}${esc(mn)}${bossBadge}</span></div>`;
      }).join('') + `</div>`;
    }
    mapHtml = `<div class="card"><h2>🗺️ ${L('Lokasi','Location')}</h2>` +
      (c.map ? `<p><b>📍 ${esc(c.map)}</b></p>` : '') +
      (monHtml ? `<h3 class="mt">👹 ${L('Monster','Monsters')}</h3>${monHtml}` : '') + `</div>`;
  }
  // Full sections with images interleaved among steps (like the web)
  let secHtml = '';
  if(c.sections && c.sections.length){
    secHtml = c.sections.map(s=>{
      const steps = s.steps || [];
      const blocks = steps.map(st=>({html:`<li>${esc(st)}</li>`}));
      const bodyHtml = interleaveImages(blocks, s.images||[], src=>bannerImg(src));
      return `<div class="card"><h3>${esc(s.heading||'')}</h3>` +
        (steps.length ? `<ol>${bodyHtml}</ol>` : (s.images||[]).map(bannerImg).join('')) + `</div>`;
    }).join('');
  }
  view.innerHTML = `
  <div class="card">
    <button class="btn ghost" onclick="goBack()">← ${t.walkthrough_title}</button>
  </div>
  <div class="card">
    <h2><span class="chn">${c.n}</span> ${esc(c.title)}</h2>
  </div>
  ${mapHtml}${secHtml}`;
  window.scrollTo(0,0);
}

/* ---------- KARAKTER ---------- */
let heroQuery = '';
function renderChars(){
  const t = T();
  view.innerHTML = `
  <div class="card sticky-search">
    <h2>👥 ${t.heroes_title}</h2>
    <input id="heroSearch" class="search" placeholder="${t.search_hero}" value="${esc(heroQuery)}">
    <p class="small">${t.heroes_sub}</p>
  </div>
  <div id="heroGrid" class="hero-grid"></div>`;
  $('#heroSearch').addEventListener('input', e=>{ heroQuery = e.target.value; drawHeroes(); });
  drawHeroes();
}
function drawHeroes(){
  const t = T();
  const got = store.get('heroes',[]);
  const q = heroQuery.toLowerCase();
  const list = HEROES.filter(h => !q || h.name.toLowerCase().includes(q) || String(h.star)===q);
  const grid = $('#heroGrid');
  if(!list.length){ grid.innerHTML = `<p class="center">${t.no_result}</p>`; return; }
  grid.innerHTML = list.map(h=>{
    const checked = got.includes(h.star) ? 'checked' : '';
    const miss = /Aleior|Leene/.test(h.name) ? '<span class="badge warn mini">MISSABLE</span>' : '';
    return `<div class="hero-card ${checked?'done':''}" data-star="${h.star}" onclick="showHeroDetail(${h.star})">
      <img src="${h.img}" alt="${esc(h.name)}" loading="lazy" onerror="this.src='img/heroes/placeholder.png'">
      <div class="hero-info">
        <div class="hero-name"><span class="star">#${h.star}</span> ${esc(h.name)} ${miss}</div>
        <div class="hero-recruit">${esc(L(h.recruit_id, h.recruit_en))}</div>
      </div>
      <label class="hero-check" onclick="event.stopPropagation()"><input type="checkbox" ${checked} onchange="toggleHero(${h.star})"></label>
    </div>`;
  }).join('');
}
function toggleHero(star){
  let got = store.get('heroes',[]);
  got = got.includes(star) ? got.filter(s=>s!==star) : [...got, star];
  store.set('heroes', got);
  drawHeroes();
}
// Parse space-separated partner names, matching multi-word hero names greedily
function parsePartners(str){
  if(!str) return [];
  const names = HEROES.map(h=>h.name).sort((a,b)=>b.length-a.length);
  const out = [];
  let s = str.trim();
  let guard = 0;
  while(s && guard++ < 20){
    let matched = false;
    for(const n of names){
      if(s === n || s.startsWith(n + ' ')){
        out.push(n);
        s = s.slice(n.length).trim();
        matched = true;
        break;
      }
    }
    if(!matched){
      const w = s.split(' ')[0];
      out.push(w);
      s = s.slice(w.length).trim();
    }
  }
  return out;
}
function heroByName(name){
  return HEROES.find(h=>h.name === name);
}
// Tappable partner icon chips for hero combos (backFn = where back should return)
function partnerChips(partnersStr, backFnSrc){
  const names = parsePartners(partnersStr);
  if(!names.length) return '';
  return `<div class="partner-grid">` + names.map(n=>{
    const h = heroByName(n);
    if(h){
      const bf = backFnSrc ? `,${backFnSrc}` : '';
      return `<div class="partner-chip" onclick="event.stopPropagation();showHeroDetail(${h.star}${bf})"><img src="${h.img}" alt="${esc(n)}" loading="lazy" onerror="this.src='img/heroes/placeholder.png'"><span>${esc(n)}</span></div>`;
    }
    return `<div class="partner-chip noimg"><span>${esc(n)}</span></div>`;
  }).join('') + `</div>`;
}
function showHeroDetail(star, backFn, fromBack){
  const t = T();
  const h = HEROES.find(x=>x.star===star);
  if(!h) return;
  if(!fromBack) pushNav(backFn || renderChars);
  const miss = /Aleior|Leene/.test(h.name) ? `<p><span class="badge warn">MISSABLE</span></p>` : '';
  const desc = L(h.desc_id, h.desc_en);
  const gp = h.gameplay || {};

  // Recruitment box
  let recHtml = '';
  if(gp.recruitment){
    const parts = gp.recruitment.split(' | ');
    const loc = parts.length > 1 ? parts[1] : '';
    const det = parts.length > 2 ? parts.slice(2).join(' | ') : gp.recruitment;
    recHtml = `<div class="card"><h2>🤝 ${t.how_to_recruit}</h2>
      <table class="wiki-table">
        <tr><th>${L('Lokasi','Location')}</th><td>${esc(loc)}</td></tr>
        <tr><th>${L('Detail','Details')}</th><td>${esc(det)}</td></tr>
      </table></div>`;
  }

  // Weapon tiers - vertical compact
  let wpnHtml = '';
  if(gp.weapon_tiers && gp.weapon_tiers.length){
    wpnHtml = `<div class="card"><h2>⚔️ ${L('Senjata','Weapon')}</h2>` +
      gp.weapon_tiers.map(tier=>{
        const n = tier.levels.length;
        const lvRange = n ? `${tier.levels[0]}–${tier.levels[n-1]}` : '';
        const atkRange = tier.atk.length ? `${tier.atk[0]}→${tier.atk[tier.atk.length-1]}` : '';
        // Vertical: each level as a row
        const rows = tier.levels.map((lv, i)=>`<tr><th>Lv ${esc(lv)}</th><td>ATK <b>${esc(tier.atk[i]||'')}</b></td><td>${esc(tier.cost[i]||'')}</td></tr>`).join('');
        return `<h3 class="mt">${esc(tier.name)} <span class="small">(${lvRange})</span></h3>
        <table class="wiki-table compact">${rows}</table>
        <p class="small">ATK ${atkRange}</p>`;
      }).join('') + `</div>`;
  } else if(gp.weapon){
    wpnHtml = `<div class="card"><h2>⚔️ ${L('Senjata','Weapon')}</h2><p>${esc(gp.weapon)}</p></div>`;
  }

  // Elemental grid
  let elemHtml = '';
  if(gp.elemental){
    const order = ['fire','water','wind','earth','light','dark','plain'];
    const labels = {fire:'Api',water:'Air',wind:'Angin',earth:'Tanah',light:'Cahaya',dark:'Gelap',plain:'Polos'};
    elemHtml = `<div class="card"><h2>🔥 ${L('Kompatibilitas Elemen','Elemental Compatibility')}</h2>
      <div class="elem-grid">` +
      order.map(k=>{
        const v = gp.elemental[k];
        if(v === undefined) return '';
        return `<div class="elem-cell"><img src="img/elem/elem-${k}.png" alt="${k}" onerror="this.style.display='none'"><span>${labels[k]}</span><b>${esc(v)}</b></div>`;
      }).join('') + `</div></div>`;
  }

  // Unit compat table
  let unitHtml = '';
  if(gp.unit_compat && gp.unit_compat.length){
    unitHtml = `<div class="card"><h2>👥 ${L('Kompatibilitas Unit','Unit Compatibility')}</h2>
      <table class="wiki-table"><tr><th>${L('Karakter','Character')}</th><th>${L('Kecocokan','Compatibility')}</th></tr>` +
      gp.unit_compat.map(u=>`<tr><td>${esc(u.char)}</td><td>${esc(u.rating)}</td></tr>`).join('') + `</table></div>`;
  }

  // Rune lens table
  let rlHtml = '';
  if(gp.runelens && gp.runelens.length){
    rlHtml = `<div class="card"><h2>💎 ${L('Rune Lens','Rune-Lens')}</h2>
      <table class="wiki-table"><tr><th>Lv</th><th>Slot</th><th>${L('Detail','Details')}</th></tr>` +
      gp.runelens.map(s=>`<tr><td>${esc(s.lv)}</td><td>${esc(s.slot)}</td><td>${esc(s.detail)}</td></tr>`).join('') + `</table></div>`;
  }

  // Combos table
  let comboHtml = '';
  if(gp.combos && gp.combos.length){
    comboHtml = `<div class="card"><h2>💥 ${L('Hero Combo','Hero Combos')}</h2>
      <table class="wiki-table"><tr><th>${L('Nama','Name')}</th><th>${L('Partner','Partners')}</th><th>${L('Deskripsi','Description')}</th></tr>` +
      gp.combos.map(c=>`<tr><td><b>${esc(c.name)}</b></td><td>${partnerChips(c.partners, '()=>showHeroDetail('+star+')')}</td><td>${esc(c.desc)}</td></tr>`).join('') + `</table></div>`;
  }

  view.innerHTML = `
  <div class="card">
    <button class="btn ghost" onclick="goBack()">← ${t.tab_heroes}</button>
  </div>
  <div class="card center">
    ${(h.portrait ? `<img src="${h.portrait}" alt="${esc(h.name)}" class="detail-artwork" style="cursor:zoom-in" onclick="openLightbox('${esc(h.portrait)}')" onerror="this.style.display='none';this.nextElementSibling.style.display=''">` : '')}
    <img src="${h.img}" alt="${esc(h.name)}" class="detail-icon"${h.portrait ? ` style="display:none"` : ''} onerror="this.src='img/heroes/placeholder.png'">
    <h2><span class="star">#${h.star}</span> ${esc(h.name)}</h2>
    ${miss}
    ${desc ? `<p>${esc(desc)}</p>` : ''}
  </div>
  ${recHtml}${wpnHtml}${elemHtml}${unitHtml}${rlHtml}${comboHtml}`;
  window.scrollTo(0,0);
}

/* ---------- ENEMIES ---------- */
let enemyQuery = '';
function renderEnemies(){
  const t = T();
  const locs = (typeof ENEMIES !== 'undefined') ? ENEMIES : [];
  let html = `<div class="card sticky-search"><h2>👹 ${L('List of Monsters','List of Monsters')}</h2>
    <input id="enemySearch" class="search" placeholder="${L('Cari monster...','Search monsters...')}" value="${esc(enemyQuery)}">
    <p class="small">${L('Ketuk monster untuk detail.','Tap a monster for details.')}</p></div>
    <div id="enemyList"></div>`;
  view.innerHTML = html;
  $('#enemySearch').addEventListener('input', e=>{ enemyQuery = e.target.value; drawEnemies(); });
  drawEnemies();
  window.scrollTo(0,0);
}
function drawEnemies(){
  const locs = (typeof ENEMIES !== 'undefined') ? ENEMIES : [];
  const q = enemyQuery.toLowerCase().trim();
  const el = $('#enemyList');
  if(!el) return;
  if(q){
    // Search mode: flat list of matching enemies across all locations
    let html = '';
    locs.forEach((loc, li)=>{
      (loc.enemies||[]).forEach((e, ei)=>{
        if(e.name.toLowerCase().includes(q)){
          html += `<div class="enemy-chip" onclick="showEnemyDetail(${li},${ei})" style="margin-bottom:8px">
            <img src="${esc(e.icon||'img/enemies/placeholder.png')}" alt="${esc(e.name)}" onerror="this.src='img/enemies/placeholder.png'">
            <span>${esc(e.name)}</span>
            <span class="small">${esc(loc.region)}</span>
          </div>`;
        }
      });
    });
    el.innerHTML = html ? `<div class="card"><div class="enemy-grid">${html}</div></div>` : `<div class="card"><p class="center">${T().no_result}</p></div>`;
    return;
  }
  // Normal mode: grouped by map like the web (region → map → monsters)
  let html = '';
  locs.forEach((loc, li)=>{
    html += `<div class="card"><div style="margin-bottom:8px"><span>📍 <b>${esc(loc.region)}</b></span></div>`;
    // Group enemies by their map (locations[0])
    const byMap = {};
    const mapOrder = loc.maps || [];
    (loc.enemies||[]).forEach((e, ei)=>{
      const m = (e.locations && e.locations[0]) || '-';
      if(!byMap[m]) byMap[m] = [];
      byMap[m].push({e, ei});
    });
    // Show in map order
    mapOrder.forEach(mapName=>{
      const list = byMap[mapName];
      if(!list || !list.length) return;
      html += `<div style="margin:12px 0 6px"><b>🗺️ ${esc(mapName)}</b></div><div class="enemy-grid">` +
        list.map(({e, ei})=>`
          <div class="enemy-chip" onclick="showEnemyDetail(${li},${ei})">
            <img src="${esc(e.icon||'img/enemies/placeholder.png')}" alt="${esc(e.name)}" loading="lazy" onerror="this.src='img/enemies/placeholder.png'">
            <span>${esc(e.name)}</span>
          </div>`).join('') + `</div>`;
    });
    // Any leftovers not in mapOrder
    Object.keys(byMap).forEach(mapName=>{
      if(mapOrder.includes(mapName)) return;
      html += `<div style="margin:12px 0 6px"><b>🗺️ ${esc(mapName)}</b></div><div class="enemy-grid">` +
        byMap[mapName].map(({e, ei})=>`
          <div class="enemy-chip" onclick="showEnemyDetail(${li},${ei})">
            <img src="${esc(e.icon||'img/enemies/placeholder.png')}" alt="${esc(e.name)}" loading="lazy" onerror="this.src='img/enemies/placeholder.png'">
            <span>${esc(e.name)}</span>
          </div>`).join('') + `</div>`;
    });
    html += `</div>`;
  });
  el.innerHTML = html;
}
function findEnemy(li, ei){
  const locs = (typeof ENEMIES !== 'undefined') ? ENEMIES : [];
  return (locs[li] && locs[li].enemies && locs[li].enemies[ei]) || null;
}
function showEnemyDetail(li, ei, backFn, fromBack){
  const t = T();
  const e = findEnemy(li, ei);
  if(!e) return;
  if(!fromBack) pushNav(backFn || renderEnemies);
  const pg = e.page || {};  // scraped wiki data (Task 2)

  // Artwork (large) or fallback to icon
  const artSrc = pg.artwork ? pg.artwork.replace('https://eiyuden.wiki.gg','') : null;
  // Use local artwork if downloaded, else icon
  const artLocal = e.artwork_local || null;

  // Basic info table
  let infoHtml = '';
  const infoRows = [];
  if(pg.details){
    const d = pg.details;
    if(d.Level) infoRows.push(`<tr><th>Level</th><td>${esc(d.Level)}</td></tr>`);
    if(d.Armor) infoRows.push(`<tr><th>Armor</th><td>${esc(d.Armor)}</td></tr>`);
    if(d.Baqua) infoRows.push(`<tr><th>Baqua</th><td>${esc(d.Baqua)}</td></tr>`);
    if(d.Items) infoRows.push(`<tr><th>Items</th><td>${esc(d.Items)}</td></tr>`);
  }
  if(e.kind) infoRows.push(`<tr><th>${L('Jenis','Kind')}</th><td>${esc(e.kind)}</td></tr>`);
  if(e.range) infoRows.push(`<tr><th>${L('Jarak','Range')}</th><td>${esc(e.range)}</td></tr>`);
  if(e.weapon) infoRows.push(`<tr><th>${L('Senjata','Weapon')}</th><td>${esc(e.weapon)}</td></tr>`);
  if(infoRows.length) infoHtml = `<div class="card"><h2>ℹ️ ${L('Info Dasar','Basic Information')}</h2><table class="wiki-table">${infoRows.join('')}</table></div>`;

  // Stats - compact VERTICAL (not horizontal)
  let statHtml = '';
  const statsN = (pg.stats && pg.stats.normal) || e.stats || {};
  const statsH = (pg.stats && pg.stats.hard) || null;
  const statOrder = ['HP','MP','PWR','MGC','DEX','SPD','PD','MD','LUK','APT'];
  function statTable(s){
    const keys = statOrder.filter(k=>s[k]!==undefined);
    const extra = Object.keys(s).filter(k=>!statOrder.includes(k));
    return `<table class="wiki-table compact">` +
      keys.map(k=>`<tr><th>${esc(k)}</th><td><b>${esc(s[k])}</b></td></tr>`).join('') +
      extra.map(k=>`<tr><th>${esc(k)}</th><td>${esc(s[k])}</td></tr>`).join('') + `</table>`;
  }
  if(Object.keys(statsN).length){
    statHtml = `<div class="card"><h2>📊 ${L('Statistik','Stats')}</h2>`;
    if(statsH && Object.keys(statsH).length){
      const sid = `stattab-${li}-${ei}`;
      statHtml += `<div class="mini-tabs"><button class="mini-tab active" onclick="enemyStatTab('${sid}',0,this)">Normal</button><button class="mini-tab" onclick="enemyStatTab('${sid}',1,this)">Hard</button></div>
        <div id="${sid}-0">${statTable(statsN)}</div>
        <div id="${sid}-1" style="display:none">${statTable(statsH)}</div>`;
    } else {
      statHtml += statTable(statsN);
    }
    statHtml += `</div>`;
  }

  // Damage resistances with icons
  let dmgHtml = '';
  if(pg.damage_res && Object.keys(pg.damage_res).length){
    dmgHtml = `<div class="card"><h2>🛡️ ${L('Resistensi Damage','Damage Resistances')}</h2><div class="res-grid">` +
      Object.entries(pg.damage_res).map(([k,v])=>`
        <div class="res-cell"><img src="${esc(v.icon||'')}" alt="" loading="lazy" onerror="this.style.display='none'"><span>${esc(k)}</span><b>${esc(v.value||'-')}</b></div>`
      ).join('') + `</div></div>`;
  }
  // Status resistances with icons
  let stHtml = '';
  if(pg.status_res && Object.keys(pg.status_res).length){
    stHtml = `<div class="card"><h2>🔮 ${L('Resistensi Status','Status Resistances')}</h2><div class="res-grid">` +
      Object.entries(pg.status_res).map(([k,v])=>`
        <div class="res-cell"><img src="${esc(v.icon||'')}" alt="" loading="lazy" onerror="this.style.display='none'"><span>${esc(k)}</span><b>${esc(v.value||'-')}</b></div>`
      ).join('') + `</div></div>`;
  }

  let locHtml = '';
  if(e.locations && e.locations.length){
    locHtml = `<div class="card"><h2>📍 ${L('Lokasi','Locations')}</h2><ul class="ticks">` +
      e.locations.map(l=>`<li>${esc(l)}</li>`).join('') + `</ul></div>`;
  }
  let weakHtml = '';
  if(e.weaknesses && Object.keys(e.weaknesses).length){
    weakHtml = `<div class="card"><h2>⚡ ${L('Kelemahan','Weaknesses')}</h2>
      <table class="wiki-table"><tr><th>${L('Elemen','Element')}</th><th>${L('Efek','Effect')}</th></tr>` +
      Object.entries(e.weaknesses).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('') + `</table></div>`;
  }
  let dropHtml = '';
  if(e.drops && e.drops.length){
    dropHtml = `<div class="card"><h2>🎁 ${L('Drop','Drops')}</h2><ul class="ticks">` +
      e.drops.map(d=>`<li>${esc(d)}</li>`).join('') + `</ul></div>`;
  }
  view.innerHTML = `
  <div class="card">
    <button class="btn ghost" onclick="goBack()">← ${t.tab_enemies}</button>
  </div>
  <div class="card center">
    ${e.artwork_forms && e.artwork_forms.length > 1 ? `
      <div class="mini-tabs" style="margin-bottom:8px">
        ${e.artwork_forms.map((f,i)=>`<button class="mini-tab${i===0?' active':''}" onclick="enemyArtTab(${i},this)">Form ${i+1}</button>`).join('')}
      </div>
      ${e.artwork_forms.map((f,i)=>`<img src="${esc(f)}" alt="${esc(e.name)} Form ${i+1}" class="detail-artwork enemy-art-form" id="eart-${i}" style="${i>0?'display:none':''};cursor:zoom-in" onclick="openLightbox('${esc(f)}')" onerror="this.style.display='none'">`).join('')}
    ` : artLocal ? `<img src="${esc(artLocal)}" alt="${esc(e.name)}" class="detail-artwork" style="cursor:zoom-in" onclick="openLightbox('${esc(artLocal)}')" onerror="this.style.display='none';this.nextElementSibling.style.display=''">` : ''}
    <img src="${esc(e.icon||'img/enemies/placeholder.png')}" alt="${esc(e.name)}" class="detail-icon"${(artLocal||(e.artwork_forms&&e.artwork_forms.length))?" style='display:none'":""} onerror="this.src='img/enemies/placeholder.png'">
    <h2 class="enemy-detail-name">${esc(e.name).replace(/\//g, '/<wbr>')}</h2>
  </div>
  ${infoHtml}${locHtml}${dropHtml}${statHtml}${dmgHtml}${stHtml}${weakHtml}`;
  window.scrollTo(0,0);
}
function enemyStatTab(sid, idx, btn){
  document.getElementById(sid+'-0').style.display = idx===0?'':'none';
  document.getElementById(sid+'-1').style.display = idx===1?'':'none';
  btn.parentElement.querySelectorAll('.mini-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}
function enemyArtTab(idx, btn){
  document.querySelectorAll('.enemy-art-form').forEach((img,i)=>{ img.style.display = i===idx?'':'none'; });
  btn.parentElement.querySelectorAll('.mini-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}

/* ---------- BEIGOMA (Task 4) ---------- */
function renderBeigoma(backFn){
  const t = T();
  pushNav(backFn || renderMinigames);
  const list = (typeof BEIGOMA !== 'undefined') ? BEIGOMA : [];
  view.innerHTML = `
  <div class="card">
    <button class="btn ghost" onclick="goBack()">← ${L('Beigoma','Beigoma')}</button>
  </div>
  <div class="card">
    <h2>🌀 ${L('Daftar Beigoma','Beigoma List')} (${list.length})</h2>
    <p class="small">${L('Ketuk beigoma untuk detail stats, skill, dan cara mendapatkannya.','Tap a beigoma for stats, skills, and how to obtain it.')}</p>
  </div>
  <div class="hero-grid">` +
    list.map((b,i)=>`
    <div class="hero-card" onclick="showBeigomaDetail(${i}, ()=>renderBeigoma())">
      <img src="${esc(b.icon_local||b.icon||'img/beigoma/placeholder.png')}" alt="${esc(b.name)}" loading="lazy" onerror="this.src='img/beigoma/placeholder.png'">
      <div class="hero-info">
        <div class="hero-name">${esc(b.name)}</div>
        <div class="hero-recruit">⭐ ${esc(b.rarity||'')}</div>
      </div>
    </div>`).join('') + `</div>`;
  window.scrollTo(0,0);
}
function showBeigomaDetail(i, backFn, fromBack){
  const t = T();
  const b = (typeof BEIGOMA !== 'undefined') ? BEIGOMA[i] : null;
  if(!b) return;
  if(!fromBack) pushNav(backFn || (()=>renderBeigoma()));
  // Stats table (vertical compact)
  const statRows = [
    ['Spin', b.spin], ['Defense', b.defense], ['Magic', b.magic],
    ['Weight', b.weight], ['Attack', b.attack], ['Rarity', b.rarity]
  ].filter(([k,v])=>v).map(([k,v])=>`<tr><th>${esc(k)}</th><td><b>${esc(v)}</b></td></tr>`).join('');
  // Skills - like web (horizontal compact table)
  let skillHtml = '';
  if(b.skills && b.skills.length){
    const hdrs = Object.keys(b.skills[0]);
    skillHtml = `<div class="card"><h2>✨ Skill</h2><div class="table-wrap"><table class="wiki-table compact"><tr>${hdrs.map(h=>`<th>${esc(h)}</th>`).join('')}</tr>` +
      b.skills.map(s=>`<tr>${hdrs.map(h=>`<td>${esc(s[h]||'')}</td>`).join('')}</tr>`).join('') + `</table></div></div>`;
  }
  // Drop sources with icons (only monsters & characters, skip locations/categories)
  let dropHtml = '';
  if(b.drops && b.drops.length){
    const skipNames = ['enemies','character','characters','practice beigoma','locations'];
    const items = [];
    b.drops.forEach(d=>{
      const nl = d.name.toLowerCase();
      if(skipNames.includes(nl)) return;
      // Try to find character or monster
      let icon = null, click = '';
      const eIdx = findEnemyIdx(d.name);
      if(eIdx && typeof ENEMIES!=='undefined' && ENEMIES[eIdx.li] && ENEMIES[eIdx.li].enemies[eIdx.ei]){
        icon = ENEMIES[eIdx.li].enemies[eIdx.ei].icon;
        click = `onclick="showEnemyDetail(${eIdx.li},${eIdx.ei},()=>showBeigomaDetail(${i}))"`;
      } else {
        const h = (typeof HEROES!=='undefined') ? HEROES.find(x=>x.name.toLowerCase()===nl) : null;
        if(h){
          icon = h.img;
          click = `onclick="showHeroDetail(${h.star},()=>showBeigomaDetail(${i}))"`;
        }
      }
      if(icon){ // Only show if we found a real monster/character
        items.push(`<div class="partner-chip" style="margin-right:8px" ${click}><img src="${esc(icon)}" loading="lazy" onerror="this.src='img/enemies/placeholder.png'"><span>${esc(d.name)}</span></div>`);
      }
    });
    if(items.length){
      dropHtml = `<div class="card"><h2>🎁 ${L('Drop dari','Dropped by')}</h2><div class="partner-grid">` + items.join('') + `</div></div>`;
    }
  }
  view.innerHTML = `
  <div class="card">
    <button class="btn ghost" onclick="goBack()">← ${L('Beigoma','Beigoma')}</button>
  </div>
  <div class="card center">
    <img src="${esc(b.icon_local||b.icon||'img/beigoma/placeholder.png')}" alt="${esc(b.name)}" class="detail-icon" style="width:120px;height:120px" onerror="this.src='img/beigoma/placeholder.png'">
    <h2>🌀 ${esc(b.name)}</h2>
  </div>
  ${b.description ? `<div class="card"><h2>📝 ${L('Deskripsi','Description')}</h2><p>${esc(b.description)}</p></div>` : ''}
  ${b.obtaining ? `<div class="card"><h2>🔍 ${L('Cara Mendapatkan','How to Obtain')}</h2><p>${esc(b.obtaining)}</p></div>` : ''}
  ${dropHtml}
  <div class="card"><h2>📊 Stats</h2><table class="wiki-table compact">${statRows}</table></div>
  <div class="card"><h2>🛡️ ${L('Status Information','Status Information')}</h2><p class="small">${L('Data segera hadir.','Data coming soon.')}</p></div>
  ${skillHtml}`;
  window.scrollTo(0,0);
}
function renderMinigames(){
  const t = T();
  view.innerHTML = `<div class="card"><h2>🃏 ${t.tab_minigames}</h2>
    <p class="small">${L('Panduan semua mini-game di dalam game. Ketuk untuk detail.','Guides for all in-game mini-games. Tap for details.')}</p></div>
  <div class="item-list">` +
    MINIGAMES.map((m,i)=>`
    <div class="item-row" onclick="showMinigameDetail(${i})">
      <span class="item-name">${esc(L(m.name_id, m.name_en))}</span>
      <span class="item-arrow">›</span>
    </div>`).join('') + `</div>`;
}
function showMinigameDetail(i){
  const t = T();
  const m = MINIGAMES[i];
  if(!m) return;
  pushNav(renderMinigames);
  // Build content blocks (sections) then interleave images among them like the web
  let blocks = [];
  if(m.sections && m.sections.length){
    blocks = m.sections.map(s=>{
      const h = L(s.h_id, s.h_en);
      const ps = (LANG==='en' ? s.p_en : s.p_id) || [];
      let tHtml = '';
      const tbl = (LANG==='en' ? s.table_en : s.table_id) || s.table_id;
      const hdrs = (LANG==='en' ? s.table_headers_en : s.table_headers) || s.table_headers;
      if(tbl && tbl.length){
        // Vertical compact: each row becomes a vertical key-value block (no horizontal scroll)
        tHtml = tbl.map(row=>{
          const rows = (hdrs||[]).map((hd,ci)=>`<tr><th>${esc(hd)}</th><td>${esc(row[ci]||'')}</td></tr>`).join('');
          return `<table class="wiki-table compact" style="margin-bottom:8px">${rows}</table>`;
        }).join('');
      }
      return {html:`<h3 class="mt">${esc(h)}</h3>` + ps.map(p=>`<p>${esc(p)}</p>`).join('') + tHtml};
    });
  } else {
    const det = (LANG==='en' ? m.details_en : m.details) || [];
    if(det.length) blocks = [{html:`<ul>${det.map(d=>`<li>${esc(d)}</li>`).join('')}</ul>`}];
  }
  const imgs = (m.images && m.images.length ? m.images : (m.img ? [m.img] : []));
  const secHtml = interleaveImages(blocks, imgs, src=>bannerImg(src));
  // Special: beigoma minigame gets a button to the beigoma database
  let beigomaBtn = '';
  if(m.slug === 'beigoma'){
    beigomaBtn = `<div class="card center"><button class="btn" onclick="renderBeigoma(()=>showMinigameDetail(${i}))">🌀 ${L('Lihat Semua Beigoma','View All Beigoma')}</button></div>`;
  }
  view.innerHTML = `
  <div class="card">
    <button class="btn ghost" onclick="goBack()">← ${t.tab_minigames}</button>
  </div>
  <div class="card">
    <h2>🃏 ${esc(L(m.name_id, m.name_en))}</h2>
    <p>${esc(L(m.summary_id, m.summary_en))}</p>
    ${secHtml}
  </div>
  ${beigomaBtn}`;
  window.scrollTo(0,0);
}

/* ---------- FASILITAS ---------- */
function accToggle(id){
  const body = document.getElementById(id);
  const head = document.querySelector('[data-acc="'+id+'"]');
  if(body) body.classList.toggle('open');
  if(head) head.classList.toggle('open');
}
function renderFacilities(){
  const t = T();
  const lvName = l => L('HQ Level ','HQ Level ') + l;
  let html = `<div class="card"><h2>🏰 ${t.tab_facilities}</h2>
    <p class="small">${L('Semua fasilitas HQ dan cara membukanya. Ketuk level untuk mekar/tutup, ketuk fasilitas untuk detail.','All HQ facilities and how to unlock them. Tap a level to expand/collapse, tap a facility for details.')}</p></div>`;
  [1,2,3].forEach(lv=>{
    const list = FACILITIES.map((m,i)=>({...m, _i:i})).filter(m=>(m.hq_level||1)===lv);
    if(!list.length) return;
    const aid = 'acc-fac-'+lv;
    html += `<div class="card acc-head" data-acc="${aid}" onclick="accToggle('${aid}')">
      <h2>${lvName(lv)} (${list.length}) <span class="acc-arrow">›</span></h2></div>
      <div class="acc-body" id="${aid}"><div class="item-list">` +
      list.map(m=>`
      <div class="item-row" onclick="showFacilityDetail(${m._i})">
        <span class="item-name">${esc(L(m.name_id, m.name_en))}</span>
        <span class="item-arrow">›</span>
      </div>`).join('') + `</div></div>`;
  });
  view.innerHTML = html;
}
function showFacilityDetail(i){
  const t = T();
  const m = FACILITIES[i];
  if(!m) return;
  pushNav(renderFacilities);
  let blocks = [];
  if(m.sections && m.sections.length){
    blocks = m.sections.map(s=>{
      const h = L(s.h_id, s.h_en);
      const ps = (LANG==='en' ? s.p_en : s.p_id) || [];
      return {html:`<h3 class="mt">${esc(h)}</h3>` + ps.map(p=>`<p>${esc(p)}</p>`).join('')};
    });
  } else {
    const det = (LANG==='en' ? m.details_en : m.details) || [];
    if(det.length) blocks = [{html:`<ul>${det.map(d=>`<li>${esc(d)}</li>`).join('')}</ul>`}];
  }
  const imgs = (m.images && m.images.length ? m.images : (m.img ? [m.img] : []));
  const secHtml = interleaveImages(blocks, imgs, src=>bannerImg(src));
  view.innerHTML = `
  <div class="card">
    <button class="btn ghost" onclick="goBack()">← ${t.tab_facilities}</button>
  </div>
  <div class="card">
    <h2>🏰 ${esc(L(m.name_id, m.name_en))}</h2>
    <p>${esc(L(m.summary_id, m.summary_en))}</p>
    ${m.cost_baqua?`<p><b>💰</b> ${m.cost_baqua} Baqua${m.materials?` &nbsp;•&nbsp; 🧱 ${esc(m.materials)}`:''}</p>`:''}
    ${m.requires?`<p><b>👤</b> ${esc(m.requires)}</p>`:''}
    ${secHtml}
  </div>`;
  window.scrollTo(0,0);
}

/* ---------- LAIN-LAIN (Guides + Game Data) ---------- */
function renderMisc(){
  const t = T();
  let html = `<div class="card"><h2>📦 ${t.tab_misc}</h2>
    <p class="small">${L('Panduan umum dan referensi data game. Ketuk grup untuk mekar/tutup.','General guides and game data reference. Tap a group to expand/collapse.')}</p></div>`;

  html += `<div class="card acc-head" data-acc="acc-guides" onclick="accToggle('acc-guides')">
    <h2>📖 ${L('Panduan','Guides')} (${GUIDES.length}) <span class="acc-arrow">›</span></h2></div>
    <div class="acc-body" id="acc-guides"><div class="item-list">` +
    GUIDES.map((m,i)=>`
    <div class="item-row" onclick="showGuideDetail(${i})">
      <span class="item-name">${esc(L(m.name_id, m.name_en))}</span>
      <span class="item-arrow">›</span>
    </div>`).join('') + `</div></div>`;

  html += `<div class="card acc-head" data-acc="acc-gamedata" onclick="accToggle('acc-gamedata')">
    <h2>💾 ${L('Data Game','Game Data')} (${GAMEDATA.length}) <span class="acc-arrow">›</span></h2></div>
    <div class="acc-body" id="acc-gamedata"><div class="item-list">` +
    GAMEDATA.map((cat,i)=>`
    <div class="item-row" onclick="showGamedataDetail(${i})">
      <span class="item-name">${esc(L(cat.category_id, cat.category_en))} (${cat.entries.length})</span>
      <span class="item-arrow">›</span>
    </div>`).join('') + `</div></div>`;
  view.innerHTML = html;
}
function showGuideDetail(i){
  const t = T();
  const m = GUIDES[i];
  if(!m) return;
  pushNav(renderMisc);
  let blocks = [];
  if(m.sections && m.sections.length){
    blocks = m.sections.map(s=>{
      const h = L(s.h_id, s.h_en);
      const ps = (LANG==='en' ? s.p_en : s.p_id) || [];
      let tHtml = '';
      const tbl = (LANG==='en' ? s.table_en : s.table_id) || s.table_id;
      const hdrs = (LANG==='en' ? s.table_headers_en : s.table_headers) || s.table_headers;
      if(tbl && tbl.length){
        // Vertical compact: each row becomes a vertical key-value block (no horizontal scroll)
        tHtml = tbl.map(row=>{
          const rows = (hdrs||[]).map((hd,ci)=>`<tr><th>${esc(hd)}</th><td>${esc(row[ci]||'')}</td></tr>`).join('');
          return `<table class="wiki-table compact" style="margin-bottom:8px">${rows}</table>`;
        }).join('');
      }
      return {html:`<h3 class="mt">${esc(h)}</h3>` + ps.map(p=>`<p>${esc(p)}</p>`).join('') + tHtml};
    });
  } else {
    const det = (LANG==='en' ? m.details_en : m.details) || [];
    if(det.length) blocks = [{html:`<ul>${det.map(d=>`<li>${esc(d)}</li>`).join('')}</ul>`}];
  }
  const imgs = (m.images && m.images.length ? m.images : (m.img ? [m.img] : []));
  const secHtml = interleaveImages(blocks, imgs, src=>bannerImg(src));
  view.innerHTML = `
  <div class="card">
    <button class="btn ghost" onclick="goBack()">← ${t.tab_misc}</button>
  </div>
  <div class="card">
    <h2>📖 ${esc(L(m.name_id, m.name_en))}</h2>
    <p>${esc(L(m.summary_id, m.summary_en))}</p>
    ${secHtml}
  </div>`;
  window.scrollTo(0,0);
}
function showGamedataDetail(i){
  const t = T();
  const cat = GAMEDATA[i];
  if(!cat) return;
  pushNav(renderMisc);
  // Runes get a special icon grid (clickable to detail), grouped by category
  if(cat.category_id === 'Rune' && typeof RUNES !== 'undefined'){
    const categories = ['Magic', 'Passive', 'Skill', 'Enhancement'];
    const catIcons = {Magic:'🔥', Passive:'🛡️', Skill:'⚔️', Enhancement:'💪'};
    let sectionsHtml = '';
    categories.forEach(c=>{
      const runesInCat = [];
      RUNES.forEach((r, ri)=>{ if(r.category === c) runesInCat.push({r, ri}); });
      if(!runesInCat.length) return;
      const grid = runesInCat.map(({r, ri})=>{
        const icon = r.icon_local || 'img/runes/placeholder.png';
        return `<div class="enemy-chip" onclick="showRuneDetail(${ri})">
          <img src="${esc(icon)}" alt="${esc(r.name)}" loading="lazy" onerror="this.src='img/runes/placeholder.png'">
          <span>${esc(r.name)}</span>
        </div>`;
      }).join('');
      sectionsHtml += `<h3 class="mt">${catIcons[c]||'💾'} ${c} (${runesInCat.length})</h3><div class="enemy-grid">${grid}</div>`;
    });
    view.innerHTML = `
    <div class="card">
      <button class="btn ghost" onclick="goBack()">← ${t.tab_misc}</button>
    </div>
    <div class="card">
      <h2>💾 ${esc(L(cat.category_id, cat.category_en))} (${RUNES.length})</h2>
      <p class="small">${L('Ketuk rune untuk detail.','Tap a rune for details.')}</p>
      ${sectionsHtml}
    </div>`;
    window.scrollTo(0,0);
    return;
  }
  view.innerHTML = `
  <div class="card">
    <button class="btn ghost" onclick="goBack()">← ${t.tab_misc}</button>
  </div>
  <div class="card">
    <h2>💾 ${esc(L(cat.category_id, cat.category_en))}</h2>
    <div class="item-list">${cat.entries.map(e=>`<div class="item-row"><span class="item-name">${esc(e.name)}</span></div>`).join('')}</div>
  </div>`;
  window.scrollTo(0,0);
}

function showRuneDetail(ri, fromBack){
  const t = T();
  const r = (typeof RUNES !== 'undefined') ? RUNES[ri] : null;
  if(!r) return;
  window.currentRuneIdx = ri;
  if(!fromBack) pushNav(()=>showGamedataDetail(0));
  const icon = r.icon_local || 'img/runes/placeholder.png';
  const gp = r.gameplay || {};
  const ob = r.obtain || {};

  // Gameplay info table
  let gpHtml = '';
  const gpRows = [];
  if(gp.Type) gpRows.push(`<tr><th>${L('Tipe','Type')}</th><td>${esc(gp.Type)}</td></tr>`);
  if(gp.Rarity) gpRows.push(`<tr><th>${L('Kelangkaan','Rarity')}</th><td>${esc(gp.Rarity)}</td></tr>`);
  if(gp.Value) gpRows.push(`<tr><th>${L('Nilai','Value')}</th><td>${esc(gp.Value)} Baqua</td></tr>`);
  if(gpRows.length) gpHtml = `<div class="card rune-sec"><h2>📊 ${L('Info Gameplay','Gameplay Information')}</h2><table class="wiki-table compact rune-tbl">${gpRows.join('')}</table></div>`;

  // Obtain info
  let obHtml = '';
  const obRows = [];
  if(ob.Sold) obRows.push(`<tr><th>${L('Dijual','Sold')}</th><td>${esc(ob.Sold)}</td></tr>`);
  if(ob.Found) obRows.push(`<tr><th>${L('Ditemukan','Found')}</th><td>${esc(ob.Found)}</td></tr>`);
  if(obRows.length || ob.Drop){
    let dropHtml = '';
    if(ob.Drop){
      // Parse drop monsters and link them
      dropHtml = `<tr><th>${L('Drop','Drop')}</th><td>${formatRuneDrops(ob.Drop)}</td></tr>`;
    }
    obHtml = `<div class="card rune-sec"><h2>📦 ${L('Cara Memperoleh','Obtain Information')}</h2><table class="wiki-table compact rune-tbl">${obRows.join('')}${dropHtml}</table></div>`;
  }

  // Spells
  let spellHtml = '';
  if(r.spells && r.spells.length){
    spellHtml = `<div class="card rune-sec"><h2>✨ ${L('Skill/Mantra','Spells')} (${r.spells.length})</h2>` +
      r.spells.map(s=>{
        const rows = (s.rows||[]).map(row=>{
          if(row.length === 1) return `<tr><th colspan="4">${esc(row[0])}</th></tr>`;
          // pad to 4 cols for compact display
          const cells = row.map(c=>`<td>${esc(c)}</td>`).join('');
          return `<tr>${cells}</tr>`;
        }).join('');
        return `<h3 class="mt">${esc(s.name)}</h3><table class="wiki-table compact rune-tbl">${rows}</table>`;
      }).join('') + `</div>`;
  }

  view.innerHTML = `
  <div class="card">
    <button class="btn ghost" onclick="goBack()">← ${L('Rune','Runes')}</button>
  </div>
  <div class="card rune-head">
    <img src="${esc(icon)}" alt="${esc(r.name)}" onerror="this.src='img/runes/placeholder.png'">
    <div><h2>${esc(r.name)}</h2>${r.description ? `<p>${esc(r.description)}</p>` : ''}</div>
  </div>
  ${gpHtml}${obHtml}${spellHtml}`;
  window.scrollTo(0,0);
}

function formatRuneDrops(dropText){
  // dropText like "Wyvern Near Headquarters" - try to match monster names
  if(typeof findEnemyIdx !== 'function') return esc(dropText);
  let html = esc(dropText);
  try {
    const locs = (typeof ENEMIES !== 'undefined') ? ENEMIES : [];
    const matched = [];
    const seenNames = new Set();
    // Normalize drop text: lowercase, underscores to spaces
    const normDrop = dropText.toLowerCase().replace(/_/g, ' ');
    locs.forEach((loc, li)=>{
      (loc.enemies||[]).forEach((e, ei)=>{
        if(!e.name || seenNames.has(e.name)) return;
        const enLower = e.name.toLowerCase();
        const enNorm = enLower.replace(/_/g, ' ');
        // Also try base name without /Enemy suffix
        const baseName = enLower.replace(/\/enemy$/, '');
        const baseNorm = baseName.replace(/_/g, ' ');
        if(normDrop.includes(enNorm) || normDrop.includes(baseNorm) ||
           dropText.toLowerCase().includes(enLower)){
          seenNames.add(e.name);
          matched.push({name:e.name, li, ei});
        }
      });
    });
    if(matched.length){
      html = matched.map(m=>{
        const e = locs[m.li].enemies[m.ei];
        const icon = e.icon || 'img/enemies/placeholder.png';
        // Display base name (without /Enemy) for cleaner look
        const dispName = m.name.replace(/\/Enemy$/, '');
        return `<span class="drop-mon" onclick="showEnemyDetail(${m.li},${m.ei},()=>showRuneDetail(currentRuneIdx,true),true)" style="display:inline-flex;align-items:center;gap:4px;margin:2px 6px 2px 0;cursor:pointer">
          <img src="${esc(icon)}" style="width:24px;height:24px;object-fit:contain" onerror="this.style.display='none'">
          <u>${esc(dispName)}</u>
        </span>`;
      }).join('') + `<div class="small" style="margin-top:4px">${esc(dropText)}</div>`;
      window.currentRuneIdx = window.currentRuneIdx || 0;
    }
  } catch(err){}
  return html;
}

/* ---------- DLC ---------- */
function renderDLC(){
  const t = T();
  let html = `<div class="card"><h2>💎 ${t.tab_dlc}</h2>
    <p class="small">${esc(L(DLC_INFO.note_id, DLC_INFO.note_en))}</p></div>`;
  (DLC_INFO.dlcs||[]).forEach(d=>{
    html += `<details class="walk-ch">
      <summary>${esc(L(d.name_id||d.name, d.name_en||d.name))}</summary>
      <div class="walk-body"><p>${esc(L(d.desc_id||d.desc, d.desc_en||d.desc))}</p></div>
    </details>`;
  });
  // DLC walkthrough chapters
  const dlcCh = WALKTHROUGH.filter(c=>c.is_dlc);
  if(dlcCh.length){
    html += `<div class="card"><h2>🗺️ ${t.dlc_section} (${dlcCh.length})</h2></div>` +
      dlcCh.map(c=>`
      <details class="walk-ch">
        <summary><span class="chn">${c.n}</span> ${esc(c.title)}</summary>
        <div class="walk-body">
          <p>${esc(L(c.summary_id, c.summary_en))}</p>
          ${c.bosses && c.bosses.length ? `<p><b>⚔️ ${t.boss}:</b> ${c.bosses.map(esc).join(', ')}</p>` : ''}
          ${c.key_points && c.key_points.length ? `<p><b>📌 ${t.key_points}:</b></p><ul>${c.key_points.map(k=>`<li>${esc(k)}</li>`).join('')}</ul>` : ''}
        </div>
      </details>`).join('');
  }
  view.innerHTML = html;
}

/* ---------- RISING ---------- */
function renderRising(){
  const t = T();
  let html = `<div class="card"><h2>🌅 ${t.tab_rising}</h2>
    <p>${esc(L(RISING_INFO.note_id, RISING_INFO.note_en))}</p>
    <p>${(RISING_INFO.characters||[]).map(c=>`<span class="badge">${esc(c.name||c)}</span>`).join(' ')}</p>
    <p class="small">${L('Ketiga karakter Rising sudah termasuk dalam 120 Stars di tab Karakter.','All three Rising characters are already included in the 120 Stars in the Characters tab.')}</p></div>`;
  view.innerHTML = html;
}

/* ---------- OTA ---------- */
const OTA_URL = 'https://raw.githubusercontent.com/K1F4nn12/Eiyuden-Companion/main/eiyuden-data.json';
let otaStatus = '…';
async function checkOTA(silent){
  try{
    const r = await fetch(OTA_URL + '?t=' + Date.now());
    if(!r.ok) throw 0;
    const j = await r.json();
    if(j.version > DATA_VERSION){
      localStorage.setItem('otaCache', JSON.stringify(j));
      applyOTA(j);
      otaStatus = 'updated → v' + j.version;
    } else otaStatus = 'up to date';
  }catch(e){ otaStatus = 'offline'; }
  if(!silent){
    const tab = document.querySelector('.tabbar button.active');
    render(tab ? tab.dataset.tab : 'home');
  }
}
function applyOTA(j){
  try{
    if(j.heroes) HEROES = j.heroes;
    if(j.walkthrough) WALKTHROUGH = j.walkthrough;
    if(j.minigames) MINIGAMES = j.minigames;
    if(j.facilities) FACILITIES = j.facilities;
    if(j.guides) GUIDES = j.guides;
    if(j.gamedata) GAMEDATA = j.gamedata;
    if(j.enemies) ENEMIES = j.enemies;
    if(j.beigoma) BEIGOMA = j.beigoma;
    if(j.runes) RUNES = j.runes;
    if(j.panels){ PANELS = j.panels; applyPanels(); }
    DATA_VERSION = j.version;
  }catch(e){}
}

/* ---------- PANEL VISIBILITY (OTA) ---------- */
function applyPanels(){
  try{
    const p = (typeof PANELS !== 'undefined') ? PANELS : {};
    let activeHidden = false;
    document.querySelectorAll('.tabbar button').forEach(b=>{
      const show = p[b.dataset.tab] !== 0;
      b.style.display = show ? '' : 'none';
      if(!show && b.classList.contains('active')) activeHidden = true;
    });
    if(activeHidden){
      document.querySelectorAll('.tabbar button').forEach(x=>x.classList.remove('active'));
      const home = document.querySelector('.tabbar button[data-tab="home"]');
      if(home && home.style.display !== 'none'){ home.classList.add('active'); render('home'); }
    }
  }catch(e){}
}
function manualOTA(){ otaStatus = '…'; checkOTA(false); }

/* ---------- INIT ---------- */
async function init(){
  try{
    const c = localStorage.getItem('otaCache');
    if(c){ const j = JSON.parse(c); if(j.version > DATA_VERSION) applyOTA(j); }
  }catch(e){}
  document.querySelectorAll('.lang-btn').forEach(b=>{
    b.classList.toggle('active', b.dataset.lang===LANG);
    b.addEventListener('click', ()=>setLang(b.dataset.lang));
  });
  const sub = document.querySelector('.app-header p');
  if(sub) sub.textContent = T().app_subtitle;
  updateTabLabels();
  applyPanels();
  setupBackButton();
  render('home');
  checkOTA(true);
}
document.addEventListener('DOMContentLoaded', init);
