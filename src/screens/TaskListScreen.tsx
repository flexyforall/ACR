/**
 * TaskListScreen — a simple demo list screen to launch into TaskDetailScreen.
 * Not part of the production task list UI — purely for dev/preview navigation.
 */
import React from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../theme/colors';
import { TaskStatusBadge } from '../components/StatusBadge';
import { MOCK_TASKS } from '../data/mockTasks';
import type { Task } from '../types/task';

interface Props {
  onSelectTask: (task: Task) => void;
}

export function TaskListScreen({ onSelectTask }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>My Tasks</Text>
        <Text style={styles.subtitle}>{MOCK_TASKS.length} tasks assigned</Text>
      </View>

      <FlatList
        data={MOCK_TASKS}
        keyExtractor={t => t.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.75}
            onPress={() => onSelectTask(item)}
          >
            <View style={styles.cardLeft}>
              <View style={styles.typeIcon}>
                <Ionicons
                  name={item.type === 'Delivery' ? 'car-outline' : 'arrow-up-circle-outline'}
                  size={20}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardRef}>{item.contractRef}</Text>
                <Text style={styles.cardCustomer}>{item.customer.name}</Text>
                <Text style={styles.cardVehicle} numberOfLines={1}>
                  {item.vehicle.make} {item.vehicle.model} · {item.vehicle.plateNumber}
                </Text>
              </View>
            </View>
            <View style={styles.cardRight}>
              <TaskStatusBadge status={item.status} />
              {item.isExchange && (
                <View style={styles.exchangePill}>
                  <Text style={styles.exchangePillText}>Exchange</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 2,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  list: {
    padding: Spacing.base,
  },
  sep: {
    height: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    flex: 1,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardRef: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  cardCustomer: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  cardVehicle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  exchangePill: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  exchangePillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
});
