import axios from 'axios';

/**
 * Utilidad para manejar rate limiting y peticiones con retry
 */

// Queue para controlar concurrencia
let requestQueue = [];
let isProcessingQueue = false;
const inFlightRequests = new Map();
const MAX_CONCURRENT_REQUESTS = 1;
const BASE_DELAY = 1500;
const MAX_RETRIES = 3;
const RATE_LIMIT_COOLDOWN = 12000;
let rateLimitUntil = 0;

/**
 * Delay con backoff exponencial
 * @param {number} attempt - Número de intento (0-based)
 * @param {number} baseDelay - Delay base en ms
 * @returns {Promise} Promise que se resuelve después del delay
 */
export const exponentialBackoff = (attempt, baseDelay = BASE_DELAY) => {
  const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000; // Jitter aleatorio
  return new Promise(resolve => setTimeout(resolve, delay));
};

const stableStringify = (value) => {
  if (!value || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;

  return `{${Object.keys(value)
    .sort()
    .filter((key) => key !== 'signal')
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(',')}}`;
};

const buildRequestKey = (url, config = {}) => {
  const method = String(config.method || 'GET').toUpperCase();
  const params = stableStringify(config.params || {});
  const data = stableStringify(config.data || null);
  return `${method}:${url}:params=${params}:data=${data}`;
};

export const isRateLimitError = (error) => error?.response?.status === 429;

const getRetryAfterDelay = (error) => {
  const retryAfter = error?.response?.headers?.['retry-after'];
  if (!retryAfter) return RATE_LIMIT_COOLDOWN;

  const retryAfterSeconds = Number(retryAfter);
  if (Number.isFinite(retryAfterSeconds)) {
    return Math.max(RATE_LIMIT_COOLDOWN, retryAfterSeconds * 1000);
  }

  const retryAfterDate = new Date(retryAfter).getTime();
  if (Number.isFinite(retryAfterDate)) {
    return Math.max(RATE_LIMIT_COOLDOWN, retryAfterDate - Date.now());
  }

  return RATE_LIMIT_COOLDOWN;
};

const applyGlobalCooldown = async () => {
  const waitTime = rateLimitUntil - Date.now();
  if (waitTime > 0) {
    await delay(waitTime);
  }
};

/**
 * Procesa la queue de peticiones de forma secuencial
 */
const processQueue = async () => {
  if (isProcessingQueue || requestQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;
  
  while (requestQueue.length > 0) {
    const batch = requestQueue.splice(0, MAX_CONCURRENT_REQUESTS);
    
    // Procesar batch en paralelo
    await Promise.all(batch.map(async (requestItem) => {
      try {
        const result = await requestItem.execute();
        requestItem.resolve(result);
      } catch (error) {
        requestItem.reject(error);
      }
    }));
    
    // Delay entre batches para evitar rate limiting
    if (requestQueue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 500)); // 500ms entre batches
    }
  }
  
  isProcessingQueue = false;
};

/**
 * Añade una petición a la queue
 * @param {Function} requestFunction - Función que ejecuta la petición
 * @returns {Promise} Promise que se resuelve con el resultado
 */
export const queueRequest = (requestFunction) => {
  return new Promise((resolve, reject) => {
    requestQueue.push({
      execute: requestFunction,
      resolve,
      reject
    });
    
    // Iniciar procesamiento si no está en curso
    processQueue();
  });
};

/**
 * Ejecuta una petición HTTP con retry y backoff exponencial
 * @param {string} url - URL de la petición
 * @param {Object} config - Configuración de axios
 * @param {number} maxRetries - Número máximo de reintentos
 * @returns {Promise} Promise con la respuesta
 */
export const requestWithRetry = async (url, config = {}, maxRetries = MAX_RETRIES) => {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await applyGlobalCooldown();
      // Aplicar rate limiting
      await applyRateLimit();
      
      const response = await axios({
        url,
        ...config
      });
      return response;
      
    } catch (error) {
      lastError = error;
      
      // Si es error 429 (rate limit), siempre reintentar
      if (isRateLimitError(error)) {
        if (attempt === maxRetries) break;
        const retryDelay = getRetryAfterDelay(error) + (attempt * 3000);
        rateLimitUntil = Math.max(rateLimitUntil, Date.now() + retryDelay);
        console.warn(`OpenF1 ha limitado las peticiones. Pausa de ${Math.round(retryDelay / 1000)}s antes de reintentar ${url}.`);
        await delay(retryDelay + Math.random() * 1000);
        continue;
      }
      
      // Si es error de red o timeout, reintentar
      if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || !error.response) {
        if (attempt === maxRetries) break;
        await exponentialBackoff(attempt);
        continue;
      }
      
      // Para otros errores HTTP, no reintentar
      if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429) {
        console.error(`❌ Error HTTP ${error.response.status} en ${url}. No se reintenta.`, error.message);
        throw error;
      }
    }
  }
  console.error(`❌ Todos los reintentos fallaron para ${url}.`, lastError?.message || lastError);
  throw lastError;
};

/**
 * Wrapper para peticiones con queue y retry
 * @param {string} url - URL de la petición
 * @param {Object} config - Configuración de axios
 * @returns {Promise} Promise con la respuesta
 */
export const safeRequest = async (url, config = {}) => {
  const requestKey = buildRequestKey(url, config);
  const existingRequest = inFlightRequests.get(requestKey);
  if (existingRequest) {
    return existingRequest;
  }

  const requestPromise = queueRequest(async () => {
    return requestWithRetry(url, config);
  });

  inFlightRequests.set(requestKey, requestPromise);
  requestPromise.then(
    () => inFlightRequests.delete(requestKey),
    () => inFlightRequests.delete(requestKey)
  );

  return requestPromise;
};

/**
 * Delay simple entre peticiones
 * @param {number} ms - Milisegundos a esperar
 * @returns {Promise} Promise que se resuelve después del delay
 */
export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Rate limiter con control de tiempo entre peticiones
 */
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1500; // 1.5 segundos mínimo entre peticiones

/**
 * Aplica rate limiting basado en tiempo
 * @param {number} minInterval - Intervalo mínimo entre peticiones en ms
 * @returns {Promise} Promise que se resuelve cuando es seguro hacer la petición
 */
export const applyRateLimit = async (minInterval = MIN_REQUEST_INTERVAL) => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < minInterval) {
    const waitTime = minInterval - timeSinceLastRequest;
    await delay(waitTime);
  }
  
  lastRequestTime = Date.now();
};

/**
 * Obtiene el estado actual de la queue
 * @returns {Object} Estado de la queue
 */
export const getQueueStatus = () => {
  return {
    queueLength: requestQueue.length,
    isProcessing: isProcessingQueue,
    maxConcurrent: MAX_CONCURRENT_REQUESTS
  };
};
