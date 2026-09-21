import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import Screen from '../../components/ui/Screen';
import GlassCard from '../../components/ui/GlassCard';
import { colors, radii, tint, type as typ, overlays } from '../../theme';
import { expenseService } from '../../services/expenseService';
import { offlineSyncService } from '../../services/offlineSyncService';

const SUGGESTIONS = [
  'Log workout Chest Day 45m',
  'Log exercise Bench Press 3 sets 10 reps',
  'Diary: Productive day',
  'Log food 2 eggs and toast 350 calories',
  'Add task Buy groceries',
  'Open my diary',
  'Open fitness workouts',
  'Contact Rahul',
  'Contact +91 98765 43210',
  'I spent 500 rupees on lunch',
  'How much does Rahul owe me?',
  'Convert 100 EUR to INR',
];

const ROUTE_MAP = {
  '/diary': 'DiaryList',
  '/fitness': 'FitnessList',
  '/fitness/planner': 'WorkoutPlanner',
  '/todo': 'TodoList',
  '/body-scan': 'BodyScan',
  '/': 'Home',
  '/ai': 'AIChat',
  '/expenses': 'ExpenseList',
  '/settings': 'Settings',
};

const MODULE_TO_SCREEN = {
  OPEN_DIARY: 'DiaryList',
  OPEN_FITNESS: 'FitnessList',
  OPEN_WORKOUT_PLANNER: 'WorkoutPlanner',
  OPEN_TODOS: 'TodoList',
  OPEN_BODY_SCAN: 'BodyScan',
  OPEN_DASHBOARD: 'Home',
  OPEN_AI: 'AIChat',
  NAVIGATE_EXPENSES: 'ExpenseList',
  NAVIGATE_GROUPS: 'ExpenseList',
  NAVIGATE_SETTLEMENTS: 'ExpenseList',
};

export default function VoiceAssistantScreen({ navigation }) {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [manualText, setManualText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState(null);
  const [talkBackEnabled, setTalkBackEnabled] = useState(true);

  useEffect(() => {
    return () => {
      try {
        Speech.stop();
      } catch {}
    };
  }, []);

  const speak = (textToSpeak) => {
    if (!talkBackEnabled || !textToSpeak) return;
    try {
      Speech.stop();
      Speech.speak(textToSpeak, {
        language: 'en',
        pitch: 1.0,
        rate: 0.95,
      });
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission Denied', 'Microphone access is needed for voice assistant.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsRecording(true);
      setTranscript('');
      setResponse(null);
    } catch (err) {
      Alert.alert('Audio Error', err.message || 'Failed to start recording');
    }
  };

  const stopRecordingAndProcess = async () => {
    if (!recording) return;
    try {
      setIsRecording(false);
      setProcessing(true);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      // Check online connectivity
      const online = await offlineSyncService.isOnline();
      if (!online) {
        const msg = 'Microphone speech recognition requires internet. You can type commands offline below.';
        speak(msg);
        setTranscript('Audio command (Offline)');
        setResponse({
          intent: 'OFFLINE_NOTICE',
          kind: 'result',
          resultText: msg,
          speechText: msg,
        });
        return;
      }

      // Send audio to speech-to-text pipeline
      const data = await expenseService.transcribeAndExecute(uri);
      setTranscript(data.transcript || 'Audio command');
      setResponse(data);

      const feedback = data.speechText || data.executionMessage || data.resultText || data.previewText;
      if (feedback) speak(feedback);
    } catch (err) {
      Alert.alert('Processing Error', err.message || 'Failed to process voice command');
    } finally {
      setProcessing(false);
    }
  };

  const handleManualCommand = async (textToRun) => {
    const query = (textToRun || manualText).trim();
    if (!query) return;
    try {
      setProcessing(true);
      setTranscript(query);
      setManualText('');

      const online = await offlineSyncService.isOnline();
      if (!online) {
        // Offline handling: Queue locally
        if (/^(?:diary|write diary|log diary)\b/i.test(query)) {
          const content = query.replace(/^(?:diary:?|write diary|log diary)\s*/i, '') || 'Offline voice journal note';
          await offlineSyncService.queueDiaryEntry({ title: 'Offline Reflection', content, mood: 'productive' });
          const speech = 'Diary entry saved offline. It will automatically sync as soon as you reconnect.';
          speak(speech);
          setResponse({ kind: 'result', executionMessage: speech, resultText: speech, speechText: speech });
        } else if (/^(?:add task|create todo|todo)\b/i.test(query)) {
          const title = query.replace(/^(?:add task|create todo|todo:?)\s*/i, '') || 'Offline task';
          await offlineSyncService.queueTodo({ title, priority: 'medium' });
          const speech = `Added task ${title} offline. Will sync when back online.`;
          speak(speech);
          setResponse({ kind: 'result', executionMessage: speech, resultText: speech, speechText: speech });
        } else if (/^(?:log workout|workout)\b/i.test(query)) {
          const name = query.replace(/^(?:log workout|workout:?)\s*/i, '') || 'Workout';
          await offlineSyncService.queueWorkout({ name, durationMin: 35, totalCaloriesBurned: 220 });
          const speech = `Logged workout ${name} offline. Will sync when back online.`;
          speak(speech);
          setResponse({ kind: 'result', executionMessage: speech, resultText: speech, speechText: speech });
        } else {
          const speech = 'You are currently offline. Connect to internet for advanced voice queries.';
          speak(speech);
          setResponse({ kind: 'result', executionMessage: speech, resultText: speech, speechText: speech });
        }
        return;
      }

      const data = await expenseService.processVoiceCommand(query);
      setResponse(data);

      const feedback = data.speechText || data.executionMessage || data.resultText || data.previewText;
      if (feedback) speak(feedback);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to execute command');
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmAction = async (confirmed) => {
    if (!response?.serverCommandId) return;
    try {
      setProcessing(true);
      const res = await expenseService.confirmVoiceAction(response.serverCommandId, confirmed);
      const msg = res.message || (confirmed ? 'Action confirmed.' : 'Action cancelled.');
      speak(msg);
      Alert.alert('Result', msg);
      setResponse(null);
    } catch (err) {
      Alert.alert('Error', err.message || 'Confirmation failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            Speech.stop();
            navigation.goBack();
          }}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textSoft} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Life OS Voice Assistant</Text>
        <TouchableOpacity
          onPress={() => {
            const next = !talkBackEnabled;
            setTalkBackEnabled(next);
            if (!next) Speech.stop();
          }}
          style={styles.speakerBtn}
          activeOpacity={0.7}
          accessibilityLabel="Toggle Voice Talk Back"
        >
          <Ionicons
            name={talkBackEnabled ? 'volume-high' : 'volume-mute'}
            size={20}
            color={talkBackEnabled ? colors.violet : colors.textFaint}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Big Microphone Button */}
        <View style={styles.micSection}>
          <TouchableOpacity
            style={[
              styles.micButton,
              isRecording && styles.micButtonRecording,
            ]}
            onPress={isRecording ? stopRecordingAndProcess : startRecording}
            activeOpacity={0.8}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color={colors.white} size="large" />
            ) : (
              <Ionicons
                name={isRecording ? 'stop' : 'mic'}
                size={40}
                color={colors.white}
              />
            )}
          </TouchableOpacity>
          <Text style={styles.micStatus}>
            {processing
              ? 'Processing voice command...'
              : isRecording
              ? 'Listening... Tap to finish'
              : 'Tap microphone to speak'}
          </Text>
        </View>

        {/* Command Transcript & Outcome */}
        {transcript ? (
          <GlassCard style={styles.resultCard}>
            <Text style={styles.transcriptLabel}>YOU SAID:</Text>
            <Text style={styles.transcriptText}>"{transcript}"</Text>

            {response?.executionMessage ? (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={18} color={colors.emerald} />
                <Text style={styles.successText}>{response.executionMessage}</Text>
              </View>
            ) : null}

            {/* Navigation Action */}
            {response?.kind === 'navigate' ? (
              <View style={styles.navigateBox}>
                <View style={styles.navigateInfo}>
                  <Ionicons name="compass" size={22} color={colors.violet} />
                  <Text style={styles.navigateText}>
                    Navigate to {response.executionMessage?.replace('Opening ', '')?.replace('...', '') || 'Screen'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.navigateBtn}
                  onPress={() => {
                    const target = ROUTE_MAP[response.route] || MODULE_TO_SCREEN[response.data?.module] || 'Home';
                    navigation.navigate(target);
                  }}
                >
                  <Text style={styles.navigateBtnText}>Go to Screen</Text>
                  <Ionicons name="arrow-forward" size={15} color={colors.white} />
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Contact User Information */}
            {response?.data?.user ? (
              <View style={styles.userCardBox}>
                <Ionicons name="person-circle" size={32} color={colors.violet} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.userCardName}>{response.data.user.name || 'Registered User'}</Text>
                  <Text style={styles.userCardSub}>
                    {response.data.user.phoneNumber ? `📞 ${response.data.user.phoneNumber}` : ''}
                    {response.data.user.phoneNumber && response.data.user.email ? ' • ' : ''}
                    {response.data.user.email || ''}
                  </Text>
                </View>
              </View>
            ) : null}

            {response?.kind === 'result' && response.resultText ? (
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>{response.resultText}</Text>
              </View>
            ) : null}

            {/* Confirmation Alert */}
            {response?.requiresConfirmation ? (
              <View style={styles.confirmBox}>
                <Text style={styles.confirmTitle}>Confirmation Required</Text>
                <Text style={styles.confirmPreview}>{response.previewText}</Text>
                <View style={styles.confirmBtnRow}>
                  <TouchableOpacity
                    style={styles.confirmCancel}
                    onPress={() => handleConfirmAction(false)}
                  >
                    <Text style={styles.confirmCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmOk}
                    onPress={() => handleConfirmAction(true)}
                  >
                    <Text style={styles.confirmOkText}>Yes, Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </GlassCard>
        ) : null}

        {/* Text Input Fallback */}
        <GlassCard style={styles.textInputCard}>
          <Text style={styles.label}>OR TYPE COMMAND</Text>
          <View style={styles.inputRow}>
            <TextInput
              value={manualText}
              onChangeText={setManualText}
              placeholder="e.g. I spent 400 on groceries"
              placeholderTextColor={colors.textFaint}
              style={styles.textInput}
              onSubmitEditing={() => handleManualCommand()}
            />
            <TouchableOpacity
              style={styles.sendBtn}
              onPress={() => handleManualCommand()}
            >
              <Ionicons name="send" size={16} color={colors.white} />
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* Try Saying Suggestions */}
        <View style={styles.suggestionsContainer}>
          <Text style={styles.label}>TRY SAYING</Text>
          {SUGGESTIONS.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.suggestionPill}
              onPress={() => handleManualCommand(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.violet} />
              <Text style={styles.suggestionText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
  speakerBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: overlays.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...typ.h2, fontSize: 18, color: colors.white },
  scroll: { paddingHorizontal: 20, paddingBottom: 60, gap: 16 },
  micSection: { alignItems: 'center', paddingVertical: 24 },
  micButton: {
    width: 90,
    height: 90,
    borderRadius: radii.full,
    backgroundColor: colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.violet,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  micButtonRecording: {
    backgroundColor: colors.rose,
    shadowColor: colors.rose,
  },
  micStatus: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSoft,
  },
  resultCard: { padding: 18, borderRadius: radii.xl, gap: 10 },
  transcriptLabel: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 1 },
  transcriptText: { fontSize: 16, fontWeight: '600', color: colors.white, fontStyle: 'italic' },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: tint(colors.emerald, 0.12),
    padding: 12,
    borderRadius: radii.md,
    marginTop: 4,
  },
  successText: { fontSize: 13, color: colors.emerald, fontWeight: '600', flex: 1 },
  infoBox: {
    backgroundColor: overlays.mid,
    padding: 12,
    borderRadius: radii.md,
    marginTop: 4,
  },
  infoText: { fontSize: 13, color: colors.textSoft, lineHeight: 18 },
  confirmBox: {
    backgroundColor: tint(colors.amber, 0.12),
    borderWidth: 1,
    borderColor: tint(colors.amber, 0.3),
    padding: 14,
    borderRadius: radii.lg,
    marginTop: 4,
    gap: 6,
  },
  confirmTitle: { fontSize: 12, fontWeight: '800', color: colors.amber },
  confirmPreview: { fontSize: 14, fontWeight: '700', color: colors.white },
  confirmBtnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  confirmCancel: { flex: 1, paddingVertical: 8, borderRadius: radii.md, backgroundColor: overlays.mid, alignItems: 'center' },
  confirmCancelText: { fontSize: 12, color: colors.textSoft, fontWeight: '600' },
  confirmOk: { flex: 1, paddingVertical: 8, borderRadius: radii.md, backgroundColor: colors.violet, alignItems: 'center' },
  confirmOkText: { fontSize: 12, color: colors.white, fontWeight: '700' },
  textInputCard: { padding: 16, borderRadius: radii.lg },
  label: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 1, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  textInput: {
    flex: 1,
    backgroundColor: overlays.mid,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.white,
    fontSize: 14,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionsContainer: { gap: 8 },
  suggestionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: overlays.soft,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.lg,
  },
  suggestionText: { fontSize: 13, color: colors.textSoft },
  navigateBox: {
    backgroundColor: tint(colors.violet, 0.15),
    borderWidth: 1,
    borderColor: tint(colors.violet, 0.35),
    borderRadius: radii.lg,
    padding: 14,
    marginTop: 6,
    gap: 12,
  },
  navigateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navigateText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
    flex: 1,
  },
  navigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.violet,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  navigateBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
  userCardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: tint(colors.sky, 0.12),
    borderWidth: 1,
    borderColor: tint(colors.sky, 0.3),
    borderRadius: radii.lg,
    padding: 12,
    marginTop: 4,
  },
  userCardName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  userCardSub: {
    fontSize: 12,
    color: colors.textSoft,
    marginTop: 2,
  },
});
