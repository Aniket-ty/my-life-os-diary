import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../../theme';

export default function Screen({ children, style }) {
  return (
    <View style={[styles.screen, style]}>
      <StatusBar style="light" backgroundColor={colors.void} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.void },
});
