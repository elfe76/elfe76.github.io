<!doctype html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>Elsa & John — Notre mariage</title>
<meta name="description" content="Les photos du mariage d'Elsa et John" />

<link rel="icon" type="image/png" href="favicon.png">
<link rel="shortcut icon" href="favicon.ico">

<meta property="og:title" content="Elsa & John — Notre mariage" />
<meta property="og:description" content="Un accès privé pour découvrir les photos de notre mariage 🌿" />
<meta property="og:image" content="og-image.jpg" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Elsa & John — Notre mariage" />
<meta name="twitter:image" content="og-image.jpg" />

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,500;1,600&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/style.css" />
</head>
<body>

<div id="app">

  <!-- Décor plein écran : le carrousel de photos -->
  <section class="scene" aria-hidden="true">
    <div class="carousel-wrap" id="carouselWrap">
      <div class="carousel-track" id="carouselTrack">
        <!-- Les photos sont injectées ici par script.js -->
        <p class="loading-hint">Chargement des souvenirs…</p>
      </div>
    </div>
    <div class="scene-veil" id="sceneVeil"></div>
  </section>

  <button type="button" class="nav-arrow nav-arrow--prev" id="prevBtn" aria-label="Photo précédente">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 4 L7 12 L15 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>
  <button type="button" class="nav-arrow nav-arrow--next" id="nextBtn" aria-label="Photo suivante">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 4 L17 12 L9 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>

  <!-- Titre, visible flou ou net selon l'état -->
  <header class="hero-title" id="heroTitle">
    <p class="eyebrow">Le mariage de</p>
    <h1>Elsa <span class="amp">&amp;</span> John</h1>
    <svg class="title-divider" viewBox="0 0 200 24" aria-hidden="true">
      <path d="M2 12 C 40 2, 70 22, 100 12 S 160 2, 198 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="100" cy="12" r="2.4" fill="currentColor" />
    </svg>
  </header>

  <!-- Compteur de progression -->
  <div class="progress-counter" id="progressCounter" aria-live="polite">1 / 1</div>

  <!-- Bouton pour reverrouiller l'accès sur cet appareil -->
  <button type="button" class="lock-btn" id="lockBtn" aria-label="Verrouiller à nouveau l'accès">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/>
      <path d="M8 10 V7 a4 4 0 0 1 8 0 v3" fill="none" stroke="currentColor" stroke-width="1.6"/>
    </svg>
    <span>Verrouiller</span>
  </button>

  <!-- Message de bienvenue après déverrouillage -->
  <div class="welcome-toast" id="welcomeToast">
    Bienvenue ! Et merci encore de votre présence en cette magnifique journée 🌿
  </div>

  <!-- Portail d'accès -->
  <div class="gate" id="gate">
    <div class="gate-card">

      <svg class="corner-flora corner-flora--tl" viewBox="0 0 120 120" aria-hidden="true">
        <path d="M6 6 C 30 4, 34 26, 20 34 C 40 30, 50 46, 44 62" fill="none" stroke="currentColor" stroke-width="1.3"/>
        <circle cx="20" cy="34" r="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
        <circle cx="44" cy="62" r="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
        <path d="M6 6 C 8 24, 24 30, 30 12" fill="none" stroke="currentColor" stroke-width="1.1"/>
      </svg>

      <svg class="corner-flora corner-flora--br" viewBox="0 0 120 120" aria-hidden="true">
        <path d="M114 114 C 90 116, 86 94, 100 86 C 80 90, 70 74, 76 58" fill="none" stroke="currentColor" stroke-width="1.3"/>
        <circle cx="100" cy="86" r="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
        <circle cx="76" cy="58" r="3" fill="none" stroke="currentColor" stroke-width="1.2"/>
        <path d="M114 114 C 112 96, 96 90, 90 108" fill="none" stroke="currentColor" stroke-width="1.1"/>
      </svg>

      <p class="gate-eyebrow">Un instant précieux, juste pour vous</p>
      <h2>Entrez le code pour découvrir nos photos</h2>

      <form id="gateForm" autocomplete="off" novalidate>
        <label for="codeInput" class="visually-hidden">Code d'accès</label>
        <input
          type="text"
          id="codeInput"
          name="code"
          inputmode="numeric"
          autocomplete="off"
          placeholder="Code d'accès"
          aria-describedby="gateError"
        />
        <button type="submit">Découvrir</button>
      </form>

      <p class="gate-error" id="gateError" role="alert" aria-live="polite"></p>
    </div>
  </div>

</div>

<!-- Visionnage plein écran d'une photo -->
<div class="lightbox" id="lightbox" aria-hidden="true">
  <button type="button" class="lightbox-close" id="lightboxClose" aria-label="Fermer">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 5 L19 19 M19 5 L5 19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  </button>
  <button type="button" class="lightbox-nav lightbox-nav--prev" id="lightboxPrev" aria-label="Photo précédente">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4 L7 12 L15 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </button>
  <div class="lightbox-stage" id="lightboxStage">
    <img id="lightboxImg" src="" alt="Photo du mariage d'Elsa et John en plein écran" draggable="false" />
  </div>
  <button type="button" class="lightbox-nav lightbox-nav--next" id="lightboxNext" aria-label="Photo suivante">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4 L17 12 L9 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </button>
  <div class="lightbox-counter" id="lightboxCounter">1 / 1</div>
</div>

<script src="js/script.js"></script>
</body>
</html>
