/**
 * Servicio principal de OpenF1 - Punto de entrada centralizado
 * Este archivo actúa como un barrel export para todos los servicios especializados
 */

// Importaciones para el export default
import { getCurrentYear } from './config/apiConfig.js';
import { clearCache } from './utils/cache.js';
import { getDrivers, getDriverByNumber, getDriversFromErgast, getDriverCareerStatsFromErgast, getDriverSeasonStatsFromErgast } from './api/driversService.js';
import { getSessions, getRaces, getMeetings } from './api/sessionsService.js';
import { getDriverStandings, getConstructorStandings, getDriverStandingsFromErgast, getConstructorStandingsFromErgast, getChampionshipStandings } from './api/standingsService.js';
import { getStatistics, getSeasonProgress } from './api/statisticsService.js';
import { getRaceResults, getSessionDrivers, getCompleteRaceResults } from './api/raceResultsService.js';
import { getMeetingSessions, getSessionResults, getCompleteMeetingResults, categorizeSessionsByType } from './api/meetingSessionsService.js';

// Configuración y utilidades
export { getCurrentYear } from './config/apiConfig.js';
export { clearCache } from './utils/cache.js';

// Servicios de pilotos
export { 
  getDrivers, 
  getDriverByNumber,
  getDriversFromErgast,
  getDriverCareerStatsFromErgast,
  getDriverSeasonStatsFromErgast
} from './api/driversService.js';

// Servicios de sesiones y carreras
export { 
  getSessions, 
  getRaces, 
  getMeetings 
} from './api/sessionsService.js';

// Servicios de clasificaciones
export { 
  getDriverStandings, 
  getConstructorStandings, 
  getDriverStandingsFromErgast, 
  getConstructorStandingsFromErgast,
  getChampionshipStandings 
} from './api/standingsService.js';

// Servicios de estadísticas
export { 
  getStatistics, 
  getSeasonProgress
} from './api/statisticsService.js';

// Servicios de resultados de carreras
export { 
  getRaceResults, 
  getSessionDrivers, 
  getCompleteRaceResults 
} from './api/raceResultsService.js';

// Servicios de sesiones de meeting
export { 
  getMeetingSessions, 
  getSessionResults, 
  getCompleteMeetingResults, 
  categorizeSessionsByType 
} from './api/meetingSessionsService.js';

// Mantener compatibilidad con el export default anterior
export default {
  // Configuración
  getCurrentYear,
  clearCache,
  
  // Pilotos
  getDrivers,
  getDriverByNumber,
  getDriversFromErgast,
  getDriverCareerStatsFromErgast,
  getDriverSeasonStatsFromErgast,
  
  // Sesiones y carreras
  getSessions,
  getRaces,
  getMeetings,
  
  
  // Clasificaciones
  getDriverStandings,
  getConstructorStandings,
  getDriverStandingsFromErgast,
  getConstructorStandingsFromErgast,
  getChampionshipStandings,
  
  // Estadísticas
  getStatistics,
  getSeasonProgress,
  
  // Resultados de carreras
  getRaceResults,
  getSessionDrivers,
  getCompleteRaceResults,
  
  // Sesiones de meeting
  getMeetingSessions,
  getSessionResults,
  getCompleteMeetingResults,
  categorizeSessionsByType
};
