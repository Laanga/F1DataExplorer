import { API_CONFIG } from '../config/apiConfig.js';
import { getCachedData, setCachedData } from '../utils/cache.js';
import { safeRequest } from '../utils/rateLimiter.js';

/**
 * Servicio para operaciones relacionadas con resultados de carreras
 */

/**
 * Obtiene los resultados finales de una carrera usando session_key
 * @param {number} sessionKey - Clave única de la sesión
 * @returns {Promise<Array>} Array con los resultados de la carrera
 */
export const getRaceResults = async (sessionKey) => {
  if (!sessionKey) {
    return [];
  }

  const cacheKey = `race_results_${sessionKey}`;
  
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    // Intentar obtener resultados usando el endpoint session_result
    const response = await safeRequest(`${API_CONFIG.OPENF1.BASE_URL}/session_result`, {
      params: { session_key: sessionKey }
    });
    
    if (response.data && response.data.length > 0) {
      const results = response.data.sort((a, b) => (a.position || 999) - (b.position || 999));
      setCachedData(cacheKey, results);
      return results;
    }

    // Si no hay resultados en session_result, intentar con position endpoint
    const positionResponse = await safeRequest(`${API_CONFIG.OPENF1.BASE_URL}/position`, {
      params: { session_key: sessionKey }
    });

    if (positionResponse.data && positionResponse.data.length > 0) {
      // Obtener las posiciones finales (últimas posiciones registradas)
      const positions = positionResponse.data;
      
      // Agrupar por driver_number y obtener la última posición de cada piloto
      const finalPositions = {};
      positions.forEach(pos => {
        const driverNumber = pos.driver_number;
        if (!finalPositions[driverNumber] || new Date(pos.date) > new Date(finalPositions[driverNumber].date)) {
          finalPositions[driverNumber] = pos;
        }
      });

      const results = Object.values(finalPositions)
        .sort((a, b) => (a.position || 999) - (b.position || 999));

      setCachedData(cacheKey, results);
      return results;
    }

    return [];

  } catch (error) {
    console.error(`❌ Error al obtener resultados de carrera para sesión ${sessionKey}:`, error.message);
    return [];
  }
};

/**
 * Obtiene información detallada de los pilotos para una sesión específica
 * @param {number} sessionKey - Clave única de la sesión
 * @returns {Promise<Array>} Array con información de los pilotos
 */
export const getSessionDrivers = async (sessionKey) => {
  if (!sessionKey) {
    return [];
  }

  const cacheKey = `session_drivers_${sessionKey}`;
  
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    const response = await safeRequest(`${API_CONFIG.OPENF1.BASE_URL}/drivers`, {
      params: { session_key: sessionKey }
    });
    
    const drivers = response.data || [];
    setCachedData(cacheKey, drivers);
    return drivers;

  } catch (error) {
    console.error(`❌ Error al obtener pilotos para sesión ${sessionKey}:`, error.message);
    
    // Intentar usar datos en caché como fallback
    const oldCachedData = getCachedData(cacheKey, true);
    if (oldCachedData && oldCachedData.length > 0) {
      return oldCachedData;
    }
    
    return [];
  }
};

/**
 * Combina resultados de carrera con información de pilotos
 * @param {number} sessionKey - Clave única de la sesión
 * @returns {Promise<Array>} Array con resultados completos incluyendo información de pilotos
 */
export const getCompleteRaceResults = async (sessionKey) => {
  try {
    const [results, drivers] = await Promise.all([
      getRaceResults(sessionKey),
      getSessionDrivers(sessionKey)
    ]);

    if (results.length === 0) {
      return [];
    }

    // Combinar resultados con información de pilotos
    const completeResults = results.map(result => {
      const driver = drivers.find(d => d.driver_number === result.driver_number);
      return {
        ...result,
        driver_info: driver || null
      };
    });

    return completeResults;

  } catch (error) {
    console.error(`❌ Error al obtener resultados completos para sesión ${sessionKey}:`, error.message);
    return [];
  }
};
