// assets/js/ui.js

// ISO 3166-1 alpha-3 → alpha-2 mapping for flagcdn.com
// Windows does not render flag emoji — we use real flag images instead.
const ISO3_TO_ISO2 = {
  MEX:'mx', ZAF:'za', KOR:'kr', CZE:'cz', CAN:'ca', BIH:'ba', QAT:'qa', CHE:'ch',
  BRA:'br', MAR:'ma', HTI:'ht', SCO:'gb-sct', USA:'us', PRY:'py', AUS:'au', TUR:'tr',
  DEU:'de', CUW:'cw', CIV:'ci', ECU:'ec', NLD:'nl', JPN:'jp', SWE:'se', TUN:'tn',
  BEL:'be', EGY:'eg', IRN:'ir', NZL:'nz', ESP:'es', CPV:'cv', SAU:'sa', URY:'uy',
  FRA:'fr', SEN:'sn', IRQ:'iq', NOR:'no', ARG:'ar', DZA:'dz', AUT:'at', JOR:'jo',
  PRT:'pt', COD:'cd', UZB:'uz', COL:'co', GBR:'gb', HRV:'hr', GHA:'gh', PAN:'pa'
};

// Returns an <img> HTML string for a country flag from flagcdn.com
// size: 'w20' | 'w40' | 'w80' (width in px, height proportional ~3:4)
export function flagImg(iso3, size = 'w40') {
  const code = ISO3_TO_ISO2[iso3];
  if (!code) return '';
  return `<img src="https://flagcdn.com/${size}/${code}.webp" class="flag-img" alt="${iso3}" loading="lazy">`;
}

// Kept for backward compat (not used for display anymore)
export const flags = {};

// Global references to UI state
let appData = null;
let currentOnCountryClickCallback = null;

// DOM Elements cached
const searchInput = document.getElementById('search-input');
const countriesList = document.getElementById('countries-list');
const matchesModal = document.getElementById('matches-modal');
const closeMatchesModal = document.getElementById('close-matches-modal');
const matchDetailsModal = document.getElementById('match-details-modal');
const closeDetailsModal = document.getElementById('close-details-modal');

// Level 1 elements
const modalCountryFlag = document.getElementById('modal-country-flag');
const modalCountryName = document.getElementById('modal-country-name');
const modalCountryGroup = document.getElementById('modal-country-group');
const modalStatParticipations = document.getElementById('modal-stat-participations');
const modalStatTitles = document.getElementById('modal-stat-titles');
const modalStatBest = document.getElementById('modal-stat-best');
const modalMatchesList = document.getElementById('modal-matches-list');

// Level 2 elements
const detailMatchStage = document.getElementById('detail-match-stage');
const detailHomeFlag = document.getElementById('detail-home-flag');
const detailHomeName = document.getElementById('detail-home-name');
const detailAwayFlag = document.getElementById('detail-away-flag');
const detailAwayName = document.getElementById('detail-away-name');
const detailHomeScore = document.getElementById('detail-home-score');
const detailAwayScore = document.getElementById('detail-away-score');
const detailMatchVenue = document.getElementById('detail-match-venue');
const stickersGrid = document.getElementById('stickers-grid');

/**
 * Formats a UTC ISO Date string into Argentina timezone (GMT-3) formatted text
 * @param {string} dateStr UTC ISO Date string
 */
export function formatToArgentinaTime(dateStr) {
  const date = new Date(dateStr);
  try {
    const formatted = date.toLocaleString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    // Capitalize first letter (e.g. "jueves" -> "Jueves")
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch (error) {
    console.error('Error formatting timezone:', error);
    return date.toLocaleString();
  }
}

/**
 * Initialize all UI events and listeners
 * @param {Object} data The complete synchronized tournament dataset
 * @param {Function} onCountryClick Action triggered when country card clicked
 */
export function initUI(data, onCountryClick) {
  appData = data;
  currentOnCountryClickCallback = onCountryClick;

  // Render full sidebar list initially
  renderSidebar(appData.countries);

  // Setup search filter listener
  searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    const filtered = appData.countries.filter(c => 
      c.name.toLowerCase().includes(term) || 
      c.id.toLowerCase().includes(term) ||
      `grupo ${c.group.toLowerCase()}`.includes(term)
    );
    renderSidebar(filtered);
  });

  // Modal Closures
  closeMatchesModal.addEventListener('click', () => hideModal(matchesModal));
  closeDetailsModal.addEventListener('click', () => hideModal(matchDetailsModal));

  // Close modals clicking outside the content box
  window.addEventListener('click', (e) => {
    if (e.target === matchesModal) hideModal(matchesModal);
    if (e.target === matchDetailsModal) hideModal(matchDetailsModal);
  });

  // Esc key closure
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (matchDetailsModal.classList.contains('active')) {
        hideModal(matchDetailsModal);
      } else if (matchesModal.classList.contains('active')) {
        hideModal(matchesModal);
      }
    }
  });
}

/**
 * Renders the sidebar with countries
 * @param {Array} countriesToRender Filtered list of countries to show
 */
function renderSidebar(countriesToRender) {
  countriesList.innerHTML = '';

  if (countriesToRender.length === 0) {
    countriesList.innerHTML = `
      <div class="loading-state">
        <p>No se encontraron países participantes.</p>
      </div>
    `;
    return;
  }

  // Sort countries alphabetically
  const sorted = [...countriesToRender].sort((a, b) => a.name.localeCompare(b.name));

  sorted.forEach(country => {
    const titles = country.stats.titles;

    // Cup badge if they have won World Cups
    let titlesBadge = '';
    if (titles > 0) {
      titlesBadge = `<span class="cups-won">⭐ ${titles}</span>`;
    }

    const item = document.createElement('div');
    item.className = 'country-item';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.innerHTML = `
      <div class="country-item-info">
        <span class="country-item-flag">${flagImg(country.id, 'w40')}</span>
        <div class="country-item-details">
          <span class="country-item-name">${country.name}</span>
          <span class="country-item-group">Grupo ${country.group}</span>
        </div>
      </div>
      <div class="country-item-stats">
        ${titlesBadge}
        <span>Part: ${country.stats.participations}</span>
      </div>
    `;

    // Click and keyboard accessibility
    const clickHandler = () => {
      if (currentOnCountryClickCallback) {
        currentOnCountryClickCallback(country.id);
      }
    };
    item.addEventListener('click', clickHandler);
    item.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        clickHandler();
      }
    });

    countriesList.appendChild(item);
  });
}

/**
 * Helper to show modal with correct animations
 */
function showModal(modal) {
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden'; // Lock background scroll
}

/**
 * Helper to hide modal
 */
function hideModal(modal) {
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  if (!matchesModal.classList.contains('active') && !matchDetailsModal.classList.contains('active')) {
    document.body.style.overflow = ''; // Restore scroll
  }
}

/**
 * Opens Level 1 Modal: Country matches & Stats
 * @param {string} countryId ISO alpha-3 country code
 */
export function openCountryDetailsModal(countryId) {
  const country = appData.countries.find(c => c.id === countryId);
  if (!country) return;

  // Populate basic header data
  modalCountryFlag.innerHTML = flagImg(countryId, 'w80');
  modalCountryName.textContent = country.name;
  modalCountryGroup.textContent = `Grupo ${country.group}`;
  
  modalStatParticipations.textContent = country.stats.participations;
  modalStatTitles.textContent = country.stats.titles;
  modalStatBest.textContent = country.stats.bestFinish;

  // Filter matches related to this country
  const countryMatches = appData.matches.filter(m => 
    m.homeTeam === countryId || m.awayTeam === countryId
  );

  // Sort matches by date
  countryMatches.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Render match items
  modalMatchesList.innerHTML = '';

  countryMatches.forEach(match => {
    const homeName = appData.countries.find(c => c.id === match.homeTeam)?.name || match.homeTeam;
    const awayName = appData.countries.find(c => c.id === match.awayTeam)?.name || match.awayTeam;
    const homeFlag = flagImg(match.homeTeam, 'w40');
    const awayFlag = flagImg(match.awayTeam, 'w40');

    const matchCard = document.createElement('div');
    matchCard.className = `match-item ${match.status}`;

    if (match.status === 'played') {
      matchCard.setAttribute('role', 'button');
      matchCard.setAttribute('tabindex', '0');

      // Aggregate scorers names for quick preview on card
      let scorersSummary = '';
      if (match.result.scorers && match.result.scorers.length > 0) {
        const scorerLines = match.result.scorers.map(s => `${flagImg(s.team, 'w20')} ${s.name} (${s.minute}')`);
        scorersSummary = `
          <div class="match-scorers-preview">
            ⚽ ${scorerLines.join(' &nbsp;·&nbsp; ')}
          </div>
        `;
      }

      matchCard.innerHTML = `
        <div class="match-info-top">
          <span class="match-stage">${match.group ? 'Grupo ' + match.group : match.stage}</span>
          <span class="match-date-badge">Jugado</span>
        </div>
        <div class="match-teams-row">
          <div class="match-team team-home">
            <span class="match-flag-small" aria-hidden="true">${homeFlag}</span>
            <span>${homeName}</span>
          </div>
          <div class="match-score-bubble">
            <span>${match.result.homeScore}</span>
            <span>-</span>
            <span>${match.result.awayScore}</span>
          </div>
          <div class="match-team team-away">
            <span>${awayName}</span>
            <span class="match-flag-small" aria-hidden="true">${awayFlag}</span>
          </div>
        </div>
        <div class="match-venue">${match.venue}</div>
        ${scorersSummary}
      `;

      // Trigger Level 2 modal on click
      const openDetailsHandler = (e) => {
        e.stopPropagation();
        openMatchDetailModal(match);
      };
      matchCard.addEventListener('click', openDetailsHandler);
      matchCard.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          openDetailsHandler(e);
        }
      });

    } else {
      // Unplayed Match -> format to Argentina GMT-3 timezone
      const formattedArgTime = formatToArgentinaTime(match.date);

      matchCard.innerHTML = `
        <div class="match-info-top">
          <span class="match-stage">${match.group ? 'Grupo ' + match.group : match.stage}</span>
          <span class="match-date-badge">Próximamente</span>
        </div>
        <div class="match-teams-row">
          <div class="match-team team-home">
            <span class="match-flag-small" aria-hidden="true">${homeFlag}</span>
            <span>${homeName}</span>
          </div>
          <div class="match-score-bubble future">
            VS
          </div>
          <div class="match-team team-away">
            <span>${awayName}</span>
            <span class="match-flag-small" aria-hidden="true">${awayFlag}</span>
          </div>
        </div>
        <div class="match-venue">${match.venue}</div>
        <div class="match-scorers-preview text-center">
          🕒 Hora ARG: <b>${formattedArgTime}</b>
        </div>
      `;
    }

    modalMatchesList.appendChild(matchCard);
  });

  showModal(matchesModal);
}

/**
 * Fetches a player photo from Wikipedia REST API and injects it into the img element.
 * Falls back to the fallback element if no image is found.
 * @param {HTMLImageElement} imgEl
 * @param {HTMLElement} fallbackEl
 * @param {string|null} wikiName Wikipedia article title (underscores, no accent needed — Wikipedia redirects)
 */
async function loadPlayerPhoto(imgEl, fallbackEl, wikiName) {
  if (!wikiName) {
    imgEl.style.display = 'none';
    fallbackEl.style.display = 'flex';
    return;
  }
  // Direct image URL override (e.g. Wikimedia Commons URL)
  if (wikiName.startsWith('https://')) {
    imgEl.src = wikiName;
    return;
  }
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiName)}`,
      { headers: { 'Accept': 'application/json' } }
    );
    const data = await res.json();
    if (data.thumbnail?.source) {
      imgEl.src = data.thumbnail.source;
    } else {
      imgEl.style.display = 'none';
      fallbackEl.style.display = 'flex';
    }
  } catch {
    imgEl.style.display = 'none';
    fallbackEl.style.display = 'flex';
  }
}

/**
 * Opens Level 2 Modal: Sticker grid representing goalscorers in 3D effect
 * @param {Object} match The played match object
 */
function openMatchDetailModal(match) {
  const homeName = appData.countries.find(c => c.id === match.homeTeam)?.name || match.homeTeam;
  const awayName = appData.countries.find(c => c.id === match.awayTeam)?.name || match.awayTeam;
  // Render header scoreboard details
  detailMatchStage.textContent = match.group ? `Grupo ${match.group}` : match.stage;
  detailHomeFlag.innerHTML = flagImg(match.homeTeam, 'w80');
  detailAwayFlag.innerHTML = flagImg(match.awayTeam, 'w80');
  detailHomeName.textContent = homeName;
  detailAwayName.textContent = awayName;
  detailHomeScore.textContent = match.result.homeScore;
  detailAwayScore.textContent = match.result.awayScore;
  detailMatchVenue.textContent = match.venue;

  // Clear previous sticker card nodes
  stickersGrid.innerHTML = '';

  const scorers = match.result.scorers || [];

  if (scorers.length === 0) {
    stickersGrid.innerHTML = `
      <p class="empty-scorers-msg">Partido sin goles registrados.</p>
    `;
  } else {
    scorers.forEach(scorer => {
      const sticker = document.createElement('div');
      sticker.className = 'sticker-card has-glow';

      const imgEl = document.createElement('img');
      imgEl.className = 'sticker-avatar';
      imgEl.alt = scorer.name;
      imgEl.loading = 'lazy';

      const fallbackEl = document.createElement('div');
      fallbackEl.className = 'sticker-fallback';
      fallbackEl.setAttribute('aria-hidden', 'true');
      fallbackEl.style.display = 'none';
      fallbackEl.textContent = '👤';

      const photoContainer = document.createElement('div');
      photoContainer.className = 'sticker-photo-container';
      photoContainer.appendChild(imgEl);
      photoContainer.appendChild(fallbackEl);

      const scorerCountryName = appData.countries.find(c => c.id === scorer.team)?.name || scorer.team;
      sticker.innerHTML = `
        <div class="sticker-name" title="${scorer.name}">${scorer.name}</div>
        <div class="sticker-meta">
          <span class="sticker-team-badge">${flagImg(scorer.team, 'w20')} ${scorerCountryName}</span>
          <span class="sticker-minute">⚽ ${scorer.minute}'</span>
        </div>
      `;
      sticker.prepend(photoContainer);

      stickersGrid.appendChild(sticker);

      // Async load Wikipedia photo (non-blocking)
      loadPlayerPhoto(imgEl, fallbackEl, scorer.wikiName || null);
    });
  }

  showModal(matchDetailsModal);
}
