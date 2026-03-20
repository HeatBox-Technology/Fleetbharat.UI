// context/LayoutContext.jsx
"use client";
import { createContext, useContext, useState } from "react";

const LayoutContext = createContext();

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
};

export const LayoutProvider = ({ children }) => {
  const [layout, setLayout] = useState("sidebar"); // "sidebar" or "topnav"

  return (
    <LayoutContext.Provider value={{ layout, setLayout }}>
      {children}
    </LayoutContext.Provider>
  );
};
