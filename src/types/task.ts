/**
 * Core types for GA Mobile App — Task domain
 */

export type TaskType = 'Delivery' | 'Pickup';

export type TaskStatus =
  | 'Pending'
  | 'On the Way'
  | 'Delivered'
  | 'Picked Up'
  | 'Completed'
  | 'Cancelled';

export type PaymentStatus = 'Paid' | 'Approved' | 'Pending' | 'Failed';

export interface DeliveryLocation {
  label: string;           // Human-readable name/address
  mapsUrl: string;         // URL for Google Maps / Apple Maps
  isCustom: boolean;
}

export interface Vehicle {
  make: string;
  model: string;
  plateNumber: string;
  color?: string;
}

export interface Customer {
  name: string;
  phone: string;           // E.164 format, e.g. +1234567890
}

export interface Task {
  id: string;
  type: TaskType;
  status: TaskStatus;
  contractRef: string;     // e.g. "ACR-2024-0042"

  // Locations
  pickupLocation: DeliveryLocation;
  deliveryAddress: DeliveryLocation;

  // Entities
  customer: Customer;
  vehicle: Vehicle;

  // Payment
  paymentStatus: PaymentStatus;

  // Flags
  isExchange: boolean;

  // ETA / timing
  estimatedArrival?: string;  // ISO datetime string
  completedAt?: string;

  // Notes
  notes?: string;
}

/**
 * Determines which action buttons are visible/enabled for the current task state.
 */
export interface TaskActions {
  showOnTheWay: boolean;
  showDelivered: boolean;
  showCashPayment: boolean;
  showMarkAsExchange: boolean;
  showCompleted: boolean;
  completedEnabled: boolean;
  showViewContract: boolean;
}

export function resolveTaskActions(task: Task): TaskActions {
  const { type, status, paymentStatus, isExchange } = task;

  const paymentSettled =
    paymentStatus === 'Paid' || paymentStatus === 'Approved';

  return {
    // "On the Way" — visible when task is Pending (not yet en-route)
    showOnTheWay: status === 'Pending',

    // "Delivered" — visible when driver is On the Way
    showDelivered:
      status === 'On the Way' && type === 'Delivery',

    // "Cash Payment" — visible when payment is not yet approved/paid
    showCashPayment: !paymentSettled,

    // "Mark as Exchange" — only for exchange tasks not yet completed
    showMarkAsExchange: isExchange && status !== 'Completed' && status !== 'Cancelled',

    // "Completed" button — visible after delivery/pickup action taken
    showCompleted:
      status === 'Delivered' ||
      status === 'Picked Up' ||
      (type === 'Pickup' && status === 'On the Way'),

    // Enabled only after payment is settled
    completedEnabled: paymentSettled,

    // Always shown
    showViewContract: true,
  };
}
