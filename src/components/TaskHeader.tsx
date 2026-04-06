import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight, Spacing } from '../theme/colors';
import { TaskStatusBadge } from './StatusBadge';
import type { Task } from '../types/task';

interface TaskHeaderProps {
  task: Task;
  onBack: () => void;
}

export function TaskHeader({ task, onBack }: TaskHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.sm }]}>
      {/* Top row: back + contract ref */}
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.contractRef}>{task.contractRef}</Text>
      </View>

      {/* Bottom row: task type label + status badge */}
      <View style={styles.bottomRow}>
        <View style={styles.taskTypeWrap}>
          <Ionicons
            name={task.type === 'Delivery' ? 'car-outline' : 'arrow-up-circle-outline'}
            size={16}
            color={Colors.primary}
          />
          <Text style={styles.taskType}>{task.type}</Text>
        </View>

        <TaskStatusBadge status={task.status} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    padding: Spacing.xs,
    marginLeft: -Spacing.xs,
  },
  contractRef: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  taskTypeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  taskType: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
});
