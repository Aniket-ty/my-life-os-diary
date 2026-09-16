import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, tint } from '../../theme';

const tones = {
  violet: { fg: colors.violet, bg: tint(colors.violet, 0.16) },
  gold: { fg: colors.gold300, bg: tint(colors.gold, 0.16) },
  mint: { fg: colors.mint, bg: tint(colors.mint, 0.16) },
  emerald: { fg: colors.emerald, bg: tint(colors.emerald, 0.16) },
  sky: { fg: colors.sky, bg: tint(colors.sky, 0.16) },
  rose: { fg: colors.rose, bg: tint(colors.rose, 0.16) },
  amber: { fg: colors.amber, bg: tint(colors.amber, 0.16) },
  slate: { fg: colors.textMuted, bg: 'rgba(255,255,255,0.06)' },
};

export default function Badge({ children, tone = 'violet', style, textStyle }) {
  const t = tones[tone] || tones.violet;
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }, style]}>
      <Text style={[styles.text, { color: t.fg }, textStyle]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
});
