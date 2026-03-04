import { API_CONFIG } from '../config/apiConfig.js';

/**
 * Sistema de caché persistente usando localStorage
 * Los datos se mantienen entre sesiones del navegador
 */

const CACHE_PREFIX = 'f1_cache_';
const CACHE_VERSION = 'v1_';

/**
 * Obtiene datos del caché
 * @param {string} key - Clave del caché
 * @param {boolean} ignoreExpiration - Si true, ignora la expiración
 * @returns {any|null} - Datos cacheados o null
 */
export const getCachedData = (key, ignoreExpiration = false) => {
  try {
    const cacheKey = CACHE_PREFIX + CACHE_VERSION + key;
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) {
      return null;
    }

    const { data, timestamp } = JSON.parse(cached);
    const isExpired = Date.now() - timestamp >= API_CONFIG.OPENF1.CACHE_DURATION;
    
    if (!isExpired || ignoreExpiration) {
      return data;
    }
    
    // Si expiró, eliminar del localStorage
    localStorage.removeItem(cacheKey);
    return null;
  } catch (error) {
    console.warn('Error al leer del caché:', error);
    return null;
  }
};

/**
 * Guarda datos en el caché
 * @param {string} key - Clave del caché
 * @param {any} data - Datos a cachear
 */
export const setCachedData = (key, data) => {
  const cacheKey = CACHE_PREFIX + CACHE_VERSION + key;
  const cacheData = {
    data,
    timestamp: Date.now()
  };

  try {
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    // Si localStorage está lleno o no disponible, solo advertir
    console.warn('Error al guardar en caché:', error);
    
    // Intentar limpiar caché antiguo si está lleno
    if (error.name === 'QuotaExceededError') {
      clearExpiredCache();
      // Intentar guardar nuevamente
      try {
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      } catch (retryError) {
        console.warn('No se pudo guardar en caché después de limpiar:', retryError);
      }
    }
  }
};

/**
 * Limpia todo el caché de la aplicación
 */
export const clearCache = () => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX + CACHE_VERSION)) {
        localStorage.removeItem(key);
      }
    });
    // Caché limpiado completamente
  } catch (error) {
    console.warn('Error al limpiar caché:', error);
  }
};

/**
 * Limpia solo las entradas expiradas del caché
 */
export const clearExpiredCache = () => {
  try {
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX + CACHE_VERSION)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const { timestamp } = JSON.parse(cached);
            const isExpired = Date.now() - timestamp >= API_CONFIG.OPENF1.CACHE_DURATION;
            
            if (isExpired) {
              localStorage.removeItem(key);
            }
          }
        } catch (e) {
          // Si hay error al parsear, eliminar la entrada corrupta
          localStorage.removeItem(key);
        }
      }
    });
    
    // Si se eliminaron entradas expiradas, no registrar en consola
  } catch (error) {
    console.warn('Error al limpiar caché expirado:', error);
  }
};

// Limpiar caché expirado al cargar la aplicación
if (typeof window !== 'undefined') {
  // Ejecutar limpieza de caché expirado al iniciar
  setTimeout(() => {
    clearExpiredCache();
  }, 1000);
}
