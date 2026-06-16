#!/usr/bin/env node
/**
 * scripts/update-results.js
 *
 * Fetches real WC 2026 match results from football-data.org,
 * resolves scorer Wikipedia names, and writes data/matches.json.
 *
 * Usage:
 *   node scripts/update-results.js
 *
 * Requires:
 *   FOOTBALL_API_KEY env var (free key from https://www.football-data.org/client/register)
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);
const ROOT = join(__dir, '..');

const API_KEY = process.env.FOOTBALL_API_KEY;
if (!API_KEY) {
  console.error('ERROR: Set FOOTBALL_API_KEY env var before running.');
  console.error('       Get a free key at https://www.football-data.org/client/register');
  process.exit(1);
}

// football-data.org competition ID for FIFA World Cup 2026
const COMPETITION_ID = 2000;
const FD_BASE = 'https://api.football-data.org/v4';

// Our ISO3 ids differ from football-data.org TLAs in some cases
const TLA_TO_ISO3 = {
  GER: 'DEU', NED: 'NLD', ENG: 'GBR', SUI: 'CHE',
  KSA: 'SAU', URU: 'URY', POR: 'PRT', CRO: 'HRV',
  PAR: 'PRY', ALG: 'DZA', HAI: 'HTI', SCO: 'SCO',
  BIH: 'BIH', CPV: 'CPV', CUW: 'CUW', COD: 'COD',
  UZB: 'UZB', JOR: 'JOR', NOR: 'NOR', IRQ: 'IRQ',
  NZL: 'NZL', SEN: 'SEN', TUN: 'TUN', EGY: 'EGY',
  ZAF: 'ZAF', BEL: 'BEL', IRN: 'IRN', SWE: 'SWE',
  HTI: 'HTI',
};

function toISO3(tla) {
  if (!tla) return null;
  return TLA_TO_ISO3[tla.toUpperCase()] || tla.toUpperCase();
}

async function fdFetch(path) {
  const res = await fetch(`${FD_BASE}${path}`, {
    headers: { 'X-Auth-Token': API_KEY }
  });
  if (!res.ok) {
    throw new Error(`football-data.org ${path} → HTTP ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function wikiSearch(playerName) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(playerName + ' footballer')}&srlimit=1&format=json&origin=*`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'FIFA-WC2026-App/1.0 (vstecnic@gmail.com)' }
    });
    const data = await res.json();
    const hit = data?.query?.search?.[0];
    if (!hit) return null;
    return hit.title.replace(/ /g, '_');
  } catch {
    return null;
  }
}

async function resolveWikiName(playerName, cache) {
  if (cache[playerName] !== undefined) return cache[playerName];
  console.log(`  Buscando Wikipedia para: ${playerName}`);
  const wikiName = await wikiSearch(playerName);
  cache[playerName] = wikiName;
  return wikiName;
}

async function main() {
  // Load current matches and wiki cache
  const matchesPath = join(ROOT, 'data', 'matches.json');
  const wikiCachePath = join(ROOT, 'data', 'wiki-names.json');

  const currentMatches = JSON.parse(readFileSync(matchesPath, 'utf8'));
  const wikiCache = JSON.parse(readFileSync(wikiCachePath, 'utf8'));

  // Index current matches by id for fast lookup
  const matchIndex = Object.fromEntries(currentMatches.map(m => [m.id, m]));

  console.log('Obteniendo partidos de football-data.org...');
  let fdMatches;
  try {
    const data = await fdFetch(`/competitions/${COMPETITION_ID}/matches`);
    fdMatches = data.matches || [];
  } catch (err) {
    console.error('Error al conectar con football-data.org:', err.message);
    process.exit(1);
  }

  console.log(`${fdMatches.length} partidos recibidos de la API.`);

  let updatedCount = 0;

  for (const fdMatch of fdMatches) {
    // Only process finished matches in the group stage
    if (fdMatch.status !== 'FINISHED') continue;
    if (fdMatch.stage !== 'GROUP_STAGE') continue;

    const homeISO = toISO3(fdMatch.homeTeam?.tla);
    const awayISO = toISO3(fdMatch.awayTeam?.tla);
    const fdDate = fdMatch.utcDate; // ISO string

    // Find the matching entry in our data (same teams, same group date)
    const ourMatch = currentMatches.find(m => {
      if (m.status === 'played') return false; // already updated
      return m.homeTeam === homeISO && m.awayTeam === awayISO;
    });

    if (!ourMatch) continue;

    const homeScore = fdMatch.score?.fullTime?.home ?? 0;
    const awayScore = fdMatch.score?.fullTime?.away ?? 0;

    // Fetch detailed scorers for this match
    let scorers = [];
    try {
      const detail = await fdFetch(`/matches/${fdMatch.id}`);
      const goals = detail.goals || [];

      for (const goal of goals) {
        if (goal.type === 'OWN_GOAL') {
          const scorerName = `${goal.scorer?.name || 'Desconocido'} (autogol)`;
          const teamISO = goal.team?.tla ? toISO3(goal.team.tla) : null;
          scorers.push({
            name: scorerName,
            playerId: String(goal.scorer?.id || ''),
            minute: goal.minute,
            team: teamISO,
            wikiName: null
          });
        } else {
          const scorerName = goal.scorer?.name || 'Desconocido';
          const teamISO = goal.team?.tla ? toISO3(goal.team.tla) : null;
          const wikiName = await resolveWikiName(scorerName, wikiCache);
          scorers.push({
            name: scorerName,
            playerId: String(goal.scorer?.id || ''),
            minute: goal.minute,
            team: teamISO,
            wikiName
          });
        }
      }
    } catch (err) {
      console.warn(`  No se pudo obtener detalle del partido ${fdMatch.id}:`, err.message);
    }

    ourMatch.status = 'played';
    ourMatch.result = { homeScore, awayScore, scorers };
    updatedCount++;
    console.log(`✓ Actualizado: ${homeISO} ${homeScore}-${awayScore} ${awayISO}`);
  }

  // Write updated matches
  writeFileSync(matchesPath, JSON.stringify(currentMatches, null, 2), 'utf8');
  console.log(`\nmatches.json actualizado (${updatedCount} partidos nuevos).`);

  // Write updated wiki cache
  writeFileSync(wikiCachePath, JSON.stringify(wikiCache, null, 2), 'utf8');
  console.log('wiki-names.json actualizado.');

  if (updatedCount === 0) {
    console.log('No hay partidos nuevos para actualizar.');
  }
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
