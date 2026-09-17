import React from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors, radii, tint, shadow } from '../../theme';

const sizes = {
  sm: { height: 34, paddingHorizontal: 12, fontSize: 12, iconSize: 15 },
  md: { height: 44, paddingHorizontal: 18, fontSize: 14, iconSize: 17 },
  lg: { height: 52, paddingHorizontal: 24, fontSize: 16, iconSize: 19 },
  icon: { height: 44, width: 44, paddingHorizontal: 0, fontSize: 14, iconSize: 18 },
};

export default function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon = null,
  style,
  textStyle,
  iconColor,
  ...rest
}) {
  const s = sizes[size] || sizes.md;
  const isDisabled = disabled || loading;

  const base = {
    primary: { bg: colors.violet, border: colors.violet, text: colors.white, glow: colors.violet },
    danger: { bg: colors.rose, border: colors.rose, text: colors.white, glow: colors.rose },
    secondary: { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.10)', text: colors.text },
    outline: { bg: 'transparent', border: 'rgba(255,255,255,0.18)', text: colors.text },
    ghost: { bg: 'transparent', border: 'transparent', text: colors.textMuted },
  }[variant] || {};

  const resolvedIcon = icon
    ? React.cloneElement(icon, { color: iconColor || base.text, size: icon.props?.size || s.iconSize })
    : null;

  const renderLabel = (labels) =>
    React.Children.map(labels, (child) =>
      typeof child === 'string' || typeof child === 'number' ? (
        <Text style={[styles.label, { fontSize: s.fontSize, color: base.text }, textStyle]}>
          {child}
        </Text>
      ) : (
        child
      ),
    );

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          height: s.height,
          paddingHorizontal: s.paddingHorizontal,
          backgroundColor: base.bg,
          borderColor: base.border,
          borderRadius: radii.md,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
        variant === 'primary' || variant === 'danger' ? shadow.glow(base.glow) : null,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <View style={styles.row}>
          <ActivityIndicator size="small" color={base.text} />
          <Text style={[styles.label, { fontSize: s.fontSize, color: base.text }, textStyle]}>
            Please wait…
          </Text>
        </View>
      ) : (
        <View style={styles.row}>
          {resolvedIcon}
          {renderLabel(children)}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexDirection: 'row',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontWeight: '700' },
});
