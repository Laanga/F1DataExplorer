import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook personalizado para manejar llamadas asíncronas con cleanup automático
 * Previene memory leaks y llamadas duplicadas en StrictMode
 * 
 * @param {Function} asyncFunction - Función asíncrona que retorna una promesa
 * @param {Array} dependencies - Array de dependencias para el useEffect
 * @param {Object} options - Opciones adicionales
 * @returns {Object} - { data, loading, error, refetch }
 */
export const useAsyncData = (asyncFunction, dependencies = [], options = {}) => {
  const [data, setData] = useState(options.initialData || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const dependencyList = Array.isArray(dependencies) ? dependencies : [];
  const initialData = options.initialData || null;
  const dependencyKey = JSON.stringify(dependencyList);
  const asyncFunctionRef = useRef(asyncFunction);
  const initialDataRef = useRef(initialData);

  useEffect(() => {
    asyncFunctionRef.current = asyncFunction;
  }, [asyncFunction]);

  useEffect(() => {
    initialDataRef.current = initialData;
  }, [initialData]);

  const fetchData = useCallback(async (controller) => {
    try {
      setLoading(true);
      setError(null);

      // Ejecutar la función asíncrona pasando el signal para cancelación
      const result = await asyncFunctionRef.current(controller.signal);
      
      // Solo actualizar el estado si no se canceló la petición
      if (!controller.signal.aborted) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      // Ignorar errores de cancelación
      if (err.name !== 'AbortError' && !controller.signal.aborted) {
        console.error('Error en useAsyncData:', err);
        setError(err.message || 'Error al cargar datos');
        setData(initialDataRef.current);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // Crear un AbortController para esta petición
    const controller = new AbortController();

    // Ejecutar la petición
    fetchData(controller);

    // Cleanup: cancelar la petición si el componente se desmonta
    return () => {
      controller.abort();
    };
  }, [fetchData, dependencyKey]);

  // Función para refetch manual
  const refetch = useCallback(() => {
    const controller = new AbortController();
    fetchData(controller);
    return () => controller.abort();
  }, [fetchData]);

  return { data, loading, error, refetch };
};

/**
 * Hook para múltiples llamadas en paralelo con cleanup
 * 
 * @param {Array<Function>} asyncFunctions - Array de funciones asíncronas
 * @param {Array} dependencies - Dependencias del useEffect
 * @returns {Object} - { data, loading, error, refetch }
 */
export const useAsyncDataParallel = (asyncFunctions, dependencies = []) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const dependencyList = Array.isArray(dependencies) ? dependencies : [];
  const dependencyKey = JSON.stringify(dependencyList);
  const asyncFunctionsRef = useRef(asyncFunctions);

  useEffect(() => {
    asyncFunctionsRef.current = asyncFunctions;
  }, [asyncFunctions]);

  const fetchData = useCallback(async (controller) => {
    try {
      setLoading(true);
      setError(null);

      // Ejecutar todas las funciones en paralelo
      const promises = (asyncFunctionsRef.current || []).map(fn => fn(controller.signal));
      const results = await Promise.all(promises);
      
      if (!controller.signal.aborted) {
        setData(results);
        setError(null);
      }
    } catch (err) {
      if (err.name !== 'AbortError' && !controller.signal.aborted) {
        console.error('Error en useAsyncDataParallel:', err);
        setError(err.message || 'Error al cargar datos');
        setData([]);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller);
    
    return () => {
      controller.abort();
    };
  }, [fetchData, dependencyKey]);

  const refetch = useCallback(() => {
    const controller = new AbortController();
    fetchData(controller);
    return () => controller.abort();
  }, [fetchData]);

  return { data, loading, error, refetch };
};
