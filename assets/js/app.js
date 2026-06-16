// assets/js/app.js

import { initMap, loadCountryPolygons, focusCountry } from './map.js';
import { initUI, openCountryDetailsModal } from './ui.js';

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

  // If cache exists and is less than 12 hours old, return it
  if (cachedData && cachedTime && (now - parseInt(cachedTime, 10) < CACHE_EXPIRATION_MS)) {
    console.log('Caché local válido detectado (< 12hs). Cargando datos de LocalStorage...');
    return JSON.parse(cachedData);
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
