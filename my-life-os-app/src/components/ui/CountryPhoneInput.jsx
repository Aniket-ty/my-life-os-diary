import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, tint, overlays, type as typ } from '../../theme';

export const COUNTRY_CODES = [
  { code: '+91', country: 'IN', flag: '🇮🇳', name: 'India' },
  { code: '+1', country: 'US', flag: '🇺🇸', name: 'United States / Canada' },
  { code: '+44', country: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+971', country: 'AE', flag: '🇦🇪', name: 'United Arab Emirates' },
  { code: '+65', country: 'SG', flag: '🇸🇬', name: 'Singapore' },
  { code: '+61', country: 'AU', flag: '🇦🇺', name: 'Australia' },
  { code: '+49', country: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', country: 'FR', flag: '🇫🇷', name: 'France' },
  { code: '+81', country: 'JP', flag: '🇯🇵', name: 'Japan' },
  { code: '+86', country: 'CN', flag: '🇨🇳', name: 'China' },
  { code: '+966', country: 'SA', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+974', country: 'QA', flag: '🇶🇦', name: 'Qatar' },
  { code: '+880', country: 'BD', flag: '🇧🇩', name: 'Bangladesh' },
  { code: '+977', country: 'NP', flag: '🇳🇵', name: 'Nepal' },
  { code: '+94', country: 'LK', flag: '🇱🇰', name: 'Sri Lanka' },
  { code: '+60', country: 'MY', flag: '🇲🇾', name: 'Malaysia' },
  { code: '+62', country: 'ID', flag: '🇮🇩', name: 'Indonesia' },
  { code: '+64', country: 'NZ', flag: '🇳🇿', name: 'New Zealand' },
  { code: '+34', country: 'ES', flag: '🇪🇸', name: 'Spain' },
  { code: '+39', country: 'IT', flag: '🇮🇹', name: 'Italy' },
  { code: '+31', country: 'NL', flag: '🇳🇱', name: 'Netherlands' },
  { code: '+41', country: 'CH', flag: '🇨🇭', name: 'Switzerland' },
  { code: '+46', country: 'SE', flag: '🇸🇪', name: 'Sweden' },
  { code: '+27', country: 'ZA', flag: '🇿🇦', name: 'South Africa' },
  { code: '+55', country: 'BR', flag: '🇧🇷', name: 'Brazil' },
  { code: '+52', country: 'MX', flag: '🇲🇽', name: 'Mexico' },
];

export default function CountryPhoneInput({
  label = 'Phone Number',
  value = '',
  onChangeText,
  placeholder = '98765 43210',
  style,
}) {
  const [selectedCode, setSelectedCode] = useState('+91');
  const [nationalNumber, setNationalNumber] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!value) {
      setNationalNumber('');
      return;
    }
    const clean = String(value).trim();
    if (clean.startsWith('+')) {
      const match = COUNTRY_CODES.find((c) => clean.startsWith(c.code));
      if (match) {
        setSelectedCode(match.code);
        setNationalNumber(clean.slice(match.code.length).trim());
        return;
      }
    }
    setNationalNumber(clean);
  }, [value]);

  const handleSelectCountry = (country) => {
    setSelectedCode(country.code);
    setModalVisible(false);
    setSearchQuery('');
    const digits = nationalNumber.replace(/\D/g, '');
    onChangeText?.(digits ? `${country.code}${digits}` : '');
  };

  const handleNumberChange = (text) => {
    // If user typed/pasted a + country code, auto detect
    if (text.trim().startsWith('+')) {
      const match = COUNTRY_CODES.find((c) => text.trim().startsWith(c.code));
      if (match) {
        setSelectedCode(match.code);
        const rest = text.trim().slice(match.code.length).replace(/\D/g, '');
        setNationalNumber(rest);
        onChangeText?.(rest ? `${match.code}${rest}` : '');
        return;
      }
    }

    const digits = text.replace(/[^\d\s-]/g, '');
    setNationalNumber(digits);
    const cleanDigits = digits.replace(/\D/g, '');
    onChangeText?.(cleanDigits ? `${selectedCode}${cleanDigits}` : '');
  };

  const currentCountry =
    COUNTRY_CODES.find((c) => c.code === selectedCode) || COUNTRY_CODES[0];

  const filteredCountries = COUNTRY_CODES.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.includes(searchQuery) ||
      c.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={styles.inputWrapper}>
        {/* Country Picker Trigger */}
        <TouchableOpacity
          style={styles.countryBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.flagText}>{currentCountry.flag}</Text>
          <Text style={styles.codeText}>{currentCountry.code}</Text>
          <Ionicons name="chevron-down" size={13} color={colors.textSoft} />
        </TouchableOpacity>

        {/* National Number Input */}
        <TextInput
          style={styles.input}
          value={nationalNumber}
          onChangeText={handleNumberChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          keyboardType="phone-pad"
        />

        <Ionicons name="call-outline" size={16} color={colors.textFaint} style={styles.icon} />
      </View>

      {/* Country Selection Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country Code</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSoft} />
              </TouchableOpacity>
            </View>

            {/* Search Country Input */}
            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={16} color={colors.textSoft} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search country or dial code..."
                placeholderTextColor={colors.textFaint}
                autoCorrect={false}
              />
            </View>

            {/* Countries List */}
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code + item.country}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    item.code === selectedCode && styles.countryItemActive,
                  ]}
                  onPress={() => handleSelectCountry(item)}
                >
                  <Text style={styles.itemFlag}>{item.flag}</Text>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemCode}>{item.code}</Text>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: overlays.soft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: overlays.borderSoft,
    overflow: 'hidden',
  },
  countryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: overlays.borderSoft,
    backgroundColor: overlays.faint,
  },
  flagText: { fontSize: 16 },
  codeText: { fontSize: 13, fontWeight: '700', color: colors.white },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.white,
  },
  icon: { marginRight: 12 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '75%',
    backgroundColor: '#0c0f1d',
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    padding: 20,
    borderWidth: 1,
    borderColor: overlays.borderSoft,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: { ...typ.h3, color: colors.white },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: overlays.soft,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: overlays.borderSoft,
  },
  searchInput: { flex: 1, color: colors.white, fontSize: 13 },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: overlays.borderSoft,
  },
  countryItemActive: {
    backgroundColor: tint(colors.violet, 0.15),
    borderRadius: radii.md,
  },
  itemFlag: { fontSize: 20 },
  itemName: { flex: 1, fontSize: 13, color: colors.white, fontWeight: '500' },
  itemCode: { fontSize: 13, fontWeight: '700', color: colors.violet },
});
