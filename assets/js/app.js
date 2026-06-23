// assets/js/app.js

import { initMap, loadCountryPolygons, focusCountry } from './map.js';
import { initUI, openCountryDetailsModal, flagImg, initViewToggle } from './ui.js';
import { initStatsView } from './stats.js';

// Cache key constants
const CACHE_KEY_DATA = 'wc2026_tournament_data';
const CACHE_KEY_TIME = 'wc2026_cache_timestamp';
const CACHE_EXPIRATION_MS = 12 * 60 * 60 * 1000; // 12 Hours in milliseconds

/**
 * Main application orchestrator
 */
async function bootstrap() {
  try {
    // 1. Initialize the Leaflet map base layer
    initMap();

    // 2. Fetch the tournament data (with cache validation)
    const data = await getTournamentData();

    // 3. Callback when a country is selected (via map or sidebar list)
    const handleCountrySelection = (countryId) => {
      // Open Level 1 matches modal
      openCountryDetailsModal(countryId);
      // Pan and zoom the map to the country polygon
      focusCountry(countryId);
    };

    // 4. Render the country boundaries on the map
    await loadCountryPolygons(data.countries, handleCountrySelection);

    // 5. Setup sidebar listings, events, and search triggers
    initUI(data, handleCountrySelection);

    // 5.2 Initialize view toggle buttons
    initViewToggle();

    // 5.5 Initialize statistics view with flag images
    initStatsView(data, flagImg);

    // 6. Update map overlays
    const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

    // Fecha actual
    const overlayEl = document.getElementById('overlay-date-text');
    if (overlayEl) {
      const today = new Date();
      overlayEl.textContent = `Mundial en curso (${MONTHS[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()})`;
    }

    // Última actualización de datos
    const updateEl = document.getElementById('overlay-update-text');
    if (updateEl) {
      const lastUpdated = data.dataLastUpdated || '2026-06-23T05:00:00Z';
      const dt = new Date(lastUpdated);
      // Mostrar en UTC-3 (Argentina)
      const localHour = ((dt.getUTCHours() - 3) + 24) % 24;
      const localMin  = dt.getUTCMinutes().toString().padStart(2, '0');
      updateEl.textContent = `Últ. actualización: ${dt.getUTCDate()} ${MONTHS_SHORT[dt.getUTCMonth()]} ${dt.getUTCFullYear()}, ${localHour}:${localMin} hs`;
    }

    // Próximo partido
    const nextMatchEl = document.getElementById('overlay-next-match');
    if (nextMatchEl) {
      // Use the last played match date as reference (no browser-clock dependency)
      const lastPlayedDate = data.matches
        .filter(m => m.status === 'played')
        .reduce((max, m) => { const d = new Date(m.date); return d > max ? d : max; }, new Date(0));

      const nextMatch = [...data.matches]
        .filter(m => m.status === 'scheduled' && new Date(m.date) > lastPlayedDate)
        .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

      if (nextMatch) {
        const d   = new Date(nextMatch.date);
        const arg = new Date(d.getTime() - 3 * 60 * 60 * 1000); // UTC-3 Argentina
        const hh  = arg.getUTCHours().toString().padStart(2, '0');
        const mm  = arg.getUTCMinutes().toString().padStart(2, '0');
        const dateLabel = `${arg.getUTCDate()} ${MONTHS_SHORT[arg.getUTCMonth()]} • ${hh}:${mm} hs (ARG)`;
        nextMatchEl.innerHTML = `
          <span class="overlay-next-label">Próximo partido</span>
          <div class="overlay-next-teams">
            <span class="overlay-next-team">${flagImg(nextMatch.homeTeam, 'w20')} ${nextMatch.homeTeam}</span>
            <span class="overlay-next-vs">vs</span>
            <span class="overlay-next-team">${nextMatch.awayTeam} ${flagImg(nextMatch.awayTeam, 'w20')}</span>
          </div>
          <span class="overlay-next-details">${dateLabel} | ${nextMatch.venue}</span>
        `;
      }
    }

  } catch (error) {
    console.error('Error al iniciar la aplicación:', error);
    // Display error message to user
    const container = document.getElementById('countries-list');
    if (container) {
      container.innerHTML = `
        <div class="loading-state">
          <p style="color: #ef4444;">⚠️ Error de conexión al sincronizar los datos de la FIFA. Por favor, recarga la página.</p>
        </div>
      `;
    }
  }
}

/**
 * Resolves the tournament data. Either loads it from localStorage
 * or fetches it from the serverless API if cache is expired or missing.
 */
async function getTournamentData() {
  const cachedData = localStorage.getItem(CACHE_KEY_DATA);
  const cachedTime = localStorage.getItem(CACHE_KEY_TIME);
  const now = Date.now();

  // If cache exists, is less than 12 hours old, and has dataLastUpdated, return it
  if (cachedData && cachedTime && (now - parseInt(cachedTime, 10) < CACHE_EXPIRATION_MS)) {
    const parsed = JSON.parse(cachedData);
    if (parsed.dataLastUpdated) {
      console.log('Caché local válido detectado (< 12hs). Cargando datos de LocalStorage...');
      return parsed;
    }
    console.log('Caché desactualizado (sin dataLastUpdated). Refrescando...');
  }

  // Cache is missing or expired -> Fetch fresh data from backend
  console.log('Caché local inactivo o expirado. Solicitando datos actualizados a /api/scores...');
  const response = await fetch('/api/scores');
  if (!response.ok) {
    throw new Error(`Error HTTP: ${response.status}`);
  }

  const freshData = await response.json();

  // Save to cache
  localStorage.setItem(CACHE_KEY_DATA, JSON.stringify(freshData));
  localStorage.setItem(CACHE_KEY_TIME, now.toString());

  return freshData;
}

// Start application when DOM loads
document.addEventListener('DOMContentLoaded', bootstrap);
