import axios from 'axios';
import { API_CONFIG, getCurrentYear } from '../config/apiConfig.js';
import { getCachedData, setCachedData } from '../utils/cache.js';
import { getSelectedYear } from '../../hooks/useSelectedYear.js';
import { safeRequest } from '../utils/rateLimiter.js';

const toDayKey = (dateValue) => {
  if (!dateValue) return '';
  if (typeof dateValue === 'string') {
    const rawDateMatch = dateValue.match(/^(\d{4}-\d{2}-\d{2})/);
    if (rawDateMatch?.[1]) {
      return rawDateMatch[1];
    }
  }
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const normalizeText = (value) => (
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
);

const buildRaceKey = (race) => {
  const explicitRound = Number.parseInt(race?.round, 10);
  const roundKey = Number.isFinite(explicitRound) ? `round:${String(explicitRound).padStart(2, '0')}` : '';
  const dayKey = toDayKey(race?.date_start || race?.date_end);
  const nameKey = normalizeText(race?.race_name || race?.meeting_name || race?.circuit_short_name || race?.location || race?.country_name);

  // Priorizar día para unificar OpenF1 y Ergast aunque falte `round` en una fuente.
  if (dayKey) return `day:${dayKey}`;
  if (roundKey && nameKey) return `${roundKey}|${nameKey}`;
  if (roundKey) return roundKey;
  if (nameKey) return `name:${nameKey}`;
  return `session:${race?.session_key || race?.meeting_key || Math.random()}`;
};

const buildMeetingKey = (meeting) => {
  const explicitRound = Number.parseInt(meeting?.round, 10);
  const roundKey = Number.isFinite(explicitRound) ? `round:${String(explicitRound).padStart(2, '0')}` : '';
  const dayKey = toDayKey(meeting?.date_end || meeting?.date_start);
  const nameKey = normalizeText(meeting?.meeting_name || meeting?.meeting_official_name || meeting?.circuit_short_name || meeting?.location);

  // Priorizar día para unificar OpenF1 y Ergast aunque falte `round` en una fuente.
  if (dayKey) return `day:${dayKey}`;
  if (roundKey && nameKey) return `${roundKey}|${nameKey}`;
  if (roundKey) return roundKey;
  if (nameKey) return `name:${nameKey}`;
  return `meeting:${meeting?.meeting_key || Math.random()}`;
};

const preferPrimarySource = (currentItem, nextItem) => {
  if (!currentItem) return nextItem;
  const currentIsErgast = currentItem?.source === 'ergast';
  const nextIsErgast = nextItem?.source === 'ergast';

  // Si hay conflicto, priorizar el dato de OpenF1 por ser la fuente principal de la app.
  if (currentIsErgast && !nextIsErgast) return nextItem;
  return currentItem;
};

const dedupeItems = (items, getKey) => {
  const dedupedMap = new Map();

  items.forEach((item) => {
    const key = getKey(item);
    const existing = dedupedMap.get(key);
    const preferred = preferPrimarySource(existing, item);
    dedupedMap.set(key, preferred);
  });

  return Array.from(dedupedMap.values());
};

export const getSessions = async (sessionName = null, options = {}) => {
  const { year } = options;
  const selectedYear = year ?? getSelectedYear();
  const cacheKey = sessionName ? `sessions_${sessionName}_${selectedYear}` : `sessions_${selectedYear}`;
  
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    const response = await safeRequest(`${API_CONFIG.OPENF1.BASE_URL}/sessions`, {
      params: sessionName ? { session_name: sessionName } : {}
    });
    
    const sessions = response.data || [];
    
    if (!Array.isArray(sessions) || sessions.length === 0) {
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      return [];
    }

    const filteredSessions = sessions.filter(session => {
      const sessionDate = new Date(session.date_start);
      return sessionDate.getFullYear() === selectedYear;
    });

    setCachedData(cacheKey, filteredSessions);
    return filteredSessions;
  } catch (error) {
    console.error('❌ Error al obtener sesiones:', error.message);
    // Usar cache antiguo si existe
    
    const oldCachedData = getCachedData(cacheKey, true);
    if (oldCachedData && oldCachedData.length > 0) {
      return oldCachedData;
    }
    
    return [];
  }
};

export const getFutureRacesFromErgast = async (year, options = {}) => {
  const { signal } = options;
  const cacheKey = `future_races_ergast_${year}`;
  
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    const response = await axios.get(`${API_CONFIG.JOLPICA.BASE_URL}/${year}.json`, { signal });
    
    if (response.data?.MRData?.RaceTable?.Races) {
      const races = response.data.MRData.RaceTable.Races;
      
      const futureRaces = races
        .filter(race => {
          const raceDate = new Date(race.date);
          return raceDate > new Date();
        })
        .map((race) => {
          const meetingKey = parseInt(`${year}${String(race.round).padStart(2, '0')}`);
          
          return {
            session_key: parseInt(`${meetingKey}01`),
            session_name: 'Race',
            date_start: race.date + 'T' + (race.time || '14:00:00'),
            date_end: race.date + 'T' + (race.time || '16:00:00'),
            gmt_offset: '+00:00',
            session_type: 'Race',
            meeting_key: meetingKey,
            location: race.Circuit?.circuitName || race.raceName,
            country_code: race.Circuit?.Location?.country || 'Unknown',
            country_name: race.Circuit?.Location?.country || 'Unknown',
            circuit_key: race.Circuit?.circuitId || `circuit_${race.round}`,
            circuit_short_name: race.Circuit?.circuitName || race.raceName,
            race_name: race.raceName,
            round: parseInt(race.round),
            is_future_race: true,
            source: 'ergast'
          };
        });

      setCachedData(cacheKey, futureRaces);
      return futureRaces;
    }
  } catch (error) {
    console.error(`❌ Error al obtener carreras futuras desde Ergast para ${year}:`, error.message);
  }
  
  return [];
};

export const getRaces = async (options = {}) => {
  const { signal, year } = options;
  const selectedYear = year ?? getSelectedYear();
  const currentYear = getCurrentYear();
  
  try {
    const historicalRaces = await getSessions('Race', { year: selectedYear });
    
    const yearFilteredRaces = historicalRaces.filter(race => {
      const raceYear = new Date(race.date_start).getFullYear();
      return raceYear === selectedYear;
    });

    let futureRaces = [];
    if (selectedYear >= currentYear) {
      try {
        futureRaces = await getFutureRacesFromErgast(selectedYear, { signal });
      } catch (futureError) {
        console.error('❌ Error al obtener carreras futuras desde Ergast:', futureError.message);
        futureRaces = [];
      }
    }
    
    const allRaces = [...yearFilteredRaces, ...futureRaces];
    const dedupedRaces = dedupeItems(allRaces, buildRaceKey);

    dedupedRaces.sort((a, b) => new Date(a.date_start) - new Date(b.date_start));
    
    return dedupedRaces;
  } catch (error) {
    console.error('❌ Error al obtener carreras:', error.message);
    // Intentar fallback
    
    try {
      const fallbackRaces = await getSessions('Race', { year: selectedYear });
      const filteredFallback = fallbackRaces.filter(race => {
        const raceYear = new Date(race.date_start).getFullYear();
        return raceYear === selectedYear;
      });
      return filteredFallback;
    } catch (fallbackError) {
      console.error('❌ Error en fallback de carreras:', fallbackError.message);
      return [];
    }
  }
};

// getLatestSession eliminado por no usarse

export const getFutureMeetingsFromErgast = async (year, options = {}) => {
  const { signal } = options;
  const cacheKey = `future_meetings_ergast_${year}`;
  
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    const response = await axios.get(`${API_CONFIG.JOLPICA.BASE_URL}/${year}.json`, { signal });
    
    if (response.data?.MRData?.RaceTable?.Races) {
      const races = response.data.MRData.RaceTable.Races;
      
      const futureMeetings = races
        .filter(race => {
          const raceDate = new Date(race.date);
          return raceDate > new Date();
        })
        .map((race) => {
          const meetingKey = parseInt(`${year}${String(race.round).padStart(2, '0')}`);
          
          return {
            meeting_key: meetingKey,
            meeting_name: race.raceName,
            date_start: race.date + 'T09:00:00',
            date_end: race.date + 'T' + (race.time || '16:00:00'),
            gmt_offset: '+00:00',
            meeting_official_name: race.raceName,
            location: race.Circuit?.circuitName || race.raceName,
            country_code: race.Circuit?.Location?.country || 'Unknown',
            country_name: race.Circuit?.Location?.country || 'Unknown',
            circuit_key: race.Circuit?.circuitId || `circuit_${race.round}`,
            circuit_short_name: race.Circuit?.circuitName || race.raceName,
            year: year,
            round: parseInt(race.round),
            is_future_meeting: true,
            source: 'ergast'
          };
        });

      setCachedData(cacheKey, futureMeetings);
      return futureMeetings;
    }
  } catch (error) {
    console.error(`❌ Error al obtener meetings futuros desde Ergast para ${year}:`, error.message);
  }
  
  return [];
};

export const getMeetings = async (options = {}) => {
  const { signal, year } = options;
  const selectedYear = year ?? getSelectedYear();
  const currentYear = getCurrentYear();
  const cacheKey = `meetings_${selectedYear}`;
  
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    const dedupedCachedMeetings = dedupeItems(cachedData, buildMeetingKey);
    if (dedupedCachedMeetings.length !== cachedData.length) {
      setCachedData(cacheKey, dedupedCachedMeetings);
    }
    return dedupedCachedMeetings;
  }

  try {
    const response = await axios.get(`${API_CONFIG.OPENF1.BASE_URL}/meetings`, { signal });
    const meetings = response.data || [];
    
    const selectedYearMeetings = meetings.filter(meeting => {
      const meetingYear = new Date(meeting.date_start).getFullYear();
      return meetingYear === selectedYear;
    });

    let futureMeetings = [];
    if (selectedYear >= currentYear) {
      futureMeetings = await getFutureMeetingsFromErgast(selectedYear, { signal });
    }
    
    const allMeetings = [...selectedYearMeetings, ...futureMeetings];
    const dedupedMeetings = dedupeItems(allMeetings, buildMeetingKey);

    dedupedMeetings.sort((a, b) => new Date(a.date_start) - new Date(b.date_start));

    setCachedData(cacheKey, dedupedMeetings);
    return dedupedMeetings;
  } catch (error) {
    console.error('❌ Error al obtener meetings:', error.message);
    return [];
  }
};

// getPositions eliminado por no usarse

// getLaps eliminado por no usarse

// getLastSession eliminado por no usarse
