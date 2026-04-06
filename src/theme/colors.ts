/**
 * ACR Design System — Color Tokens
 * Aligned with ACR Admin Web component library
 */
export const Colors = {
  // Brand
  primary: '#1D4ED8',       // Blue 700
  primaryLight: '#DBEAFE',  // Blue 100
  primaryDark: '#1E40AF',   // Blue 800

  // Surface
  white: '#FFFFFF',
  background: '#F8FAFC',    // Slate 50
  surface: '#FFFFFF',
  border: '#E2E8F0',        // Slate 200
  divider: '#F1F5F9',       // Slate 100

  // Text
  textPrimary: '#0F172A',   // Slate 900
  textSecondary: '#475569', // Slate 600
  textMuted: '#94A3B8',     // Slate 400
  textInverse: '#FFFFFF',

  // Status — badges & indicators
  statusPending: '#F59E0B',       // Amber 500
  statusPendingBg: '#FEF3C7',     // Amber 100
  statusActive: '#10B981',        // Emerald 500
  statusActiveBg: '#D1FAE5',      // Emerald 100
  statusDelivered: '#6366F1',     // Indigo 500
  statusDeliveredBg: '#E0E7FF',   // Indigo 100
  statusPickedUp: '#8B5CF6',      // Violet 500
  statusPickedUpBg: '#EDE9FE',    // Violet 100
  statusOnTheWay: '#0EA5E9',      // Sky 500
  statusOnTheWayBg: '#E0F2FE',    // Sky 100
  statusCompleted: '#10B981',     // Emerald 500
  statusCompletedBg: '#D1FAE5',   // Emerald 100
  statusCancelled: '#EF4444',     // Red 500
  statusCancelledBg: '#FEE2E2',   // Red 100

  // Payment status
  paymentPaid: '#10B981',         // Emerald 500
  paymentPaidBg: '#D1FAE5',
  paymentApproved: '#6366F1',     // Indigo 500
  paymentApprovedBg: '#E0E7FF',
  paymentPending: '#F59E0B',      // Amber 500
  paymentPendingBg: '#FEF3C7',
  paymentFailed: '#EF4444',
  paymentFailedBg: '#FEE2E2',

  // Actions
  secondary: '#F8FAFC',
  secondaryBorder: '#CBD5E1',     // Slate 300
  secondaryText: '#334155',       // Slate 700

  danger: '#EF4444',
  dangerLight: '#FEE2E2',

  success: '#10B981',
  successLight: '#D1FAE5',

  // Disabled
  disabled: '#CBD5E1',
  disabledText: '#94A3B8',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const Radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};
