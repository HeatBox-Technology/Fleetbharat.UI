"use client";
import { createContext, useContext, useState } from "react";

const ColorContext = createContext();

export const useColor = () => {
  const context = useContext(ColorContext);
  if (!context) {
    throw new Error("useColor must be used within a ColorProvider");
  }
  return context;
};

const hexToHsl = (hex) => {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
      default:
        h = 0;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(
    l * 100,
  )}%`;
};

export const ColorProvider = ({ children }) => {
  const [selectedColor, setSelectedColor] = useState("#6366f1"); // Default indigo
  const [colorBlock, setColorBlock] = useState(false);

  const handleColorChange = (hex) => {
    setSelectedColor(hex);
    // You can also update theme HSL here if needed
    // setPrimaryHsl(hexToHsl(hex));
  };

  return (
    <ColorContext.Provider
      value={{
        selectedColor,
        setSelectedColor,
        handleColorChange,
        colorBlock,
        setColorBlock,
        hexToHsl,
      }}
    >
      {children}
    </ColorContext.Provider>
  );
};
