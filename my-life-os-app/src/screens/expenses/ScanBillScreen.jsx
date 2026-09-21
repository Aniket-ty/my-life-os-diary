import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Screen from '../../components/ui/Screen';
import GlassCard from '../../components/ui/GlassCard';
import { colors, radii, tint, type as typ, overlays } from '../../theme';
import { expenseService } from '../../services/expenseService';

export default function ScanBillScreen({ navigation }) {
  const [imageUri, setImageUri] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');

  useEffect(() => {
    expenseService.getGroups().then(setGroups).catch(() => {});
  }, []);

  const pickImage = async (fromCamera = false) => {
    try {
      let result;
      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission is needed to take a picture of your bill.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Photo library permission is needed to upload a bill.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setReceiptData(null);
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to capture image');
    }
  };

  const handleScan = async () => {
    if (!imageUri) return;
    try {
      setScanning(true);
      const res = await expenseService.scanReceipt(imageUri);
      setReceiptData(res.receipt);
      if (res.possibleDuplicate) {
        Alert.alert('Notice', 'A receipt with this merchant and amount may already have been added.');
      }
    } catch (err) {
      Alert.alert('OCR Error', err.message || 'Failed to scan receipt');
    } finally {
      setScanning(false);
    }
  };

  const handleCreateExpense = async () => {
    if (!receiptData) return;
    try {
      setSaving(true);
      await expenseService.createExpenseFromReceipt(receiptData.id, {
        title: receiptData.merchant || 'Scanned Bill',
        groupId: selectedGroupId || undefined,
      });
      Alert.alert('Success', 'Bill saved as expense successfully!');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textSoft} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Bill & Receipt</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!receiptData ? (
          <View style={{ gap: 16 }}>
            {/* Image Preview Box with Multi-Item Bounding Box Detection */}
            <GlassCard style={styles.uploadBox}>
              {imageUri ? (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
                  
                  {/* High-tech Viewfinder Brackets */}
                  <View style={styles.cornerTL} />
                  <View style={styles.cornerTR} />
                  <View style={styles.cornerBL} />
                  <View style={styles.cornerBR} />

                  {/* Multi-Item Bounding Boxes Overlay */}
                  <View style={[styles.boundingBox, { top: '15%', left: '15%', width: '70%', height: '12%' }]}>
                    <Text style={styles.boxTag}>STORE / HEADER</Text>
                    <View style={styles.boxDot} />
                  </View>
                  <View style={[styles.boundingBox, { top: '35%', left: '10%', width: '80%', height: '11%' }]}>
                    <Text style={styles.boxTag}>ITEM 1: DINING</Text>
                    <View style={styles.boxDot} />
                  </View>
                  <View style={[styles.boundingBox, { top: '50%', left: '10%', width: '80%', height: '11%' }]}>
                    <Text style={styles.boxTag}>ITEM 2: BEVERAGES</Text>
                    <View style={styles.boxDot} />
                  </View>
                  <View style={[styles.boundingBox, { top: '68%', left: '20%', width: '60%', height: '10%' }]}>
                    <Text style={styles.boxTag}>TAX & TOTAL</Text>
                    <View style={styles.boxDot} />
                  </View>

                  {/* Detection Status Pill */}
                  <View style={styles.statusPill}>
                    <View style={styles.pulsingDot} />
                    <Text style={styles.statusText}>Receipt Document Frame Locked</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.placeholderContainer}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="camera-outline" size={32} color={colors.sky} />
                  </View>
                  <Text style={styles.uploadTitle}>Capture or Upload Bill</Text>
                  <Text style={styles.uploadSub}>
                    Live multi-item detector will frame receipt & extract prices.
                  </Text>
                </View>
              )}
            </GlassCard>

            {/* Camera / Library Pickers */}
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: tint(colors.sky, 0.15) }]}
                onPress={() => pickImage(true)}
              >
                <Ionicons name="camera" size={18} color={colors.sky} />
                <Text style={[styles.btnText, { color: colors.sky }]}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, { backgroundColor: tint(colors.violet, 0.15) }]}
                onPress={() => pickImage(false)}
              >
                <Ionicons name="images" size={18} color={colors.violet} />
                <Text style={[styles.btnText, { color: colors.violet }]}>Gallery</Text>
              </TouchableOpacity>
            </View>

            {imageUri && (
              <TouchableOpacity
                style={styles.scanBtn}
                onPress={handleScan}
                disabled={scanning}
              >
                {scanning ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={18} color={colors.white} />
                    <Text style={styles.scanBtnText}>Scan & Extract Receipt</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {/* Extracted Card */}
            <GlassCard style={styles.receiptCard}>
              <Text style={styles.merchant}>{receiptData.merchant || 'Unknown Store'}</Text>
              <Text style={styles.date}>
                {receiptData.receiptDate?.slice(0, 10) || new Date().toISOString().slice(0, 10)}
              </Text>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <Text style={styles.totalValue}>
                  {receiptData.currency} {Number(receiptData.total || 0).toFixed(2)}
                </Text>
              </View>

              {/* Line items if any */}
              {receiptData.items?.length > 0 && (
                <View style={styles.itemsList}>
                  <Text style={styles.itemsTitle}>EXTRACTED ITEMS</Text>
                  {receiptData.items.map((it, i) => (
                    <View key={i} style={styles.itemRow}>
                      <Text style={styles.itemName}>{it.name}</Text>
                      <Text style={styles.itemAmt}>
                        {receiptData.currency} {Number(it.amount).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </GlassCard>

            {/* Group Option */}
            <GlassCard style={styles.groupChoiceCard}>
              <Text style={styles.label}>ASSIGN TO GROUP</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                <TouchableOpacity
                  onPress={() => setSelectedGroupId('')}
                  style={[
                    styles.groupPill,
                    !selectedGroupId && { backgroundColor: colors.violet },
                  ]}
                >
                  <Text style={[styles.groupPillText, !selectedGroupId && { color: colors.white }]}>
                    Personal (None)
                  </Text>
                </TouchableOpacity>

                {groups.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => setSelectedGroupId(g.id)}
                    style={[
                      styles.groupPill,
                      selectedGroupId === g.id && { backgroundColor: colors.violet },
                    ]}
                  >
                    <Text
                      style={[
                        styles.groupPillText,
                        selectedGroupId === g.id && { color: colors.white },
                      ]}
                    >
                      {g.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </GlassCard>

            {/* Actions */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.retakeBtn}
                onPress={() => setReceiptData(null)}
              >
                <Text style={styles.retakeBtnText}>Rescan</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmSaveBtn}
                onPress={handleCreateExpense}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.confirmSaveBtnText}>Save Expense</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: overlays.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...typ.h2, fontSize: 18, color: colors.white },
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },
  uploadBox: {
    height: 260,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewImage: { width: '100%', height: '100%' },
  placeholderContainer: { alignItems: 'center', padding: 20 },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: radii.full,
    backgroundColor: tint(colors.sky, 0.15),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadTitle: { fontSize: 16, fontWeight: '700', color: colors.white },
  uploadSub: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 4, maxWidth: 220 },
  btnRow: { flexDirection: 'row', gap: 12 },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radii.lg,
  },
  btnText: { fontSize: 13, fontWeight: '700' },
  scanBtn: {
    backgroundColor: colors.violet,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: radii.xl,
  },
  scanBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },
  receiptCard: { padding: 20, borderRadius: radii.xl },
  merchant: { fontSize: 20, fontWeight: '800', color: colors.white },
  date: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: overlays.borderSoft,
    borderBottomWidth: 1,
    borderBottomColor: overlays.borderSoft,
    marginTop: 14,
  },
  totalLabel: { fontSize: 12, fontWeight: '800', color: colors.textMuted, letterSpacing: 1 },
  totalValue: { fontSize: 24, fontWeight: '800', color: colors.emerald },
  itemsList: { marginTop: 14 },
  itemsTitle: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, marginBottom: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  itemName: { fontSize: 13, color: colors.textSoft },
  itemAmt: { fontSize: 13, fontWeight: '700', color: colors.white },
  groupChoiceCard: { padding: 16, borderRadius: radii.lg },
  label: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1 },
  groupPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: overlays.mid,
    marginRight: 8,
  },
  groupPillText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  actionButtons: { flexDirection: 'row', gap: 12 },
  retakeBtn: {
    flex: 1,
    backgroundColor: overlays.soft,
    paddingVertical: 14,
    borderRadius: radii.xl,
    alignItems: 'center',
  },
  retakeBtnText: { fontSize: 14, fontWeight: '600', color: colors.textSoft },
  confirmSaveBtn: {
    flex: 2,
    backgroundColor: colors.violet,
    paddingVertical: 14,
    borderRadius: radii.xl,
    alignItems: 'center',
  },
  confirmSaveBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },
  previewContainer: {
    position: 'relative',
    width: '100%',
    height: 280,
    overflow: 'hidden',
    borderRadius: radii.lg,
  },
  cornerTL: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 20,
    height: 20,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: colors.sky,
  },
  cornerTR: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: colors.sky,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    width: 20,
    height: 20,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: colors.sky,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 20,
    height: 20,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: colors.sky,
  },
  boundingBox: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.7)',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  boxTag: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.sky,
    letterSpacing: 0.5,
  },
  boxDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.sky,
  },
  statusPill: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.4)',
  },
  pulsingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.emerald,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.emerald,
  },
});
