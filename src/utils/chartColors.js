/**
 * Paleta de colores para charts de estadísticas
 * Colores vibrantes y contrastantes para mejorar la visualización
 */

// Paleta principal de colores para charts
export const CHART_COLORS = [
  '#e10600', // Rojo F1 (principal)
  '#00d4ff', // Azul cyan vibrante
  '#ff6b35', // Naranja vibrante
  '#4ecdc4', // Verde turquesa
  '#ffe66d', // Amarillo dorado
  '#ff006e', // Rosa magenta
  '#8338ec', // Púrpura
  '#3a86ff', // Azul brillante
  '#06ffa5', // Verde neón
  '#ffbe0b', // Amarillo naranja
  '#fb5607', // Rojo naranja
  '#8ecae6', // Azul claro
  '#219ebc', // Azul océano
  '#023047', // Azul marino
  '#ffb3c6', // Rosa claro
  '#fb8500', // Naranja oscuro
];

// Colores específicos para diferentes tipos de datos
export const DRIVER_COLORS = {
  // Colores principales para pilotos destacados
  primary: '#e10600',   // Rojo F1
  secondary: '#00d4ff', // Azul cyan
  tertiary: '#ff6b35',  // Naranja
  quaternary: '#4ecdc4', // Verde turquesa
  fifth: '#ffe66d',     // Amarillo dorado
  sixth: '#ff006e',     // Rosa magenta
  seventh: '#8338ec',   // Púrpura
  eighth: '#3a86ff',    // Azul brillante
};

// Gradientes para efectos visuales
export const CHART_GRADIENTS = {
  primary: 'linear-gradient(135deg, #e10600 0%, #ff4757 100%)',
  secondary: 'linear-gradient(135deg, #00d4ff 0%, #0abde3 100%)',
  tertiary: 'linear-gradient(135deg, #ff6b35 0%, #ff9ff3 100%)',
  success: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
  warning: 'linear-gradient(135deg, #ffe66d 0%, #ff6b6b 100%)',
  info: 'linear-gradient(135deg, #3a86ff 0%, #a8e6cf 100%)',
};

/**
 * Obtiene un color de la paleta basado en el índice
 * @param {number} index - Índice del elemento
 * @returns {string} Color hexadecimal
 */
export const getChartColor = (index) => {
  return CHART_COLORS[index % CHART_COLORS.length];
};

/**
 * Genera una paleta de colores para un número específico de elementos
 * @param {number} count - Número de colores necesarios
 * @returns {Array} Array de colores
 */
export const generateColorPalette = (count) => {
  const colors = [];
  for (let i = 0; i < count; i++) {
    colors.push(getChartColor(i));
  }
  return colors;
};

/**
 * Asigna colores específicos a datos basados en nombres o índices
 * @param {Array} data - Array de datos
 * @param {string} nameKey - Clave que contiene el nombre (opcional)
 * @returns {Array} Array de datos con colores asignados
 */
export const assignColorsToData = (data, nameKey = 'name') => {
  return data.map((item, index) => {
    const paletteSeed = String(item?.[nameKey] ?? index);
    let hash = 0;
    for (let i = 0; i < paletteSeed.length; i += 1) {
      hash = (hash << 5) - hash + paletteSeed.charCodeAt(i);
      hash |= 0;
    }
    const color = getChartColor(Math.abs(hash));

    return {
      ...item,
      color,
      fill: color, // Para recharts
      stroke: color, // Para líneas
    };
  });
};

/**
 * Colores específicos para equipos de F1 (basados en colores reales)
 */
export const TEAM_COLORS = {
  // Nombres exactos de la API de Ergast (2024)
  'Red Bull Racing Honda RBPT': '#1e40af', // Azul Red Bull
  'Mercedes': '#00d2be', // Verde agua Mercedes
  'Ferrari': '#dc2626', // Rojo Ferrari
  'McLaren Mercedes': '#f97316', // Naranja McLaren
  'Alpine Renault': '#0ea5e9', // Azul Alpine
  'Aston Martin Aramco Mercedes': '#059669', // Verde Aston Martin
  'Williams Mercedes': '#3b82f6', // Azul Williams
  'RB Honda RBPT': '#1e40af', // Azul RB (ex AlphaTauri)
  'Haas Ferrari': '#ef4444', // Rojo Haas
  'Kick Sauber Ferrari': '#10b981', // Verde Sauber
  
  // Nombres completos (fallback)
  'Red Bull Racing': '#1e40af', // Azul Red Bull
  'Alpine': '#0ea5e9', // Azul Alpine
  'Aston Martin': '#059669', // Verde Aston Martin
  'Williams': '#3b82f6', // Azul Williams
  'AlphaTauri': '#1e293b', // Azul marino AlphaTauri
  'Alfa Romeo': '#dc2626', // Rojo Alfa Romeo
  'Haas': '#ef4444', // Rojo Haas
  'Kick Sauber': '#10b981', // Verde Sauber
  'RB F1 Team': '#1e40af', // Azul RB (ex AlphaTauri)
  'Audi': '#c8102e', // Rojo Audi
  'Audi F1 Team': '#c8102e',
  'Cadillac': '#1d4ed8', // Azul Cadillac
  'Cadillac F1 Team': '#1d4ed8',
  
  // Nombres alternativos/abreviados
  'Red Bull': '#1e40af',
  'Mercedes-AMG': '#00d2be',
  'Scuderia Ferrari': '#dc2626',
  'McLaren F1': '#f97316',
  'McLaren': '#f97316',
  'Alpine F1': '#0ea5e9',
  'Aston Martin F1': '#059669',
  'Williams Racing': '#3b82f6',
  'Haas F1': '#ef4444',
  'Sauber': '#10b981',
  'RB': '#1e40af',
  
  // IDs de constructores (por si acaso)
  'red_bull': '#1e40af',
  'mercedes': '#00d2be',
  'ferrari': '#dc2626',
  'mclaren': '#f97316',
  'alpine': '#0ea5e9',
  'aston_martin': '#059669',
  'williams': '#3b82f6',
  'alphatauri': '#1e293b',
  'alfa': '#dc2626',
  'haas': '#ef4444',
  'sauber': '#10b981',
  'rb': '#1e40af',
  'audi': '#c8102e',
  'cadillac': '#1d4ed8',
};

/**
 * Obtiene el color de un equipo específico
 * @param {string} teamName - Nombre del equipo
 * @returns {string} Color del equipo o color por defecto
 */
export const getTeamColor = (teamName) => {
  const safeTeamName = String(teamName ?? '').trim();
  if (!safeTeamName) return getChartColor(0);
  
  // Búsqueda directa
  if (TEAM_COLORS[safeTeamName]) {
    return TEAM_COLORS[safeTeamName];
  }
  
  // Búsqueda por palabras clave (insensible a mayúsculas)
  const teamNameLower = safeTeamName.toLowerCase();
  
  if (teamNameLower.includes('red bull')) {
    return '#1e40af'; // Azul Red Bull
  }
  if (teamNameLower.includes('mercedes')) {
    return '#00d2be'; // Verde agua Mercedes
  }
  if (teamNameLower.includes('ferrari')) {
    return '#dc2626'; // Rojo Ferrari
  }
  if (teamNameLower.includes('mclaren')) {
    return '#f97316'; // Naranja McLaren
  }
  if (teamNameLower.includes('alpine')) {
    return '#0ea5e9'; // Azul Alpine
  }
  if (teamNameLower.includes('aston')) {
    return '#059669'; // Verde Aston Martin
  }
  if (teamNameLower.includes('williams')) {
    return '#3b82f6'; // Azul Williams
  }
  if (teamNameLower.includes('haas')) {
    return '#ef4444'; // Rojo Haas
  }
  if (teamNameLower.includes('sauber') || teamNameLower.includes('kick')) {
    return '#10b981'; // Verde Sauber
  }
  if (teamNameLower.includes('rb') || teamNameLower.includes('racing bulls') || teamNameLower.includes('alphatauri')) {
    return '#1e40af'; // Azul RB
  }
  if (teamNameLower.includes('audi')) {
    return '#c8102e'; // Rojo Audi
  }
  if (teamNameLower.includes('cadillac')) {
    return '#1d4ed8'; // Azul Cadillac
  }
  
  return getChartColor(0);
};

/**
 * Obtiene el color de un piloto basado en su equipo
 * @param {Object} piloto - Objeto del piloto con información del constructor
 * @returns {string} Color del equipo del piloto
 */
export const getDriverTeamColor = (piloto) => {
  if (!piloto || typeof piloto !== 'object') {
    return getChartColor(0);
  }

  const teamName = String(
    piloto.team_name ||
    piloto.teamName ||
    piloto.constructor?.name ||
    piloto.constructor?.constructorId ||
    ''
  ).trim();

  if (!teamName) {
    return getChartColor(0);
  }

  return getTeamColor(teamName);
};

/**
 * Asigna colores de equipo a una lista de pilotos
 * @param {Array} pilotos - Array de pilotos
 * @returns {Array} Array de pilotos con colores de equipo asignados
 */
export const assignTeamColorsToDrivers = (pilotos) => {
  return pilotos.map((piloto) => ({
    ...piloto,
    color: getDriverTeamColor(piloto),
    fill: getDriverTeamColor(piloto),
    stroke: getDriverTeamColor(piloto),
  }));
};
