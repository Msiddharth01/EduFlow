'use client';
import React, { useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';

export type PatternType =
  | 'circles'
  | 'triangles'
  | 'grid'
  | 'hexagons'
  | 'polygons'
  | 'bauhaus'
  | 'waves';

export interface PaletteThemeColors {
  bgGradient: string;
  shapeFill1: string;
  shapeFill2: string;
  shapeStroke: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export interface PaletteDef {
  name: string;
  dark: PaletteThemeColors;
  light: PaletteThemeColors;
}

// 7 distinct palettes representing:
// Lavender/Purple, Sky Blue, Teal/Green, Soft Orange, Pink, Yellow/Amber, Indigo
export const PALETTES: PaletteDef[] = [
  {
    name: 'purple',
    dark: {
      bgGradient: 'linear-gradient(135deg, #2E1065 0%, #581C87 50%, #7C3AED 100%)',
      shapeFill1: 'rgba(192, 132, 252, 0.22)',
      shapeFill2: 'rgba(232, 121, 249, 0.16)',
      shapeStroke: 'rgba(216, 180, 254, 0.35)',
      badgeBg: 'rgba(30, 10, 60, 0.7)',
      badgeText: '#F3E8FF',
      badgeBorder: 'rgba(192, 132, 252, 0.45)',
    },
    light: {
      bgGradient: 'linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 50%, #DDD6FE 100%)',
      shapeFill1: 'rgba(126, 34, 206, 0.16)',
      shapeFill2: 'rgba(168, 85, 247, 0.12)',
      shapeStroke: 'rgba(109, 40, 217, 0.28)',
      badgeBg: 'rgba(255, 255, 255, 0.9)',
      badgeText: '#581C87',
      badgeBorder: 'rgba(168, 85, 247, 0.4)',
    },
  },
  {
    name: 'sky',
    dark: {
      bgGradient: 'linear-gradient(135deg, #082F49 0%, #0369A1 50%, #0284C7 100%)',
      shapeFill1: 'rgba(56, 189, 248, 0.22)',
      shapeFill2: 'rgba(125, 211, 252, 0.16)',
      shapeStroke: 'rgba(186, 230, 253, 0.35)',
      badgeBg: 'rgba(8, 47, 73, 0.7)',
      badgeText: '#E0F2FE',
      badgeBorder: 'rgba(56, 189, 248, 0.45)',
    },
    light: {
      bgGradient: 'linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 50%, #7DD3FC 100%)',
      shapeFill1: 'rgba(2, 132, 199, 0.18)',
      shapeFill2: 'rgba(14, 165, 233, 0.12)',
      shapeStroke: 'rgba(3, 105, 161, 0.28)',
      badgeBg: 'rgba(255, 255, 255, 0.9)',
      badgeText: '#075985',
      badgeBorder: 'rgba(2, 132, 199, 0.4)',
    },
  },
  {
    name: 'teal',
    dark: {
      bgGradient: 'linear-gradient(135deg, #064E3B 0%, #047857 50%, #059669 100%)',
      shapeFill1: 'rgba(52, 211, 153, 0.22)',
      shapeFill2: 'rgba(110, 231, 183, 0.16)',
      shapeStroke: 'rgba(167, 243, 208, 0.35)',
      badgeBg: 'rgba(6, 78, 59, 0.7)',
      badgeText: '#D1FAE5',
      badgeBorder: 'rgba(52, 211, 153, 0.45)',
    },
    light: {
      bgGradient: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 50%, #A7F3D0 100%)',
      shapeFill1: 'rgba(5, 150, 105, 0.16)',
      shapeFill2: 'rgba(16, 185, 129, 0.12)',
      shapeStroke: 'rgba(4, 120, 87, 0.28)',
      badgeBg: 'rgba(255, 255, 255, 0.9)',
      badgeText: '#065F46',
      badgeBorder: 'rgba(5, 150, 105, 0.4)',
    },
  },
  {
    name: 'orange',
    dark: {
      bgGradient: 'linear-gradient(135deg, #431407 0%, #9A3412 50%, #EA580C 100%)',
      shapeFill1: 'rgba(251, 146, 60, 0.22)',
      shapeFill2: 'rgba(253, 186, 116, 0.16)',
      shapeStroke: 'rgba(254, 215, 170, 0.35)',
      badgeBg: 'rgba(67, 20, 7, 0.7)',
      badgeText: '#FFEDD5',
      badgeBorder: 'rgba(251, 146, 60, 0.45)',
    },
    light: {
      bgGradient: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 50%, #FED7AA 100%)',
      shapeFill1: 'rgba(234, 88, 12, 0.16)',
      shapeFill2: 'rgba(249, 115, 22, 0.12)',
      shapeStroke: 'rgba(194, 65, 12, 0.28)',
      badgeBg: 'rgba(255, 255, 255, 0.9)',
      badgeText: '#9A3412',
      badgeBorder: 'rgba(234, 88, 12, 0.4)',
    },
  },
  {
    name: 'pink',
    dark: {
      bgGradient: 'linear-gradient(135deg, #500724 0%, #9D174D 50%, #DB2777 100%)',
      shapeFill1: 'rgba(244, 114, 182, 0.22)',
      shapeFill2: 'rgba(251, 113, 133, 0.16)',
      shapeStroke: 'rgba(251, 207, 232, 0.35)',
      badgeBg: 'rgba(80, 7, 36, 0.7)',
      badgeText: '#FCE7F3',
      badgeBorder: 'rgba(244, 114, 182, 0.45)',
    },
    light: {
      bgGradient: 'linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 50%, #FBCFE8 100%)',
      shapeFill1: 'rgba(219, 39, 119, 0.16)',
      shapeFill2: 'rgba(244, 63, 94, 0.12)',
      shapeStroke: 'rgba(190, 24, 93, 0.28)',
      badgeBg: 'rgba(255, 255, 255, 0.9)',
      badgeText: '#831843',
      badgeBorder: 'rgba(219, 39, 119, 0.4)',
    },
  },
  {
    name: 'yellow',
    dark: {
      bgGradient: 'linear-gradient(135deg, #451A03 0%, #92400E 50%, #D97706 100%)',
      shapeFill1: 'rgba(251, 191, 36, 0.22)',
      shapeFill2: 'rgba(252, 211, 77, 0.16)',
      shapeStroke: 'rgba(253, 230, 138, 0.35)',
      badgeBg: 'rgba(69, 26, 3, 0.7)',
      badgeText: '#FEF3C7',
      badgeBorder: 'rgba(251, 191, 36, 0.45)',
    },
    light: {
      bgGradient: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 50%, #FDE68A 100%)',
      shapeFill1: 'rgba(217, 119, 6, 0.16)',
      shapeFill2: 'rgba(245, 158, 11, 0.12)',
      shapeStroke: 'rgba(180, 83, 9, 0.28)',
      badgeBg: 'rgba(255, 255, 255, 0.9)',
      badgeText: '#78350F',
      badgeBorder: 'rgba(217, 119, 6, 0.4)',
    },
  },
  {
    name: 'indigo',
    dark: {
      bgGradient: 'linear-gradient(135deg, #1E1B4B 0%, #3730A3 50%, #4F46E5 100%)',
      shapeFill1: 'rgba(129, 140, 248, 0.22)',
      shapeFill2: 'rgba(165, 180, 252, 0.16)',
      shapeStroke: 'rgba(199, 210, 254, 0.35)',
      badgeBg: 'rgba(30, 27, 75, 0.7)',
      badgeText: '#EEF2FF',
      badgeBorder: 'rgba(129, 140, 248, 0.45)',
    },
    light: {
      bgGradient: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 50%, #C7D2FE 100%)',
      shapeFill1: 'rgba(79, 70, 229, 0.16)',
      shapeFill2: 'rgba(99, 102, 241, 0.12)',
      shapeStroke: 'rgba(67, 56, 202, 0.28)',
      badgeBg: 'rgba(255, 255, 255, 0.9)',
      badgeText: '#312E81',
      badgeBorder: 'rgba(79, 70, 229, 0.4)',
    },
  },
];

export const PATTERNS: PatternType[] = [
  'circles',
  'triangles',
  'grid',
  'hexagons',
  'polygons',
  'bauhaus',
  'waves',
];

/**
 * Deterministically computes a palette and pattern from a course identifier.
 * Stable across refreshes, logins, and devices.
 */
export function getCoursePatternConfig(courseIdOrCode?: string) {
  const seed = (courseIdOrCode || 'eduflow-course-default').trim();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);

  const paletteIndex = positiveHash % PALETTES.length;
  // Shift to decouple pattern choice from palette choice
  const patternIndex = Math.floor(positiveHash / PALETTES.length) % PATTERNS.length;

  return {
    palette: PALETTES[paletteIndex],
    pattern: PATTERNS[patternIndex],
  };
}

interface CoursePatternBannerProps {
  courseId: string;
  courseCode?: string;
  className?: string;
}

export default function CoursePatternBanner({
  courseId,
  courseCode,
  className = '',
}: CoursePatternBannerProps) {
  const { theme } = useTheme();

  const { palette, pattern } = useMemo(() => {
    return getCoursePatternConfig(courseId || courseCode);
  }, [courseId, courseCode]);

  const currentTheme = theme === 'light' ? palette.light : palette.dark;

  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none ${className}`}
      style={{
        background: currentTheme.bgGradient,
      }}
    >
      {/* SVG Geometric Pattern Layer */}
      <svg
        viewBox="0 0 400 135"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        aria-hidden="true"
      >
        <defs>
          {/* Subtle noise/grid filter or linear gradients if needed */}
          <linearGradient id={`grad-diag-${courseId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={currentTheme.shapeFill1} />
            <stop offset="100%" stopColor={currentTheme.shapeFill2} />
          </linearGradient>
        </defs>

        {/* 1. CIRCLES & RINGS */}
        {pattern === 'circles' && (
          <g>
            {/* Large background ring cluster */}
            <circle
              cx="340"
              cy="65"
              r="75"
              fill="none"
              stroke={currentTheme.shapeStroke}
              strokeWidth="1.5"
            />
            <circle
              cx="340"
              cy="65"
              r="52"
              fill="none"
              stroke={currentTheme.shapeStroke}
              strokeWidth="2"
              strokeDasharray="6 5"
            />
            <circle
              cx="340"
              cy="65"
              r="28"
              fill={currentTheme.shapeFill1}
              stroke={currentTheme.shapeStroke}
              strokeWidth="1"
            />

            {/* Floating translucent bubbles */}
            <circle cx="230" cy="30" r="32" fill={currentTheme.shapeFill2} />
            <circle
              cx="140"
              cy="105"
              r="48"
              fill="none"
              stroke={currentTheme.shapeStroke}
              strokeWidth="1.5"
            />
            <circle cx="140" cy="105" r="22" fill={currentTheme.shapeFill1} />
            <circle cx="60" cy="25" r="14" fill={currentTheme.shapeFill2} />

            {/* Dot array in top-center */}
            {[0, 1, 2].map((row) =>
              [0, 1, 2, 3].map((col) => (
                <circle
                  key={`dot-${row}-${col}`}
                  cx={180 + col * 12}
                  cy={15 + row * 12}
                  r="1.8"
                  fill={currentTheme.shapeStroke}
                  opacity="0.8"
                />
              ))
            )}
          </g>
        )}

        {/* 2. TRIANGLES */}
        {pattern === 'triangles' && (
          <g>
            <polygon
              points="280,10 370,130 190,130"
              fill={currentTheme.shapeFill1}
              stroke={currentTheme.shapeStroke}
              strokeWidth="1"
            />
            <polygon
              points="320,15 390,105 250,105"
              fill="none"
              stroke={currentTheme.shapeStroke}
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <polygon
              points="90,20 170,125 10,125"
              fill={currentTheme.shapeFill2}
              stroke={currentTheme.shapeStroke}
              strokeWidth="1"
            />
            <polygon
              points="140,40 210,135 70,135"
              fill={currentTheme.shapeFill1}
              opacity="0.6"
            />
            <polygon
              points="220,10 260,65 180,65"
              fill="none"
              stroke={currentTheme.shapeStroke}
              strokeWidth="1.5"
            />
            {/* Small accent triangle */}
            <polygon points="35,15 55,45 15,45" fill={currentTheme.shapeFill1} />
          </g>
        )}

        {/* 3. SQUARES & GRIDS */}
        {pattern === 'grid' && (
          <g>
            {/* Isometric diamond / rotated squares */}
            <rect
              x="270"
              y="25"
              width="60"
              height="60"
              transform="rotate(45 300 55)"
              fill={currentTheme.shapeFill1}
              stroke={currentTheme.shapeStroke}
              strokeWidth="1.5"
            />
            <rect
              x="320"
              y="55"
              width="45"
              height="45"
              transform="rotate(45 342 77)"
              fill="none"
              stroke={currentTheme.shapeStroke}
              strokeWidth="1.5"
              strokeDasharray="5 4"
            />
            <rect
              x="180"
              y="15"
              width="44"
              height="44"
              transform="rotate(45 202 37)"
              fill={currentTheme.shapeFill2}
              stroke={currentTheme.shapeStroke}
              strokeWidth="1"
            />
            <rect
              x="95"
              y="65"
              width="36"
              height="36"
              transform="rotate(45 113 83)"
              fill={currentTheme.shapeFill1}
              stroke={currentTheme.shapeStroke}
              strokeWidth="1"
            />
            {/* Minimal architectural grid lines */}
            <line
              x1="20"
              y1="40"
              x2="150"
              y2="40"
              stroke={currentTheme.shapeStroke}
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <line
              x1="20"
              y1="75"
              x2="150"
              y2="75"
              stroke={currentTheme.shapeStroke}
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <line
              x1="60"
              y1="10"
              x2="60"
              y2="120"
              stroke={currentTheme.shapeStroke}
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          </g>
        )}

        {/* 4. HEXAGONS */}
        {pattern === 'hexagons' && (
          <g>
            {/* Hexagon 1: Center-Right */}
            <polygon
              points="320,25 355,45 355,85 320,105 285,85 285,45"
              fill={currentTheme.shapeFill1}
              stroke={currentTheme.shapeStroke}
              strokeWidth="1.5"
            />
            {/* Nested concentric hexagon */}
            <polygon
              points="320,40 342,53 342,77 320,90 298,77 298,53"
              fill="none"
              stroke={currentTheme.shapeStroke}
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            {/* Hexagon 2: Top Right */}
            <polygon
              points="380,65 410,82 410,117 380,134 350,117 350,82"
              fill={currentTheme.shapeFill2}
              stroke={currentTheme.shapeStroke}
              strokeWidth="1"
            />
            {/* Hexagon 3: Left-Center */}
            <polygon
              points="240,65 270,82 270,117 240,134 210,117 210,82"
              fill={currentTheme.shapeFill1}
              stroke={currentTheme.shapeStroke}
              strokeWidth="1"
            />
            {/* Hexagon 4: Upper Left */}
            <polygon
              points="140,25 170,42 170,77 140,94 110,77 110,42"
              fill="none"
              stroke={currentTheme.shapeStroke}
              strokeWidth="1.5"
            />
            <polygon
              points="60,65 85,79 85,107 60,121 35,107 35,79"
              fill={currentTheme.shapeFill2}
            />
          </g>
        )}

        {/* 5. ABSTRACT POLYGONS / FACETED CRYSTAL */}
        {pattern === 'polygons' && (
          <g>
            <polygon
              points="190,0 300,35 250,135 140,95"
              fill={currentTheme.shapeFill1}
              stroke={currentTheme.shapeStroke}
              strokeWidth="1"
            />
            <polygon
              points="300,35 400,10 365,115 250,135"
              fill={currentTheme.shapeFill2}
              stroke={currentTheme.shapeStroke}
              strokeWidth="1"
            />
            <polygon
              points="70,15 190,0 140,95 20,65"
              fill="none"
              stroke={currentTheme.shapeStroke}
              strokeWidth="1.5"
            />
            <polygon
              points="365,115 400,10 400,135 250,135"
              fill={currentTheme.shapeFill1}
              opacity="0.5"
            />
            <polygon
              points="20,65 140,95 90,135 0,135"
              fill={currentTheme.shapeFill2}
              opacity="0.7"
            />
          </g>
        )}

        {/* 6. BAUHAUS / MEMPHIS COMPOSITION */}
        {pattern === 'bauhaus' && (
          <g>
            {/* Semicircle arch */}
            <path
              d="M 280,125 A 50,50 0 0,1 380,125 Z"
              fill={currentTheme.shapeFill1}
              stroke={currentTheme.shapeStroke}
              strokeWidth="1.5"
            />
            {/* Pill capsule shape rotated */}
            <rect
              x="200"
              y="20"
              width="95"
              height="28"
              rx="14"
              transform="rotate(-28 247 34)"
              fill={currentTheme.shapeFill2}
              stroke={currentTheme.shapeStroke}
              strokeWidth="1.5"
            />
            {/* Solid circle with concentric ring */}
            <circle cx="110" cy="50" r="32" fill={currentTheme.shapeFill1} />
            <circle
              cx="110"
              cy="50"
              r="45"
              fill="none"
              stroke={currentTheme.shapeStroke}
              strokeWidth="1.5"
              strokeDasharray="5 5"
            />
            {/* Graphic Plus signs (+) */}
            {[
              { x: 30, y: 30 },
              { x: 50, y: 95 },
              { x: 260, y: 95 },
            ].map((pt, i) => (
              <g key={i}>
                <line
                  x1={pt.x - 7}
                  y1={pt.y}
                  x2={pt.x + 7}
                  y2={pt.y}
                  stroke={currentTheme.shapeStroke}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1={pt.x}
                  y1={pt.y - 7}
                  x2={pt.x}
                  y2={pt.y + 7}
                  stroke={currentTheme.shapeStroke}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </g>
            ))}
          </g>
        )}

        {/* 7. WAVES & CONTOURS */}
        {pattern === 'waves' && (
          <g>
            {/* Layer 1 wave fill */}
            <path
              d="M -20,65 Q 90,25 200,60 T 420,50 L 420,140 L -20,140 Z"
              fill={currentTheme.shapeFill1}
            />
            {/* Layer 2 wave fill */}
            <path
              d="M -20,90 Q 110,50 230,95 T 420,80 L 420,140 L -20,140 Z"
              fill={currentTheme.shapeFill2}
            />
            {/* Fine dashed contour wave line */}
            <path
              d="M -10,40 Q 100,80 210,35 T 410,45"
              fill="none"
              stroke={currentTheme.shapeStroke}
              strokeWidth="2"
              strokeDasharray="6 6"
            />
            {/* Second contour wave line */}
            <path
              d="M -10,110 Q 120,70 240,115 T 410,95"
              fill="none"
              stroke={currentTheme.shapeStroke}
              strokeWidth="1.5"
            />
            {/* Minimal ripple circles */}
            <circle
              cx="330"
              cy="35"
              r="18"
              fill="none"
              stroke={currentTheme.shapeStroke}
              strokeWidth="1.5"
            />
            <circle
              cx="330"
              cy="35"
              r="8"
              fill={currentTheme.shapeFill2}
            />
          </g>
        )}
      </svg>

      {/* Subtle bottom-edge gradient fade for ultra-smooth transition into card body */}
      <div
        className="absolute inset-x-0 bottom-0 h-6 pointer-events-none"
        style={{
          background:
            theme === 'light'
              ? 'linear-gradient(to top, rgba(255, 255, 255, 0.45), transparent)'
              : 'linear-gradient(to top, rgba(17, 24, 42, 0.5), transparent)',
        }}
      />
    </div>
  );
}
