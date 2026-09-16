import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors, radii, overlays, type as typ } from '../../theme';

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  multiline,
  style,
  inputStyle,
  icon = null,
  ...rest
}) {
  return (
    <View style={[styles.wrap, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.field}>
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          style={[
            styles.input,
            icon ? { paddingLeft: 40 } : null,
            multiline ? styles.multiline : null,
            inputStyle,
          ]}
          {...rest}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { ...typ.label },
  field: { position: 'relative', justifyContent: 'center' },
  icon: { position: 'absolute', left: 14, zIndex: 1 },
  input: {
    backgroundColor: overlays.faint,
    borderWidth: 1,
    borderColor: overlays.border,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
  },
  multiline: { minHeight: 120, textAlignVertical: 'top', paddingTop: 12 },
});
