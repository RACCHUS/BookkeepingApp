/**
 * UI Constants
 * Shared UI-related constants, themes, and configurations
 */

/**
 * Color Palette
 */
export const COLORS = {
  // Primary Colors
  PRIMARY: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a'
  },

  // Success/Income Colors
  SUCCESS: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d'
  },

  // Error/Expense Colors
  ERROR: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d'
  },

  // Warning Colors
  WARNING: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f'
  },

  // Neutral Colors
  GRAY: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827'
  }
};

/**
 * Semantic Color Mapping
 */
export const SEMANTIC_COLORS = {
  INCOME: COLORS.SUCCESS[500],
  EXPENSE: COLORS.ERROR[500],
  TRANSFER: COLORS.PRIMARY[500],
  PENDING: COLORS.WARNING[500],
  SUCCESS: COLORS.SUCCESS[500],
  ERROR: COLORS.ERROR[500],
  WARNING: COLORS.WARNING[500],
  INFO: COLORS.PRIMARY[500]
};

/**
 * Typography
 */
export const TYPOGRAPHY = {
  FONT_FAMILIES: {
    SANS: ['Inter', 'system-ui', 'sans-serif'],
    MONO: ['JetBrains Mono', 'Monaco', 'Consolas', 'monospace'],
    SERIF: ['Georgia', 'Times New Roman', 'serif']
  },

  FONT_SIZES: {
    XS: '0.75rem',    // 12px
    SM: '0.875rem',   // 14px
    BASE: '1rem',     // 16px
    LG: '1.125rem',   // 18px
    XL: '1.25rem',    // 20px
    '2XL': '1.5rem',  // 24px
    '3XL': '1.875rem', // 30px
    '4XL': '2.25rem',  // 36px
    '5XL': '3rem',     // 48px
    '6XL': '3.75rem'   // 60px
  },

  FONT_WEIGHTS: {
    THIN: 100,
    EXTRALIGHT: 200,
    LIGHT: 300,
    NORMAL: 400,
    MEDIUM: 500,
    SEMIBOLD: 600,
    BOLD: 700,
    EXTRABOLD: 800,
    BLACK: 900
  },

  LINE_HEIGHTS: {
    NONE: 1,
    TIGHT: 1.25,
    SNUG: 1.375,
    NORMAL: 1.5,
    RELAXED: 1.625,
    LOOSE: 2
  }
};

/**
 * Spacing
 */
export const SPACING = {
  PX: '1px',
  0: '0',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  11: '2.75rem',    // 44px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  28: '7rem',       // 112px
  32: '8rem',       // 128px
  36: '9rem',       // 144px
  40: '10rem',      // 160px
  44: '11rem',      // 176px
  48: '12rem',      // 192px
  52: '13rem',      // 208px
  56: '14rem',      // 224px
  60: '15rem',      // 240px
  64: '16rem',      // 256px
  72: '18rem',      // 288px
  80: '20rem',      // 320px
  96: '24rem'       // 384px
};

/**
 * Border Radius
 */
export const BORDER_RADIUS = {
  NONE: '0',
  SM: '0.125rem',   // 2px
  DEFAULT: '0.25rem', // 4px
  MD: '0.375rem',   // 6px
  LG: '0.5rem',     // 8px
  XL: '0.75rem',    // 12px
  '2XL': '1rem',    // 16px
  '3XL': '1.5rem',  // 24px
  FULL: '9999px'
};

/**
 * Shadows
 */
export const SHADOWS = {
  SM: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  MD: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  LG: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  XL: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2XL': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  INNER: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  NONE: '0 0 #0000'
};

/**
 * Z-Index Layers
 */
export const Z_INDEX = {
  HIDE: -1,
  AUTO: 'auto',
  BASE: 0,
  DOCKED: 10,
  DROPDOWN: 1000,
  STICKY: 1020,
  BANNER: 1030,
  OVERLAY: 1040,
  MODAL: 1050,
  POPOVER: 1060,
  SKIPLINK: 1070,
  TOAST: 1080,
  TOOLTIP: 1090
};

/**
 * Breakpoints
 */
export const BREAKPOINTS = {
  SM: '640px',
  MD: '768px',
  LG: '1024px',
  XL: '1280px',
  '2XL': '1536px'
};

/**
 * Animation Durations
 */
export const ANIMATION = {
  DURATION: {
    FAST: '150ms',
    NORMAL: '300ms',
    SLOW: '500ms'
  },
  
  EASING: {
    DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
    IN: 'cubic-bezier(0.4, 0, 1, 1)',
    OUT: 'cubic-bezier(0, 0, 0.2, 1)',
    IN_OUT: 'cubic-bezier(0.4, 0, 0.2, 1)'
  }
};

/**
 * Component Variants
 */
export const BUTTON_VARIANTS = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  SUCCESS: 'success',
  DANGER: 'danger',
  WARNING: 'warning',
  INFO: 'info',
  GHOST: 'ghost',
  LINK: 'link'
};

export const BUTTON_SIZES = {
  XS: 'xs',
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
  XL: 'xl'
};

export const INPUT_VARIANTS = {
  DEFAULT: 'default',
  ERROR: 'error',
  SUCCESS: 'success',
  WARNING: 'warning'
};

export const BADGE_VARIANTS = {
  DEFAULT: 'default',
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  OUTLINE: 'outline'
};

/**
 * Icon Sizes
 */
export const ICON_SIZES = {
  XS: 12,
  SM: 16,
  MD: 20,
  LG: 24,
  XL: 32,
  '2XL': 40
};

/**
 * Table Configuration
 */
export const TABLE = {
  PAGE_SIZES: [10, 25, 50, 100],
  DEFAULT_PAGE_SIZE: 25
};

/**
 * Toast Configuration
 */
export const TOAST = {
  DURATION: {
    SHORT: 3000,
    MEDIUM: 5000,
    LONG: 8000,
    PERSISTENT: 0
  },
  
  POSITION: {
    TOP_LEFT: 'top-left',
    TOP_CENTER: 'top-center',
    TOP_RIGHT: 'top-right',
    BOTTOM_LEFT: 'bottom-left',
    BOTTOM_CENTER: 'bottom-center',
    BOTTOM_RIGHT: 'bottom-right'
  }
};

/**
 * Form Configuration
 */
export const FORM = {
  VALIDATION_DELAY: 300, // milliseconds
  AUTOSAVE_DELAY: 2000   // milliseconds
};

/**
 * Chart Colors
 */
export const CHART_COLORS = [
  COLORS.PRIMARY[500],
  COLORS.SUCCESS[500],
  COLORS.ERROR[500],
  COLORS.WARNING[500],
  COLORS.PRIMARY[300],
  COLORS.SUCCESS[300],
  COLORS.ERROR[300],
  COLORS.WARNING[300],
  COLORS.GRAY[500],
  COLORS.GRAY[300]
];

/**
 * File Upload UI
 */
export const FILE_UPLOAD = {
  DROP_ZONE_HEIGHT: '200px',
  PROGRESS_BAR_HEIGHT: '8px',
  PREVIEW_SIZE: '100px'
};
