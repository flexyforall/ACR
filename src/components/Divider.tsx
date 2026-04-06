import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../theme/colors';

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 44, // aligns with content after icon
  },
});
