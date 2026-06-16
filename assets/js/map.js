// assets/js/map.js

let map;
let geojsonLayer;
const countryLayers = {}; // Cache map layers by ISO code for fast access

// Distinct color per group (A–L) for map polygon highlighting
const GROUP_COLORS = {
  A: '#e63946', B: '#f4a261', C: '#2a9d8f', D: '#e9c46a',
  E: '#457b9d', F: '#a8dadc', G: '#c77dff', H: '#06d6a0',
  I: '#ffb703', J: '#3a86ff', K: '#ff006e', L: '#8ecae6'
};
const BORDER_COLOR = '#222d44';
const BG_DEEP = '#0a0f1d';

/**
 * Initializes the Leaflet map in the map container
 */
export function initMap() {
  // Center map on North America since 2026 is hosted in USA/MEX/CAN
  map = L.map('map', {
    center: [30, -50],
    zoom: 3,
    minZoom: 2,
    maxZoom: 7,
    zoomControl: true,
    maxBounds: [[-85, -180], [85, 180]],
    maxBoundsViscosity: 1.0
  });

  // Position zoom controls in top right instead of top left to clear sidebar
  map.zoomControl.setPosition('topright');

  // CartoDB Dark Matter tile layer for the premium dark aesthetic
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map);

  return map;
}

/**
 * Fetch and render the country polygons, highlighting participating countries
 * @param {Array} participatingCountries List of country objects from API
 * @param {Function} onCountryClick Callback when a country polygon is clicked
 */
export async function loadCountryPolygons(participatingCountries, onCountryClick) {
  try {
    const participantIds = new Set(participatingCountries.map(c => c.id));
    const groupByCountry = Object.fromEntries(participatingCountries.map(c => [c.id, c.group]));
    
    // Fetch Natural Earth 1:110m lightweight GeoJSON
    const response = await fetch('https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson');
    if (!response.ok) throw new Error('Error al descargar polígonos del mapa');
    
    const geojsonData = await response.ok ? await response.json() : null;
    if (!geojsonData) return;

    geojsonLayer = L.geoJSON(geojsonData, {
      style: (feature) => {
        // Resolve ISO_A3 in properties
        const iso = (feature.properties.ISO_A3 || feature.properties.iso_a3 || '').toUpperCase();
        const isParticipant = participantIds.has(iso);

        if (isParticipant) {
          const color = GROUP_COLORS[groupByCountry[iso]] || '#00d2ff';
          return {
            color: color,
            weight: 2,
            opacity: 1,
            fillColor: color,
            fillOpacity: 0.25,
            className: 'participant-polygon'
          };
        } else {
          return {
            color: BORDER_COLOR,
            weight: 0.5,
            opacity: 0.3,
            fillColor: BG_DEEP,
            fillOpacity: 0.4,
            className: 'non-participant-polygon'
          };
        }
      },
      onEachFeature: (feature, layer) => {
        const iso = (feature.properties.ISO_A3 || feature.properties.iso_a3 || '').toUpperCase();
        const isParticipant = participantIds.has(iso);

        if (isParticipant) {
          countryLayers[iso] = layer;
          
          // Hover interactions
          layer.on({
            mouseover: (e) => {
              const ly = e.target;
              ly.setStyle({
                fillOpacity: 0.55,
                weight: 3
              });
              
              // Leaflet tooltip displaying name
              const countryObj = participatingCountries.find(c => c.id === iso);
              if (countryObj) {
                ly.bindTooltip(`<b>${countryObj.name}</b> (Grupo ${countryObj.group})`, {
                  direction: 'top',
                  sticky: true,
                  className: 'map-tooltip'
                }).openTooltip();
              }
            },
            mouseout: (e) => {
              const ly = e.target;
              ly.setStyle({
                fillOpacity: 0.25,
                weight: 2
              });
            },
            click: () => {
              onCountryClick(iso);
            }
          });
        }
      }
    }).addTo(map);

  } catch (error) {
    console.error('Error al cargar datos del mapa:', error);
  }
}

/**
 * Zooms and pans the map to highlight a specific country
 * @param {string} countryId ISO-A3 code of the country
 */
export function focusCountry(countryId) {
  const layer = countryLayers[countryId];
  if (layer && map) {
    // Zoom and center on the polygon bounds
    const bounds = layer.getBounds();
    map.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 5,
      animate: true,
      duration: 1.0 // 1s smooth transition
    });

    // Momentary trigger hover effect to highlight
    layer.setStyle({
      fillOpacity: 0.7,
      weight: 3
    });

    setTimeout(() => {
      if (layer) {
        layer.setStyle({
          fillOpacity: 0.25,
          weight: 2
        });
      }
    }, 1500);
  }
}
