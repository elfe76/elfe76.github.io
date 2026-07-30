/* ============================================
   Elsa & John — Mariage
   - Charge automatiquement toutes les photos listées
     dans photos.json (aucune limite de nombre)
   - Vérifie le code d'accès
   ============================================ */

const ACCESS_CODE = "04072026";

const track   = document.getElementById('carouselTrack');
const app     = document.getElementById('app');
const form    = document.getElementById('gateForm');
const input   = document.getElementById('codeInput');
const errorEl = document.getElementById('gateError');
const gateCard= document.querySelector('.gate-card');

// Empêche de garder le focus/valeur du champ après déverrouillage
sessionStorage.removeItem?.('__noop__');

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

  // On construit la liste des <img>, une fois
  const frag = document.createDocumentFragment();
  photos.forEach((src) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = 'Photo du mariage d\'Elsa et John';
    img.loading = 'lazy';
    img.draggable = false;
    frag.appendChild(img);
  });

  track.innerHTML = '';
  track.appendChild(frag);

  // On duplique la série une seconde fois pour un défilement en boucle parfaitement fluide
  const clone = track.innerHTML;
  track.insertAdjacentHTML('beforeend', clone);

  // Durée du défilement proportionnelle au nombre de photos (s'adapte automatiquement)
  const secondsPerPhoto = 6.5;
  const duration = Math.max(24, photos.length * secondsPerPhoto);
  track.style.setProperty('--carousel-speed', duration + 's');
  track.style.animationDuration = duration + 's';
}

loadPhotos();

/* ---------- 2. Pause au survol / au toucher ---------- */

const wrap = document.getElementById('carouselWrap');
['mouseenter','touchstart'].forEach(evt =>
  wrap.addEventListener(evt, () => track.classList.add('paused'), { passive:true })
);
['mouseleave','touchend'].forEach(evt =>
  wrap.addEventListener(evt, () => track.classList.remove('paused'), { passive:true })
);

/* ---------- 3. Vérification du code d'accès ---------- */

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const value = input.value.trim();

  if(value === ACCESS_CODE){
    app.classList.add('unlocked');
    errorEl.textContent = '';
  } else {
    errorEl.textContent = "Code incorrect, essayez à nouveau.";
    gateCard.classList.remove('shake');
    // force le reflow pour rejouer l'animation
    void gateCard.offsetWidth;
    gateCard.classList.add('shake');
    input.focus();
    input.select();
  }
});
