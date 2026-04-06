import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../theme/colors';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface AppButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  label: string;
  variant?: ButtonVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

export function AppButton({
  label,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  fullWidth = true,
  ...rest
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  const containerStyle = [
    styles.base,
    fullWidth && styles.fullWidth,
    variantStyles[variant].container,
    isDisabled && disabledStyles[variant].container,
  ];

  const labelStyle = [
    styles.label,
    variantStyles[variant].label,
    isDisabled && disabledStyles[variant].label,
  ];

  const iconColor = isDisabled
    ? disabledStyles[variant].iconColor
    : variantStyles[variant].iconColor;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={isDisabled}
      style={containerStyle}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variantStyles[variant].iconColor}
        />
      ) : (
        <View style={styles.inner}>
          {icon && (
            <Ionicons name={icon} size={18} color={iconColor} style={styles.icon} />
          )}
          <Text style={labelStyle}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  fullWidth: {
    width: '100%',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  label: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
  icon: {
    marginTop: 1,
  },
});

const variantStyles: Record<
  ButtonVariant,
  { container: object; label: object; iconColor: string }
> = {
  primary: {
    container: {
      backgroundColor: Colors.primary,
    },
    label: {
      color: Colors.textInverse,
    },
    iconColor: Colors.textInverse,
  },
  secondary: {
    container: {
      backgroundColor: Colors.white,
      borderWidth: 1.5,
      borderColor: Colors.secondaryBorder,
    },
    label: {
      color: Colors.secondaryText,
    },
    iconColor: Colors.secondaryText,
  },
  ghost: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: Colors.primary,
    },
    label: {
      color: Colors.primary,
    },
    iconColor: Colors.primary,
  },
  danger: {
    container: {
      backgroundColor: Colors.danger,
    },
    label: {
      color: Colors.textInverse,
    },
    iconColor: Colors.textInverse,
  },
};

const disabledStyles: Record<
  ButtonVariant,
  { container: object; label: object; iconColor: string }
> = {
  primary: {
    container: { backgroundColor: Colors.disabled },
    label: { color: Colors.disabledText },
    iconColor: Colors.disabledText,
  },
  secondary: {
    container: { borderColor: Colors.disabled },
    label: { color: Colors.disabledText },
    iconColor: Colors.disabledText,
  },
  ghost: {
    container: { borderColor: Colors.disabled },
    label: { color: Colors.disabledText },
    iconColor: Colors.disabledText,
  },
  danger: {
    container: { backgroundColor: Colors.disabled },
    label: { color: Colors.disabledText },
    iconColor: Colors.disabledText,
  },
};
