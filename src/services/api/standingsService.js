import axios from 'axios';
import { API_CONFIG } from '../config/apiConfig.js';
import { getCachedData, setCachedData } from '../utils/cache.js';
import { getSelectedYear } from '../../hooks/useSelectedYear.js';
import { getTeamColor } from '../../utils/formatUtils.js';
import { getDrivers } from './driversService.js';

const normalizeText = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim();

const getCanonicalTeamKey = (teamName) => {
  const normalized = normalizeText(teamName);
  if (!normalized) return '';

  if (
    normalized.includes('racing bulls') ||
    normalized.includes('rb f1 team') ||
    normalized.includes('visa cash app rb') ||
    normalized === 'rb'
  ) {
    return 'racing_bulls';
  }

  if (normalized.includes('red bull')) return 'red_bull';
  if (normalized.includes('kick') || normalized.includes('sauber')) return 'sauber';
  if (normalized.includes('haas')) return 'haas';
  if (normalized.includes('aston')) return 'aston_martin';
  if (normalized.includes('mclaren')) return 'mclaren';
  if (normalized.includes('mercedes')) return 'mercedes';
  if (normalized.includes('ferrari')) return 'ferrari';
  if (normalized.includes('williams')) return 'williams';
  if (normalized.includes('alpine')) return 'alpine';
  if (normalized.includes('audi')) return 'audi';
  if (normalized.includes('cadillac')) return 'cadillac';

  return normalized;
};

const isSameTeam = (firstName, secondName) => {
  const first = normalizeText(firstName);
  const second = normalizeText(secondName);
  if (!first || !second) return false;

  const firstCanonical = getCanonicalTeamKey(first);
  const secondCanonical = getCanonicalTeamKey(second);

  return (
    firstCanonical === secondCanonical ||
    first === second ||
    first.includes(second) ||
    second.includes(first)
  );
};

const buildConstructorIdFromName = (teamName) => {
  const normalized = normalizeText(teamName).replace(/\s+/g, '_');
  return normalized || 'unknown';
};

const mapStandingDriver = (driverStanding) => {
  const teamName = driverStanding?.constructor?.name || 'Equipo';
  return {
    driver_number: driverStanding?.driver?.permanentNumber || '0',
    full_name: `${driverStanding?.driver?.givenName || ''} ${driverStanding?.driver?.familyName || ''}`.trim() || driverStanding?.driver?.code || 'Piloto',
    name_acronym: driverStanding?.driver?.code || null,
    points: Number(driverStanding?.points || 0),
    position: Number(driverStanding?.position || 0) || null,
    wins: Number(driverStanding?.wins || 0),
    team_name: teamName,
    constructor_id: driverStanding?.constructor?.constructorId || buildConstructorIdFromName(teamName),
    team_colour: getTeamColor(teamName)
  };
};

const mapCatalogDriver = (driver, teamNameOverride = '') => {
  const fullName = String(
    driver?.full_name ||
    `${driver?.first_name || driver?.givenName || ''} ${driver?.last_name || driver?.familyName || ''}`.trim() ||
    driver?.name_acronym ||
    'Piloto'
  ).trim();
  const teamName = String(teamNameOverride || driver?.team_name || 'Equipo').trim() || 'Equipo';

  return {
    driver_number: String(driver?.driver_number || driver?.permanentNumber || '0'),
    full_name: fullName,
    name_acronym: driver?.name_acronym || driver?.code || null,
    points: Number(driver?.points || 0),
    position: Number(driver?.position || 0) || null,
    wins: Number(driver?.wins || 0),
    team_name: teamName,
    constructor_id: buildConstructorIdFromName(teamName),
    team_colour: getTeamColor(teamName)
  };
};

const getDriverIdentityKey = (driver, index) => {
  const numberKey = String(driver?.driver_number || '').trim();
  if (numberKey && numberKey !== '0') return `num:${numberKey}`;

  const codeKey = normalizeText(driver?.name_acronym);
  if (codeKey) return `code:${codeKey}`;

  const nameKey = normalizeText(driver?.full_name);
  if (nameKey) return `name:${nameKey}`;

  return `idx:${index}`;
};

const dedupeDrivers = (drivers = []) => {
  const seen = new Set();
  return drivers.filter((driver, index) => {
    const key = getDriverIdentityKey(driver, index);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const buildConstructorsFromDriversCatalog = (driversCatalog = []) => {
  const teamsMap = new Map();

  driversCatalog.forEach((driver) => {
    const teamName = String(driver?.team_name || '').trim();
    if (!teamName || normalizeText(teamName) === 'equipo no disponible') return;
    const key = normalizeText(teamName);
    if (!teamsMap.has(key)) {
      teamsMap.set(key, {
        constructor: {
          constructorId: buildConstructorIdFromName(teamName),
          name: teamName,
          nationality: ''
        },
        points: 0,
        wins: 0
      });
    }
  });

  return Array.from(teamsMap.values())
    .sort((a, b) => String(a.constructor.name).localeCompare(String(b.constructor.name), 'es', { sensitivity: 'base' }))
    .map((constructor, index) => ({
      ...constructor,
      position: index + 1
    }));
};

/**
 * Servicio para operaciones relacionadas con clasificaciones y standings
 */

export const getDriverStandingsFromErgast = async (options = {}) => {
  const { signal, year } = options;
  const selectedYear = year ?? getSelectedYear();
  const cacheKey = `driver_standings_ergast_${selectedYear}`;
  
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    const response = await axios.get(`${API_CONFIG.JOLPICA.BASE_URL}/${selectedYear}/driverstandings.json`, { signal });
    
    if (response.data?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings) {
      const standings = response.data.MRData.StandingsTable.StandingsLists[0].DriverStandings;
      
      const processedStandings = standings.map(standing => ({
        position: parseInt(standing.position),
        points: parseFloat(standing.points),
        wins: parseInt(standing.wins),
        driver: {
          driverId: standing.Driver.driverId,
          permanentNumber: standing.Driver.permanentNumber,
          code: standing.Driver.code,
          givenName: standing.Driver.givenName,
          familyName: standing.Driver.familyName,
          nationality: standing.Driver.nationality
        },
        constructor: {
          constructorId: standing.Constructors[0].constructorId,
          name: standing.Constructors[0].name,
          nationality: standing.Constructors[0].nationality
        }
      }));

      setCachedData(cacheKey, processedStandings);
      return processedStandings;
    }
  } catch (error) {
    // Ignorar errores de cancelación
    if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
      return [];
    }
    console.error('❌ Error al obtener clasificaciones desde Ergast:', error.message);
  }
  
  return [];
};

export const getConstructorStandingsFromErgast = async (options = {}) => {
  const { signal, year } = options;
  const selectedYear = year ?? getSelectedYear();
  const cacheKey = `constructor_standings_ergast_${selectedYear}`;
  
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    const response = await axios.get(`${API_CONFIG.JOLPICA.BASE_URL}/${selectedYear}/constructorstandings.json`, { signal });
    
    if (response.data?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings) {
      const standings = response.data.MRData.StandingsTable.StandingsLists[0].ConstructorStandings;
      
      const processedStandings = standings.map(standing => {
        const constructorData = {
          position: parseInt(standing.position),
          points: parseFloat(standing.points),
          wins: parseInt(standing.wins),
          constructor: {
            constructorId: standing.Constructor.constructorId,
            name: standing.Constructor.name,
            nationality: standing.Constructor.nationality
          }
        };

        return constructorData;
      });

      setCachedData(cacheKey, processedStandings);
      return processedStandings;
    }
  } catch (error) {
    // Ignorar errores de cancelación
    if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
      return [];
    }
    console.error('❌ Error al obtener clasificaciones de constructores desde Ergast:', error.message);
  }
  
  return [];
};

export const getConstructorsFromErgast = async (options = {}) => {
  const { signal, year } = options;
  const selectedYear = year ?? getSelectedYear();
  const cacheKey = `constructors_ergast_${selectedYear}`;

  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    const response = await axios.get(`${API_CONFIG.JOLPICA.BASE_URL}/${selectedYear}/constructors.json`, { signal });

    const constructors = response.data?.MRData?.ConstructorTable?.Constructors || [];
    if (constructors.length > 0) {
      const processedConstructors = constructors.map((constructor, index) => ({
        position: index + 1,
        points: 0,
        wins: 0,
        constructor: {
          constructorId: constructor.constructorId,
          name: constructor.name,
          nationality: constructor.nationality
        }
      }));

      setCachedData(cacheKey, processedConstructors);
      return processedConstructors;
    }
  } catch (error) {
    if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
      return [];
    }
    console.error('❌ Error al obtener lista de constructores desde Ergast:', error.message);
  }

  return [];
};

export const getDriverStandings = async (options = {}) => {
  const { signal, year } = options;
  try {
    // Intentar obtener datos reales primero
    const realStandings = await getDriverStandingsFromErgast({ signal, year });
    if (realStandings.length > 0) {
      return realStandings;
    }
    
    // Fallback a datos base de OpenF1 (sin puntos simulados)
    return [];
  } catch (error) {
    console.error('❌ Error al obtener clasificación de pilotos:', error.message);
    return [];
  }
};

export const getConstructorStandings = async (options = {}) => {
  const { signal, year } = options;
  try {
    // Intentar obtener datos reales primero
    const realStandings = await getConstructorStandingsFromErgast({ signal, year });
    if (realStandings.length > 0) {
      return realStandings;
    }
    
    // Fallback a datos base de OpenF1 (sin puntos simulados)
    return [];
  } catch (error) {
    console.error('❌ Error al obtener clasificación de constructores:', error.message);
    return [];
  }
};

export const getChampionshipStandings = async (options = {}) => {
  const { signal, year } = options;
  try {
    const selectedYear = year ?? getSelectedYear();
    const cacheKey = `championship_standings_${selectedYear}`;
    
    // Verificar cache primero
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return applyTeamCorrections(cachedData, selectedYear);
    }
    
    // Obtener datos de pilotos y constructores
    const [driverStandings, constructorStandings, driversCatalog] = await Promise.all([
      getDriverStandingsFromErgast({ signal, year: selectedYear }),
      getConstructorStandingsFromErgast({ signal, year: selectedYear }),
      getDrivers({ signal, year: selectedYear })
    ]);

    const fallbackConstructorsFromDrivers = buildConstructorsFromDriversCatalog(driversCatalog);

    const constructorsFromErgast = constructorStandings.length > 0
      ? []
      : await getConstructorsFromErgast({ signal, year: selectedYear });

    const constructorsSource = constructorStandings.length > 0
      ? constructorStandings
      : (constructorsFromErgast.length > 0 ? constructorsFromErgast : fallbackConstructorsFromDrivers);

    if (Array.isArray(constructorsSource) && constructorsSource.length > 0) {
      const standingDrivers = dedupeDrivers(driverStandings.map(mapStandingDriver));
      const rosterDrivers = dedupeDrivers((driversCatalog || []).map((driver) => mapCatalogDriver(driver)));

      // Agrupar pilotos por constructor
      const constructorsWithDrivers = constructorsSource.map((constructor, index) => {
        const constructorName = constructor?.constructor?.name || constructor?.team_name || 'Equipo';
        const constructorId = constructor?.constructor?.constructorId || buildConstructorIdFromName(constructorName);
        const constructorColor = getTeamColor(constructorName);

        const driversFromStandings = standingDrivers.filter((driver) =>
          driver.constructor_id === constructorId || isSameTeam(driver.team_name, constructorName)
        );
        const driversFromRoster = rosterDrivers
          .filter((driver) => isSameTeam(driver.team_name, constructorName))
          .map((driver) => ({
            ...driver,
            team_name: constructorName,
            team_colour: constructorColor,
            constructor_id: constructorId
          }));

        const constructorDrivers = (driversFromStandings.length > 0 ? driversFromStandings : driversFromRoster)
          .map(({ constructor_id, ...driver }) => driver);

        return {
          team_name: constructorName,
          team_colour: constructorColor,
          points: Number(constructor?.points || 0),
          position: Number(constructor?.position || 0) || index + 1,
          wins: Number(constructor?.wins || 0),
          drivers: constructorDrivers
        };
      });

      const driversFromConstructors = dedupeDrivers(
        constructorsWithDrivers.flatMap((constructor) =>
          constructor.drivers.map((driver) => mapCatalogDriver(driver, constructor.team_name))
        )
      );

      const championshipDrivers = standingDrivers.length > 0
        ? standingDrivers
        : driversFromConstructors;

      const result = {
        constructors: constructorsWithDrivers,
        drivers: championshipDrivers.map(({ constructor_id, ...driver }) => driver)
      };

      // Aplicar correcciones manuales
      const correctedResult = applyTeamCorrections(result, selectedYear);
      
      setCachedData(cacheKey, correctedResult);
      return correctedResult;
    }
  } catch (error) {
    console.error('❌ Error al obtener clasificación del campeonato:', error.message);
  }

  // Fallback: devolver estructura vacía
  return {
    constructors: [],
    drivers: []
  };
};

/**
 * Aplica correcciones manuales a las asignaciones de equipos para 2025
 * Cambios mid-season:
 * - Tsunoda: Promovido a Red Bull Racing desde el GP de Japón (carrera 3)
 * - Lawson: Degradado a Racing Bulls desde el GP de Japón (carrera 3)
 * @param {Object} data - Datos de standings
 * @returns {Object} Datos corregidos
 */
const applyTeamCorrections = (data, seasonYear) => {
  if (!data || seasonYear !== 2025) {
    return data;
  }

  const safeData = {
    ...data,
    drivers: Array.isArray(data.drivers) ? data.drivers.map((driver) => ({ ...driver })) : [],
    constructors: Array.isArray(data.constructors)
      ? data.constructors.map((constructor) => ({
          ...constructor,
          drivers: Array.isArray(constructor.drivers) ? constructor.drivers.map((driver) => ({ ...driver })) : []
        }))
      : []
  };
  
  // Primero, corregir los drivers individuales
  safeData.drivers = safeData.drivers.map(driver => {
    const driverKey = driver.name_acronym?.toLowerCase();
    const fullNameKey = driver.full_name?.toLowerCase();
    
    // Corrección específica para Tsunoda - DEBE IR A RED BULL RACING (promovido en 2025)
    if (driverKey === 'tsu' || (fullNameKey && fullNameKey.includes('tsunoda'))) {
      return {
        ...driver,
        team_name: 'Red Bull',
        team_colour: getTeamColor('Red Bull')
      };
    }
    
    // Corrección específica para Lawson - DEBE IR A RACING BULLS (degradado en 2025)
    if (driverKey === 'law' || (fullNameKey && fullNameKey.includes('lawson'))) {
      return {
        ...driver,
        team_name: 'RB F1 Team',
        team_colour: getTeamColor('RB F1 Team')
      };
    }
    
    // Para todos los demás pilotos, mantener sus datos originales
    return driver;
  });

  // Ahora reorganizar los constructores con los pilotos corregidos
  safeData.constructors = safeData.constructors.map(constructor => {
    let teamDrivers = [];
    
    // Identificar el equipo y asignar los pilotos correctos
    const teamName = String(constructor.team_name || '').toLowerCase();
    
    if (teamName.includes('red bull') && !teamName.includes('rb') && !teamName.includes('racing')) {
      // Red Bull Racing - Debe tener Verstappen y Tsunoda
      teamDrivers = safeData.drivers.filter(d => {
        const dKey = d.name_acronym?.toLowerCase();
        return dKey === 'ver' || dKey === 'tsu';
      });
    } else if (teamName.includes('rb') || teamName.includes('racing bulls')) {
      // Racing Bulls - Debe tener Lawson y Hadjar
      teamDrivers = safeData.drivers.filter(d => {
        const dKey = d.name_acronym?.toLowerCase();
        return dKey === 'law' || dKey === 'had';
      });
    } else {
      // Para otros equipos, mantener sus pilotos originales
      teamDrivers = constructor.drivers;
    }

    return {
      ...constructor,
      drivers: teamDrivers
    };
  });

  return safeData;
};
