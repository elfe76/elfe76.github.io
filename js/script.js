/* ============================================
   Elsa & John — Mariage
   - Charge automatiquement toutes les photos listées dans photos.json
   - Carrousel "coverflow" (statique, ne bouge que sur interaction)
   - Compteur de progression, mode plein écran, message de bienvenue,
     protection basique anti clic-droit, aide à la navigation,
     encart de remerciements
   ============================================ */

const ACCESS_CODE = "04072026";
const GAP = 22;              // doit correspondre au gap défini en CSS (.carousel-track)
const CENTER_ZONE_RATIO = 0.22; // largeur de la zone centrale (en % de l'écran) qui ouvre le plein écran

const track    = document.getElementById('carouselTrack');
const wrap     = document.getElementById('carouselWrap');
const app      = document.getElementById('app');
const form     = document.getElementById('gateForm');
const input    = document.getElementById('codeInput');
const errorEl  = document.getElementById('gateError');
const gateCard = document.querySelector('.gate-card');
const prevBtn  = document.getElementById('prevBtn');
const nextBtn  = document.getElementById('nextBtn');
const progressCounter = document.getElementById('progressCounter');
const lockBtn  = document.getElementById('lockBtn');
const welcomeToast = document.getElementById('welcomeToast');

const lightbox        = document.getElementById('lightbox');
const lightboxImg     = document.getElementById('lightboxImg');
const lightboxStage   = document.getElementById('lightboxStage');
const lightboxClose   = document.getElementById('lightboxClose');
const lightboxPrev    = document.getElementById('lightboxPrev');
const lightboxNext    = document.getElementById('lightboxNext');
const lightboxCounter = document.getElementById('lightboxCounter');

const helpBtn      = document.getElementById('helpBtn');
const helpModal    = document.getElementById('helpModal');
const helpModalClose = document.getElementById('helpModalClose');

const creditsBtn   = document.getElementById('creditsBtn');
const creditsModal = document.getElementById('creditsModal');
const creditsModalClose = document.getElementById('creditsModalClose');
const creditsList  = document.getElementById('creditsList');

let photosList     = [];
let photosCount    = 0;
let slideMeta      = [];   // [{el, left, width, resting, photoIndex}]
let singleSetWidth = 0;
let position       = 0;    // position de défilement en px
let isPaused       = false;
let isDragging     = false;
let dragStartX     = 0;
let dragStartPos   = 0;
let dragMoved      = false;
let isTweening     = false;
let tweenFrom = 0, tweenTo = 0, tweenStart = 0, tweenDuration = 420;
let resumeTimer    = null;
let welcomeTimer   = null;
let lastTs         = null;
let influenceRadius = 380;
let lightboxIndex  = 0;
let creditsLoaded  = false;

function lerp(a, b, t){ return a + (b - a) * t; }
function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }
function mod(n, m){ return ((n % m) + m) % m; }

function anyOverlayOpen(){
  return lightbox.classList.contains('open') ||
         helpModal.classList.contains('open') ||
         creditsModal.classList.contains('open');
}

/* ---------- 1. Chargement des photos ---------- */

async function loadPhotos(){
  let photos = [];
  try{
    const res = await fetch('photos.json', { cache: 'no-store' });
    if(!res.ok) throw new Error('photos.json introuvable');
    photos = await res.json();
  }catch(err){
    console.warn('Impossible de charger photos.json :', err);
  }

  if(!Array.isArray(photos) || photos.length === 0){
    track.innerHTML = '<p class="loading-hint">Ajoutez vos photos dans le dossier « photos » et listez-les dans photos.json ✿</p>';
    return;
  }

  photosList  = photos;
  photosCount = photos.length;

  const frag = document.createDocumentFragment();
  photos.forEach((src) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = "Photo du mariage d'Elsa et John";
    img.draggable = false;
    frag.appendChild(img);
  });

  track.innerHTML = '';
  track.appendChild(frag);

  // Triplé pour un défilement infini fluide dans les deux sens
  const onceHTML = track.innerHTML;
  track.insertAdjacentHTML('beforeend', onceHTML);
  track.insertAdjacentHTML('beforeend', onceHTML);

  await waitForImages();
  buildSlideMeta();
  updateInfluenceRadius();

  // On centre exactement la toute première photo (2e copie = copie "centrale"),
  // net et sans flou dès l'ouverture du site.
  centerOnSlideIndex(photosCount, true);

  lastTs = null;
  requestAnimationFrame(tick);
}

function waitForImages(){
  const imgs = Array.from(track.querySelectorAll('img'));
  return Promise.all(imgs.map(img => {
    const ready = img.complete
      ? Promise.resolve()
      : new Promise(resolve => {
          img.addEventListener('load', resolve, { once:true });
          img.addEventListener('error', resolve, { once:true });
        });
    return ready.then(() => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()));
  }));
}

function buildSlideMeta(){
  const imgs = Array.from(track.querySelectorAll('img'));
  slideMeta = [];
  let running = 0;
  imgs.forEach((img, i) => {
    const w = img.getBoundingClientRect().width || img.offsetWidth || 300;
    slideMeta.push({ el: img, left: running, width: w, resting: false, photoIndex: i % photosCount });
    running += w + GAP;
  });

  let oneSet = 0;
  for(let i = 0; i < photosCount && i < slideMeta.length; i++){
    oneSet += slideMeta[i].width + GAP;
  }
  singleSetWidth = oneSet || 1;
}

/* Centre EXACTEMENT le slide d'index `slideIdx` (index dans slideMeta, pas photoIndex) */
function centerOnSlideIndex(slideIdx, instant){
  const m = slideMeta[slideIdx];
  if(!m) return;
  const target = m.left + m.width / 2 - window.innerWidth / 2;
  if(instant){
    position = target;
    isTweening = false;
  }else{
    animateTo(target);
  }
}

function updateInfluenceRadius(){
  influenceRadius = Math.max(220, Math.min(window.innerWidth, 1000) * 0.34);
}

/* ---------- 2. Boucle d'animation ---------- */

function wrapPosition(){
  if(singleSetWidth <= 0) return;
  if(position > singleSetWidth * 1.5) position -= singleSetWidth;
  else if(position < singleSetWidth * 0.5) position += singleSetWidth;
}

function tick(ts){
  if(lastTs === null) lastTs = ts;
  lastTs = ts;

  if(isTweening){
    const elapsed = ts - tweenStart;
    const t = Math.min(1, elapsed / tweenDuration);
    position = lerp(tweenFrom, tweenTo, easeOutCubic(t));
    if(t >= 1) isTweening = false;
  }
  // Pas de défilement automatique : la position ne change que via un "tween"
  // déclenché par une interaction (swipe, clic, clavier, boutons flèches).

  wrapPosition();
  render();
  requestAnimationFrame(tick);
}

function render(){
  track.style.transform = `translateX(${-position}px)`;
  updateSlideStyles();
  updateProgressCounter();
}

function updateSlideStyles(){
  const viewportCenter = window.innerWidth / 2;
  const radius = influenceRadius;

  for(const m of slideMeta){
    const centerX = m.left + m.width / 2 - position;
    const dist = centerX - viewportCenter;
    const adist = Math.abs(dist);

    if(adist > radius * 2.6){
      if(!m.resting){
        m.el.style.transform = 'translateY(8px) scale(0.68)';
        m.el.style.opacity = '0.35';
        m.el.style.filter = 'blur(2.6px) brightness(0.72)';
        m.el.style.zIndex = '0';
        m.resting = true;
      }
      continue;
    }
    m.resting = false;

    const t = Math.min(adist / radius, 1);
    const scale  = lerp(1.16, 0.74, t);
    const lift   = lerp(-18, 8, t);
    const opac   = lerp(1, 0.45, t);
    const blur   = lerp(0, 2.4, t);
    const bright = lerp(1, 0.76, t);
    const rot    = Math.sign(dist) * lerp(0, 28, t);
    const tz     = lerp(0, -150, t);

    m.el.style.transform = `translateY(${lift}px) translateZ(${tz}px) rotateY(${rot}deg) scale(${scale})`;
    m.el.style.opacity = String(opac);
    m.el.style.filter = blur > 0.05 ? `blur(${blur}px) brightness(${bright})` : `brightness(${bright})`;
    m.el.style.zIndex = String(Math.round((1 - t) * 100));
  }
}

function updateProgressCounter(){
  if(!photosCount || !singleSetWidth) return;
  const avg = singleSetWidth / photosCount;
  let idx = Math.round(mod(position, singleSetWidth) / avg);
  idx = mod(idx, photosCount);
  progressCounter.textContent = (idx + 1) + ' / ' + photosCount;
}

function findFrontSlideIndex(){
  let bestIdx = 0, bestDist = Infinity;
  const viewportCenter = window.innerWidth / 2;
  slideMeta.forEach((m, i) => {
    const centerX = m.left + m.width / 2 - position;
    const dist = Math.abs(centerX - viewportCenter);
    if(dist < bestDist){ bestDist = dist; bestIdx = i; }
  });
  return bestIdx;
}

/* ---------- 3. Navigation manuelle du carrousel ---------- */

function animateTo(target){
  tweenFrom = position;
  tweenTo = target;
  tweenStart = performance.now();
  isTweening = true;
}

function manualStep(dir){
  if(!singleSetWidth) return;
  const avgStep = singleSetWidth / Math.max(1, photosCount);
  animateTo(position + dir * avgStep);
}

function snapToNearest(){
  if(!singleSetWidth) return;
  const avgStep = singleSetWidth / Math.max(1, photosCount);
  const nearest = Math.round(position / avgStep) * avgStep;
  animateTo(nearest);
}

/* Clavier : flèches gauche / droite (carrousel, plein écran, ou fermeture des popups) */
window.addEventListener('keydown', (e) => {
  if(!app.classList.contains('unlocked')) return;
  const tag = document.activeElement && document.activeElement.tagName;
  if(tag === 'INPUT' || tag === 'TEXTAREA') return;

  if(helpModal.classList.contains('open')){
    if(e.key === 'Escape'){ e.preventDefault(); closeModal(helpModal); }
    return;
  }
  if(creditsModal.classList.contains('open')){
    if(e.key === 'Escape'){ e.preventDefault(); closeModal(creditsModal); }
    return;
  }

  if(lightbox.classList.contains('open')){
    if(e.key === 'ArrowLeft'){ e.preventDefault(); lightboxStep(-1); }
    else if(e.key === 'ArrowRight'){ e.preventDefault(); lightboxStep(1); }
    else if(e.key === 'Escape'){ e.preventDefault(); closeLightbox(); }
    return;
  }

  if(e.key === 'ArrowLeft'){ e.preventDefault(); manualStep(-1); }
  else if(e.key === 'ArrowRight'){ e.preventDefault(); manualStep(1); }
});

/* Tactile / souris : glisser (swipe), cliquer à gauche/droite, ou cliquer au centre pour le plein écran */
wrap.style.touchAction = 'none';

wrap.addEventListener('pointerdown', (e) => {
  isDragging = true;
  dragMoved = false;
  dragStartX = e.clientX;
  dragStartPos = position;
  isTweening = false;
  try{ wrap.setPointerCapture(e.pointerId); }catch(err){}
});

wrap.addEventListener('pointermove', (e) => {
  if(!isDragging) return;
  const dx = e.clientX - dragStartX;
  if(Math.abs(dx) > 6) dragMoved = true;
  position = dragStartPos - dx;
  wrapPosition();
  render();
});

function endDrag(e){
  if(!isDragging) return;
  isDragging = false;

  if(!dragMoved){
    const rect = wrap.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const centerHalf = rect.width * CENTER_ZONE_RATIO;

    if(Math.abs(relX - rect.width / 2) < centerHalf){
      openLightbox(slideMeta[findFrontSlideIndex()].photoIndex);
    }else{
      manualStep(relX < rect.width / 2 ? -1 : 1);
    }
  }else{
    snapToNearest();
  }
}

wrap.addEventListener('pointerup', endDrag);
wrap.addEventListener('pointercancel', endDrag);

/* Anti clic-droit / enregistrement basique sur les photos */
wrap.addEventListener('contextmenu', (e) => e.preventDefault());

/* Boutons flèches */
prevBtn.addEventListener('click', () => manualStep(-1));
nextBtn.addEventListener('click', () => manualStep(1));

/* Redimensionnement : on recalcule les repères et on recentre exactement */
let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    updateInfluenceRadius();
    if(slideMeta.length){
      const currentSlideIdx = findFrontSlideIndex();
      const photoIdx = slideMeta[currentSlideIdx].photoIndex;
      buildSlideMeta();
      centerOnSlideIndex(photosCount + photoIdx, true);
    }
  }, 200);
});

loadPhotos();

/* ---------- 4. Mode plein écran (lightbox) ---------- */

function openLightbox(index){
  if(!photosCount) return;
  lightboxIndex = mod(index, photosCount);
  lightboxImg.src = photosList[lightboxIndex];
  lightboxCounter.textContent = (lightboxIndex + 1) + ' / ' + photosCount;
  lightbox.classList.add('open');
  lightbox.setAttribute('aria-hidden', 'false');
}

function closeLightbox(){
  lightbox.classList.remove('open');
  lightbox.setAttribute('aria-hidden', 'true');
}

function lightboxStep(dir){
  if(!photosCount) return;
  lightboxIndex = mod(lightboxIndex + dir, photosCount);
  lightboxImg.src = photosList[lightboxIndex];
  lightboxCounter.textContent = (lightboxIndex + 1) + ' / ' + photosCount;
}

lightboxClose.addEventListener('click', closeLightbox);
lightboxPrev.addEventListener('click', () => lightboxStep(-1));
lightboxNext.addEventListener('click', () => lightboxStep(1));
lightboxImg.addEventListener('contextmenu', (e) => e.preventDefault());
lightboxStage.addEventListener('contextmenu', (e) => e.preventDefault());

let lbDragStartX = 0, lbDragMoved = false, lbDragging = false;

lightboxStage.addEventListener('pointerdown', (e) => {
  lbDragging = true;
  lbDragMoved = false;
  lbDragStartX = e.clientX;
});

lightboxStage.addEventListener('pointermove', (e) => {
  if(!lbDragging) return;
  if(Math.abs(e.clientX - lbDragStartX) > 8) lbDragMoved = true;
});

lightboxStage.addEventListener('pointerup', (e) => {
  if(!lbDragging) return;
  lbDragging = false;
  const dx = e.clientX - lbDragStartX;

  if(lbDragMoved && Math.abs(dx) > 50){
    lightboxStep(dx < 0 ? 1 : -1);
  }else if(!lbDragMoved && e.target === lightboxStage){
    closeLightbox();
  }
});

/* ---------- 5. Popups génériques (aide / remerciements) ---------- */

function openModal(modalEl){
  modalEl.classList.add('open');
  modalEl.setAttribute('aria-hidden', 'false');
}
function closeModal(modalEl){
  modalEl.classList.remove('open');
  modalEl.setAttribute('aria-hidden', 'true');
}

helpBtn.addEventListener('click', () => openModal(helpModal));
helpModalClose.addEventListener('click', () => closeModal(helpModal));
helpModal.addEventListener('click', (e) => { if(e.target === helpModal) closeModal(helpModal); });

creditsBtn.addEventListener('click', async () => {
  if(!creditsLoaded) await loadCredits();
  openModal(creditsModal);
});
creditsModalClose.addEventListener('click', () => closeModal(creditsModal));
creditsModal.addEventListener('click', (e) => { if(e.target === creditsModal) closeModal(creditsModal); });

async function loadCredits(){
  let credits = [];
  try{
    const res = await fetch('credits.json', { cache: 'no-store' });
    if(!res.ok) throw new Error('credits.json introuvable');
    credits = await res.json();
  }catch(err){
    console.warn('Impossible de charger credits.json :', err);
  }

  creditsLoaded = true;

  if(!Array.isArray(credits) || credits.length === 0){
    creditsList.innerHTML = '<p class="credits-empty">Ajoutez vos remerciements dans le fichier credits.json ✿</p>';
    return;
  }

  creditsList.innerHTML = credits.map(c => {
    const role = c.role ? `<span class="credit-role">${escapeHtml(c.role)}</span>` : '';
    const name = c.name ? `<span class="credit-name">${escapeHtml(c.name)}</span>` : '';
    const linkHtml = c.link ? `<a href="${escapeAttr(c.link)}" target="_blank" rel="noopener noreferrer">🔗 Voir</a>` : '';
    const phoneHtml = c.phone ? `<a href="tel:${escapeAttr(c.phone.replace(/\s+/g,''))}">📞 ${escapeHtml(c.phone)}</a>` : '';
    return `
      <div class="credit-item">
        <div class="credit-header">${role}${name}</div>
        <div class="credit-links">${linkHtml}${phoneHtml}</div>
      </div>`;
  }).join('');
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}
function escapeAttr(str){ return escapeHtml(str); }

/* ---------- 6. Verrouiller à nouveau l'accès (pour cette session) ---------- */

lockBtn.addEventListener('click', () => {
  app.classList.remove('unlocked');
  input.value = '';
  errorEl.textContent = '';
  closeLightbox();
  closeModal(helpModal);
  closeModal(creditsModal);
});

/* ---------- 7. Message de bienvenue ---------- */

function showWelcomeToast(){
  welcomeToast.classList.add('show');
  clearTimeout(welcomeTimer);
  welcomeTimer = setTimeout(() => welcomeToast.classList.remove('show'), 5200);
}

/* ---------- 8. Vérification du code d'accès ---------- */

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const value = input.value.trim();

  if(value === ACCESS_CODE){
    app.classList.add('unlocked');
    errorEl.textContent = '';
    showWelcomeToast();
    // On recentre au cas où la mise en page ait changé pendant que le portail était affiché
    if(slideMeta.length) centerOnSlideIndex(photosCount, true);
  } else {
    errorEl.textContent = "Code incorrect, essayez à nouveau.";
    gateCard.classList.remove('shake');
    void gateCard.offsetWidth;
    gateCard.classList.add('shake');
    input.focus();
    input.select();
  }
});
