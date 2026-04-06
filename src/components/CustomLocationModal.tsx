import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '../theme/colors';
import { AppButton } from './AppButton';
import type { DeliveryLocation } from '../types/task';

interface CustomLocationModalProps {
  visible: boolean;
  current?: DeliveryLocation;
  onSave: (location: DeliveryLocation) => void;
  onClose: () => void;
}

export function CustomLocationModal({
  visible,
  current,
  onSave,
  onClose,
}: CustomLocationModalProps) {
  const insets = useSafeAreaInsets();
  const [label, setLabel] = useState(current?.label ?? '');
  const [mapsUrl, setMapsUrl] = useState(current?.mapsUrl ?? '');

  const isValid = label.trim().length > 0 && mapsUrl.trim().length > 0;

  function handleSave() {
    if (!isValid) return;
    onSave({ label: label.trim(), mapsUrl: mapsUrl.trim(), isCustom: true });
    onClose();
  }

  function handleClose() {
    setLabel(current?.label ?? '');
    setMapsUrl(current?.mapsUrl ?? '');
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>
              {current?.isCustom ? 'Edit Delivery Location' : 'Set Custom Delivery Location'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.sheetSubtitle}>
            Enter a custom address and a Maps URL so the driver can navigate directly.
          </Text>

          {/* Location label field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Address / Location Name</Text>
            <TextInput
              style={styles.input}
              value={label}
              onChangeText={setLabel}
              placeholder="e.g. 123 Main St, Auckland City"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          {/* Maps URL field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Maps URL</Text>
            <TextInput
              style={[styles.input, styles.urlInput]}
              value={mapsUrl}
              onChangeText={setMapsUrl}
              placeholder="https://maps.google.com/?q=..."
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              onSubmitEditing={handleSave}
              multiline
              numberOfLines={2}
            />
            <Text style={styles.fieldHint}>
              Paste a Google Maps or Apple Maps share link.
            </Text>
          </View>

          <AppButton
            label="Save Location"
            variant="primary"
            icon="location"
            disabled={!isValid}
            onPress={handleSave}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    gap: Spacing.base,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.xs,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    flex: 1,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  sheetSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: -Spacing.sm,
  },
  fieldGroup: {
    gap: Spacing.xs,
  },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  urlInput: {
    minHeight: 60,
    textAlignVertical: 'top',
    paddingTop: Spacing.md,
  },
  fieldHint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
});
