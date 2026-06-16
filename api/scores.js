// api/scores.js
import { readFileSync } from 'fs';
import { join } from 'path';

// The 48 countries participating in the 2026 FIFA World Cup, grouped A-L
// according to the official final draw. ID matches ISO 3166-1 alpha-3 codes
// (or a close equivalent) for Leaflet GeoJSON synchronization.
// Note: England (GBR) and Scotland (SCO) share a single landmass in the
// Natural Earth GeoJSON (ISO_A3 "GBR"), so only England highlights on the map.
const countries = [
  // Group A
  { id: "MEX", name: "México", group: "A", stats: { participations: 18, titles: 0, runnersUp: 0, bestFinish: "Cuartos de Final (1970, 1986)" } },
  { id: "ZAF", name: "Sudáfrica", group: "A", stats: { participations: 4, titles: 0, runnersUp: 0, bestFinish: "Fase de Grupos" } },
  { id: "KOR", name: "Corea del Sur", group: "A", stats: { participations: 12, titles: 0, runnersUp: 0, bestFinish: "Cuarto Puesto (2002)" } },
  { id: "CZE", name: "Chequia", group: "A", stats: { participations: 11, titles: 0, runnersUp: 2, bestFinish: "Subcampeón (1934, 1962)" } },

  // Group B
  { id: "CAN", name: "Canadá", group: "B", stats: { participations: 3, titles: 0, runnersUp: 0, bestFinish: "Fase de Grupos" } },
  { id: "BIH", name: "Bosnia y Herzegovina", group: "B", stats: { participations: 2, titles: 0, runnersUp: 0, bestFinish: "Fase de Grupos (2014)" } },
  { id: "QAT", name: "Catar", group: "B", stats: { participations: 2, titles: 0, runnersUp: 0, bestFinish: "Fase de Grupos (2022, anfitrión)" } },
  { id: "CHE", name: "Suiza", group: "B", stats: { participations: 13, titles: 0, runnersUp: 0, bestFinish: "Cuartos de Final (1934, 1938, 1954)" } },

  // Group C
  { id: "BRA", name: "Brasil", group: "C", stats: { participations: 23, titles: 5, runnersUp: 2, bestFinish: "Pentacampeón (1958, 1962, 1970, 1994, 2002)" } },
  { id: "MAR", name: "Marruecos", group: "C", stats: { participations: 7, titles: 0, runnersUp: 0, bestFinish: "Cuarto Puesto (2022)" } },
  { id: "HTI", name: "Haití", group: "C", stats: { participations: 2, titles: 0, runnersUp: 0, bestFinish: "Fase de Grupos (1974)" } },
  { id: "SCO", name: "Escocia", group: "C", stats: { participations: 9, titles: 0, runnersUp: 0, bestFinish: "Fase de Grupos" } },

  // Group D
  { id: "USA", name: "Estados Unidos", group: "D", stats: { participations: 12, titles: 0, runnersUp: 0, bestFinish: "Tercer Puesto (1930)" } },
  { id: "PRY", name: "Paraguay", group: "D", stats: { participations: 9, titles: 0, runnersUp: 0, bestFinish: "Octavos de Final (1986, 1998, 2002, 2010)" } },
  { id: "AUS", name: "Australia", group: "D", stats: { participations: 7, titles: 0, runnersUp: 0, bestFinish: "Octavos de Final (2006, 2022)" } },
  { id: "TUR", name: "Turquía", group: "D", stats: { participations: 3, titles: 0, runnersUp: 0, bestFinish: "Tercer Puesto (2002)" } },

  // Group E
  { id: "DEU", name: "Alemania", group: "E", stats: { participations: 21, titles: 4, runnersUp: 4, bestFinish: "Campeón (1954, 1974, 1990, 2014)" } },
  { id: "CUW", name: "Curazao", group: "E", stats: { participations: 1, titles: 0, runnersUp: 0, bestFinish: "Primera Participación (2026)" } },
  { id: "CIV", name: "Costa de Marfil", group: "E", stats: { participations: 4, titles: 0, runnersUp: 0, bestFinish: "Fase de Grupos" } },
  { id: "ECU", name: "Ecuador", group: "E", stats: { participations: 5, titles: 0, runnersUp: 0, bestFinish: "Octavos de Final (2006)" } },

  // Group F
  { id: "NLD", name: "Países Bajos", group: "F", stats: { participations: 11, titles: 0, runnersUp: 3, bestFinish: "Subcampeón (1974, 1978, 2010)" } },
  { id: "JPN", name: "Japón", group: "F", stats: { participations: 8, titles: 0, runnersUp: 0, bestFinish: "Octavos de Final (2002, 2010, 2018, 2022)" } },
  { id: "SWE", name: "Suecia", group: "F", stats: { participations: 13, titles: 0, runnersUp: 1, bestFinish: "Subcampeón (1958)" } },
  { id: "TUN", name: "Túnez", group: "F", stats: { participations: 7, titles: 0, runnersUp: 0, bestFinish: "Fase de Grupos" } },

  // Group G
  { id: "BEL", name: "Bélgica", group: "G", stats: { participations: 15, titles: 0, runnersUp: 0, bestFinish: "Tercer Puesto (2018)" } },
  { id: "EGY", name: "Egipto", group: "G", stats: { participations: 4, titles: 0, runnersUp: 0, bestFinish: "Fase de Grupos" } },
  { id: "IRN", name: "Irán", group: "G", stats: { participations: 7, titles: 0, runnersUp: 0, bestFinish: "Fase de Grupos" } },
  { id: "NZL", name: "Nueva Zelanda", group: "G", stats: { participations: 3, titles: 0, runnersUp: 0, bestFinish: "Fase de Grupos (Invicto en 2010)" } },

  // Group H
  { id: "ESP", name: "España", group: "H", stats: { participations: 16, titles: 1, runnersUp: 0, bestFinish: "Campeón (2010)" } },
  { id: "CPV", name: "Cabo Verde", group: "H", stats: { participations: 1, titles: 0, runnersUp: 0, bestFinish: "Primera Participación (2026)" } },
  { id: "SAU", name: "Arabia Saudita", group: "H", stats: { participations: 7, titles: 0, runnersUp: 0, bestFinish: "Octavos de Final (1994)" } },
  { id: "URY", name: "Uruguay", group: "H", stats: { participations: 14, titles: 2, runnersUp: 0, bestFinish: "Campeón (1930, 1950)" } },

  // Group I
  { id: "FRA", name: "Francia", group: "I", stats: { participations: 17, titles: 2, runnersUp: 2, bestFinish: "Campeón (1998, 2018)" } },
  { id: "SEN", name: "Senegal", group: "I", stats: { participations: 3, titles: 0, runnersUp: 0, bestFinish: "Cuartos de Final (2002)" } },
  { id: "IRQ", name: "Irak", group: "I", stats: { participations: 2, titles: 0, runnersUp: 0, bestFinish: "Fase de Grupos (1986)" } },
  { id: "NOR", name: "Noruega", group: "I", stats: { participations: 4, titles: 0, runnersUp: 0, bestFinish: "Octavos de Final (1938, 1998)" } },

  // Group J
  { id: "ARG", name: "Argentina", group: "J", stats: { participations: 19, titles: 3, runnersUp: 3, bestFinish: "Campeón (1978, 1986, 2022)" } },
  { id: "DZA", name: "Argelia", group: "J", stats: { participations: 5, titles: 0, runnersUp: 0, bestFinish: "Octavos de Final (2014)" } },
  { id: "AUT", name: "Austria", group: "J", stats: { participations: 8, titles: 0, runnersUp: 0, bestFinish: "Tercer Puesto (1954)" } },
  { id: "JOR", name: "Jordania", group: "J", stats: { participations: 1, titles: 0, runnersUp: 0, bestFinish: "Primera Participación (2026)" } },

  // Group K
  { id: "PRT", name: "Portugal", group: "K", stats: { participations: 9, titles: 0, runnersUp: 0, bestFinish: "Tercer Puesto (1966)" } },
  { id: "COD", name: "RD del Congo", group: "K", stats: { participations: 2, titles: 0, runnersUp: 0, bestFinish: "Fase de Grupos (1974, como Zaire)" } },
  { id: "UZB", name: "Uzbekistán", group: "K", stats: { participations: 1, titles: 0, runnersUp: 0, bestFinish: "Primera Participación (2026)" } },
  { id: "COL", name: "Colombia", group: "K", stats: { participations: 7, titles: 0, runnersUp: 0, bestFinish: "Cuartos de Final (2014)" } },

  // Group L
  { id: "GBR", name: "Inglaterra", group: "L", stats: { participations: 17, titles: 1, runnersUp: 0, bestFinish: "Campeón (1966)" } },
  { id: "HRV", name: "Croacia", group: "L", stats: { participations: 6, titles: 0, runnersUp: 1, bestFinish: "Subcampeón (2018)" } },
  { id: "GHA", name: "Ghana", group: "L", stats: { participations: 4, titles: 0, runnersUp: 0, bestFinish: "Cuartos de Final (2010)" } },
  { id: "PAN", name: "Panamá", group: "L", stats: { participations: 2, titles: 0, runnersUp: 0, bestFinish: "Fase de Grupos (2018)" } }
];

// Match data loaded from data/matches.json — updated by scripts/update-results.js
const matches = JSON.parse(readFileSync(join(process.cwd(), 'data/matches.json'), 'utf8'));

export default function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const dataset = {
    updatedAt: new Date().toISOString(),
    countries: countries,
    matches: matches
  };

  res.status(200).json(dataset);
}
