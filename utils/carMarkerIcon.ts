interface CarMarkerSvgOptions {
  color?: string;
  strokeColor?: string;
  isActive?: boolean;
  size?: number;
  direction?: number;
}

export function getCarMarkerSvg(options: CarMarkerSvgOptions = {}): string {
  const {
    color = "#10b981",
    strokeColor = "#0f172a",
    isActive = false,
    size = 48,
    direction = 0,
  } = options;

  return `data:image/svg+xml;utf-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48">
      <defs>
        <linearGradient id="carGradient-${color.replace("#", "")}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color};stop-opacity:0.85" />
        </linearGradient>
        <filter id="shadow">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.3"/>
        </filter>
      </defs>
      <g transform="translate(24, 24) rotate(${Number.isFinite(direction) ? direction : 0})" filter="url(#shadow)">
        <path d="M -9,-14 L -9,14 Q -9,15 -8,15 L 8,15 Q 9,15 9,14 L 9,-14 Q 9,-15 8,-15 L -8,-15 Q -9,-15 -9,-14 Z"
              fill="url(#carGradient-${color.replace("#", "")})"
              stroke="${strokeColor}"
              stroke-width="${isActive ? "2" : "1.2"}"/>
        <rect x="-7" y="-13" width="14" height="5" rx="1.5" fill="#000000" opacity="0.15"/>
        <path d="M -6.5,-7 L -6.5,-2 L 6.5,-2 L 6.5,-7 Z" fill="#1e293b" opacity="0.6"/>
        <path d="M -6.5,2 L -6.5,7 L 6.5,7 L 6.5,2 Z" fill="#1e293b" opacity="0.5"/>
        <rect x="-7" y="8" width="14" height="5" rx="1.5" fill="#000000" opacity="0.1"/>
        <ellipse cx="-9.5" cy="0" rx="1.8" ry="2.5" fill="${color}" stroke="${strokeColor}" stroke-width="0.8" opacity="0.95"/>
        <ellipse cx="9.5" cy="0" rx="1.8" ry="2.5" fill="${color}" stroke="${strokeColor}" stroke-width="0.8" opacity="0.95"/>
        <circle cx="-5" cy="-13.5" r="1.3" fill="#ffffff" opacity="0.95"/>
        <circle cx="5" cy="-13.5" r="1.3" fill="#ffffff" opacity="0.95"/>
        <ellipse cx="-5" cy="13.5" rx="1.5" ry="1" fill="#dc2626" opacity="0.9"/>
        <ellipse cx="5" cy="13.5" rx="1.5" ry="1" fill="#dc2626" opacity="0.9"/>
        <ellipse cx="0" cy="0" rx="5" ry="8" fill="#ffffff" opacity="0.15"/>
      </g>
    </svg>
  `)}`;
}
