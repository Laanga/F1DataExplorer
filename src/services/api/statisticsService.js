import { getCurrentYear, getTotalRacesForYear } from '../config/apiConfig.js';
import { getCachedData, setCachedData } from '../utils/cache.js';
import { getDrivers } from './driversService.js';
import { getSessions, getMeetings } from './sessionsService.js';
import { getDriverStandingsFromErgast, getConstructorStandingsFromErgast } from './standingsService.js';
import { getSelectedYear } from '../../hooks/useSelectedYear.js';
import { getDriverTeamColor } from '../../utils/chartColors.js';

const CONSTRUCTORS_DISPLAY_LIMIT = 11;

// Mapeo de países para circuitos de F1
const circuitCountryMapping = {
  'albert_park': 'AU',
  'sepang': 'MY', 
  'bahrain': 'BH',
  'imola': 'IT',
  'portimao': 'PT',
  'catalunya': 'ES',
  'monaco': 'MC',
  'baku': 'AZ',
  'montreal': 'CA',
  'silverstone': 'GB',
  'red_bull_ring': 'AT',
  'hungaroring': 'HU',
  'spa': 'BE',
  'zandvoort': 'NL',
  'monza': 'IT',
  'marina_bay': 'SG',
  'suzuka': 'JP',
  'losail': 'QA',
  'interlagos': 'BR',
  'vegas': 'US',
  'yas_marina': 'AE',
  'jeddah': 'SA',
  'miami': 'US',
  'shanghai': 'CN',
  'villeneuve': 'CA',
  'americas': 'US', // Circuit of the Americas - Austin
  'rodriguez': 'MX', // Autódromo Hermanos Rodríguez - México
  'nurburgring': 'DE',
  'hockenheim': 'DE',
  'mugello': 'IT',
  'sochi': 'RU',
  'istanbul': 'TR',
  'algarve': 'PT',
  'kyalami': 'ZA'
};

const getCountryFromCircuit = (circuitName, circuitId) => {
  // Primero intentar con el ID del circuito
  if (circuitId && circuitCountryMapping[circuitId]) {
    return circuitCountryMapping[circuitId];
  }
  
  // Luego intentar con el nombre del circuito
  const name = circuitName?.toLowerCase() || '';
  
  // Mapeos específicos por nombre
  if (name.includes('albert park') || name.includes('melbourne')) return 'AU';
  if (name.includes('bahrain') || name.includes('sakhir')) return 'BH';
  if (name.includes('imola') || name.includes('san marino')) return 'IT';
  if (name.includes('miami')) return 'US';
  if (name.includes('spain') || name.includes('catalunya') || name.includes('barcelona')) return 'ES';
  if (name.includes('monaco') || name.includes('monte carlo')) return 'MC';
  if (name.includes('baku') || name.includes('azerbaijan')) return 'AZ';
  if (name.includes('canada') || name.includes('montreal') || name.includes('villeneuve')) return 'CA';
  if (name.includes('silverstone') || name.includes('britain') || name.includes('british')) return 'GB';
  if (name.includes('austria') || name.includes('red bull ring') || name.includes('spielberg')) return 'AT';
  if (name.includes('hungary') || name.includes('hungaroring') || name.includes('budapest')) return 'HU';
  if (name.includes('belgium') || name.includes('spa')) return 'BE';
  if (name.includes('netherlands') || name.includes('zandvoort') || name.includes('dutch')) return 'NL';
  if (name.includes('monza') || name.includes('italy') || name.includes('italian')) return 'IT';
  if (name.includes('singapore') || name.includes('marina bay')) return 'SG';
  if (name.includes('japan') || name.includes('suzuka') || name.includes('japanese')) return 'JP';
  if (name.includes('qatar') || name.includes('losail')) return 'QA';
  if (name.includes('brazil') || name.includes('interlagos') || name.includes('sao paulo')) return 'BR';
  if (name.includes('las vegas') || name.includes('vegas')) return 'US';
  if (name.includes('abu dhabi') || name.includes('yas marina')) return 'AE';
  if (name.includes('saudi') || name.includes('jeddah')) return 'SA';
  if (name.includes('china') || name.includes('shanghai') || name.includes('chinese')) return 'CN';
  if (name.includes('germany') || name.includes('hockenheim') || name.includes('nurburgring')) return 'DE';
  if (name.includes('turkey') || name.includes('istanbul')) return 'TR';
  if (name.includes('portugal') || name.includes('portimao') || name.includes('algarve')) return 'PT';
  if (name.includes('russia') || name.includes('sochi')) return 'RU';
  if (name.includes('south africa') || name.includes('kyalami')) return 'ZA';
  
  return 'F1'; // Fallback genérico
};

/**
 * Servicio para estadísticas y análisis de datos
 */

export const getStatistics = async (options = {}) => {
  const { signal, year } = options;
  const selectedYear = year ?? getSelectedYear();
  const cacheKey = `statistics_${selectedYear}`;
  
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
  
    
    // Obtener datos base
    const [drivers, sessions, meetings] = await Promise.all([
      getDrivers({ signal, year: selectedYear }),
      getSessions(null, { year: selectedYear }),
      getMeetings({ signal, year: selectedYear })
    ]);

    // Intentar obtener datos reales de clasificaciones
    const [driverStandings, constructorStandings] = await Promise.all([
      getDriverStandingsFromErgast({ signal, year: selectedYear }),
      getConstructorStandingsFromErgast({ signal, year: selectedYear })
    ]);

    const totalRaces = getTotalRacesForYear(selectedYear);
    const completedRaces = sessions.filter(session => 
      session.session_name === 'Race' && 
      new Date(session.date_start) < new Date()
    ).length;

    const upcomingMeetings = meetings.filter(meeting => 
      new Date(meeting.date_start) > new Date()
    ).slice(0, 3);

    // Determinar el tipo de datos
    const hasRealData = driverStandings.length > 0 && constructorStandings.length > 0;
    const dataSource = hasRealData ? 'real' : 'base';

    let statistics = {
      totalDrivers: drivers.length,
      totalRaces,
      completedRaces,
      upcomingMeetings,
      dataSource,
      topDrivers: [],
      topConstructors: [],
      championshipLeader: null,
      constructorLeader: null,
      totalPoints: 0,
      totalWins: 0
    };

    if (hasRealData) {
      // Usar datos reales
      statistics.topDrivers = driverStandings.slice(0, 20);
      statistics.topConstructors = constructorStandings.slice(0, CONSTRUCTORS_DISPLAY_LIMIT);
      statistics.championshipLeader = driverStandings[0] || null;
      statistics.constructorLeader = constructorStandings[0] || null;
      statistics.totalPoints = driverStandings.reduce((sum, driver) => sum + driver.points, 0);
      statistics.totalWins = driverStandings.reduce((sum, driver) => sum + driver.wins, 0);
    }

    setCachedData(cacheKey, statistics);

    return statistics;

  } catch (error) {
    // Silenciar error al generar estadísticas
    return {
      totalDrivers: 0,
      totalRaces: getTotalRacesForYear(selectedYear),
      completedRaces: 0,
      upcomingMeetings: [],
      dataSource: 'error',
      topDrivers: [],
      topConstructors: [],
      championshipLeader: null,
      constructorLeader: null,
      totalPoints: 0,
      totalWins: 0
    };
  }
};

/**
 * Obtiene datos de evolución de puntos para los top pilotos a lo largo de la temporada
 * @param {number} topCount - Número de pilotos top a incluir (por defecto 3)
 * @returns {Promise<Object>} Datos de evolución y configuración de líneas
 */


const getRaceCalendarFromErgast = async (year) => {
  const cacheKey = `race_calendar_ergast_${year}`;
  
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
  
    
    // Usar el endpoint específico para carreras/rondas
    const response = await fetch(`https://api.jolpi.ca/ergast/f1/${year}/races.json`);
    const data = await response.json();
    
    if (!data.MRData?.RaceTable?.Races) {
      return [];
    }

    const races = data.MRData.RaceTable.Races;

    
    setCachedData(cacheKey, races);
    return races;

  } catch (error) {
    // Silenciar error al obtener calendario de Ergast
    return [];
  }
};

export const getPointsEvolution = async (topCount = 3) => {
  const selectedYear = getSelectedYear();
  const cacheKey = `points_evolution_${selectedYear}_${topCount}`;
  
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
  
    
    // Obtener el calendario completo de carreras
    const raceCalendar = await getRaceCalendarFromErgast(selectedYear);

    if (!raceCalendar || raceCalendar.length === 0) {
      return { evolutionData: [], lineConfig: [], totalRaces: 0, racesWithResults: 0, racesShown: 0, futureRacesShown: 0 };
    }

    // Obtener los top pilotos actuales para determinar quiénes incluir
    const currentStandings = await getDriverStandingsFromErgast();
    const topDrivers = currentStandings.slice(0, topCount);

    if (topDrivers.length === 0) {
      return { evolutionData: [], lineConfig: [], totalRaces: 0, racesWithResults: 0, racesShown: 0, futureRacesShown: 0 };
    }

    // Determinar qué carreras tienen resultados probando los driver standings
    const racesWithResults = [];
    for (const race of raceCalendar) {
      try {
        const response = await fetch(`https://api.jolpi.ca/ergast/f1/${selectedYear}/${race.round}/driverstandings.json`);
        const data = await response.json();
        
        if (data.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings?.length > 0) {
          racesWithResults.push(parseInt(race.round));
        }
      } catch (error) {
        // Si hay error, asumimos que no hay resultados para esta carrera
        break;
      }
    }

    const lastRaceWithResults = Math.max(0, ...racesWithResults);
    
    // Filtrar carreras para mostrar: todas las que tienen resultados + las próximas 3
    const racesToShow = raceCalendar.filter(race => {
      const raceRound = parseInt(race.round);
      return raceRound <= lastRaceWithResults + 3;
    });

    // Procesar cada carrera para obtener los puntos acumulados
    const evolutionData = [];
    
    for (const race of racesToShow) {
       const raceRound = parseInt(race.round);
       const hasResults = racesWithResults.includes(raceRound);
       const isFuture = raceRound > lastRaceWithResults;
       
       const raceData = {
         race: `R${race.round}`,
         raceName: race.raceName,
         round: raceRound,
         hasResults,
         isFuture,
         countryCode: getCountryFromCircuit(race.raceName, race.circuitId)
       };

      if (hasResults) {
        // Obtener los driver standings después de esta carrera
        try {
          const response = await fetch(`https://api.jolpi.ca/ergast/f1/${selectedYear}/${race.round}/driverstandings.json`);
          const data = await response.json();
          
          if (data.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings) {
            const standings = data.MRData.StandingsTable.StandingsLists[0].DriverStandings;
            
            // Agregar los puntos de cada top piloto después de esta carrera
             topDrivers.forEach(driver => {
               const driverKey = `driver_${driver.driver.driverId}`;
               
               // Buscar el piloto en los standings de esta carrera
               const driverStanding = standings.find(standing => 
                 standing.Driver.driverId === driver.driver.driverId
               );
               
               // Usar los puntos acumulados hasta esta carrera
               raceData[driverKey] = driverStanding ? parseFloat(driverStanding.points) : 0;
             });
          }
        } catch (error) {
           // En caso de error, usar los puntos de la carrera anterior o 0
           topDrivers.forEach(driver => {
             const driverKey = `driver_${driver.driver.driverId}`;
             const previousRace = evolutionData[evolutionData.length - 1];
             raceData[driverKey] = previousRace ? (previousRace[driverKey] || 0) : 0;
           });
         }
       } else {
         // Para carreras sin resultados, mantener los puntos de la última carrera con resultados
         topDrivers.forEach(driver => {
           const driverKey = `driver_${driver.driver.driverId}`;
           const lastRaceData = evolutionData.find(rd => rd.hasResults && rd.round <= lastRaceWithResults);
           raceData[driverKey] = lastRaceData ? (lastRaceData[driverKey] || 0) : 0;
         });
       }

      evolutionData.push(raceData);
    }

    // Configurar las líneas para el gráfico
     const lineConfig = topDrivers.map((driver, index) => {
       const driverKey = `driver_${driver.driver.driverId}`;
       return {
         dataKey: driverKey,
         name: driver.driver.code || driver.driver.familyName,
         fullName: `${driver.driver.givenName} ${driver.driver.familyName}`,
         color: getDriverTeamColor(driver),
         constructor: driver.constructor
       };
     });

    const result = {
      evolutionData,
      lineConfig,
      totalRaces: raceCalendar.length,
      racesWithResults: racesWithResults.length,
      racesShown: racesToShow.length,
      futureRacesShown: racesToShow.filter(race => parseInt(race.round) > lastRaceWithResults).length,
      hasRealData: true
    };

    setCachedData(cacheKey, result);

    
    return result;

  } catch (error) {
    // Silenciar error al generar evolución de puntos
    return { evolutionData: [], lineConfig: [], totalRaces: 0, racesWithResults: 0, racesShown: 0, futureRacesShown: 0, hasRealData: false };
  }
};

export const getSeasonProgress = async (options = {}) => {
  const { year } = options;
  const selectedYear = year ?? getSelectedYear();
  const cacheKey = `season_progress_${selectedYear}`;
  
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
  
    
    const sessions = await getSessions('Race', { year: selectedYear });
    const totalRaces = getTotalRacesForYear(selectedYear);
    const completedRaces = sessions.filter(session => 
      new Date(session.date_start) < new Date()
    ).length;

    const progress = {
      totalRaces,
      completedRaces,
      remainingRaces: totalRaces - completedRaces,
      progressPercentage: Math.round((completedRaces / totalRaces) * 100)
    };

    setCachedData(cacheKey, progress);

    return progress;

  } catch (error) {
    // Silenciar error al calcular progreso
    return {
      totalRaces: getTotalRacesForYear(selectedYear),
      completedRaces: 0,
      remainingRaces: getTotalRacesForYear(selectedYear),
      progressPercentage: 0
    };
  }
};
