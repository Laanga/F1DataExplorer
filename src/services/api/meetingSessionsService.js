import { API_CONFIG } from '../config/apiConfig.js';
import { getCachedData, setCachedData } from '../utils/cache.js';
import { isRateLimitError, safeRequest } from '../utils/rateLimiter.js';

/**
 * Servicio para obtener todas las sesiones de un meeting y sus resultados
 */

const hasSessionEnded = (dateEnd) => {
  if (!dateEnd) return false;

  const parsedDate = new Date(dateEnd);
  if (Number.isNaN(parsedDate.getTime())) return false;

  return parsedDate.getTime() <= Date.now();
};

const isCompletedSessionWithoutResults = (results, dateEnd) => (
  Array.isArray(results) && results.length === 0 && hasSessionEnded(dateEnd)
);

const hasStaleCompletedSessions = (meetingData) => {
  const sessionList = Array.isArray(meetingData?.session_list) ? meetingData.session_list : [];

  return sessionList.some((session) => {
    const sessionResults = meetingData?.sessions?.[session.session_key]?.results || [];
    return isCompletedSessionWithoutResults(sessionResults, session?.date_end);
  });
};

const completeMeetingRequests = new Map();
const sessionResultRequests = new Map();
const sessionDriverRequests = new Map();

/**
 * Obtiene todas las sesiones de un meeting específico
 * @param {number} meetingKey - Clave del meeting
 * @returns {Promise<Array>} Array de sesiones del meeting
 */
export const getMeetingSessions = async (meetingKey) => {
  const cacheKey = `meeting_sessions_${meetingKey}`;
  
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    const response = await safeRequest(`${API_CONFIG.OPENF1.BASE_URL}/sessions`, {
      params: { meeting_key: meetingKey }
    });
    
    const sessions = response.data || [];
    
    // Ordenar sesiones por fecha y tipo
    const sortedSessions = sessions.sort((a, b) => {
      const dateA = new Date(a.date_start);
      const dateB = new Date(b.date_start);
      return dateA - dateB;
    });

    setCachedData(cacheKey, sortedSessions);
    return sortedSessions;
  } catch (error) {
    if (!isRateLimitError(error)) {
      console.error(`❌ Error al obtener sesiones del meeting ${meetingKey}:`, error.message);
    }
    return getCachedData(cacheKey, true) || [];
  }
};

/**
 * Obtiene los resultados de una sesión específica
 * @param {number} sessionKey - Clave de la sesión
 * @param {string} sessionType - Tipo de sesión (Practice, Qualifying, Sprint, Race)
 * @returns {Promise<Array>} Array de resultados de la sesión
 */
export const getSessionResults = async (sessionKey, sessionType, options = {}) => {
  const { sessionDateEnd } = options;
  const cacheKey = `session_results_${sessionKey}`;
  
  const cachedData = getCachedData(cacheKey);
  if (cachedData && !isCompletedSessionWithoutResults(cachedData, sessionDateEnd)) {
    return cachedData;
  }

  const existingRequest = sessionResultRequests.get(sessionKey);
  if (existingRequest) return existingRequest;

  const requestPromise = (async () => {
    let results = [];
    const typeText = String(sessionType || '').toLowerCase();
    const trySessionResultFirst = (
      typeText.includes('race') ||
      typeText.includes('sprint') ||
      typeText.includes('qualifying') ||
      typeText.includes('quali') ||
      typeText.includes('q1') ||
      typeText.includes('q2') ||
      typeText.includes('q3')
    );

    // Para carrera, sprint y clasificación, intentar primero session_result
    if (trySessionResultFirst) {
      try {
        const sessionResultResponse = await safeRequest(`${API_CONFIG.OPENF1.BASE_URL}/session_result`, {
          params: { session_key: sessionKey }
        });
        results = sessionResultResponse.data || [];
      } catch (error) {
        if (isRateLimitError(error)) {
          const oldCachedData = getCachedData(cacheKey, true);
          if (oldCachedData) return oldCachedData;
          return [];
        }
      }
    }
    
    // Si no hay resultados o es una sesión de práctica/clasificación, usar position
    if (results.length === 0) {
      try {
        const positionResponse = await safeRequest(`${API_CONFIG.OPENF1.BASE_URL}/position`, {
          params: { session_key: sessionKey }
        });
        const positions = positionResponse.data || [];
        
        // Para sesiones de práctica y clasificación, obtener las mejores posiciones
        if (positions.length > 0) {
          const latestPositions = positions.reduce((acc, position) => {
            const driverNumber = position.driver_number;
            if (!acc[driverNumber] || new Date(position.date) > new Date(acc[driverNumber].date)) {
              acc[driverNumber] = position;
            }
            return acc;
          }, {});
          
          results = Object.values(latestPositions).sort((a, b) => a.position - b.position);
        }
      } catch (error) {
        if (!isRateLimitError(error)) {
          console.error(`❌ Error al obtener posiciones para sesión ${sessionKey}:`, error.message);
        }
      }
    }

    if (!isCompletedSessionWithoutResults(results, sessionDateEnd)) {
      setCachedData(cacheKey, results);
    }
    return results;
  })().catch((error) => {
    if (!isRateLimitError(error)) {
      console.error(`❌ Error al obtener resultados de la sesión ${sessionKey}:`, error.message);
    }
    return getCachedData(cacheKey, true) || [];
  }).finally(() => {
    sessionResultRequests.delete(sessionKey);
  });

  sessionResultRequests.set(sessionKey, requestPromise);
  return requestPromise;
};

/**
 * Obtiene información de los pilotos para una sesión
 * @param {number} sessionKey - Clave de la sesión
 * @returns {Promise<Array>} Array de información de pilotos
 */
export const getSessionDrivers = async (sessionKey) => {
  const cacheKey = `session_drivers_${sessionKey}`;
  
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  const existingRequest = sessionDriverRequests.get(sessionKey);
  if (existingRequest) return existingRequest;

  const requestPromise = (async () => {
    const response = await safeRequest(`${API_CONFIG.OPENF1.BASE_URL}/drivers`, {
      params: { session_key: sessionKey }
    });
    
    const drivers = response.data || [];
    setCachedData(cacheKey, drivers);
    return drivers;
  })().catch((error) => {
    if (!isRateLimitError(error)) {
      console.error(`❌ Error al obtener pilotos de la sesión ${sessionKey}:`, error.message);
    }
    return getCachedData(cacheKey, true) || [];
  }).finally(() => {
    sessionDriverRequests.delete(sessionKey);
  });

  sessionDriverRequests.set(sessionKey, requestPromise);
  return requestPromise;
};

/**
 * Obtiene resultados completos de todas las sesiones de un meeting
 * @param {number} meetingKey - Clave del meeting
 * @returns {Promise<Object>} Objeto con todas las sesiones y sus resultados
 */
export const getCompleteMeetingResults = async (meetingKey) => {
  const cacheKey = `complete_meeting_${meetingKey}`;
  
  const cachedData = getCachedData(cacheKey);
  if (cachedData && !hasStaleCompletedSessions(cachedData)) {
    return cachedData;
  }

  const existingRequest = completeMeetingRequests.get(meetingKey);
  if (existingRequest) return existingRequest;

  const requestPromise = (async () => {
    const sessions = await getMeetingSessions(meetingKey);
    const sessionResults = {};
    
    // Procesar sesiones secuencialmente (el rate limiter ya controla las peticiones)
    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];
      const sessionType = session.session_name || session.session_type;
      
      try {
        const results = await getSessionResults(session.session_key, sessionType, { sessionDateEnd: session.date_end });
        const drivers = results.length > 0 ? await getSessionDrivers(session.session_key) : [];
        
        // Combinar resultados con información de pilotos
        const completeResults = results.map(result => {
          const driver = drivers.find(d => d.driver_number === result.driver_number);
          return {
            ...result,
            driver_info: driver || null
          };
        });
        
        sessionResults[session.session_key] = {
          session_info: session,
          results: completeResults,
          session_type: sessionType
        };
        
        // Sin delay adicional: el rate limiter y la cola ya gestionan el ritmo
        
      } catch (sessionError) {
        console.error(`❌ Error al procesar sesión ${session.session_key}:`, sessionError.message);
        // Continuar con la siguiente sesión en caso de error
        sessionResults[session.session_key] = {
          session_info: session,
          results: [],
          session_type: sessionType,
          error: sessionError.message
        };
      }
    }
    
    const result = {
      meeting_key: meetingKey,
      sessions: sessionResults,
      session_list: sessions
    };
    
    if (!hasStaleCompletedSessions(result)) {
      setCachedData(cacheKey, result);
    }
    return result;
    
  })().catch((error) => {
    if (!isRateLimitError(error)) {
      console.error(`❌ Error al obtener resultados completos del meeting ${meetingKey}:`, error.message);
    }
    
    // Intentar usar datos en caché como fallback
    const oldCachedData = getCachedData(cacheKey, true);
    if (oldCachedData) {
      return oldCachedData;
    }
    
    return {
      meeting_key: meetingKey,
      sessions: {},
      session_list: []
    };
  }).finally(() => {
    completeMeetingRequests.delete(meetingKey);
  });

  completeMeetingRequests.set(meetingKey, requestPromise);
  return requestPromise;
};

/**
 * Categoriza las sesiones por tipo
 * @param {Array} sessions - Array de sesiones
 * @returns {Object} Sesiones categorizadas por tipo
 */
export const categorizeSessionsByType = (sessions) => {
  const categorized = {
    practice: [],
    qualifying: [],
    sprint: [],
    race: []
  };
  
  sessions.forEach(session => {
    const sessionName = (session.session_name || session.session_type || '').toLowerCase();
    
    if (sessionName.includes('practice') || sessionName.includes('free')) {
      categorized.practice.push(session);
    } else if (sessionName.includes('qualifying') || sessionName.includes('quali')) {
      categorized.qualifying.push(session);
    } else if (sessionName.includes('sprint')) {
      categorized.sprint.push(session);
    } else if (sessionName.includes('race')) {
      categorized.race.push(session);
    }
  });
  
  return categorized;
};
