import React from 'react';
import { View, StyleSheet } from 'react-native';
import { glass, glassStrong, radii } from '../../theme';

export default function GlassCard({ children, style, strong = false, padded = true, ...rest }) {
  return (
    <View
      style={[
        strong ? glassStrong : glass,
        { borderRadius: strong ? radii.xxl : radii.xl },
        padded ? styles.padded : null,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  padded: { padding: 20 },
});
