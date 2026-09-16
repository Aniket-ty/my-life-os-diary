import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import Screen from '../../components/ui/Screen';
import Button from '../../components/ui/Button';
import GlassCard from '../../components/ui/GlassCard';
import Input from '../../components/ui/Input';
import { colors, overlays, radii, shadow, spacing, tint, type as typ } from '../../theme';

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
  const [skipped, setSkipped] = useState(false);

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

  const submit = async (skip = false) => {
    setBusy(true);
    try {
      const res = await completeOnboarding({
        age: Number(age),
        gender,
        heightCm: Number(heightCm),
        weightKg: skip ? undefined : Number(weightKg),
        bodyFatPct: bodyFatPct ? Number(bodyFatPct) : undefined,
        muscleMassKg: muscleMassKg ? Number(muscleMassKg) : undefined,
        activityLevel,
        goal,
      });
      setResult(res.calculations);
      setSkipped(skip);
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
            <Text style={typ.h1}>Your profile</Text>
            <Text style={styles.stepSub}>Basic details for accurate calculations</Text>
            <View style={styles.form}>
              <Input
                label="Age"
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
                placeholder="25"
                style={styles.field}
              />
              <Input
                label="Height (cm)"
                value={heightCm}
                onChangeText={setHeightCm}
                keyboardType="numeric"
                placeholder="175"
                style={styles.field}
              />
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Gender</Text>
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
          </View>
        );
      case 1:
        return (
          <View>
            <Text style={typ.h1}>Body scan</Text>
            <Text style={styles.stepSub}>Your starting measurements — progress is tracked from here</Text>
            <View style={styles.form}>
              <Input
                label="Current weight (kg) *"
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType="numeric"
                placeholder="80"
                style={styles.field}
              />
              <Input
                label="Body fat % (optional)"
                value={bodyFatPct}
                onChangeText={setBodyFatPct}
                keyboardType="numeric"
                placeholder="20"
                style={styles.field}
              />
              <Input
                label="Muscle mass kg (optional)"
                value={muscleMassKg}
                onChangeText={setMuscleMassKg}
                keyboardType="numeric"
                placeholder="35"
                style={styles.field}
              />
              <View style={styles.hintBox}>
                <Text style={styles.hintText}>Don't know body fat? Leave it blank — we'll estimate lean mass.</Text>
              </View>
              <TouchableOpacity
                style={styles.skipBtn}
                onPress={() => submit(true)}
                disabled={busy}
              >
                <Text style={styles.skipBtnText}>Skip for now — I'll do this later</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 2:
        return (
          <View>
            <Text style={typ.h1}>Lifestyle</Text>
            <Text style={styles.stepSub}>How active are you, and what's your goal?</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Activity level</Text>
              <View style={styles.list}>
                {ACTIVITY_LEVELS.map((a) => (
                  <TouchableOpacity
                    key={a.value} style={[styles.option, activityLevel === a.value && styles.optionActiveEmerald]}
                    onPress={() => setActivityLevel(a.value)}
                  >
                    <View style={styles.optionTextWrap}>
                      <Text style={styles.optionTitle}>{a.label}</Text>
                      <Text style={styles.optionDesc}>{a.desc}</Text>
                    </View>
                    {activityLevel === a.value && <Ionicons name="checkmark-circle" size={20} color={colors.emerald} />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Fitness goal</Text>
              <View style={styles.list}>
                {GOALS.map((g) => (
                  <TouchableOpacity
                    key={g.value} style={[styles.option, goal === g.value && styles.optionActiveGold]}
                    onPress={() => setGoal(g.value)}
                  >
                    <View style={styles.optionTextWrap}>
                      <Text style={styles.optionTitle}>{g.label}</Text>
                      <Text style={styles.optionDesc}>{g.desc}</Text>
                    </View>
                    {goal === g.value && <Ionicons name="checkmark-circle" size={20} color={colors.gold} />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );
      case 3:
        if (skipped) {
          return (
            <View>
              <Text style={typ.h1}>All set for now</Text>
              <Text style={styles.stepSub}>Your Life OS is ready — add your body scan when you're ready</Text>
              <View style={styles.skipCard}>
                <Ionicons name="scan-outline" size={30} color={colors.textFaint} />
                <Text style={styles.skipCardTitle}>You skipped the body scan</Text>
                <Text style={styles.skipCardText}>
                  Open Body Scan anytime to enter your starting measurements — that unlocks your
                  calorie targets, macros and AI workout plans.
                </Text>
              </View>
            </View>
          );
        }
        return result ? (
          <View>
            <Text style={typ.h1}>Your personalized numbers</Text>
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
              <View style={[styles.macroCard, { borderColor: tint(colors.emerald, 0.25), backgroundColor: tint(colors.emerald, 0.06) }]}>
                <Text style={styles.macroValue}>{result.proteinG}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={[styles.macroCard, { borderColor: tint(colors.gold, 0.25), backgroundColor: tint(colors.gold, 0.06) }]}>
                <Text style={styles.macroValue}>{result.carbsG}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={[styles.macroCard, { borderColor: tint(colors.sky, 0.25), backgroundColor: tint(colors.sky, 0.06) }]}>
                <Text style={styles.macroValue}>{result.fatG}g</Text>
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
    <Screen>
      <View style={styles.header}>
        <Text style={[typ.display, styles.title]}>
          Set up your <Text style={styles.titleAccent}>Life OS</Text>
        </Text>
        <Text style={styles.subtitle}>Hi {user?.name?.split(' ')[0]} — a quick body scan unlocks your calories, macros & plan. You can skip it for now and add it later.</Text>
      </View>

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
        <GlassCard strong style={styles.stepCard}>
          {renderStep()}
        </GlassCard>
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 && step < 3 && (
          <Button
            variant="outline"
            size="md"
            icon={<Ionicons name="chevron-back" size={18} />}
            onPress={() => setStep(step - 1)}
          >
            Back
          </Button>
        )}
        <Button
          size="lg"
          loading={busy}
          onPress={step === 3 ? finish : next}
          style={[styles.nextBtn, (step === 2 || step === 3) && styles.finishBtn]}
          textStyle={styles.nextText}
        >
          {step === 2 ? 'Generate my plan' : step === 3 ? 'Start my Life OS' : 'Continue'}
          {step === 3 ? '' : '  →'}
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 64, paddingHorizontal: spacing.xxl, paddingBottom: spacing.lg },
  title: { textAlign: 'center' },
  titleAccent: { color: colors.gold300 },
  subtitle: { ...typ.bodyMuted, marginTop: spacing.sm, textAlign: 'center', lineHeight: 18 },
  progressRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, marginVertical: spacing.sm },
  progressItem: { flex: 1, alignItems: 'center', position: 'relative' },
  progressDot: {
    width: 30, height: 30, borderRadius: radii.pill, backgroundColor: overlays.soft,
    borderWidth: 1, borderColor: overlays.border,
    alignItems: 'center', justifyContent: 'center', zIndex: 2,
  },
  progressDotActive: { backgroundColor: colors.violet, borderColor: colors.violet },
  progressDotCurrent: { borderWidth: 2, borderColor: colors.white },
  progressDotText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  progressLabel: { fontSize: 9, color: colors.textFaint, marginTop: spacing.xs, textAlign: 'center' },
  progressLabelActive: { color: colors.textSoft },
  progressLine: {
    position: 'absolute', top: 15, right: -50, left: '50%', height: 2,
    backgroundColor: overlays.border, width: '100%', zIndex: 1,
  },
  progressLineActive: { backgroundColor: tint(colors.violet, 0.6) },
  scroll: { padding: spacing.xl, paddingBottom: 110 },
  stepCard: { marginTop: spacing.xs },
  stepSub: { marginTop: spacing.xs, ...typ.bodyMuted },
  form: { marginTop: spacing.xl },
  field: { marginBottom: spacing.lg },
  fieldLabel: { ...typ.label, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  segBtn: {
    flex: 1, borderWidth: 1, borderColor: overlays.border, borderRadius: radii.md,
    backgroundColor: overlays.soft, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13,
  },
  segBtnActive: { backgroundColor: colors.violet, borderColor: colors.violet },
  segText: { fontSize: 15, color: colors.textMuted, fontWeight: '600' },
  segTextActive: { color: colors.white },
  hintBox: { backgroundColor: overlays.faint, borderRadius: radii.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  hintText: { ...typ.small, lineHeight: 18 },
  skipBtn: {
    marginTop: spacing.xs, borderWidth: 1, borderColor: overlays.border, borderRadius: radii.md,
    backgroundColor: overlays.soft, paddingVertical: 13, alignItems: 'center',
  },
  skipBtnText: { fontSize: 13, color: colors.textSoft, fontWeight: '600' },
  skipCard: {
    marginTop: spacing.lg, backgroundColor: overlays.faint, borderRadius: radii.xl,
    padding: spacing.xl, borderWidth: 1, borderColor: overlays.border, alignItems: 'center',
  },
  skipCardTitle: { ...typ.h3, marginTop: spacing.md },
  skipCardText: { ...typ.small, marginTop: spacing.sm, textAlign: 'center', lineHeight: 18 },
  list: { marginTop: spacing.xs },
  option: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: overlays.faint,
    borderRadius: radii.md, padding: 14, marginBottom: spacing.sm,
    borderWidth: 1.5, borderColor: overlays.border,
  },
  optionActiveEmerald: { borderColor: tint(colors.emerald, 0.55), backgroundColor: tint(colors.emerald, 0.1) },
  optionActiveGold: { borderColor: tint(colors.gold, 0.55), backgroundColor: tint(colors.gold, 0.1) },
  optionTextWrap: { flex: 1 },
  optionTitle: { ...typ.h3 },
  optionDesc: { ...typ.small, marginTop: 2 },
  resultGrid: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  resultCard: {
    flex: 1, backgroundColor: overlays.faint, borderRadius: radii.lg, padding: spacing.lg,
    alignItems: 'center', borderWidth: 1, borderColor: overlays.border,
  },
  resultLabel: { fontSize: 10, color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '700' },
  resultLabelGold: { fontSize: 11, color: colors.gold300, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '700' },
  resultValue: { fontSize: 24, fontWeight: '800', color: colors.white, marginTop: spacing.xs },
  resultUnit: { fontSize: 10, color: colors.textFaint, marginTop: 2, textAlign: 'center' },
  heroCard: { marginTop: spacing.md, backgroundColor: tint(colors.gold, 0.12), borderColor: tint(colors.gold, 0.35) },
  heroValue: { fontSize: 36, fontWeight: '900', color: colors.white, marginTop: spacing.xs },
  macroRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  macroCard: {
    flex: 1, backgroundColor: overlays.faint, borderRadius: radii.md, padding: 14,
    alignItems: 'center', borderWidth: 1.5,
  },
  macroValue: { fontSize: 18, fontWeight: '800', color: colors.white, marginTop: 4 },
  macroLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2, textTransform: 'uppercase' },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.xl, paddingBottom: 36,
    flexDirection: 'row', gap: spacing.md, backgroundColor: colors.void,
  },
  nextBtn: { flex: 1 },
  finishBtn: { backgroundColor: colors.emerald, ...shadow.glow(colors.emerald) },
  nextText: { color: colors.white, fontSize: 15, fontWeight: '800' },
});