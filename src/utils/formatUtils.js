/**
 * Utilidades para formateo de datos en la aplicación F1
 */

/**
 * Formatea un número de puntos para mostrar
 * @param {number} puntos - Puntos a formatear
 * @returns {string} Puntos formateados
 */
export const formatearPuntos = (puntos) => {
  if (typeof puntos !== 'number') return '0';
  return puntos.toLocaleString('es-ES');
};

/**
 * Formatea un nombre de piloto para mostrar
 * @param {Object} piloto - Objeto piloto
 * @returns {string} Nombre formateado
 */
export const formatearNombrePiloto = (piloto) => {
  if (!piloto) return 'Piloto desconocido';
  
  if (piloto.full_name) {
    return piloto.full_name;
  }
  
  if (piloto.first_name && piloto.last_name) {
    return `${piloto.first_name} ${piloto.last_name}`;
  }
  
  if (piloto.givenName && piloto.familyName) {
    return `${piloto.givenName} ${piloto.familyName}`;
  }
  
  return piloto.name_acronym || piloto.code || `Piloto #${piloto.driver_number || '?'}`;
};

/**
 * Formatea el nombre de un equipo
 * @param {string} teamName - Nombre del equipo
 * @returns {string} Nombre del equipo formateado
 */
export const formatearNombreEquipo = (teamName) => {
  if (!teamName) return 'Equipo desconocido';
  
  // Mapeo de nombres comunes de equipos
  const teamMappings = {
    'Red Bull Racing Honda RBPT': 'Red Bull Racing',
    'Mercedes-AMG PETRONAS F1 Team': 'Mercedes',
    'Scuderia Ferrari': 'Ferrari',
    'McLaren Formula 1 Team': 'McLaren',
    'Aston Martin Aramco Cognizant F1 Team': 'Aston Martin',
    'BWT Alpine F1 Team': 'Alpine',
    'MoneyGram Haas F1 Team': 'Haas',
    'Visa Cash App RB Formula One Team': 'RB',
    'Williams Racing': 'Williams',
    'Kick Sauber F1 Team': 'Sauber'
  };
  
  return teamMappings[teamName] || teamName;
};

/**
 * Formatea una posición para mostrar
 * @param {number} posicion - Posición a formatear
 * @returns {string} Posición formateada
 */
export const formatearPosicion = (posicion) => {
  if (typeof posicion !== 'number') return '-';
  
  const sufijos = {
    1: 'º',
    2: 'º',
    3: 'º'
  };
  
  return `${posicion}${sufijos[posicion] || 'º'}`;
};

/**
 * Obtiene el color del equipo basado en el nombre del equipo o un color por defecto
 * @param {string} teamNameOrColor - Nombre del equipo o color del equipo en hex
 * @returns {string} Color en formato hex
 */
export const getTeamColor = (teamNameOrColor) => {
  // Si ya es un color hex válido, devolverlo directamente
  if (teamNameOrColor && teamNameOrColor.startsWith('#') && teamNameOrColor.length === 7) {
    return teamNameOrColor;
  }
  
  if (!teamNameOrColor) {
    return '#6B7280'; // Color gris por defecto
  }
  
  // Mapeo de colores específicos por nombre de equipo (temporada 2025)
  const teamColorMappings = {
    'Red Bull Racing Honda RBPT': '#3671C6',
    'Red Bull Racing': '#3671C6',
    'Red Bull': '#3671C6',
    'Mercedes-AMG PETRONAS F1 Team': '#27F4D2',
    'Mercedes': '#27F4D2',
    'Scuderia Ferrari': '#E8002D',
    'Ferrari': '#E8002D',
    'McLaren F1 Team': '#FF8000',
    'McLaren Formula 1 Team': '#FF8000',
    'McLaren': '#FF8000',
    'Aston Martin Aramco Cognizant F1 Team': '#229971',
    'Aston Martin': '#229971',
    'BWT Alpine F1 Team': '#0093CC',
    'Alpine': '#0093CC',
    'MoneyGram Haas F1 Team': '#B6BABD',
    'Haas F1 Team': '#B6BABD',
    'Haas': '#B6BABD',
    'Visa Cash App RB Formula One Team': '#6692FF',
    'RB F1 Team': '#6692FF',
    'Racing Bulls': '#6692FF',
    'RB': '#6692FF',
    'Kick Sauber F1 Team': '#52E252',
    'Sauber': '#52E252',
    'Kick Sauber': '#52E252',
    'Williams Racing': '#64C4FF',
    'Williams': '#64C4FF',
    'Audi': '#C8102E',
    'Audi F1 Team': '#C8102E',
    'Cadillac': '#1D4ED8',
    'Cadillac F1 Team': '#1D4ED8'
  };
  
  const teamName = teamNameOrColor?.toLowerCase() || '';
  
  // Buscar coincidencia exacta primero
  for (const [key, color] of Object.entries(teamColorMappings)) {
    if (key.toLowerCase() === teamName) {
      return color;
    }
  }
  
  // Buscar coincidencia parcial por nombre
  for (const [key, color] of Object.entries(teamColorMappings)) {
    if (key.toLowerCase().includes(teamName) || teamName.includes(key.toLowerCase())) {
      return color;
    }
  }
  
  // Si es un color hex sin #, agregarlo
  if (/^[0-9A-Fa-f]{6}$/.test(teamNameOrColor)) {
    return `#${teamNameOrColor}`;
  }
  
  // Color por defecto si no se encuentra
  return '#e10600'; // Rojo F1 por defecto
};

/**
 * Trunca un texto a una longitud específica
 * @param {string} texto - Texto a truncar
 * @param {number} longitud - Longitud máxima
 * @returns {string} Texto truncado
 */
export const truncarTexto = (texto, longitud = 50) => {
  if (!texto || typeof texto !== 'string') return '';
  
  if (texto.length <= longitud) return texto;
  
  return `${texto.substring(0, longitud)}…`;
};

/**
 * Obtiene la ruta del logo del equipo basado en el nombre
 * @param {string} teamName - Nombre del equipo
 * @returns {string} Ruta del logo del equipo
 */
export const getTeamLogo = (teamName) => {
  if (!teamName) return '/teams/default.png';
  
  // Mapeo de nombres de equipos a archivos de logo
  const teamLogoMappings = {
    'Red Bull Racing Honda RBPT': '/teams/red-bull.png',
    'Red Bull Racing': '/teams/red-bull.png',
    'Mercedes-AMG PETRONAS F1 Team': '/teams/mercedes.png',
    'Mercedes': '/teams/mercedes.png',
    'Scuderia Ferrari': '/teams/ferrari.png',
    'Ferrari': '/teams/ferrari.png',
    'McLaren F1 Team': '/teams/mclaren.png',
    'McLaren': '/teams/mclaren.png',
    'Aston Martin Aramco Cognizant F1 Team': '/teams/aston-martin.png',
    'Aston Martin': '/teams/aston-martin.png',
    'BWT Alpine F1 Team': '/teams/alpine.png',
    'Alpine': '/teams/alpine.png',
    'MoneyGram Haas F1 Team': '/teams/haas.png',
    'Haas': '/teams/haas.png',
    'Visa Cash App RB Formula One Team': '/teams/visa-red.png',
    'Racing Bulls': '/teams/visa-red.png',
    'Kick Sauber F1 Team': '/teams/kick.png',
    'Sauber': '/teams/kick.png',
    'Kick Sauber': '/teams/kick.png',
    'Williams Racing': '/teams/williams.png',
    'Williams': '/teams/williams.png',
    'Audi': '/teams/audi.png',
    'Audi F1 Team': '/teams/audi.png',
    'Cadillac': '/teams/cadillac.png',
    'Cadillac F1 Team': '/teams/cadillac.png'
  };
  
  // Buscar coincidencia exacta primero
  if (teamLogoMappings[teamName]) {
    return teamLogoMappings[teamName];
  }
  
  // Buscar coincidencia parcial
  const teamNameLower = teamName.toLowerCase();
  for (const [key, logo] of Object.entries(teamLogoMappings)) {
    if (key.toLowerCase().includes(teamNameLower) || teamNameLower.includes(key.toLowerCase())) {
      return logo;
    }
  }
  
  // Si no se encuentra, intentar con palabras clave
  if (teamNameLower.includes('red bull')) return '/teams/red-bull.png';
  if (teamNameLower.includes('mercedes')) return '/teams/mercedes.png';
  if (teamNameLower.includes('ferrari')) return '/teams/ferrari.png';
  if (teamNameLower.includes('mclaren')) return '/teams/mclaren.png';
  if (teamNameLower.includes('aston')) return '/teams/aston-martin.png';
  if (teamNameLower.includes('alpine')) return '/teams/alpine.png';
  if (teamNameLower.includes('haas')) return '/teams/haas.png';
  if (teamNameLower.includes('rb') || teamNameLower.includes('visa')) return '/teams/visa-red.png';
  if (teamNameLower.includes('sauber') || teamNameLower.includes('kick')) return '/teams/kick.png';
  if (teamNameLower.includes('williams')) return '/teams/williams.png';
  if (teamNameLower.includes('audi')) return '/teams/audi.png';
  if (teamNameLower.includes('cadillac')) return '/teams/cadillac.png';
  
  // Logo por defecto si no se encuentra
  return '/teams/default.png';
};

/**
 * Obtiene la ruta de la foto local del piloto
 * Usa imágenes de /public/drivers en lugar de la API
 * @param {Object} driver - Objeto del piloto (de OpenF1)
 * @returns {string|null} Ruta de la imagen (o null si no hay mapeo)
 */
export const getDriverPhoto = (driver) => {
  if (!driver) return null;
  // Normalizar cadenas (minúsculas y sin acentos)
  const normalize = (s) => {
    if (!s) return '';
    try {
      return String(s)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    } catch {
      return String(s).toLowerCase();
    }
  };
  
  // Mapeo de apellidos a archivos locales
  const photoMappings = {
    albon: '/drivers/Z9VKbziBA97Gig6j_2025-albon.avif',
    alonso: '/drivers/Z9VKcDiBA97Gig6k_2025-alonso.avif',
    antonelli: '/drivers/Z9VKcTiBA97Gig6l_2025-antonelli.avif',
    bearman: '/drivers/Z9VKcjiBA97Gig6m_2025-bearman.avif',
    bortoleto: '/drivers/Z9VKcziBA97Gig6n_2025-bortoleto.avif',
    doohan: '/drivers/Z9VKdDiBA97Gig6o_2025-doohan.avif',
    gasly: '/drivers/Z9VKdTiBA97Gig6p_2025-gasly.avif',
    hadjar: '/drivers/Z9VKdjiBA97Gig6q_2025-hadjar.avif',
    hamilton: '/drivers/Z9VKdziBA97Gig6r_2025-hamilton.avif',
    hulkenberg: '/drivers/Z9VKeDiBA97Gig6s_2025-hulkenberg.avif',
    leclerc: '/drivers/Z9VKejiBA97Gig6u_2025-leclerc.avif',
    norris: '/drivers/Z9VKeziBA97Gig6v_2025-norris.avif',
    ocon: '/drivers/Z9VKfDiBA97Gig6w_2025-ocon.avif',
    piastri: '/drivers/Z9VKfTiBA97Gig6x_2025-piastri.avif',
    russell: '/drivers/Z9VKfjiBA97Gig6y_2025-russell.avif',
    sainz: '/drivers/Z9VKfziBA97Gig6z_2025-sainz.avif',
    stroll: '/drivers/Z9VKgDiBA97Gig60_2025-stroll.avif',
    verstappen: '/drivers/Z9VKgjiBA97Gig62_2025-verstappen.avif',
    colapinto: '/drivers/aCOy_ydWJ-7kSCnB_2025-colapinto.avif',
    lawson: '/drivers/Z_J86HdAxsiBwXP1_2025-lawson-RB.avif',
    tsunoda: '/drivers/Z_J86XdAxsiBwXP2_2025-tsunoda-RBR.avif',
    bottas: '/drivers/aXCOGgIvOtkhBw5R_2026-bottas.png',
    perez: '/drivers/aXCOHAIvOtkhBw5T_2026-perez.png',
    lindblad: '/drivers/aXCPIwIvOtkhBw55_2026-lindblad.png',
    linvand: '/drivers/aXCPIwIvOtkhBw55_2026-lindblad.png',
  };

  // Intentar múltiples formas de obtener el apellido
  const derivedFullName = driver.full_name || `${driver.givenName || driver.first_name || ''} ${driver.familyName || driver.last_name || ''}`.trim();
  const possibleLastNames = [
    driver.last_name,
    driver.familyName,
    derivedFullName ? derivedFullName.split(' ').slice(-1)[0] : null
  ].filter(Boolean);

  // Buscar por apellido exacto
  for (const lastName of possibleLastNames) {
    const key = normalize(lastName);
    if (photoMappings[key]) {
      return photoMappings[key];
    }
  }

  // Buscar por nombre completo (contiene)
  if (derivedFullName) {
    const nameLower = normalize(derivedFullName);
    for (const [slug, path] of Object.entries(photoMappings)) {
      if (nameLower.includes(slug)) {
        return path;
      }
    }
  }

  // Buscar por acrónimo de nombre (ej: VER -> verstappen)
  if (driver.name_acronym || driver.code) {
    const acronym = normalize(driver.name_acronym || driver.code);
    const acronymMappings = {
      'ver': 'verstappen',
      'ham': 'hamilton',
      'lec': 'leclerc',
      'nor': 'norris',
      'rus': 'russell',
      'sai': 'sainz',
      'alb': 'albon',
      'alo': 'alonso',
      'gas': 'gasly',
      'oco': 'ocon',
      'pia': 'piastri',
      'str': 'stroll',
      'hul': 'hulkenberg',
      'tsu': 'tsunoda',
      'law': 'lawson',
      'col': 'colapinto',
      'ant': 'antonelli',
      'bea': 'bearman',
      'bor': 'bortoleto',
      'doo': 'doohan',
      'had': 'hadjar',
      'bot': 'bottas',
      'per': 'perez',
      'lin': 'lindblad'
    };
    
    const mappedName = acronymMappings[acronym];
    if (mappedName && photoMappings[mappedName]) {
      return photoMappings[mappedName];
    }
  }

  // Fallback: mantener headshot_url si existe; si no, null
  return driver.headshot_url || null;
};
