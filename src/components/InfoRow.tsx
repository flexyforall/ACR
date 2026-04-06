import React from 'react';
import {
  GestureResponderEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing } from '../theme/colors';

interface InfoRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  label: string;
  value: string;
  /** If provided, the value renders as a tappable link */
  onPress?: (e: GestureResponderEvent) => void;
  /** Renders a secondary action icon at the trailing end */
  actionIcon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onActionPress?: (e: GestureResponderEvent) => void;
  /** Extra content rendered below the value (e.g. a sub-row) */
  children?: React.ReactNode;
}

export function InfoRow({
  icon,
  iconColor = Colors.textSecondary,
  label,
  value,
  onPress,
  actionIcon,
  actionLabel,
  onActionPress,
  children,
}: InfoRowProps) {
  return (
    <View style={styles.wrapper}>
      {/* Leading icon */}
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>

        <View style={styles.valueRow}>
          {onPress ? (
            <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
              <Text style={[styles.value, styles.link]}>{value}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.value}>{value}</Text>
          )}

          {actionIcon && onActionPress && (
            <TouchableOpacity
              onPress={onActionPress}
              activeOpacity={0.7}
              style={styles.actionBtn}
              accessibilityLabel={actionLabel}
            >
              <Ionicons name={actionIcon} size={18} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  value: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
    flex: 1,
  },
  link: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  actionBtn: {
    padding: Spacing.xs,
  },
});
