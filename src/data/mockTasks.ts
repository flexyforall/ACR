import type { Task } from '../types/task';

/**
 * Mock tasks — used for development and Storybook.
 * Covers the key states described in the spec.
 */
export const MOCK_TASKS: Task[] = [
  // 1. Delivery — Pending, payment Pending
  {
    id: 'task-001',
    type: 'Delivery',
    status: 'Pending',
    contractRef: 'ACR-2024-0042',
    pickupLocation: {
      label: 'ACR Auckland Branch — 12 Quay St, Auckland CBD',
      mapsUrl: 'https://maps.google.com/?q=12+Quay+St+Auckland',
      isCustom: false,
    },
    deliveryAddress: {
      label: '45 Symonds St, Auckland 1010',
      mapsUrl: 'https://maps.google.com/?q=45+Symonds+St+Auckland',
      isCustom: false,
    },
    customer: {
      name: 'James Thornton',
      phone: '+6421456789',
    },
    vehicle: {
      make: 'Toyota',
      model: 'Corolla',
      plateNumber: 'AAA123',
      color: 'Silver',
    },
    paymentStatus: 'Pending',
    isExchange: false,
    notes: 'Customer prefers delivery before 2pm. Gate code: 4521.',
  },

  // 2. Delivery — On the Way, payment Approved
  {
    id: 'task-002',
    type: 'Delivery',
    status: 'On the Way',
    contractRef: 'ACR-2024-0055',
    pickupLocation: {
      label: 'ACR North Shore — 3 Tristram St, Glenfield',
      mapsUrl: 'https://maps.google.com/?q=3+Tristram+St+Glenfield',
      isCustom: false,
    },
    deliveryAddress: {
      label: '120 Ponsonby Rd, Ponsonby (Custom)',
      mapsUrl: 'https://maps.google.com/?q=120+Ponsonby+Rd+Auckland',
      isCustom: true,
    },
    customer: {
      name: 'Sarah Mena',
      phone: '+6421987654',
    },
    vehicle: {
      make: 'Honda',
      model: 'CR-V',
      plateNumber: 'XYZ789',
      color: 'White',
    },
    paymentStatus: 'Approved',
    isExchange: false,
  },

  // 3. Pickup — Pending, exchange task, payment Pending
  {
    id: 'task-003',
    type: 'Pickup',
    status: 'Pending',
    contractRef: 'ACR-2024-0061',
    pickupLocation: {
      label: 'Customer\'s address — 8 Main Rd, Ellerslie',
      mapsUrl: 'https://maps.google.com/?q=8+Main+Rd+Ellerslie+Auckland',
      isCustom: false,
    },
    deliveryAddress: {
      label: 'ACR Auckland Branch — 12 Quay St, Auckland CBD',
      mapsUrl: 'https://maps.google.com/?q=12+Quay+St+Auckland',
      isCustom: false,
    },
    customer: {
      name: 'Marco Deluca',
      phone: '+6421321654',
    },
    vehicle: {
      make: 'Mazda',
      model: 'CX-5',
      plateNumber: 'BCD456',
      color: 'Blue',
    },
    paymentStatus: 'Pending',
    isExchange: true,
    notes: 'Exchange: Customer swapping CX-5 for a larger SUV.',
  },

  // 4. Delivery — Delivered, payment Paid
  {
    id: 'task-004',
    type: 'Delivery',
    status: 'Delivered',
    contractRef: 'ACR-2024-0038',
    pickupLocation: {
      label: 'ACR Manukau — 201 Great South Rd, Manukau City',
      mapsUrl: 'https://maps.google.com/?q=201+Great+South+Rd+Manukau',
      isCustom: false,
    },
    deliveryAddress: {
      label: '6 Harbour View Ln, Devonport',
      mapsUrl: 'https://maps.google.com/?q=6+Harbour+View+Ln+Devonport',
      isCustom: false,
    },
    customer: {
      name: 'Lisa Park',
      phone: '+6421654321',
    },
    vehicle: {
      make: 'BMW',
      model: '320i',
      plateNumber: 'LUX001',
      color: 'Black',
    },
    paymentStatus: 'Paid',
    isExchange: false,
  },

  // 5. Delivery — Completed
  {
    id: 'task-005',
    type: 'Delivery',
    status: 'Completed',
    contractRef: 'ACR-2024-0027',
    pickupLocation: {
      label: 'ACR Auckland Branch — 12 Quay St, Auckland CBD',
      mapsUrl: 'https://maps.google.com/?q=12+Quay+St+Auckland',
      isCustom: false,
    },
    deliveryAddress: {
      label: '22 Beach Rd, Orewa',
      mapsUrl: 'https://maps.google.com/?q=22+Beach+Rd+Orewa',
      isCustom: false,
    },
    customer: {
      name: 'Tom Kiwi',
      phone: '+6421111222',
    },
    vehicle: {
      make: 'Volkswagen',
      model: 'Golf',
      plateNumber: 'VW9988',
    },
    paymentStatus: 'Paid',
    isExchange: false,
    completedAt: '2024-06-14T15:30:00Z',
  },
];
