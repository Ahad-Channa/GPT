import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FiGlobe, FiArrowRight } from 'react-icons/fi';

const MAP_WIDTH = 760;
const MAP_HEIGHT = 380;

const projectPoint = (lon, lat) => [
  Number((((lon + 168) / 353) * MAP_WIDTH).toFixed(1)),
  Number((((82 - lat) / 138) * MAP_HEIGHT).toFixed(1)),
];

const polyToPath = (coords) => {
  if (!coords.length) return '';
  return (
    coords
      .map((pt, idx) => {
        const [x, y] = projectPoint(pt[0], pt[1]);
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ') + ' Z'
  );
};

// Equirectangular continent & major island silhouettes projected in the same [lon, lat] space as country pins
const WORLD_POLYGONS = [
  // North & Central America
  [
    [-166, 65], [-156, 71], [-135, 70], [-122, 72], [-96, 70], [-82, 64],
    [-64, 60], [-54, 52], [-66, 44], [-75, 36], [-81, 25], [-83, 30],
    [-90, 29], [-97, 26], [-96, 19], [-88, 21], [-83, 10], [-78, 8],
    [-85, 11], [-93, 15], [-105, 20], [-112, 28], [-117, 32], [-124, 42],
    [-125, 49], [-136, 58], [-152, 60], [-162, 56],
  ],
  // Greenland
  [[-55, 68], [-44, 82], [-18, 81], [-22, 70], [-43, 60], [-52, 63]],
  // South America
  [
    [-78, 9], [-72, 12], [-62, 10], [-50, 1], [-35, -6], [-38, -14],
    [-42, -23], [-52, -33], [-62, -41], [-67, -54], [-74, -52], [-73, -38],
    [-71, -20], [-81, -5],
  ],
  // Europe (mainland)
  [
    [-9, 37], [-9, 43], [-2, 43], [-4, 48], [2, 51], [8, 55], [10, 58],
    [5, 61], [14, 68], [28, 71], [32, 69], [28, 60], [21, 59], [19, 55],
    [29, 46], [28, 41], [23, 37], [18, 40], [16, 38], [12, 42], [9, 44],
    [3, 43], [-5, 36],
  ],
  // UK & Ireland
  [[-6, 50], [-5, 58], [-1, 58], [1, 52], [-2, 50]],
  [[-10, 52], [-9, 55], [-6, 54], [-7, 52]],
  // Africa
  [
    [-17, 15], [-13, 28], [-6, 36], [10, 37], [25, 32], [33, 31],
    [43, 12], [51, 12], [41, -2], [40, -14], [34, -25], [27, -34],
    [18, -34], [14, -22], [12, -6], [9, 4], [-8, 5], [-15, 11],
  ],
  // Madagascar
  [[44, -25], [47, -14], [50, -15], [47, -25]],
  // Asia & Middle East
  [
    [27, 41], [36, 37], [35, 30], [43, 13], [59, 22], [56, 26], [62, 25],
    [68, 24], [77, 8], [86, 21], [96, 16], [103, 2], [109, 12], [108, 21],
    [120, 24], [122, 31], [119, 39], [128, 35], [131, 43], [141, 53],
    [160, 60], [178, 66], [162, 70], [125, 73], [90, 75], [66, 70],
    [58, 68], [45, 67], [32, 69], [30, 58], [38, 46], [30, 44],
  ],
  // Japan
  [[130, 32], [136, 35], [141, 41], [145, 44], [140, 37], [132, 33]],
  // Indonesia / SE Asia Islands
  [[96, 5], [105, -6], [115, -8], [104, -2]],
  [[110, 2], [118, 5], [117, -3], [111, -2]],
  [[121, 18], [126, 8], [122, 7], [120, 14]],
  // Australia
  [
    [114, -22], [129, -14], [136, -12], [142, -11], [153, -26],
    [150, -37], [138, -35], [129, -32], [115, -34],
  ],
  // New Zealand
  [[167, -46], [174, -36], [178, -38], [171, -44]],
];

const COUNTRY_META = {
  germany: { code: 'DE', label: 'Germany', coords: [10.4, 51.1] },
  de: { code: 'DE', label: 'Germany', coords: [10.4, 51.1] },
  'united states': { code: 'US', label: 'United States', coords: [-98.5, 39.8] },
  usa: { code: 'US', label: 'United States', coords: [-98.5, 39.8] },
  us: { code: 'US', label: 'United States', coords: [-98.5, 39.8] },
  'united kingdom': { code: 'GB', label: 'United Kingdom', coords: [-2.5, 54.0] },
  uk: { code: 'GB', label: 'United Kingdom', coords: [-2.5, 54.0] },
  gb: { code: 'GB', label: 'United Kingdom', coords: [-2.5, 54.0] },
  canada: { code: 'CA', label: 'Canada', coords: [-106.3, 56.1] },
  ca: { code: 'CA', label: 'Canada', coords: [-106.3, 56.1] },
  france: { code: 'FR', label: 'France', coords: [2.2, 46.2] },
  fr: { code: 'FR', label: 'France', coords: [2.2, 46.2] },
  pakistan: { code: 'PK', label: 'Pakistan', coords: [69.3, 30.4] },
  pk: { code: 'PK', label: 'Pakistan', coords: [69.3, 30.4] },
  india: { code: 'IN', label: 'India', coords: [78.9, 20.6] },
  in: { code: 'IN', label: 'India', coords: [78.9, 20.6] },
  bangladesh: { code: 'BD', label: 'Bangladesh', coords: [90.3, 23.7] },
  australia: { code: 'AU', label: 'Australia', coords: [133.8, -25.3] },
  au: { code: 'AU', label: 'Australia', coords: [133.8, -25.3] },
  brazil: { code: 'BR', label: 'Brazil', coords: [-51.9, -14.2] },
  br: { code: 'BR', label: 'Brazil', coords: [-51.9, -14.2] },
  italy: { code: 'IT', label: 'Italy', coords: [12.5, 42.8] },
  it: { code: 'IT', label: 'Italy', coords: [12.5, 42.8] },
  spain: { code: 'ES', label: 'Spain', coords: [-3.7, 40.4] },
  es: { code: 'ES', label: 'Spain', coords: [-3.7, 40.4] },
  netherlands: { code: 'NL', label: 'Netherlands', coords: [5.3, 52.1] },
  nl: { code: 'NL', label: 'Netherlands', coords: [5.3, 52.1] },
  poland: { code: 'PL', label: 'Poland', coords: [19.1, 51.9] },
  pl: { code: 'PL', label: 'Poland', coords: [19.1, 51.9] },
  turkey: { code: 'TR', label: 'Turkey', coords: [35.2, 39.0] },
  tr: { code: 'TR', label: 'Turkey', coords: [35.2, 39.0] },
  russia: { code: 'RU', label: 'Russia', coords: [95.0, 61.5] },
  ru: { code: 'RU', label: 'Russia', coords: [95.0, 61.5] },
  portugal: { code: 'PT', label: 'Portugal', coords: [-8.2, 39.4] },
  pt: { code: 'PT', label: 'Portugal', coords: [-8.2, 39.4] },
  austria: { code: 'AT', label: 'Austria', coords: [14.5, 47.5] },
  switzerland: { code: 'CH', label: 'Switzerland', coords: [8.2, 46.8] },
  sweden: { code: 'SE', label: 'Sweden', coords: [18.6, 60.1] },
  norway: { code: 'NO', label: 'Norway', coords: [8.5, 60.5] },
  denmark: { code: 'DK', label: 'Denmark', coords: [9.5, 56.2] },
  finland: { code: 'FI', label: 'Finland', coords: [25.7, 61.9] },
  ireland: { code: 'IE', label: 'Ireland', coords: [-8.2, 53.4] },
  belgium: { code: 'BE', label: 'Belgium', coords: [4.5, 50.5] },
  'czech republic': { code: 'CZ', label: 'Czech Republic', coords: [15.5, 49.8] },
  greece: { code: 'GR', label: 'Greece', coords: [21.8, 39.1] },
  'united arab emirates': { code: 'AE', label: 'UAE', coords: [53.8, 23.4] },
  uae: { code: 'AE', label: 'UAE', coords: [53.8, 23.4] },
  'saudi arabia': { code: 'SA', label: 'Saudi Arabia', coords: [45.1, 23.9] },
  singapore: { code: 'SG', label: 'Singapore', coords: [103.8, 1.35] },
  japan: { code: 'JP', label: 'Japan', coords: [138.2, 36.2] },
  thailand: { code: 'TH', label: 'Thailand', coords: [100.9, 15.8] },
  indonesia: { code: 'ID', label: 'Indonesia', coords: [113.9, -0.8] },
  philippines: { code: 'PH', label: 'Philippines', coords: [121.8, 12.9] },
  mexico: { code: 'MX', label: 'Mexico', coords: [-102.5, 23.6] },
  argentina: { code: 'AR', label: 'Argentina', coords: [-63.6, -38.4] },
  'south africa': { code: 'ZA', label: 'South Africa', coords: [22.9, -30.5] },
  nigeria: { code: 'NG', label: 'Nigeria', coords: [8.7, 9.1] },
  egypt: { code: 'EG', label: 'Egypt', coords: [30.8, 26.8] },
};

const FLAG_SVG = {
  DE: (
    <svg viewBox="0 0 24 16" className="w-5 h-3.5 rounded-[3px] shrink-0 border border-gray-200">
      <rect width="24" height="5.33" y="0" fill="#111827" />
      <rect width="24" height="5.33" y="5.33" fill="#DC2626" />
      <rect width="24" height="5.34" y="10.66" fill="#FACC15" />
    </svg>
  ),
  US: (
    <svg viewBox="0 0 24 16" className="w-5 h-3.5 rounded-[3px] shrink-0 border border-gray-200">
      <rect width="24" height="16" fill="#FFFFFF" />
      <rect width="24" height="2.3" y="0" fill="#DC2626" />
      <rect width="24" height="2.3" y="4.6" fill="#DC2626" />
      <rect width="24" height="2.3" y="9.2" fill="#DC2626" />
      <rect width="24" height="2.3" y="13.7" fill="#DC2626" />
      <rect width="10.5" height="8.8" x="0" y="0" fill="#1E3A8A" />
    </svg>
  ),
  GB: (
    <svg viewBox="0 0 24 16" className="w-5 h-3.5 rounded-[3px] shrink-0 border border-gray-200">
      <rect width="24" height="16" fill="#1E3A8A" />
      <path d="M0 0 L24 16 M24 0 L0 16" stroke="#FFFFFF" strokeWidth="3" />
      <path d="M0 0 L24 16 M24 0 L0 16" stroke="#DC2626" strokeWidth="1.4" />
      <path d="M12 0 V16 M0 8 H24" stroke="#FFFFFF" strokeWidth="4.5" />
      <path d="M12 0 V16 M0 8 H24" stroke="#DC2626" strokeWidth="2.5" />
    </svg>
  ),
  CA: (
    <svg viewBox="0 0 24 16" className="w-5 h-3.5 rounded-[3px] shrink-0 border border-gray-200">
      <rect width="24" height="16" fill="#FFFFFF" />
      <rect width="6" height="16" x="0" fill="#DC2626" />
      <rect width="6" height="16" x="18" fill="#DC2626" />
      <circle cx="12" cy="8" r="2.6" fill="#DC2626" />
    </svg>
  ),
  FR: (
    <svg viewBox="0 0 24 16" className="w-5 h-3.5 rounded-[3px] shrink-0 border border-gray-200">
      <rect width="8" height="16" x="0" fill="#1D4ED8" />
      <rect width="8" height="16" x="8" fill="#FFFFFF" />
      <rect width="8" height="16" x="16" fill="#DC2626" />
    </svg>
  ),
  PK: (
    <svg viewBox="0 0 24 16" className="w-5 h-3.5 rounded-[3px] shrink-0 border border-gray-200">
      <rect width="24" height="16" fill="#047857" />
      <rect width="6.5" height="16" x="0" fill="#FFFFFF" />
      <circle cx="15" cy="8" r="3.6" fill="#FFFFFF" />
      <circle cx="16.2" cy="7.3" r="3.1" fill="#047857" />
    </svg>
  ),
  IN: (
    <svg viewBox="0 0 24 16" className="w-5 h-3.5 rounded-[3px] shrink-0 border border-gray-200">
      <rect width="24" height="5.33" y="0" fill="#F97316" />
      <rect width="24" height="5.33" y="5.33" fill="#FFFFFF" />
      <rect width="24" height="5.34" y="10.66" fill="#16A34A" />
      <circle cx="12" cy="8" r="1.9" fill="#1D4ED8" />
    </svg>
  ),
  IT: (
    <svg viewBox="0 0 24 16" className="w-5 h-3.5 rounded-[3px] shrink-0 border border-gray-200">
      <rect width="8" height="16" x="0" fill="#16A34A" />
      <rect width="8" height="16" x="8" fill="#FFFFFF" />
      <rect width="8" height="16" x="16" fill="#DC2626" />
    </svg>
  ),
  ES: (
    <svg viewBox="0 0 24 16" className="w-5 h-3.5 rounded-[3px] shrink-0 border border-gray-200">
      <rect width="24" height="4" y="0" fill="#DC2626" />
      <rect width="24" height="8" y="4" fill="#FACC15" />
      <rect width="24" height="4" y="12" fill="#DC2626" />
    </svg>
  ),
  NL: (
    <svg viewBox="0 0 24 16" className="w-5 h-3.5 rounded-[3px] shrink-0 border border-gray-200">
      <rect width="24" height="5.33" y="0" fill="#DC2626" />
      <rect width="24" height="5.33" y="5.33" fill="#FFFFFF" />
      <rect width="24" height="5.34" y="10.66" fill="#1D4ED8" />
    </svg>
  ),
  PL: (
    <svg viewBox="0 0 24 16" className="w-5 h-3.5 rounded-[3px] shrink-0 border border-gray-200">
      <rect width="24" height="8" y="0" fill="#FFFFFF" />
      <rect width="24" height="8" y="8" fill="#DC2626" />
    </svg>
  ),
  TR: (
    <svg viewBox="0 0 24 16" className="w-5 h-3.5 rounded-[3px] shrink-0 border border-gray-200">
      <rect width="24" height="16" fill="#DC2626" />
      <circle cx="10.5" cy="8" r="3.6" fill="#FFFFFF" />
      <circle cx="11.7" cy="8" r="2.9" fill="#DC2626" />
    </svg>
  ),
  AU: (
    <svg viewBox="0 0 24 16" className="w-5 h-3.5 rounded-[3px] shrink-0 border border-gray-200">
      <rect width="24" height="16" fill="#1E3A8A" />
      <rect width="10" height="7" x="0" y="0" fill="#DC2626" />
      <circle cx="18" cy="10" r="1.4" fill="#FFFFFF" />
      <circle cx="15" cy="5" r="1.1" fill="#FFFFFF" />
    </svg>
  ),
  BR: (
    <svg viewBox="0 0 24 16" className="w-5 h-3.5 rounded-[3px] shrink-0 border border-gray-200">
      <rect width="24" height="16" fill="#16A34A" />
      <polygon points="12,2 21,8 12,14 3,8" fill="#FACC15" />
      <circle cx="12" cy="8" r="2.8" fill="#1D4ED8" />
    </svg>
  ),
  AE: (
    <svg viewBox="0 0 24 16" className="w-5 h-3.5 rounded-[3px] shrink-0 border border-gray-200">
      <rect width="24" height="5.33" y="0" fill="#16A34A" />
      <rect width="24" height="5.33" y="5.33" fill="#FFFFFF" />
      <rect width="24" height="5.34" y="10.66" fill="#111827" />
      <rect width="6" height="16" x="0" fill="#DC2626" />
    </svg>
  ),
  SA: (
    <svg viewBox="0 0 24 16" className="w-5 h-3.5 rounded-[3px] shrink-0 border border-gray-200">
      <rect width="24" height="16" fill="#15803D" />
      <rect width="12" height="2" x="6" y="7" rx="1" fill="#FFFFFF" />
    </svg>
  ),
};

const renderCountryBadge = (country, isOther) => {
  if (isOther) {
    return (
      <span className="w-5 h-3.5 rounded-[3px] shrink-0 bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
        <FiGlobe size={10} />
      </span>
    );
  }
  const meta = COUNTRY_META[(country || '').trim().toLowerCase()];
  if (meta?.code && FLAG_SVG[meta.code]) {
    return FLAG_SVG[meta.code];
  }
  if (meta?.code) {
    return (
      <span className="w-5 h-3.5 rounded-[3px] shrink-0 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[9px] font-bold flex items-center justify-center leading-none">
        {meta.code}
      </span>
    );
  }
  return (
    <span className="w-5 h-3.5 rounded-[3px] shrink-0 bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500">
      <FiGlobe size={10} />
    </span>
  );
};

const getBarColor = (idx, isOther) => {
  if (isOther) return '#2563EB';
  return idx < 3 ? '#059669' : '#4F46E5';
};

const UsersByCountryCard = ({ data = [] }) => {
  const [hoveredCountry, setHoveredCountry] = useState(null);

  const worldPaths = useMemo(
    () => WORLD_POLYGONS.map((poly, idx) => ({ id: idx, d: polyToPath(poly) })),
    []
  );

  const mapMarkers = useMemo(() => {
    return data
      .filter((item) => !item.isOther)
      .map((item, idx) => {
        const meta = COUNTRY_META[(item.country || '').trim().toLowerCase()];
        if (!meta?.coords) return null;
        const [x, y] = projectPoint(meta.coords[0], meta.coords[1]);
        const radius = Math.max(7, Math.min(20, 7 + (item.percentage / 100) * 28));
        return {
          ...item,
          x,
          y,
          radius,
          color: getBarColor(idx, false),
        };
      })
      .filter(Boolean);
  }, [data]);

  const activeMarker = useMemo(
    () => mapMarkers.find((m) => m.country === hoveredCountry) || null,
    [mapMarkers, hoveredCountry]
  );

  return (
    <div className="admin-activity-card flex flex-col justify-between">
      <div className="admin-activity-header">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-600">
            <FiGlobe style={{ fontSize: '17px' }} />
          </div>
          <div>
            <h2 className="admin-activity-title">Users by Country</h2>
            <p className="admin-activity-sub">Geographic user distribution</p>
          </div>
        </div>

        <Link to="/admin/users" className="admin-country-link">
          <span>View Details</span>
          <FiArrowRight size={14} />
        </Link>
      </div>

      {data.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">
          No country data recorded yet.
        </div>
      ) : (
        <div className="admin-country-body">
          {/* Left: Light-themed SVG World Map with Proportional Country Bubbles */}
          <div className="admin-country-map-wrap" onMouseLeave={() => setHoveredCountry(null)}>
            <svg
              viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
              className="w-full h-auto block select-none"
              role="img"
              aria-label="World map showing user distribution by country"
            >
              {worldPaths.map((p) => (
                <path
                  key={p.id}
                  d={p.d}
                  fill="#E2E8F0"
                  stroke="#CBD5E1"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
              ))}

              {mapMarkers.map((marker) => {
                const isHovered = hoveredCountry === marker.country;
                return (
                  <g
                    key={marker.country}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredCountry(marker.country)}
                  >
                    <circle
                      cx={marker.x}
                      cy={marker.y}
                      r={isHovered ? marker.radius + 9 : marker.radius + 6}
                      fill={marker.color}
                      fillOpacity={isHovered ? 0.28 : 0.16}
                    />
                    <circle
                      cx={marker.x}
                      cy={marker.y}
                      r={isHovered ? marker.radius + 2 : marker.radius}
                      fill={marker.color}
                      fillOpacity={isHovered ? 0.95 : 0.8}
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                  </g>
                );
              })}
            </svg>

            {activeMarker && (
              <div
                className="admin-activity-tooltip"
                style={{
                  left: `${(activeMarker.x / MAP_WIDTH) * 100}%`,
                  top: `${(activeMarker.y / MAP_HEIGHT) * 100}%`,
                  transform:
                    activeMarker.x > MAP_WIDTH * 0.65
                      ? 'translate(calc(-100% - 10px), -50%)'
                      : 'translate(12px, -50%)',
                  minWidth: '150px',
                }}
              >
                <div className="admin-activity-tooltip-date flex items-center gap-1.5">
                  {renderCountryBadge(activeMarker.country, false)}
                  <span>{activeMarker.country}</span>
                </div>
                <div className="admin-activity-tooltip-row">
                  <span
                    className="admin-activity-dot"
                    style={{ backgroundColor: activeMarker.color }}
                  />
                  <span className="text-gray-600">
                    {activeMarker.count.toLocaleString()} {activeMarker.count === 1 ? 'user' : 'users'}
                  </span>
                  <span className="font-bold text-[#0E0F0C] ml-auto">
                    {activeMarker.percentage}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Top Countries + Progress Bars */}
          <div className="admin-country-list">
            {data.map((item, idx) => {
              const barColor = getBarColor(idx, item.isOther);
              const isHighlighted = hoveredCountry === item.country;
              return (
                <div
                  key={item.country}
                  className={`admin-country-row ${isHighlighted ? 'is-active' : ''}`}
                  onMouseEnter={() => setHoveredCountry(item.country)}
                  onMouseLeave={() => setHoveredCountry(null)}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {renderCountryBadge(item.country, item.isOther)}
                      <span className="text-[13px] font-medium text-[#0E0F0C] truncate">
                        {item.country}
                      </span>
                    </div>
                    <span className="text-[12.5px] font-semibold text-[#374151] shrink-0">
                      {item.percentage}%
                    </span>
                  </div>

                  <div className="admin-country-track">
                    <div
                      className="admin-country-fill"
                      style={{
                        width: `${Math.max(4, Math.min(100, item.percentage))}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersByCountryCard;
