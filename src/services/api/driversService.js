import axios from 'axios';
import { API_CONFIG, getCurrentYear } from '../config/apiConfig.js';
import { getCachedData, setCachedData } from '../utils/cache.js';
import { getSelectedYear } from '../../hooks/useSelectedYear.js';

const normalizeText = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim();

const buildDriverIdentityKey = (driver, fallbackIndex) => {
  const numberKey = String(driver?.driver_number ?? driver?.permanentNumber ?? '').trim();
  if (numberKey) return `num:${numberKey}`;

  const codeKey = normalizeText(driver?.name_acronym ?? driver?.code);
  if (codeKey) return `code:${codeKey}`;

  const fullNameKey = normalizeText(
    driver?.full_name ||
    `${driver?.first_name || driver?.givenName || ''} ${driver?.last_name || driver?.familyName || ''}`
  );
  if (fullNameKey) return `name:${fullNameKey}`;

  return `idx:${fallbackIndex}`;
};

// clearDriversCache eliminado por no usarse

export const getDrivers = async (options = {}) => {
  const { signal, year } = options;
  const selectedYear = year ?? getSelectedYear();
  const currentYear = getCurrentYear();
  const cacheKey = `drivers_${selectedYear}`;
  
  // Verificar caché primero
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    // Para el año actual, usar OpenF1 + Ergast para datos completos
    // Para años históricos, usar solo Ergast ya que OpenF1 no filtra por año
    if (selectedYear === currentYear) {
      // Año actual: combinar OpenF1 y Ergast
      const [openF1Response, ergastDrivers] = await Promise.all([
        axios.get(`${API_CONFIG.OPENF1.BASE_URL}/drivers`, {
          params: {
            session_key: 'latest'
          },
          signal
        }),
        getDriversFromErgast({ signal, year: selectedYear })
      ]);

      if (openF1Response.data && openF1Response.data.length > 0) {
        // Procesar y combinar datos de pilotos
        const seenDriverKeys = new Set();
        const driversProcessed = openF1Response.data
          .filter((driver, index, self) => 
            index === self.findIndex((candidate, candidateIndex) => (
              buildDriverIdentityKey(candidate, candidateIndex) === buildDriverIdentityKey(driver, index)
            ))
          )
          .filter((driver, index) => {
            const identityKey = buildDriverIdentityKey(driver, index);
            if (seenDriverKeys.has(identityKey)) return false;
            seenDriverKeys.add(identityKey);
            return true;
          })
          .map(driver => {
            // Buscar datos de nacionalidad en Ergast
            const ergastDriver = ergastDrivers.find(ed => 
              normalizeText(ed.code) === normalizeText(driver.name_acronym) ||
              String(ed.permanentNumber ?? '') === String(driver.driver_number ?? '') ||
              normalizeText(ed.full_name) === normalizeText(driver.full_name)
            );

            return {
              ...driver,
              full_name: driver.full_name || `${driver.first_name || ''} ${driver.last_name || ''}`.trim(),
              name_acronym: driver.name_acronym || driver.full_name?.split(' ').map(n => n[0]).join('') || '???',
              team_name: driver.team_name || 'Equipo no disponible',
              driver_id: ergastDriver?.driverId || driver.driver_id || null,
              country_code: ergastDriver?.nationality || driver.country_code || 'Unknown',
              nationality: ergastDriver?.nationality || 'Unknown',
              headshot_url: driver.headshot_url || null
            };
          })
          .sort((a, b) => (a.driver_number || 999) - (b.driver_number || 999));

        setCachedData(cacheKey, driversProcessed);
        return driversProcessed;
      }
    }
    
    // Para años históricos o si OpenF1 falla, usar solo Ergast
    const ergastDrivers = await getDriversFromErgast({ signal, year: selectedYear });
    
    if (ergastDrivers && ergastDrivers.length > 0) {
      // Procesar datos de Ergast para formato consistente
      const driversProcessed = ergastDrivers.map((driver, index) => ({
        driver_id: driver.driverId,
        driver_number: driver.permanentNumber || index + 1,
        full_name: driver.full_name,
        first_name: driver.givenName,
        last_name: driver.familyName,
        name_acronym: driver.name_acronym,
        team_name: 'Equipo no disponible', // Ergast drivers endpoint no incluye equipo
        country_code: driver.nationality,
        nationality: driver.nationality,
        headshot_url: null // No disponible en Ergast
      })).sort((a, b) => (a.driver_number || 999) - (b.driver_number || 999));

      setCachedData(cacheKey, driversProcessed);
      return driversProcessed;
    }
    
    return await getDriversFallback(selectedYear);
  } catch (error) {
    // Ignorar errores de cancelación - es comportamiento normal con AbortController
    if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
      return await getDriversFallback(selectedYear);
    }
    return await getDriversFallback(selectedYear);
  }
};

const getDriversFallback = async (year = getSelectedYear()) => {
  
  try {
    // Para años históricos, intentar solo con Ergast
    if (year !== getCurrentYear()) {
      const ergastDrivers = await getDriversFromErgast({ year });
      if (ergastDrivers && ergastDrivers.length > 0) {
        return ergastDrivers.map((driver, index) => ({
          driver_id: driver.driverId,
          driver_number: driver.permanentNumber || index + 1,
          full_name: driver.full_name,
          first_name: driver.givenName,
          last_name: driver.familyName,
          name_acronym: driver.name_acronym,
          team_name: 'Equipo no disponible',
          country_code: driver.nationality,
          nationality: driver.nationality,
          headshot_url: null
        }));
      }
    }
    
    // Para año actual o si Ergast falla, usar OpenF1
    const response = await axios.get(`${API_CONFIG.OPENF1.BASE_URL}/drivers`);
    
    if (response.data && response.data.length > 0) {
      const seenDriverKeys = new Set();
      const driversProcessed = response.data
        .filter((driver, index, self) => 
          index === self.findIndex((candidate, candidateIndex) => (
            buildDriverIdentityKey(candidate, candidateIndex) === buildDriverIdentityKey(driver, index)
          ))
        )
        .filter((driver, index) => {
          const identityKey = buildDriverIdentityKey(driver, index);
          if (seenDriverKeys.has(identityKey)) return false;
          seenDriverKeys.add(identityKey);
          return true;
        })
        .slice(0, 20) // Limitar a 20 pilotos más recientes
        .map(driver => ({
          ...driver,
          driver_id: driver.driver_id || null,
          full_name: driver.full_name || `${driver.first_name || ''} ${driver.last_name || ''}`.trim(),
          name_acronym: driver.name_acronym || '???',
          team_name: driver.team_name || 'Equipo no disponible',
          country_code: driver.country_code || 'XX',
          headshot_url: driver.headshot_url || null
        }));

      return driversProcessed;
    }
  } catch (fallbackError) {
    // Error en fallback de pilotos
  }
  
  return [];
};

const fetchAllDriversFromErgast = async (options = {}) => {
  const { signal } = options;
  const cacheKey = 'drivers_ergast_all_v3';
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  const limit = 100;
  let offset = 0;
  const allDrivers = [];
  let hasMoreDrivers = true;

  while (hasMoreDrivers) {
    const response = await axios.get(`${API_CONFIG.JOLPICA.BASE_URL}/drivers.json`, {
      signal,
      params: { limit, offset }
    });

    const mrData = response.data?.MRData || {};
    const drivers = mrData?.DriverTable?.Drivers || [];
    const total = Number(mrData?.total ?? drivers.length);

    allDrivers.push(...drivers);

    if (drivers.length === 0 || allDrivers.length >= total) {
      hasMoreDrivers = false;
    } else {
      offset += drivers.length;
    }
  }

  setCachedData(cacheKey, allDrivers);
  return allDrivers;
};

const resolveErgastDriverId = async (options = {}) => {
  const {
    signal,
    driverId,
    nameAcronym,
    fullName,
    givenName,
    familyName,
    driverNumber
  } = options;

  const normalizedDriverId = normalizeText(driverId);

  const allDrivers = await fetchAllDriversFromErgast({ signal });
  if (!Array.isArray(allDrivers) || allDrivers.length === 0) {
    return null;
  }

  const normalizedCode = normalizeText(nameAcronym);
  const normalizedFullName = normalizeText(fullName);
  const normalizedGivenName = normalizeText(givenName);
  const normalizedFamilyName = normalizeText(familyName);
  const normalizedDriverNumber = String(driverNumber || '').trim();

  const driverMatchesStrongHints = (driver) => {
    if (!driver) return false;

    const matchesCode = normalizedCode
      ? normalizeText(driver?.code) === normalizedCode
      : true;
    const matchesNumber = normalizedDriverNumber
      ? String(driver?.permanentNumber || '').trim() === normalizedDriverNumber
      : true;
    const matchesFullName = normalizedFullName
      ? normalizeText(`${driver?.givenName || ''} ${driver?.familyName || ''}`) === normalizedFullName
      : true;
    const matchesGivenFamily = (normalizedGivenName && normalizedFamilyName)
      ? (
        normalizeText(driver?.givenName) === normalizedGivenName &&
        normalizeText(driver?.familyName) === normalizedFamilyName
      )
      : true;

    return matchesCode && matchesNumber && matchesFullName && matchesGivenFamily;
  };

  const hasStrongHints = Boolean(
    normalizedCode ||
    normalizedDriverNumber ||
    normalizedFullName ||
    (normalizedGivenName && normalizedFamilyName)
  );

  if (normalizedDriverId) {
    const byId = allDrivers.find((driver) => normalizeText(driver?.driverId) === normalizedDriverId);
    if (byId && (!hasStrongHints || driverMatchesStrongHints(byId))) {
      return normalizeText(byId.driverId);
    }
  }

  if (normalizedDriverNumber) {
    const byNumber = allDrivers.find((driver) => String(driver?.permanentNumber || '').trim() === normalizedDriverNumber);
    if (byNumber) {
      return normalizeText(byNumber.driverId);
    }
  }

  if (normalizedFullName) {
    const byFullName = allDrivers.find((driver) =>
      normalizeText(`${driver?.givenName || ''} ${driver?.familyName || ''}`) === normalizedFullName
    );
    if (byFullName) {
      return normalizeText(byFullName.driverId);
    }
  }

  if (normalizedFamilyName && normalizedGivenName) {
    const byGivenFamily = allDrivers.find((driver) =>
      normalizeText(driver?.familyName) === normalizedFamilyName &&
      normalizeText(driver?.givenName) === normalizedGivenName
    );
    if (byGivenFamily) {
      return normalizeText(byGivenFamily.driverId);
    }
  }

  if (normalizedCode) {
    const codeMatches = allDrivers.filter((driver) => normalizeText(driver?.code) === normalizedCode);
    if (codeMatches.length === 1) {
      return normalizeText(codeMatches[0].driverId);
    }

    if (normalizedFamilyName && codeMatches.length > 1) {
      const byCodeAndFamily = codeMatches.find((driver) => normalizeText(driver?.familyName) === normalizedFamilyName);
      if (byCodeAndFamily) {
        return normalizeText(byCodeAndFamily.driverId);
      }
    }
  }

  if (normalizedFamilyName) {
    const familyMatches = allDrivers.filter((driver) => normalizeText(driver?.familyName) === normalizedFamilyName);
    if (familyMatches.length === 1) {
      return normalizeText(familyMatches[0].driverId);
    }
  }

  return null;
};

const getRaceResultEntryForDriver = (race, driverId) => {
  const results = Array.isArray(race?.Results) ? race.Results : [];
  if (results.length === 0) return null;
  return results.find((result) => normalizeText(result?.Driver?.driverId) === normalizeText(driverId)) || null;
};

const getQualifyingEntryForDriver = (race, driverId) => {
  const qualifyingResults = Array.isArray(race?.QualifyingResults) ? race.QualifyingResults : [];
  if (qualifyingResults.length === 0) return null;
  return qualifyingResults.find((result) => normalizeText(result?.Driver?.driverId) === normalizeText(driverId)) || null;
};

const fetchDriverRacesFromErgast = async ({ signal, driverId, endpoint }) => {
  const limit = 100;
  let offset = 0;
  const allRaces = [];
  let hasMoreRaces = true;

  while (hasMoreRaces) {
    const response = await axios.get(
      `${API_CONFIG.JOLPICA.BASE_URL}/drivers/${driverId}/${endpoint}.json`,
      {
        signal,
        params: { limit, offset }
      }
    );

    const mrData = response.data?.MRData || {};
    const races = mrData?.RaceTable?.Races || [];
    const total = Number(mrData?.total ?? races.length);

    allRaces.push(...races);

    if (races.length === 0 || allRaces.length >= total) {
      hasMoreRaces = false;
    } else {
      offset += races.length;
    }
  }

  return allRaces;
};

const isFinishedRaceStatus = (statusText) => {
  const normalized = String(statusText || '').trim().toLowerCase();
  if (!normalized) return false;
  return normalized.includes('finished') || normalized.startsWith('+');
};

export const getDriverCareerStatsFromErgast = async (options = {}) => {
  const {
    signal,
    driverId,
    nameAcronym,
    fullName,
    givenName,
    familyName,
    driverNumber
  } = options;
  const resolvedDriverId = await resolveErgastDriverId({
    signal,
    driverId,
    nameAcronym,
    fullName,
    givenName,
    familyName,
    driverNumber
  });

  if (!resolvedDriverId) return null;

  const cacheKey = `driver_career_stats_ergast_v3_${resolvedDriverId}`;
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    const [racesWithResults, racesWithQualifying] = await Promise.all([
      fetchDriverRacesFromErgast({ signal, driverId: resolvedDriverId, endpoint: 'results' }),
      fetchDriverRacesFromErgast({ signal, driverId: resolvedDriverId, endpoint: 'qualifying' })
    ]);

    const raceEntries = racesWithResults
      .map((race) => getRaceResultEntryForDriver(race, resolvedDriverId))
      .filter(Boolean);

    const qualifyingEntries = racesWithQualifying
      .map((race) => getQualifyingEntryForDriver(race, resolvedDriverId))
      .filter(Boolean);

    const finishPositions = raceEntries
      .map((result) => Number(result?.position))
      .filter((position) => Number.isFinite(position) && position > 0);

    const raceCount = raceEntries.length;
    const podiums = finishPositions.filter((position) => position <= 3).length;
    const wins = finishPositions.filter((position) => position === 1).length;
    const top10 = finishPositions.filter((position) => position <= 10).length;
    const fastestLaps = raceEntries.filter((result) => Number(result?.FastestLap?.rank) === 1).length;
    const averageFinish = finishPositions.length > 0
      ? Number((finishPositions.reduce((sum, position) => sum + position, 0) / finishPositions.length).toFixed(1))
      : null;
    const qualifyingPositions = qualifyingEntries
      .map((result) => Number(result?.position))
      .filter((position) => Number.isFinite(position) && position > 0);
    const averageGrid = qualifyingPositions.length > 0
      ? Number((qualifyingPositions.reduce((sum, position) => sum + position, 0) / qualifyingPositions.length).toFixed(1))
      : null;
    const bestFinish = finishPositions.length > 0 ? Math.min(...finishPositions) : null;
    const bestGrid = qualifyingPositions.length > 0 ? Math.min(...qualifyingPositions) : null;
    const poles = qualifyingEntries
      .map((result) => Number(result?.position))
      .filter((position) => Number.isFinite(position) && position === 1)
      .length;
    const totalPoints = Number(
      raceEntries.reduce((sum, result) => sum + Number(result?.points || 0), 0).toFixed(1)
    );
    const finishedRaces = raceEntries.filter((result) => isFinishedRaceStatus(result?.status)).length;
    const dnfs = Math.max(0, raceCount - finishedRaces);
    const seasons = Array.from(
      new Set(
        racesWithResults
          .map((race) => Number(race?.season))
          .filter((season) => Number.isFinite(season) && season > 0)
      )
    ).sort((a, b) => a - b);

    const stats = {
      races: raceCount,
      wins,
      podiums,
      poles,
      top10,
      fastestLaps,
      averageFinish,
      bestFinish,
      averageGrid,
      bestGrid,
      totalPoints,
      finishedRaces,
      dnfs,
      seasonsCount: seasons.length,
      firstSeason: seasons[0] || null,
      lastSeason: seasons[seasons.length - 1] || null
    };

    setCachedData(cacheKey, stats);
    return stats;
  } catch (error) {
    if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
      return null;
    }
    return null;
  }
};

export const getDriverSeasonStatsFromErgast = async (options = {}) => {
  const {
    signal,
    year,
    driverId,
    nameAcronym,
    fullName,
    givenName,
    familyName,
    driverNumber
  } = options;
  const selectedYear = year ?? getSelectedYear();

  const resolvedDriverId = await resolveErgastDriverId({
    signal,
    driverId,
    nameAcronym,
    fullName,
    givenName,
    familyName,
    driverNumber
  });

  if (!resolvedDriverId) return null;

  const cacheKey = `driver_season_stats_ergast_v4_${selectedYear}_${resolvedDriverId}`;
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    const [resultsResponse, qualifyingResponse] = await Promise.all([
      axios.get(`${API_CONFIG.JOLPICA.BASE_URL}/${selectedYear}/drivers/${resolvedDriverId}/results.json`, {
        signal,
        params: { limit: 100, offset: 0 }
      }),
      axios.get(`${API_CONFIG.JOLPICA.BASE_URL}/${selectedYear}/drivers/${resolvedDriverId}/qualifying.json`, {
        signal,
        params: { limit: 100, offset: 0 }
      })
    ]);

    const racesWithResults = resultsResponse.data?.MRData?.RaceTable?.Races || [];
    const racesWithQualifying = qualifyingResponse.data?.MRData?.RaceTable?.Races || [];

    const raceEntries = racesWithResults
      .map((race) => getRaceResultEntryForDriver(race, resolvedDriverId))
      .filter(Boolean);

    const qualifyingEntries = racesWithQualifying
      .map((race) => getQualifyingEntryForDriver(race, resolvedDriverId))
      .filter(Boolean);

    const finishPositions = raceEntries
      .map((result) => Number(result?.position))
      .filter((position) => Number.isFinite(position) && position > 0);

    const qualifyingPositions = qualifyingEntries
      .map((result) => Number(result?.position))
      .filter((position) => Number.isFinite(position) && position > 0);

    const raceCount = raceEntries.length;
    const wins = finishPositions.filter((position) => position === 1).length;
    const podiums = finishPositions.filter((position) => position <= 3).length;
    const poles = qualifyingPositions.filter((position) => position === 1).length;
    const top10 = finishPositions.filter((position) => position <= 10).length;
    const fastestLaps = raceEntries.filter((result) => Number(result?.FastestLap?.rank) === 1).length;
    const averageFinish = finishPositions.length > 0
      ? Number((finishPositions.reduce((sum, position) => sum + position, 0) / finishPositions.length).toFixed(1))
      : null;
    const bestFinish = finishPositions.length > 0 ? Math.min(...finishPositions) : null;
    const averageGrid = qualifyingPositions.length > 0
      ? Number((qualifyingPositions.reduce((sum, position) => sum + position, 0) / qualifyingPositions.length).toFixed(1))
      : null;
    const bestGrid = qualifyingPositions.length > 0 ? Math.min(...qualifyingPositions) : null;
    const totalPoints = Number(
      raceEntries.reduce((sum, result) => sum + Number(result?.points || 0), 0).toFixed(1)
    );
    const finishedRaces = raceEntries.filter((result) => isFinishedRaceStatus(result?.status)).length;
    const dnfs = Math.max(0, raceCount - finishedRaces);

    const stats = {
      races: raceCount,
      wins,
      podiums,
      poles,
      top10,
      fastestLaps,
      averageFinish,
      bestFinish,
      averageGrid,
      bestGrid,
      totalPoints,
      dnfs
    };

    setCachedData(cacheKey, stats);
    return stats;
  } catch (error) {
    if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
      return null;
    }
    return null;
  }
};

export const getDriverByNumber = async (driverNumber) => {
  try {
    const response = await axios.get(`${API_CONFIG.OPENF1.BASE_URL}/drivers`, {
      params: {
        driver_number: driverNumber,
        session_key: 'latest'
      }
    });

    return response.data?.[0] || null;
  } catch (error) {
    return null;
  }
};

export const getDriversFromErgast = async (options = {}) => {
  const { signal, year } = options;
  const selectedYear = year ?? getSelectedYear();
  const cacheKey = `drivers_ergast_${selectedYear}`;
  
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    const response = await axios.get(`${API_CONFIG.JOLPICA.BASE_URL}/${selectedYear}/drivers.json`, { signal });
    
    if (response.data?.MRData?.DriverTable?.Drivers) {
      const drivers = response.data.MRData.DriverTable.Drivers;
      
      const processedDrivers = drivers.map(driver => ({
        driverId: driver.driverId,
        permanentNumber: driver.permanentNumber,
        code: driver.code,
        givenName: driver.givenName,
        familyName: driver.familyName,
        nationality: driver.nationality,
        full_name: `${driver.givenName} ${driver.familyName}`,
        name_acronym: driver.code || driver.familyName?.substring(0, 3).toUpperCase() || 'N/A',
        country_code: driver.nationality || 'Unknown'
      }));

      setCachedData(cacheKey, processedDrivers);
      return processedDrivers;
    }
  } catch (error) {
    // Ignorar errores de cancelación
    if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
      return [];
    }
    // Error al obtener pilotos desde Ergast
  }
  
  return [];
};
