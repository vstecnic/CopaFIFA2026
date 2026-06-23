// assets/js/mobile-ui.js - Mobile UI interactions for floating modals

/**
 * Inicializa los controles de modales flotantes para mobile
 */
export function initMobileUI(data, flagImgFn, countries, onCountryClick) {
  const fabList = document.getElementById('fab-list');
  const fabStats = document.getElementById('fab-stats');
  const listModal = document.getElementById('mobile-list-modal');
  const statsModal = document.getElementById('mobile-stats-modal');
  const closeListBtn = document.getElementById('close-list-modal');
  const closeStatsBtn = document.getElementById('close-stats-modal');

  // Lista de países
  if (fabList) {
    fabList.addEventListener('click', () => {
      listModal.classList.add('active');
      populateMobileCountriesList(countries, flagImgFn, onCountryClick, listModal);
    });
  }

  if (closeListBtn) {
    closeListBtn.addEventListener('click', () => {
      listModal.classList.remove('active');
    });
  }

  // Estadísticas
  if (fabStats) {
    fabStats.addEventListener('click', () => {
      statsModal.classList.add('active');
      populateMobileStats(data, flagImgFn);
    });
  }

  if (closeStatsBtn) {
    closeStatsBtn.addEventListener('click', () => {
      statsModal.classList.remove('active');
    });
  }

  // Tabs dentro de estadísticas
  const standingsBtn = document.getElementById('mobile-standings-btn');
  const scorersBtn = document.getElementById('mobile-scorers-btn');
  const standingsView = document.getElementById('mobile-standings-view');
  const scorersView = document.getElementById('mobile-scorers-view');

  if (standingsBtn && scorersBtn) {
    standingsBtn.addEventListener('click', () => {
      standingsView.style.display = 'block';
      scorersView.style.display = 'none';
      standingsBtn.classList.add('active');
      scorersBtn.classList.remove('active');
    });

    scorersBtn.addEventListener('click', () => {
      standingsView.style.display = 'none';
      scorersView.style.display = 'block';
      scorersBtn.classList.add('active');
      standingsBtn.classList.remove('active');
    });
  }
}

/**
 * Rellena la lista de países en mobile
 */
function populateMobileCountriesList(countries, flagImgFn, onCountryClick, listModal) {
  const container = document.getElementById('mobile-countries-list');
  if (!container) return;

  container.innerHTML = '';
  countries.forEach(country => {
    const div = document.createElement('div');
    div.className = 'mobile-country-item';
    const flagHtml = flagImgFn ? flagImgFn(country.id, 'w20') : '';
    div.innerHTML = `
      <div class="mobile-country-flag">${flagHtml}</div>
      <div class="mobile-country-info">
        <div class="mobile-country-name">${country.name}</div>
        <div class="mobile-country-group">Grupo ${country.group}</div>
      </div>
      <div class="mobile-country-stars">⭐ ${country.stats?.titles || 0}</div>
    `;

    // Agregar listener de click para abrir detalles del país
    div.addEventListener('click', () => {
      // Cerrar el modal de lista de países primero
      if (listModal) {
        listModal.classList.remove('active');
      }
      // Cerrar el modal de estadísticas también si está abierto
      const statsModal = document.getElementById('mobile-stats-modal');
      if (statsModal) {
        statsModal.classList.remove('active');
      }
      // Pequeño delay para cerrar modales antes de abrir detalles
      setTimeout(() => {
        if (onCountryClick) {
          onCountryClick(country.id);
        }
      }, 100);
    });

    // Cursor pointer para indicar que es clickeable
    div.style.cursor = 'pointer';

    container.appendChild(div);
  });
}

/**
 * Rellena las estadísticas en mobile
 */
function populateMobileStats(data, flagImgFn) {
  // Importar funciones de stats.js
  const { calculateGroupStandings, getTopScorers, renderStandings, renderTopScorers } =
    window.statsModule || {};

  if (!calculateGroupStandings) {
    console.warn('Stats module not loaded');
    return;
  }

  const standings = calculateGroupStandings(data.countries, data.matches);
  const topScorers = getTopScorers(data.matches, data.countries);

  const standingsContainer = document.getElementById('mobile-standings-view');
  const scorersContainer = document.getElementById('mobile-scorers-view');

  if (standingsContainer) {
    renderStandings(standings, standingsContainer, flagImgFn);
  }

  if (scorersContainer) {
    renderTopScorers(topScorers, scorersContainer, data.countries);
  }
}
