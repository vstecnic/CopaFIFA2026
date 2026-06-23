// assets/js/stats.js - Estadísticas y tablas de posiciones

/**
 * Calcula estadísticas de grupos
 */
export function calculateGroupStandings(countries, matches) {
  const standings = {};

  // Inicializar grupos
  countries.forEach(country => {
    if (!standings[country.group]) {
      standings[country.group] = [];
    }
    standings[country.group].push({
      id: country.id,
      name: country.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0
    });
  });

  // Procesar matches jugados
  matches.forEach(match => {
    if (match.status !== 'played') return;

    const homeTeam = match.homeTeam;
    const awayTeam = match.awayTeam;
    const homeScore = match.result.homeScore;
    const awayScore = match.result.awayScore;

    // Actualizar home team
    const homeStanding = standings[countries.find(c => c.id === homeTeam)?.group]?.find(s => s.id === homeTeam);
    if (homeStanding) {
      homeStanding.played += 1;
      homeStanding.goalsFor += homeScore;
      homeStanding.goalsAgainst += awayScore;
      if (homeScore > awayScore) {
        homeStanding.won += 1;
        homeStanding.points += 3;
      } else if (homeScore === awayScore) {
        homeStanding.drawn += 1;
        homeStanding.points += 1;
      } else {
        homeStanding.lost += 1;
      }
    }

    // Actualizar away team
    const awayStanding = standings[countries.find(c => c.id === awayTeam)?.group]?.find(s => s.id === awayTeam);
    if (awayStanding) {
      awayStanding.played += 1;
      awayStanding.goalsFor += awayScore;
      awayStanding.goalsAgainst += homeScore;
      if (awayScore > homeScore) {
        awayStanding.won += 1;
        awayStanding.points += 3;
      } else if (awayScore === homeScore) {
        awayStanding.drawn += 1;
        awayStanding.points += 1;
      } else {
        awayStanding.lost += 1;
      }
    }
  });

  // Ordenar cada grupo por puntos, diferencia de goles, goles a favor
  Object.keys(standings).forEach(group => {
    standings[group].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const diffA = a.goalsFor - a.goalsAgainst;
      const diffB = b.goalsFor - b.goalsAgainst;
      if (diffB !== diffA) return diffB - diffA;
      return b.goalsFor - a.goalsFor;
    });
  });

  return standings;
}

/**
 * Obtiene el top 10 de goleadores
 */
export function getTopScorers(matches, countries) {
  const scorers = {};

  matches.forEach(match => {
    if (match.status !== 'played' || !match.result.scorers) return;

    match.result.scorers.forEach(scorer => {
      if (!scorers[scorer.name]) {
        scorers[scorer.name] = {
          name: scorer.name,
          team: scorer.team,
          goals: 0,
          wikiName: scorer.wikiName
        };
      }
      scorers[scorer.name].goals += 1;
    });
  });

  return Object.values(scorers)
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 10);
}

/**
 * Renderiza la tabla de posiciones con banderas
 */
export function renderStandings(standings, container, flagImgFn) {
  container.innerHTML = '';

  const groups = Object.keys(standings).sort();

  groups.forEach(group => {
    const div = document.createElement('div');
    div.className = 'standings-group';

    const title = document.createElement('div');
    title.className = 'group-title';
    title.textContent = `Grupo ${group}`;
    div.appendChild(title);

    const table = document.createElement('table');
    table.className = 'standings-table';

    // Header
    const headerRow = table.createTHead().insertRow();
    const headers = ['País', 'PJ', 'G', 'E', 'P', 'GF', 'GC', 'DG', 'Pts'];
    headers.forEach(header => {
      const th = document.createElement('td');
      th.style.fontWeight = '700';
      th.textContent = header;
      headerRow.appendChild(th);
    });

    // Rows
    const tbody = table.createTBody();
    standings[group].forEach(team => {
      const row = tbody.insertRow();
      let countryCell = `${team.name}`;

      // Agregar bandera si flagImgFn está disponible
      if (flagImgFn) {
        const flagHtml = flagImgFn(team.id, 'w20');
        countryCell = `${flagHtml} ${team.name}`;
      }

      row.innerHTML = `
        <td>${countryCell}</td>
        <td>${team.played}</td>
        <td>${team.won}</td>
        <td>${team.drawn}</td>
        <td>${team.lost}</td>
        <td>${team.goalsFor}</td>
        <td>${team.goalsAgainst}</td>
        <td>${team.goalsFor - team.goalsAgainst}</td>
        <td style="font-weight: 700; color: var(--accent-color);">${team.points}</td>
      `;
    });

    div.appendChild(table);
    container.appendChild(div);
  });
}

/**
 * Renderiza el top 10 de goleadores
 */
export function renderTopScorers(topScorers, container) {
  container.innerHTML = '';

  if (topScorers.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No hay goleadores registrados</p>';
    return;
  }

  topScorers.forEach((scorer, index) => {
    const div = document.createElement('div');
    div.className = 'scorer-card';

    const rank = document.createElement('span');
    rank.className = 'scorer-rank';
    rank.textContent = `${index + 1}`;

    const photo = document.createElement('img');
    photo.className = 'scorer-photo';
    photo.alt = scorer.name;
    photo.loading = 'lazy';

    // Cargar foto del jugador (si está disponible)
    if (scorer.wikiName) {
      loadScorerPhoto(photo, scorer.wikiName);
    } else {
      photo.style.display = 'none';
    }

    const info = document.createElement('div');
    info.className = 'scorer-info';

    const name = document.createElement('div');
    name.className = 'scorer-name';
    name.textContent = scorer.name;

    const country = document.createElement('div');
    country.className = 'scorer-country';
    const countryObj = Array.isArray(arguments[2]) ? arguments[2].find(c => c.id === scorer.team) : null;
    country.textContent = countryObj ? countryObj.name : scorer.team;

    info.appendChild(name);
    info.appendChild(country);

    const goals = document.createElement('span');
    goals.className = 'scorer-goals';
    goals.textContent = `${scorer.goals} ⚽`;

    div.appendChild(rank);
    div.appendChild(photo);
    div.appendChild(info);
    div.appendChild(goals);

    container.appendChild(div);
  });
}

/**
 * Carga la foto del goleador desde Wikipedia
 */
async function loadScorerPhoto(imgEl, wikiName) {
  // Si es URL directa, usarla
  if (wikiName.startsWith('https://')) {
    imgEl.src = wikiName;
    imgEl.style.display = 'block';
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
      imgEl.style.display = 'block';
    }
  } catch (error) {
    console.log(`No se pudo cargar foto para ${wikiName}`);
  }
}

/**
 * Inicializa las vistas de estadísticas y los tab buttons
 */
export function initStatsView(data, flagImgFn) {
  const standings = calculateGroupStandings(data.countries, data.matches);
  const topScorers = getTopScorers(data.matches, data.countries);

  const standingsContainer = document.getElementById('standings-container');
  const scorersContainer = document.getElementById('top-scorers-container');

  if (standingsContainer) {
    renderStandings(standings, standingsContainer, flagImgFn);
  }

  if (scorersContainer) {
    renderTopScorers(topScorers, scorersContainer, data.countries);
  }

  // Initialize stats tab buttons
  initStatsTabButtons();

  return { standings, topScorers };
}

/**
 * Maneja los botones de navegación entre tabs en estadísticas
 */
function initStatsTabButtons() {
  const standingsBtn = document.getElementById('btn-standings-tab');
  const scorersBtn = document.getElementById('btn-scorers-tab');
  const standingsTab = document.getElementById('tab-standings');
  const scorersTab = document.getElementById('tab-scorers');

  if (standingsBtn && scorersBtn && standingsTab && scorersTab) {
    standingsBtn.addEventListener('click', () => {
      standingsTab.style.display = 'block';
      scorersTab.style.display = 'none';
      standingsBtn.classList.add('active');
      scorersBtn.classList.remove('active');
    });

    scorersBtn.addEventListener('click', () => {
      standingsTab.style.display = 'none';
      scorersTab.style.display = 'block';
      scorersBtn.classList.add('active');
      standingsBtn.classList.remove('active');
    });
  }
}
