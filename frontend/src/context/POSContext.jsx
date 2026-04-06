import { createContext, useContext } from "react";
import usePOS from "../hooks/usePos";

const POSContext = createContext(null);

export function POSProvider({ children }) {
  const pos = usePOS();
  return (
    <POSContext.Provider value={pos}>
      {children}
    </POSContext.Provider>
  );
}

export function usePOSContext() {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error("usePOSContext debe usarse dentro de POSProvider");
  }
  return context;
}
