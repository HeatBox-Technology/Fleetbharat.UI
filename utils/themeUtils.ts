export function hexToHSL(hex: string) {
  hex = hex.replace("#", "");
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;

  const cmin = Math.min(r, g, b);
  const cmax = Math.max(r, g, b);
  const delta = cmax - cmin;
  let h = 0,
    s = 0,
    l = 0;

  if (delta === 0) h = 0;
  else if (cmax === r) h = ((g - b) / delta) % 6;
  else if (cmax === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  l = (cmax + cmin) / 2;
  s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  return `${h} ${s}% ${l}%`;
}

export function applyWhiteLabelColors(
  whiteLabel: any,
  handleColorChange?: (hex: string) => void,
) {
  if (!whiteLabel) return;

  const root = document.documentElement;
  const isDark = root.classList.contains("dark");

  const { primaryColorHex, secondaryColorHex } = whiteLabel;

  // 🔹 Update context color if provided
  if (handleColorChange && primaryColorHex) {
    handleColorChange(primaryColorHex);
  }

  // 🔹 Apply primary to CSS variable
  if (primaryColorHex)
    root.style.setProperty("--primary", hexToHSL(primaryColorHex));

  // 🔹 Update background (for light theme only)
  if (!isDark && secondaryColorHex)
    root.style.setProperty("--background", hexToHSL(secondaryColorHex));
}
