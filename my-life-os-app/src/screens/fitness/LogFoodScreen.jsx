import React, { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFitnessStore } from '../../stores/fitnessStore';
import { fitnessAPI } from '../../services/fitnessService';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import Input from '../../components/ui/Input';
import GlassCard from '../../components/ui/GlassCard';
import CropPhotoModal from '../../components/fitness/CropPhotoModal';
import { searchLocalFoods } from '../../services/foodDatabase';
import { colors, spacing, radii, type as typ, tint, overlays } from '../../theme';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_ICONS = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };

const QUICK_FOODS = [
  {
    name: 'Banana',
    servingUnit: 'banana (118g)',
    servingWeightG: 118,
    per100g: { calories: 89, proteinG: 1.1, carbsG: 22.8, fatG: 0.3 },
  },
  {
    name: 'Chicken Breast',
    servingUnit: 'fillet (150g)',
    servingWeightG: 150,
    per100g: { calories: 165, proteinG: 31, carbsG: 0, fatG: 3.6 },
  },
  {
    name: 'Cooked Rice',
    servingUnit: 'cup / bowl (150g)',
    servingWeightG: 150,
    per100g: { calories: 130, proteinG: 2.7, carbsG: 28.2, fatG: 0.3 },
  },
  {
    name: 'Whole Egg',
    servingUnit: 'large egg (50g)',
    servingWeightG: 50,
    per100g: { calories: 143, proteinG: 12.6, carbsG: 0.7, fatG: 9.5 },
  },
  {
    name: 'Almonds',
    servingUnit: 'handful (30g)',
    servingWeightG: 30,
    per100g: { calories: 579, proteinG: 21.2, carbsG: 21.6, fatG: 49.9 },
  },
  {
    name: 'Protein Shake',
    servingUnit: 'scoop (30g powder)',
    servingWeightG: 30,
    per100g: { calories: 400, proteinG: 80, carbsG: 10, fatG: 5 },
  },
  {
    name: 'Bread',
    servingUnit: 'slice (40g)',
    servingWeightG: 40,
    per100g: { calories: 247, proteinG: 13, carbsG: 41, fatG: 3.4 },
  },
  {
    name: 'Oatmeal',
    servingUnit: 'bowl (50g dry)',
    servingWeightG: 50,
    per100g: { calories: 389, proteinG: 16.9, carbsG: 66.3, fatG: 6.9 },
  },
];

const PICKS = {
  mediaTypes: ['images'],
  quality: 0.7,
  allowsEditing: false,
};

export default function LogFoodScreen({ navigation }) {
  const { logFood } = useFitnessStore();
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [proteinG, setProteinG] = useState('');
  const [carbsG, setCarbsG] = useState('');
  const [fatG, setFatG] = useState('');
  const [mealType, setMealType] = useState('lunch');
  const [saving, setSaving] = useState(false);

  // Portion measurement: 'weight' (grams) or 'quantity' (servings/items)
  const [measureMode, setMeasureMode] = useState('weight');
  const [weightG, setWeightG] = useState('100');
  const [quantityNum, setQuantityNum] = useState('1');
  const [servingUnit, setServingUnit] = useState('serving');

  // Metadata for the active food item (per100g base macros)
  const [foodMeta, setFoodMeta] = useState(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // AI food photo state
  const [photoUri, setPhotoUri] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [cropUri, setCropUri] = useState(null);
  const [cropVisible, setCropVisible] = useState(false);

  // ── Calculation Functions based on Weight or Quantity ───────────

  const computeFromWeight = (grams, per100) => {
    const g = Math.max(0, Number(grams) || 0);
    const factor = g / 100;
    setCalories(String(Math.max(0, Math.round(per100.calories * factor))));
    setProteinG(String(Math.max(0, Math.round(per100.proteinG * factor * 10) / 10)));
    setCarbsG(String(Math.max(0, Math.round(per100.carbsG * factor * 10) / 10)));
    setFatG(String(Math.max(0, Math.round(per100.fatG * factor * 10) / 10)));
  };

  const computeFromQuantity = (qty, meta) => {
    const q = Math.max(0, Number(qty) || 0);
    const totalG = Math.round(q * (meta.servingWeightG || 100));
    setWeightG(String(totalG));
    computeFromWeight(totalG, meta.per100g);
  };

  const onWeightChange = (text) => {
    setWeightG(text);
    const numG = Number(text) || 0;
    if (foodMeta) {
      computeFromWeight(numG, foodMeta.per100g);
      const estQty = (numG / (foodMeta.servingWeightG || 100)).toFixed(1);
      setQuantityNum(estQty === '1.0' ? '1' : estQty);
    }
  };

  const onQuantityChange = (text) => {
    setQuantityNum(text);
    const numQty = Number(text) || 0;
    if (foodMeta) {
      computeFromQuantity(numQty, foodMeta);
    }
  };

  const selectFood = (meta) => {
    setFoodName(meta.name || meta.foodName);
    setFoodMeta(meta);
    setServingUnit(meta.servingUnit || 'serving');

    if (measureMode === 'weight') {
      const defaultG = String(meta.servingWeightG || 100);
      setWeightG(defaultG);
      setQuantityNum('1');
      computeFromWeight(Number(defaultG), meta.per100g);
    } else {
      setQuantityNum('1');
      setWeightG(String(meta.servingWeightG || 100));
      computeFromQuantity(1, meta);
    }
  };

  const switchMode = (newMode) => {
    setMeasureMode(newMode);
    if (!foodMeta) return;

    if (newMode === 'weight') {
      const g = Math.max(0, Number(weightG) || foodMeta.servingWeightG || 100);
      computeFromWeight(g, foodMeta.per100g);
    } else {
      const q = Math.max(0, Number(quantityNum) || 1);
      computeFromQuantity(q, foodMeta);
    }
  };

  // ── AI Image Capture & Analysis ─────────────────────────────────

  const pickImage = async (source) => {
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          return Alert.alert('Permission needed', 'Camera access is required to take a food photo.');
        }
      }

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(PICKS)
        : await ImagePicker.launchImageLibraryAsync(PICKS);

      if (result.canceled || !result.assets?.length) return;

      setCropUri(result.assets[0].uri);
      setCropVisible(true);
    } catch (e) {
      Alert.alert('Error', 'Could not load the photo. Please try again.');
    }
  };

  const handleCropped = async (cropped) => {
    setCropVisible(false);
    setCropUri(null);
    if (!cropped) {
      return Alert.alert('Crop failed', 'Could not crop the photo. Please try again.');
    }

    const asset = {
      uri: cropped.uri,
      mimeType: 'image/jpeg',
      fileName: `food-${Date.now()}.jpg`,
    };
    await analyzeAsset(asset);
  };

  const analyzeAsset = async (asset) => {
    try {
      setPhotoUri(asset.uri);
      setAiResult(null);
      setAnalyzing(true);

      const data = await fitnessAPI.analyzeFoodImage(asset);

      if (data?.error) {
        throw new Error(data.error);
      }
      if (!data?.foodName || !data?.per100g) {
        throw new Error('AI could not identify this food. Try a clearer photo.');
      }

      setAiResult(data);

      let servingWeight = 100;
      let unit = data.serving || 'serving (100g)';
      const match = unit.match(/(\d+)\s*g/i);
      if (match) {
        servingWeight = Number(match[1]) || 100;
      }

      selectFood({
        foodName: data.foodName,
        per100g: {
          calories: Number(data.per100g.calories) || 0,
          proteinG: Number(data.per100g.proteinG) || 0,
          carbsG: Number(data.per100g.carbsG) || 0,
          fatG: Number(data.per100g.fatG) || 0,
        },
        servingUnit: unit,
        servingWeightG: servingWeight,
      });
    } catch (e) {
      Alert.alert('Analysis failed', e.message || 'Could not analyze the photo. Please try again.');
      setPhotoUri(null);
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Save Food Log ───────────────────────────────────────────────

  const handleSave = async () => {
    if (!foodName.trim() || !calories) {
      return Alert.alert('Required', 'Food name and calories are required.');
    }
    setSaving(true);
    try {
      const finalQuantity = measureMode === 'weight'
        ? `${weightG || '100'}g`
        : `${quantityNum || '1'} ${servingUnit} (${weightG || 100}g)`;

      await logFood({
        foodName: foodName.trim(),
        calories: Number(calories),
        proteinG: proteinG ? Number(proteinG) : null,
        carbsG: carbsG ? Number(carbsG) : null,
        fatG: fatG ? Number(fatG) : null,
        quantity: finalQuantity,
        mealType,
        logDate: moment().format('YYYY-MM-DD'),
        aiSuggested: !!foodMeta,
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Could not log food.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Food</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          {saving
            ? <ActivityIndicator size="small" color={colors.emerald} />
            : <Text style={styles.saveText}>Save</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* AI Food Photo */}
        <Text style={styles.label}>AI Food Photo</Text>
        <View style={styles.captureRow}>
          <TouchableOpacity style={styles.captureBtn} onPress={() => pickImage('camera')} disabled={analyzing}>
            <Ionicons name="camera" size={18} color={colors.emerald} />
            <Text style={styles.captureBtnText}>Take photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.captureBtn} onPress={() => pickImage('gallery')} disabled={analyzing}>
            <Ionicons name="images" size={18} color={colors.sky} />
            <Text style={styles.captureBtnText}>Choose photo</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.aiHint}>Snap your meal — AI identifies it and calculates macros from weight or quantity.</Text>

        {photoUri && (
          <GlassCard style={styles.photoCard} padded={false}>
            <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
            <View style={styles.photoInfo}>
              {analyzing ? (
                <>
                  <ActivityIndicator size="small" color={colors.emerald} />
                  <Text style={styles.analyzingText}>AI is identifying your food…</Text>
                </>
              ) : foodMeta ? (
                <>
                  <Text style={styles.aiFoodName} numberOfLines={1}>{foodMeta.foodName}</Text>
                  <Text style={styles.aiPer100}>
                    per 100g: {foodMeta.per100g.calories} kcal · P {foodMeta.per100g.proteinG}g · C {foodMeta.per100g.carbsG}g · F {foodMeta.per100g.fatG}g
                  </Text>
                  <Text style={styles.aiDetail}>Serving: {foodMeta.servingUnit}</Text>
                </>
              ) : null}
            </View>
          </GlassCard>
        )}

        {/* Search Food Database */}
        <Text style={styles.label}>Search Foods</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={colors.textFaint} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search e.g. egg, chicken, oats, rice, paneer, apple..."
            placeholderTextColor={colors.textFaint}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              if (text.trim()) {
                setSearchResults(searchLocalFoods(text, 6));
              } else {
                setSearchResults([]);
              }
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
              <Ionicons name="close-circle" size={16} color={colors.textFaint} />
            </TouchableOpacity>
          )}
        </View>

        {searchResults.length > 0 && (
          <GlassCard style={styles.resultsCard} padded={false}>
            {searchResults.map((item, idx) => (
              <TouchableOpacity
                key={item.id || idx}
                style={[styles.resultItem, idx < searchResults.length - 1 && styles.resultBorder]}
                onPress={() => {
                  selectFood(item);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.resultName}>{item.name}</Text>
                    <View style={styles.verifiedTag}>
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                  </View>
                  <Text style={styles.resultSub}>
                    Per 100g: {item.per100g.calories} kcal · P {item.per100g.proteinG}g · C {item.per100g.carbsG}g · F {item.per100g.fatG}g · {item.servingUnit}
                  </Text>
                </View>
                <Ionicons name="add-circle" size={20} color={colors.emerald} />
              </TouchableOpacity>
            ))}
          </GlassCard>
        )}

        {/* Quick Add Foods */}
        <Text style={styles.label}>Quick Picks</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickRow}>
          {QUICK_FOODS.map((f) => (
            <TouchableOpacity
              key={f.name}
              style={[
                styles.quickChip,
                foodMeta?.name === f.name && styles.quickChipActive,
              ]}
              onPress={() => selectFood(f)}
            >
              <Text style={styles.quickName} numberOfLines={1}>{f.name}</Text>
              <Text style={styles.quickCal}>{f.per100g.calories} kcal/100g</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Meal Type */}
        <Text style={styles.label}>Meal</Text>
        <View style={styles.mealRow}>
          {MEAL_TYPES.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.mealBtn, mealType === m && styles.mealBtnActive]}
              onPress={() => setMealType(m)}
            >
              <Text style={styles.mealBtnEmoji}>{MEAL_ICONS[m]}</Text>
              <Text style={[styles.mealBtnText, mealType === m && styles.mealBtnTextActive]}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Food Name */}
        <Input
          label="Food Name *"
          value={foodName}
          onChangeText={setFoodName}
          placeholder="e.g. Chicken Breast"
          style={styles.fieldSpacing}
        />

        {/* ── PORTION CALCULATOR: BY WEIGHT OR QUANTITY ─────────── */}
        <Text style={styles.label}>Portion Calculation</Text>
        <View style={styles.calcCard}>
          {/* Mode Switcher */}
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeBtn, measureMode === 'weight' && styles.modeBtnActive]}
              onPress={() => switchMode('weight')}
            >
              <Ionicons
                name="scale-outline"
                size={16}
                color={measureMode === 'weight' ? colors.emerald : colors.textMuted}
              />
              <Text style={[styles.modeBtnText, measureMode === 'weight' && styles.modeBtnTextActive]}>
                By Weight (g)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeBtn, measureMode === 'quantity' && styles.modeBtnActive]}
              onPress={() => switchMode('quantity')}
            >
              <Ionicons
                name="calculator-outline"
                size={16}
                color={measureMode === 'quantity' ? colors.emerald : colors.textMuted}
              />
              <Text style={[styles.modeBtnText, measureMode === 'quantity' && styles.modeBtnTextActive]}>
                By Quantity
              </Text>
            </TouchableOpacity>
          </View>

          {/* Mode Input & Presets */}
          {measureMode === 'weight' ? (
            <View style={styles.portionInputWrap}>
              <Text style={styles.subLabel}>Weight in Grams (g)</Text>
              <TextInput
                style={styles.input}
                placeholder="100"
                placeholderTextColor={colors.textFaint}
                value={weightG}
                onChangeText={onWeightChange}
                keyboardType="numeric"
              />
              <View style={styles.presetsRow}>
                {[50, 100, 150, 200, 250, 300].map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.presetChip, weightG === String(g) && styles.presetChipActive]}
                    onPress={() => onWeightChange(String(g))}
                  >
                    <Text style={[styles.presetText, weightG === String(g) && styles.presetTextActive]}>
                      {g}g
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {foodMeta && (
                <Text style={styles.metaSubText}>
                  Based on {foodMeta.foodName || foodMeta.name} ({foodMeta.per100g.calories} kcal / 100g)
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.portionInputWrap}>
              <Text style={styles.subLabel}>
                Quantity ({foodMeta?.servingUnit || 'servings / pieces'})
              </Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                placeholderTextColor={colors.textFaint}
                value={quantityNum}
                onChangeText={onQuantityChange}
                keyboardType="numeric"
              />
              <View style={styles.presetsRow}>
                {['0.5', '1', '1.5', '2', '3'].map((q) => (
                  <TouchableOpacity
                    key={q}
                    style={[styles.presetChip, quantityNum === q && styles.presetChipActive]}
                    onPress={() => onQuantityChange(q)}
                  >
                    <Text style={[styles.presetText, quantityNum === q && styles.presetTextActive]}>
                      {q}x
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.metaSubText}>
                1 {foodMeta?.servingUnit || 'serving'} = {foodMeta?.servingWeightG || 100}g (Total: {weightG}g)
              </Text>
            </View>
          )}

          {/* Real-time Result Badge */}
          {calories ? (
            <View style={styles.calcWrap}>
              <Ionicons name="sparkles" size={14} color={colors.emerald} />
              <Text style={styles.calcResult}>
                {measureMode === 'weight' ? `${weightG}g` : `${quantityNum} ${servingUnit} (${weightG}g)`}: {calories} kcal · P {proteinG || 0}g · C {carbsG || 0}g · F {fatG || 0}g
              </Text>
            </View>
          ) : null}
        </View>

        {/* Nutritional Breakdown */}
        <Input
          label="Calories (kcal) *"
          value={calories}
          onChangeText={setCalories}
          placeholder="e.g. 165"
          keyboardType="numeric"
          style={styles.fieldSpacing}
        />

        <Text style={styles.label}>Macros (optional)</Text>
        <View style={styles.macroRow}>
          {[
            { label: 'Protein (g)', value: proteinG, setter: setProteinG, color: colors.emerald },
            { label: 'Carbs (g)', value: carbsG, setter: setCarbsG, color: colors.amber },
            { label: 'Fat (g)', value: fatG, setter: setFatG, color: colors.violet },
          ].map((m) => (
            <View key={m.label} style={styles.macroInput}>
              <Text style={[styles.macroLabel, { color: m.color }]}>{m.label}</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.textFaint}
                value={m.value}
                onChangeText={m.setter}
                keyboardType="numeric"
              />
            </View>
          ))}
        </View>
      </ScrollView>

      <CropPhotoModal
        visible={cropVisible}
        imageUri={cropUri}
        onCancel={() => {
          setCropVisible(false);
          setCropUri(null);
        }}
        onCropped={handleCropped}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.void },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingTop: 56, paddingBottom: spacing.lg, backgroundColor: colors.void,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.white },
  saveText: { fontSize: 16, color: colors.emerald, fontWeight: '700' },
  scroll: { padding: spacing.xl, paddingBottom: 60 },
  label: { ...typ.label, marginTop: spacing.lg, marginBottom: spacing.sm },
  subLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted, marginBottom: 4, textTransform: 'uppercase' },
  metaSubText: { fontSize: 11, color: colors.textFaint, marginTop: 4 },
  fieldSpacing: { marginTop: spacing.sm },
  input: {
    backgroundColor: overlays.faint, borderRadius: radii.sm, padding: 12,
    color: colors.text, fontSize: 14, borderWidth: 1, borderColor: overlays.border, marginBottom: 4,
  },
  captureRow: { flexDirection: 'row', gap: spacing.sm },
  captureBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.surface, borderRadius: radii.md, padding: 14,
    borderWidth: 1, borderColor: colors.edge,
  },
  captureBtnText: { color: colors.textSoft, fontSize: 13, fontWeight: '600' },
  aiHint: { fontSize: 11, color: colors.textFaint, marginTop: 6 },
  photoCard: {
    flexDirection: 'row', gap: spacing.md, marginTop: spacing.md,
    padding: spacing.lg, borderColor: tint(colors.emerald, 0.3),
  },
  photoPreview: { width: 88, height: 88, borderRadius: radii.lg, backgroundColor: colors.abyss },
  photoInfo: { flex: 1, justifyContent: 'center' },
  analyzingText: { color: colors.textMuted, fontSize: 12, marginTop: spacing.sm, textAlign: 'center' },
  aiFoodName: { fontSize: 16, fontWeight: '700', color: colors.white, marginBottom: 2 },
  aiPer100: { fontSize: 12, color: colors.emerald, marginBottom: 2 },
  aiDetail: { fontSize: 11, color: colors.textFaint, marginBottom: spacing.sm },
  calcCard: {
    backgroundColor: overlays.faint, borderRadius: radii.md,
    borderWidth: 1, borderColor: overlays.border, padding: spacing.md,
  },
  modeRow: {
    flexDirection: 'row', backgroundColor: colors.abyss, borderRadius: radii.sm,
    padding: 3, marginBottom: spacing.md,
  },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8, borderRadius: radii.xs,
  },
  modeBtnActive: {
    backgroundColor: tint(colors.emerald, 0.2), borderWidth: 1, borderColor: colors.emerald,
  },
  modeBtnText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  modeBtnTextActive: { color: colors.emerald },
  portionInputWrap: { marginBottom: spacing.xs },
  presetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 },
  presetChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.sm,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.edge,
  },
  presetChipActive: {
    backgroundColor: tint(colors.emerald, 0.2), borderColor: colors.emerald,
  },
  presetText: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  presetTextActive: { color: colors.emerald, fontWeight: '700' },
  calcWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm,
    backgroundColor: tint(colors.emerald, 0.12), borderRadius: radii.sm,
    paddingHorizontal: spacing.md, paddingVertical: 8, borderWidth: 1, borderColor: tint(colors.emerald, 0.25),
  },
  calcResult: { fontSize: 11, color: colors.emerald, fontWeight: '700', flex: 1 },
  quickRow: { marginBottom: 4 },
  quickChip: {
    backgroundColor: colors.surface, borderRadius: radii.md, padding: 10,
    marginRight: spacing.sm, borderWidth: 1, borderColor: colors.edge, alignItems: 'center', minWidth: 105,
  },
  quickChipActive: {
    borderColor: colors.emerald, backgroundColor: tint(colors.emerald, 0.12),
  },
  quickName: { fontSize: 12, color: colors.textSoft, fontWeight: '600', maxWidth: 90, textAlign: 'center' },
  quickCal: { fontSize: 10, color: colors.emerald, marginTop: 2 },
  mealRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  mealBtn: {
    flex: 1, minWidth: '22%', padding: 10, borderRadius: radii.md,
    alignItems: 'center', backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.edge,
  },
  mealBtnActive: { borderColor: colors.emerald, backgroundColor: tint(colors.emerald, 0.14) },
  mealBtnEmoji: { fontSize: 18 },
  mealBtnText: { fontSize: 11, color: colors.textMuted, marginTop: 2, fontWeight: '600' },
  mealBtnTextActive: { color: colors.emerald },
  macroRow: { flexDirection: 'row', gap: spacing.sm },
  macroInput: { flex: 1 },
  macroLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: overlays.faint,
    borderRadius: radii.md, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: overlays.border, marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 13, padding: 0 },
  resultsCard: {
    backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1,
    borderColor: colors.edge, marginBottom: spacing.md, overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: 10,
  },
  resultBorder: { borderBottomWidth: 1, borderBottomColor: overlays.faint },
  resultName: { fontSize: 13, fontWeight: '700', color: colors.text },
  resultSub: { fontSize: 11, color: colors.textFaint, marginTop: 2 },
  verifiedTag: {
    backgroundColor: tint(colors.emerald, 0.2), borderRadius: radii.xs,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  verifiedText: { fontSize: 9, fontWeight: '700', color: colors.emerald },
});