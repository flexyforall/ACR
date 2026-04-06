import React, { useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors, FontSize, FontWeight, Spacing } from '../theme/colors';
import { resolveTaskActions } from '../types/task';
import type { DeliveryLocation, Task, TaskStatus } from '../types/task';

import { TaskHeader } from '../components/TaskHeader';
import { InfoRow } from '../components/InfoRow';
import { SectionCard } from '../components/SectionCard';
import { Divider } from '../components/Divider';
import { AppButton } from '../components/AppButton';
import { PaymentStatusBadge } from '../components/StatusBadge';
import { CustomLocationModal } from '../components/CustomLocationModal';
import { ConfirmActionModal } from '../components/ConfirmActionModal';

// ─── Props ───────────────────────────────────────────────────────────────────

interface TaskDetailScreenProps {
  task: Task;
  onBack: () => void;
  /** Called when task status changes so parent can refresh / persist */
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  /** Called when delivery location is saved */
  onLocationSave?: (taskId: string, location: DeliveryLocation) => void;
  /** Called when cash payment is recorded */
  onCashPayment?: (taskId: string) => void;
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export function TaskDetailScreen({
  task: initialTask,
  onBack,
  onStatusChange,
  onLocationSave,
  onCashPayment,
}: TaskDetailScreenProps) {
  // Local task state so UI updates optimistically
  const [task, setTask] = useState<Task>(initialTask);

  // Modal visibility
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', confirmLabel: '', onConfirm: () => {} });
  const [actionLoading, setActionLoading] = useState(false);

  const actions = resolveTaskActions(task);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  function updateStatus(newStatus: TaskStatus) {
    setTask(prev => ({ ...prev, status: newStatus }));
    onStatusChange?.(task.id, newStatus);
  }

  function showConfirm(
    title: string,
    message: string,
    confirmLabel: string,
    onConfirm: () => void,
  ) {
    setConfirmModal({ open: true, title, message, confirmLabel, onConfirm });
  }

  function closeConfirm() {
    setConfirmModal(prev => ({ ...prev, open: false }));
  }

  async function simulateApiCall(action: () => void) {
    setActionLoading(true);
    await new Promise(r => setTimeout(r, 900));
    action();
    setActionLoading(false);
    closeConfirm();
  }

  // ─── Action handlers ─────────────────────────────────────────────────────

  function handleOnTheWay() {
    showConfirm(
      'Send ETA Notification?',
      'This will notify the customer that you are on your way with an estimated arrival time.',
      'On the Way',
      () =>
        simulateApiCall(() => {
          updateStatus('On the Way');
          Alert.alert('ETA Sent', 'The customer has been notified.');
        }),
    );
  }

  function handleDelivered() {
    showConfirm(
      'Confirm Delivery?',
      'Mark this task as Delivered. A Stripe payment charge will be initiated and the contract will become Active.',
      'Confirm Delivery',
      () =>
        simulateApiCall(() => {
          updateStatus('Delivered');
          // Simulate payment processing
          setTask(prev => ({
            ...prev,
            paymentStatus:
              prev.paymentStatus === 'Pending' ? 'Approved' : prev.paymentStatus,
          }));
        }),
    );
  }

  function handleCashPayment() {
    showConfirm(
      'Record Cash Payment?',
      'Confirm that you have received cash payment from the customer for this task.',
      'Record Cash',
      () =>
        simulateApiCall(() => {
          setTask(prev => ({ ...prev, paymentStatus: 'Paid' }));
          onCashPayment?.(task.id);
          Alert.alert('Cash Recorded', 'Cash payment has been recorded.');
        }),
    );
  }

  function handleMarkAsExchange() {
    showConfirm(
      'Mark as Exchange Task?',
      'This will flag the task as an exchange. You will need to coordinate the vehicle handover with the customer.',
      'Mark as Exchange',
      () =>
        simulateApiCall(() => {
          setTask(prev => ({ ...prev, isExchange: true }));
        }),
    );
  }

  function handleCompleted() {
    const paymentSettled =
      task.paymentStatus === 'Paid' || task.paymentStatus === 'Approved';
    if (!paymentSettled) {
      Alert.alert(
        'Payment Required',
        'Payment must be settled before marking this task as Completed.',
      );
      return;
    }
    showConfirm(
      'Complete Task?',
      'Are you sure you want to mark this task as Completed? This action cannot be undone.',
      'Complete',
      () => simulateApiCall(() => updateStatus('Completed')),
    );
  }

  function handleViewContract() {
    Alert.alert(
      'View Contract PDF',
      `Open contract ${task.contractRef} in your PDF viewer?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open',
          onPress: () => Alert.alert('Coming soon', 'PDF viewer integration pending.'),
        },
      ],
    );
  }

  function handleCallCustomer() {
    Linking.openURL(`tel:${task.customer.phone}`).catch(() =>
      Alert.alert('Cannot open dialler', 'Please call the customer manually.'),
    );
  }

  function handleOpenMaps(url: string) {
    Linking.openURL(url).catch(() =>
      Alert.alert('Cannot open Maps', 'Please check the Maps URL.'),
    );
  }

  function handleLocationSave(location: DeliveryLocation) {
    setTask(prev => ({ ...prev, deliveryAddress: location }));
    onLocationSave?.(task.id, location);
    Alert.alert('Saved', 'Custom delivery location has been saved.');
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  const paymentSettled =
    task.paymentStatus === 'Paid' || task.paymentStatus === 'Approved';

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {/* ── Header (outside scroll) ── */}
      <TaskHeader task={task} onBack={onBack} />

      {/* ── Scrollable content ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Exchange banner */}
        {task.isExchange && (
          <View style={styles.exchangeBanner}>
            <Ionicons name="swap-horizontal" size={16} color={Colors.primary} />
            <Text style={styles.exchangeText}>Exchange Task</Text>
          </View>
        )}

        {/* ── Info section ── */}
        <SectionCard title="Task Details">
          {/* Pickup location */}
          <InfoRow
            icon="location"
            iconColor={Colors.primary}
            label="Pickup Location"
            value={task.pickupLocation.label}
            onPress={() => handleOpenMaps(task.pickupLocation.mapsUrl)}
          />

          <Divider />

          {/* Delivery address */}
          <InfoRow
            icon="navigate"
            iconColor="#10B981"
            label={`Delivery Address${task.deliveryAddress.isCustom ? ' (Custom)' : ''}`}
            value={task.deliveryAddress.label}
            onPress={() => handleOpenMaps(task.deliveryAddress.mapsUrl)}
            actionIcon="create-outline"
            actionLabel="Edit delivery location"
            onActionPress={() => setLocationModalOpen(true)}
          />

          <Divider />

          {/* Customer */}
          <InfoRow
            icon="person"
            label="Customer"
            value={task.customer.name}
            actionIcon="call"
            actionLabel={`Call ${task.customer.name}`}
            onActionPress={handleCallCustomer}
          >
            <TouchableOpacity onPress={handleCallCustomer} activeOpacity={0.7}>
              <Text style={styles.phoneLink}>{task.customer.phone}</Text>
            </TouchableOpacity>
          </InfoRow>

          <Divider />

          {/* Vehicle */}
          <InfoRow
            icon="car"
            label="Vehicle"
            value={`${task.vehicle.make} ${task.vehicle.model}`}
          >
            <Text style={styles.plateNumber}>{task.vehicle.plateNumber}</Text>
          </InfoRow>

          <Divider />

          {/* Payment status */}
          <InfoRow
            icon="card"
            iconColor={paymentSettled ? Colors.paymentPaid : Colors.paymentPending}
            label="Payment"
            value=""
          >
            <PaymentStatusBadge status={task.paymentStatus} />
          </InfoRow>
        </SectionCard>

        {/* ── Notes (if present) ── */}
        {task.notes ? (
          <SectionCard title="Notes">
            <Text style={styles.notes}>{task.notes}</Text>
          </SectionCard>
        ) : null}

        {/* ── Status flow hint ── */}
        <StatusFlowHint status={task.status} type={task.type} />

        {/* Bottom padding so content clears action buttons */}
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>

      {/* ── Action buttons (fixed bottom) ── */}
      <View style={styles.actionBar}>
        {actions.showOnTheWay && (
          <AppButton
            label="On the Way"
            variant="primary"
            icon="navigate"
            onPress={handleOnTheWay}
          />
        )}

        {actions.showDelivered && (
          <AppButton
            label="Delivered"
            variant="primary"
            icon="checkmark-circle"
            onPress={handleDelivered}
          />
        )}

        {actions.showCashPayment && (
          <AppButton
            label="Cash Payment"
            variant="secondary"
            icon="cash-outline"
            onPress={handleCashPayment}
          />
        )}

        {actions.showMarkAsExchange && (
          <AppButton
            label="Mark as Exchange"
            variant="secondary"
            icon="swap-horizontal-outline"
            onPress={handleMarkAsExchange}
          />
        )}

        {actions.showCompleted && (
          <AppButton
            label="Completed"
            variant="primary"
            icon="checkmark-done"
            disabled={!actions.completedEnabled}
            onPress={handleCompleted}
          />
        )}

        {!actions.completedEnabled && actions.showCompleted && (
          <View style={styles.completedHint}>
            <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.completedHintText}>
              Payment must be settled to complete this task.
            </Text>
          </View>
        )}

        {actions.showViewContract && (
          <AppButton
            label="View Contract PDF"
            variant="ghost"
            icon="document-text-outline"
            onPress={handleViewContract}
          />
        )}
      </View>

      {/* ── Modals ── */}
      <CustomLocationModal
        visible={locationModalOpen}
        current={task.deliveryAddress.isCustom ? task.deliveryAddress : undefined}
        onSave={handleLocationSave}
        onClose={() => setLocationModalOpen(false)}
      />

      <ConfirmActionModal
        visible={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirm}
        loading={actionLoading}
      />
    </SafeAreaView>
  );
}

// ─── Status flow hint ────────────────────────────────────────────────────────

function StatusFlowHint({ status, type }: { status: string; type: string }) {
  const steps =
    type === 'Delivery'
      ? ['Pending', 'On the Way', 'Delivered', 'Completed']
      : ['Pending', 'On the Way', 'Picked Up', 'Completed'];

  const currentIndex = steps.indexOf(status);

  return (
    <View style={hintStyles.container}>
      {steps.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <React.Fragment key={step}>
            <View style={hintStyles.step}>
              <View
                style={[
                  hintStyles.dot,
                  done && hintStyles.dotDone,
                  active && hintStyles.dotActive,
                ]}
              >
                {done && (
                  <Ionicons name="checkmark" size={10} color={Colors.white} />
                )}
              </View>
              <Text
                style={[
                  hintStyles.stepLabel,
                  active && hintStyles.stepLabelActive,
                  done && hintStyles.stepLabelDone,
                ]}
              >
                {step}
              </Text>
            </View>
            {i < steps.length - 1 && (
              <View
                style={[hintStyles.connector, done && hintStyles.connectorDone]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const hintStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.md,
  },
  step: {
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 0,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dotDone: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
    marginTop: 9,
    marginHorizontal: 2,
  },
  connectorDone: {
    backgroundColor: Colors.success,
  },
  stepLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    width: 60,
  },
  stepLabelActive: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  stepLabelDone: {
    color: Colors.success,
    fontWeight: FontWeight.medium,
  },
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
  },
  exchangeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  exchangeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.primaryDark,
  },
  phoneLink: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    textDecorationLine: 'underline',
    marginTop: 2,
  },
  plateNumber: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    backgroundColor: Colors.divider,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  notes: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    lineHeight: 22,
    paddingVertical: Spacing.sm,
  },
  actionBar: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 4,
  },
  completedHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: -Spacing.xs,
    marginBottom: Spacing.xs,
  },
  completedHintText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
