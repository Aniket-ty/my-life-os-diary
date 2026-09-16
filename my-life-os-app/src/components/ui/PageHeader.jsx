import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, tint, type as typ } from '../../theme';

export default function PageHeader({ title, subtitle, icon = null, accent = colors.violet, action = null }) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {icon ? (
          <View style={[styles.iconTile, { backgroundColor: tint(accent, 0.22), borderColor: tint(accent, 0.35) }]}>
            {React.cloneElement(icon, { color: accent, size: icon.props?.size || 22 })}
          </View>
        ) : null}
        <View style={styles.titleWrap}>
          <Text style={typ.h1} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  iconTile: {
    width: 46,
    height: 46,
    borderRadius: radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: { flex: 1, minWidth: 0 },
  subtitle: { ...typ.bodyMuted, marginTop: 2 },
});
