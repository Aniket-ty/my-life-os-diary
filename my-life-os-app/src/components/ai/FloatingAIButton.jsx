import React, { useRef } from 'react';
import { TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function FloatingAIButton({ onPress }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onPress?.();
  };

  return (
    <Animated.View style={[styles.fab, { transform: [{ scale }] }]}>
      <TouchableOpacity onPress={handlePress} style={styles.btn} activeOpacity={1}>
        <Ionicons name="sparkles" size={22} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute', bottom: 28, right: 22, zIndex: 999,
    shadowColor: '#9b59b6', shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  btn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#9b59b6',
    alignItems: 'center', justifyContent: 'center',
  },
});
