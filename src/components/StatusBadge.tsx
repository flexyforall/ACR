import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../theme/colors';
import type { TaskStatus, PaymentStatus } from '../types/task';

// ─── Task Status Badge ──────────────────────────────────────────────────────

type TaskStatusConfig = {
  label: string;
  color: string;
  bg: string;
};

const TASK_STATUS_MAP: Record<TaskStatus, TaskStatusConfig> = {
  Pending: { label: 'Pending', color: Colors.statusPending, bg: Colors.statusPendingBg },
  'On the Way': { label: 'On the Way', color: Colors.statusOnTheWay, bg: Colors.statusOnTheWayBg },
  Delivered: { label: 'Delivered', color: Colors.statusDelivered, bg: Colors.statusDeliveredBg },
  'Picked Up': { label: 'Picked Up', color: Colors.statusPickedUp, bg: Colors.statusPickedUpBg },
  Completed: { label: 'Completed', color: Colors.statusCompleted, bg: Colors.statusCompletedBg },
  Cancelled: { label: 'Cancelled', color: Colors.statusCancelled, bg: Colors.statusCancelledBg },
};

interface TaskStatusBadgeProps {
  status: TaskStatus;
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const config = TASK_STATUS_MAP[status];
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

// ─── Payment Status Badge ───────────────────────────────────────────────────

type PaymentStatusConfig = {
  label: string;
  color: string;
  bg: string;
};

const PAYMENT_STATUS_MAP: Record<PaymentStatus, PaymentStatusConfig> = {
  Paid: { label: 'Paid', color: Colors.paymentPaid, bg: Colors.paymentPaidBg },
  Approved: { label: 'Approved', color: Colors.paymentApproved, bg: Colors.paymentApprovedBg },
  Pending: { label: 'Pending', color: Colors.paymentPending, bg: Colors.paymentPendingBg },
  Failed: { label: 'Failed', color: Colors.paymentFailed, bg: Colors.paymentFailedBg },
};

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const config = PAYMENT_STATUS_MAP[status];
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    gap: Spacing.xs - 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.2,
  },
});
