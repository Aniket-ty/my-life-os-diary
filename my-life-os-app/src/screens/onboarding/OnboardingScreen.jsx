import React, { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Little / no exercise' },
  { value: 'light', label: 'Light', desc: '1–3 workouts / week' },
  { value: 'moderate', label: 'Moderate', desc: '3–5 workouts / week' },
  { value: 'active', label: 'Active', desc: '6–7 workouts / week' },
  { value: 'veryActive', label: 'Very active', desc: 'Hard training + physical job' },
];

const GOALS = [
  { value: 'lose', label: 'Lose weight', desc: 'Slight deficit' },
  { value: 'maintain', label: 'Maintain', desc: 'Keep current weight' },
  { value: 'gain', label: 'Build muscle', desc: 'Calorie surplus' },
];

const STEPS = ['Profile', 'Body scan', 'Lifestyle', 'Results'];

export default function OnboardingScreen({ navigation }) {
  const { user, completeOnboarding } = useAuthStore();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  // Step 1
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [heightCm, setHeightCm] = useState('');
  // Step 2
  const [weightKg, setWeightKg] = useState('');
  const [bodyFatPct, setBodyFatPct] = useState('');
  const [muscleMassKg, setMuscleMassKg] = useState('');
  // Step 3
  const [activityLevel, setActivityLevel] = useState('moderate');
  const [goal, setGoal] = useState('maintain');
  const [result, setResult] = useState(null);

  const canContinue = () => {
    if (step === 0) return age.trim() && heightCm.trim();
    if (step === 1) return weightKg.trim();
    return true;
  };

  const next = async () => {
    if (!canContinue()) {
      Alert.alert('Almost there', 'Please fill in the highlighted fields.');
      return;
    }
    if (step < 2) { setStep(step + 1); return; }
    if (step === 2) await submit();
  };

  const submit = async () => {
    setBusy(true);
    try {
      const res = await completeOnboarding({
        age: Number(age),
        gender,
        heightCm: Number(heightCm),
        weightKg: Number(weightKg),
        bodyFatPct: bodyFatPct ? Number(bodyFatPct) : undefined,
        muscleMassKg: muscleMassKg ? Number(muscleMassKg) : undefined,
        activityLevel,
        goal,
      });
      setResult(res.calculations);
      setStep(3);
    } catch (e) {
      Alert.alert('Could not save', e?.response?.data?.error || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const finish = () => navigation.reset({ index: 0, routes: [{ name: 'Home' }] });

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View>
            <Text style={styles.stepTitle}>Your profile</Text>
            <Text style={styles.stepSub}>Basic details for accurate calculations</Text>
            <View style={styles.form}>
              <Text style={styles.label}>Age</Text>
              <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="25" placeholderTextColor="#bbb" />
              <Text style={styles.label}>Height (cm)</Text>
              <TextInput style={styles.input} value={heightCm} onChangeText={setHeightCm} keyboardType="numeric" placeholder="175" placeholderTextColor="#bbb" />
              <Text style={styles.label}>Gender</Text>
              <View style={styles.row}>
                {['male', 'female'].map((g) => (
                  <TouchableOpacity
                    key={g} style={[styles.segBtn, gender === g && styles.segBtnActive]}
                    onPress={() => setGender(g)}
                  >
                    <Text style={[styles.segText, gender === g && styles.segTextActive]}>{g === 'male' ? '♂ Male' : '♀ Female'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );
      case 1:
        return (
          <View>
            <Text style={styles.stepTitle}>Body scan</Text>
            <Text style={styles.stepSub}>Your starting measurements — progress is tracked from here</Text>
            <View style={styles.form}>
              <Text style={styles.label}>Current weight (kg) *</Text>
              <TextInput style={styles.input} value={weightKg} onChangeText={setWeightKg} keyboardType="numeric" placeholder="80" placeholderTextColor="#bbb" />
              <Text style={styles.label}>Body fat % (optional)</Text>
              <TextInput style={styles.input} value={bodyFatPct} onChangeText={setBodyFatPct} keyboardType="numeric" placeholder="20" placeholderTextColor="#bbb" />
              <Text style={styles.label}>Muscle mass kg (optional)</Text>
              <TextInput style={styles.input} value={muscleMassKg} onChangeText={setMuscleMassKg} keyboardType="numeric" placeholder="35" placeholderTextColor="#bbb" />
              <Text style={styles.hint}>Don't know body fat? Leave it blank — we'll estimate lean mass.</Text>
            </View>
          </View>
        );
      case 2:
        return (
          <View>
            <Text style={styles.stepTitle}>Lifestyle</Text>
            <Text style={styles.stepSub}>How active are you, and what's your goal?</Text>
            <Text style={styles.label}>Activity level</Text>
            <View style={styles.list}>
              {ACTIVITY_LEVELS.map((a) => (
                <TouchableOpacity
                  key={a.value} style={[styles.option, activityLevel === a.value && styles.optionActive]}
                  onPress={() => setActivityLevel(a.value)}
                >
                  <View style={styles.optionTextWrap}>
                    <Text style={styles.optionTitle}>{a.label}</Text>
                    <Text style={styles.optionDesc}>{a.desc}</Text>
                  </View>
                  {activityLevel === a.value && <Ionicons name="checkmark-circle" size={20} color="#2ecc71" />}
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Fitness goal</Text>
            <View style={styles.list}>
              {GOALS.map((g) => (
                <TouchableOpacity
                  key={g.value} style={[styles.option, goal === g.value && styles.optionActive]}
                  onPress={() => setGoal(g.value)}
                >
                  <View style={styles.optionTextWrap}>
                    <Text style={styles.optionTitle}>{g.label}</Text>
                    <Text style={styles.optionDesc}>{g.desc}</Text>
                  </View>
                  {goal === g.value && <Ionicons name="checkmark-circle" size={20} color="#2ecc71" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case 3:
        return result ? (
          <View>
            <Text style={styles.stepTitle}>Your personalized numbers</Text>
            <Text style={styles.stepSub}>Based on your body scan — adjustable in Fitness later</Text>
            <View style={styles.resultGrid}>
              <View style={styles.resultCard}>
                <Text style={styles.resultLabel}>BMR</Text>
                <Text style={styles.resultValue}>{result.bmr}</Text>
                <Text style={styles.resultUnit}>kcal / day resting</Text>
              </View>
              <View style={styles.resultCard}>
                <Text style={styles.resultLabel}>Daily burn</Text>
                <Text style={styles.resultValue}>{result.tdee}</Text>
                <Text style={styles.resultUnit}>kcal / day TDEE</Text>
              </View>
            </View>
            <View style={[styles.resultCard, styles.heroCard]}>
              <Text style={styles.resultLabelGold}>Daily calorie target</Text>
              <Text style={styles.heroValue}>{result.calorieGoal}</Text>
              <Text style={styles.resultUnit}>kcal / day for your goal</Text>
            </View>
            <View style={styles.macroRow}>
              <View style={[styles.macroCard, { borderColor: '#2ecc7155' }]}>
                <Text style={[styles.macroValue, { color: '#2ecc71' }]}>{result.proteinG}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={[styles.macroCard, { borderColor: '#f5a62355' }]}>
                <Text style={[styles.macroValue, { color: '#f5a623' }]}>{result.carbsG}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={[styles.macroCard, { borderColor: '#3498db55' }]}>
                <Text style={[styles.macroValue, { color: '#3498db' }]}>{result.fatG}g</Text>
                <Text style={styles.macroLabel}>Fat</Text>
              </View>
            </View>
          </View>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#085041" />
      <View style={styles.header}>
        <Text style={styles.title}>Set up your{' '}<Text style={styles.titleAccent}>Life OS</Text></Text>
        <Text style={styles.subtitle}>Hi {user?.name?.split(' ')[0]} — a quick body scan unlocks your calories, macros & plan.</Text>
      </View>

      {/* Progress */}
      <View style={styles.progressRow}>
        {STEPS.map((s, i) => (
          <View key={s} style={styles.progressItem}>
            <View style={[styles.progressDot, i <= step && styles.progressDotActive, i === step && styles.progressDotCurrent]}>
              <Text style={styles.progressDotText}>{i + 1}</Text>
            </View>
            <Text style={[styles.progressLabel, i <= step && styles.progressLabelActive]}>{s}</Text>
            {i < STEPS.length - 1 && <View style={[styles.progressLine, i < step && styles.progressLineActive]} />}
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {renderStep()}
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 && step < 3 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)}>
            <Ionicons name="chevron-back" size={20} color="#444" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, step === 3 && styles.finishBtn]}
          onPress={step === 3 ? finish : next}
          disabled={busy}
          activeOpacity={0.85}
        >
          {busy
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.nextText}>
                {step === 2 ? 'Generate my plan' : step === 3 ? 'Start my Life OS' : 'Continue'}
                {step === 3 ? '' : '  →'}
              </Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#085041' },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#fff' },
  titleAccent: { color: '#c8a96e' },
  subtitle: { fontSize: 13, color: '#9ee0cb', marginTop: 4, lineHeight: 19 },
  progressRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 8, marginBottom: 4 },
  progressItem: { flex: 1, alignItems: 'center', position: 'relative' },
  progressDot: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#0f6b58',
    alignItems: 'center', justifyContent: 'center', zIndex: 2,
  },
  progressDotActive: { backgroundColor: '#c8a96e' },
  progressDotCurrent: { borderWidth: 2, borderColor: '#fff' },
  progressDotText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  progressLabel: { fontSize: 9, color: '#7cc4ad', marginTop: 4, textAlign: 'center' },
  progressLabelActive: { color: '#fff' },
  progressLine: {
    position: 'absolute', top: 15, right: -50, left: '50%', height: 2,
    backgroundColor: '#0f6b58', width: '100%', zIndex: 1,
  },
  progressLineActive: { backgroundColor: '#c8a96e' },
  scroll: { padding: 20, paddingBottom: 110 },
  form: { marginTop: 14, backgroundColor: '#fff', borderRadius: 16, padding: 18 },
  label: { fontSize: 12, color: '#666', marginBottom: 6, marginTop: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, padding: 13,
    fontSize: 16, backgroundColor: '#fafafa', color: '#222',
  },
  hint: { fontSize: 12, color: '#999', marginTop: 10, lineHeight: 18 },
  row: { flexDirection: 'row', gap: 10 },
  segBtn: {
    flex: 1, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10,
    padding: 13, alignItems: 'center', backgroundColor: '#fff',
  },
  segBtnActive: { borderColor: '#085041', backgroundColor: '#08504122' },
  segText: { fontSize: 15, color: '#555', fontWeight: '600' },
  segTextActive: { color: '#085041' },
  stepTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  stepSub: { fontSize: 13, color: '#9ee0cb', marginTop: 4 },
  list: { marginTop: 4 },
  option: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: 'transparent',
  },
  optionActive: { borderColor: '#2ecc71' },
  optionTextWrap: { flex: 1 },
  optionTitle: { fontSize: 15, fontWeight: '700', color: '#222' },
  optionDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  resultGrid: { flexDirection: 'row', gap: 10, marginTop: 16 },
  resultCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center',
  },
  resultLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '700' },
  resultLabelGold: { fontSize: 12, color: '#8a6d2f', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '700' },
  resultValue: { fontSize: 26, fontWeight: '800', color: '#222', marginTop: 4 },
  resultUnit: { fontSize: 10, color: '#aaa', marginTop: 2, textAlign: 'center' },
  heroCard: { marginTop: 10, backgroundColor: '#fdf6e3', borderWidth: 1.5, borderColor: '#c8a96e' },
  heroValue: { fontSize: 38, fontWeight: '900', color: '#3d2b1f', marginTop: 4 },
  macroRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  macroCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1.5,
  },
  macroValue: { fontSize: 18, fontWeight: '800' },
  macroLabel: { fontSize: 10, color: '#888', marginTop: 2, textTransform: 'uppercase' },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20, paddingBottom: 36,
    flexDirection: 'row', gap: 12, backgroundColor: '#085041',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 28, paddingHorizontal: 16, paddingVertical: 14 },
  backText: { fontSize: 14, color: '#444', fontWeight: '600' },
  nextBtn: { flex: 1, backgroundColor: '#c8a96e', borderRadius: 28, paddingVertical: 14, alignItems: 'center' },
  finishBtn: { backgroundColor: '#2ecc71' },
  nextText: { fontSize: 15, color: '#fff', fontWeight: '800' },
});