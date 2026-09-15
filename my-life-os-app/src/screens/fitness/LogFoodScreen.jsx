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

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_ICONS = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };

const QUICK_FOODS = [
  { name: 'Banana', calories: 89, proteinG: 1.1, carbsG: 23, fatG: 0.3, quantity: '1 medium' },
  { name: 'Chicken Breast 100g', calories: 165, proteinG: 31, carbsG: 0, fatG: 3.6, quantity: '100g' },
  { name: 'White Rice 1 cup', calories: 206, proteinG: 4.3, carbsG: 45, fatG: 0.4, quantity: '1 cup cooked' },
  { name: 'Whole Egg', calories: 78, proteinG: 6, carbsG: 0.6, fatG: 5, quantity: '1 large' },
  { name: 'Almonds 30g', calories: 173, proteinG: 6, carbsG: 6, fatG: 15, quantity: '30g' },
];

const PICKS = {
  mediaTypes: ['images'],
  quality: 0.7,
  allowsEditing: true,
};

export default function LogFoodScreen({ navigation }) {
  const { logFood } = useFitnessStore();
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [proteinG, setProteinG] = useState('');
  const [carbsG, setCarbsG] = useState('');
  const [fatG, setFatG] = useState('');
  const [quantity, setQuantity] = useState('');
  const [mealType, setMealType] = useState('lunch');
  const [saving, setSaving] = useState(false);

  // AI food photo state
  const [photoUri, setPhotoUri] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [portionG, setPortionG] = useState('100');

  const pickAndAnalyze = async (source) => {
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

      const asset = result.assets[0];
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
      setPortionG('100');
      applyPortion(data, '100');
    } catch (e) {
      Alert.alert('Analysis failed', e.message || 'Could not analyze the photo. Please try again.');
      setPhotoUri(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const applyPortion = (result, grams) => {
    const g = Math.max(0, Number(grams) || 0);
    const factor = g / 100;
    setFoodName(result.foodName);
    setCalories(String(Math.max(0, Math.round(result.per100g.calories * factor))));
    setProteinG(String(Math.max(0, Math.round(result.per100g.proteinG * factor * 10) / 10)));
    setCarbsG(String(Math.max(0, Math.round(result.per100g.carbsG * factor * 10) / 10)));
    setFatG(String(Math.max(0, Math.round(result.per100g.fatG * factor * 10) / 10)));
    setQuantity(`${g}g`);
  };

  const onPortionChange = (text) => {
    setPortionG(text);
    if (aiResult && text) applyPortion(aiResult, text);
  };

  const fillQuick = (food) => {
    setFoodName(food.name);
    setCalories(String(food.calories));
    setProteinG(String(food.proteinG));
    setCarbsG(String(food.carbsG));
    setFatG(String(food.fatG));
    setQuantity(food.quantity);
  };

  const handleSave = async () => {
    if (!foodName.trim() || !calories) {
      return Alert.alert('Required', 'Food name and calories are required.');
    }
    setSaving(true);
    try {
      await logFood({
        foodName: foodName.trim(),
        calories: Number(calories),
        proteinG: proteinG ? Number(proteinG) : null,
        carbsG: carbsG ? Number(carbsG) : null,
        fatG: fatG ? Number(fatG) : null,
        quantity: quantity.trim() || null,
        mealType,
        logDate: moment().format('YYYY-MM-DD'),
        aiSuggested: !!aiResult,
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Food</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator size="small" color="#f39c12" />
            : <Text style={styles.saveText}>Save</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* AI Food Photo */}
        <Text style={styles.label}>AI Food Photo</Text>
        <View style={styles.captureRow}>
          <TouchableOpacity style={styles.captureBtn} onPress={() => pickAndAnalyze('camera')} disabled={analyzing}>
            <Ionicons name="camera" size={20} color="#e74c3c" />
            <Text style={styles.captureBtnText}>Take photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.captureBtn} onPress={() => pickAndAnalyze('gallery')} disabled={analyzing}>
            <Ionicons name="images" size={20} color="#f39c12" />
            <Text style={styles.captureBtnText}>Choose photo</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.aiHint}>Snap your meal — AI will identify it and auto-fill nutrition from the portion weight.</Text>

        {photoUri && (
          <View style={styles.photoCard}>
            <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
            <View style={styles.photoInfo}>
              {analyzing ? (
                <>
                  <ActivityIndicator size="small" color="#f39c12" />
                  <Text style={styles.analyzingText}>AI is identifying your food…</Text>
                </>
              ) : aiResult ? (
                <>
                  <Text style={styles.aiFoodName}>{aiResult.foodName}</Text>
                  <Text style={styles.aiPer100}>per 100g: {aiResult.per100g.calories} kcal · P {aiResult.per100g.proteinG}g · C {aiResult.per100g.carbsG}g · F {aiResult.per100g.fatG}g</Text>
                  {aiResult.serving && <Text style={styles.aiDetail}>Serving: {aiResult.serving}</Text>}

                  <Text style={styles.label}>Your portion weight (g)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="100"
                    placeholderTextColor="#444"
                    value={portionG}
                    onChangeText={onPortionChange}
                    keyboardType="numeric"
                  />
                  <Text style={styles.calcResult}>
                    → {foodName}: {calories} kcal · P {proteinG}g · C {carbsG}g · F {fatG}g
                  </Text>
                </>
              ) : null}
            </View>
          </View>
        )}

        {/* Quick add */}
        <Text style={styles.label}>Quick Add</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickRow}>
          {QUICK_FOODS.map((f) => (
            <TouchableOpacity key={f.name} style={styles.quickChip} onPress={() => fillQuick(f)}>
              <Text style={styles.quickName}>{f.name}</Text>
              <Text style={styles.quickCal}>{f.calories} kcal</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Meal type */}
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

        {/* Food details */}
        <Text style={styles.label}>Food Name *</Text>
        <TextInput style={styles.input} placeholder="e.g. Chicken Breast" placeholderTextColor="#444" value={foodName} onChangeText={setFoodName} />

        <Text style={styles.label}>Quantity</Text>
        <TextInput style={styles.input} placeholder="e.g. 100g, 1 cup" placeholderTextColor="#444" value={quantity} onChangeText={setQuantity} />

        <Text style={styles.label}>Calories (kcal) *</Text>
        <TextInput style={styles.input} placeholder="e.g. 165" placeholderTextColor="#444" value={calories} onChangeText={setCalories} keyboardType="numeric" />

        <Text style={styles.label}>Macros (optional)</Text>
        <View style={styles.macroRow}>
          {[
            { label: 'Protein (g)', value: proteinG, setter: setProteinG, color: '#e74c3c' },
            { label: 'Carbs (g)', value: carbsG, setter: setCarbsG, color: '#f39c12' },
            { label: 'Fat (g)', value: fatG, setter: setFatG, color: '#9b59b6' },
          ].map((m) => (
            <View key={m.label} style={styles.macroInput}>
              <Text style={[styles.macroLabel, { color: m.color }]}>{m.label}</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#444"
                value={m.value}
                onChangeText={m.setter}
                keyboardType="numeric"
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, backgroundColor: '#1a1a2e',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  saveText: { fontSize: 16, color: '#f39c12', fontWeight: '700' },
  scroll: { padding: 20, paddingBottom: 60 },
  label: { fontSize: 13, color: '#888', fontWeight: '600', marginBottom: 6, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#1a1a2e', borderRadius: 10, padding: 14, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#2a2a3e', marginBottom: 4 },
  captureRow: { flexDirection: 'row', gap: 8 },
  captureBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#2a2a3e',
  },
  captureBtnText: { color: '#ccc', fontSize: 13, fontWeight: '600' },
  aiHint: { fontSize: 11, color: '#666', marginTop: 6 },
  photoCard: {
    flexDirection: 'row', gap: 12, marginTop: 12,
    backgroundColor: '#1a1a2e', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: '#2a2a3e',
  },
  photoPreview: { width: 88, height: 88, borderRadius: 10, backgroundColor: '#0f0f1a' },
  photoInfo: { flex: 1, justifyContent: 'center' },
  analyzingText: { color: '#888', fontSize: 12, marginTop: 8, textAlign: 'center' },
  aiFoodName: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 2 },
  aiPer100: { fontSize: 12, color: '#f39c12', marginBottom: 2 },
  aiDetail: { fontSize: 11, color: '#888', marginBottom: 8 },
  calcResult: { fontSize: 12, color: '#2ecc71', fontWeight: '600', marginTop: 6 },
  quickRow: { marginBottom: 4 },
  quickChip: {
    backgroundColor: '#1a1a2e', borderRadius: 10, padding: 10,
    marginRight: 8, borderWidth: 1, borderColor: '#2a2a3e', alignItems: 'center',
  },
  quickName: { fontSize: 12, color: '#ccc', fontWeight: '600', maxWidth: 90, textAlign: 'center' },
  quickCal: { fontSize: 11, color: '#f39c12', marginTop: 2 },
  mealRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  mealBtn: {
    flex: 1, minWidth: '22%', padding: 10, borderRadius: 10,
    alignItems: 'center', backgroundColor: '#1a1a2e',
    borderWidth: 1, borderColor: '#2a2a3e',
  },
  mealBtnActive: { borderColor: '#f39c12', backgroundColor: '#2a1800' },
  mealBtnEmoji: { fontSize: 18 },
  mealBtnText: { fontSize: 11, color: '#666', marginTop: 2, fontWeight: '600' },
  mealBtnTextActive: { color: '#f39c12' },
  macroRow: { flexDirection: 'row', gap: 8 },
  macroInput: { flex: 1 },
  macroLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
});