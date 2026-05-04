import { createContext, useContext, useMemo } from 'react';
import { getCurrentF1Season } from '../services/config/apiConfig';

const YearContext = createContext();

export const useYear = () => {
  const context = useContext(YearContext);
  if (!context) {
    throw new Error('useYear debe ser usado dentro de un YearProvider');
  }
  return context;
};

export const YearProvider = ({ children }) => {
  // Siempre usar la temporada actual - sin selector
  const currentYear = getCurrentF1Season();

  const value = useMemo(() => ({
    selectedYear: currentYear,
    isCurrentSeason: true
  }), [currentYear]);

  return (
    <YearContext.Provider value={value}>
      {children}
    </YearContext.Provider>
  );
};
