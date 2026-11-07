import { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [appName] = useState('Embrapa Meeting');

  return <AppContext.Provider value={{ appName }}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  return useContext(AppContext);
}