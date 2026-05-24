import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useAIStore } from '../../stores/aiStore';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';

const SUGGESTIONS = [
  'How many calories in 100g chicken breast?',
  'What muscles does bench press work?',
  'Give me a 3-day workout plan',
  'Best foods for muscle gain?',
];

export default function AIChatScreen({ navigation }) {
  const { messages, loading, pendingAction, sendMessage, confirmAction, dismissAction, clearChat } = useAIStore();
  const [input, setInput] = useState('');
  const flatListRef = useRef(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    await sendMessage(text);
  };

  const handleConfirmAction = async () => {
    const ok = await confirmAction(pendingAction);
    const type = pendingAction?.type;
    if (ok) {
      Alert.alert(
        '✅ Done!',
        type === 'log_food' ? 'Food added to your nutrition log!' : 'Workout added to your journal!'
      );
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Ionicons name="sparkles" size={14} color="#9b59b6" />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
            {item.content}
          </Text>
          <Text style={[styles.bubbleTime, isUser && styles.bubbleTimeUser]}>
            {moment(item.createdAt).format('HH:mm')}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.aiDot} />
          <View>
            <Text style={styles.headerTitle}>AI Assistant</Text>
            <Text style={styles.headerSub}>Fitness & Nutrition Coach</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => Alert.alert('Clear Chat', 'Clear all messages?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Clear', style: 'destructive', onPress: clearChat },
          ])}
        >
          <Ionicons name="trash-outline" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      {messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyAvatar}>
            <Ionicons name="sparkles" size={32} color="#9b59b6" />
          </View>
          <Text style={styles.emptyTitle}>Your AI Fitness Coach</Text>
          <Text style={styles.emptySubText}>Ask me anything about food, exercises, or your health goals</Text>
          <View style={styles.suggestions}>
            {SUGGESTIONS.map((s) => (
              <TouchableOpacity key={s} style={styles.suggestionChip} onPress={() => { setInput(s); }}>
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {/* Typing indicator */}
      {loading && (
        <View style={styles.typingRow}>
          <View style={styles.aiAvatar}>
            <Ionicons name="sparkles" size={14} color="#9b59b6" />
          </View>
          <View style={styles.typingBubble}>
            <ActivityIndicator size="small" color="#9b59b6" />
            <Text style={styles.typingText}>Thinking...</Text>
          </View>
        </View>
      )}

      {/* Action card — AI wants to log something */}
      {pendingAction && (
        <View style={styles.actionCard}>
          <View style={styles.actionCardHeader}>
            <Ionicons name="add-circle" size={18} color="#2ecc71" />
            <Text style={styles.actionCardTitle}>
              {pendingAction.type === 'log_food' ? '🥗 Add to Nutrition Log?' : '💪 Add to Workout Journal?'}
            </Text>
          </View>
          {pendingAction.type === 'log_food' && (
            <Text style={styles.actionCardDetail}>
              {pendingAction.data?.foodName} — {pendingAction.data?.calories} kcal
              {pendingAction.data?.proteinG ? ` · ${pendingAction.data.proteinG}g protein` : ''}
            </Text>
          )}
          {pendingAction.type === 'add_workout' && (
            <Text style={styles.actionCardDetail}>
              {pendingAction.data?.workoutName} · {pendingAction.data?.exercises?.length} exercise(s)
            </Text>
          )}
          <View style={styles.actionBtns}>
            <TouchableOpacity style={styles.actionDismiss} onPress={dismissAction}>
              <Text style={styles.actionDismissText}>Not now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionConfirm} onPress={handleConfirmAction}>
              <Text style={styles.actionConfirmText}>✅ Add it</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Ask about food, exercises..."
          placeholderTextColor="#555"
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || loading}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    backgroundColor: '#1a1a2e', borderBottomWidth: 1, borderBottomColor: '#2a2a3e',
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2a1040', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#9b59b6' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 11, color: '#9b59b6' },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  emptyAvatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#2a1040', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16, borderWidth: 2, borderColor: '#9b59b6',
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8 },
  emptySubText: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  suggestions: { gap: 8, width: '100%' },
  suggestionChip: {
    backgroundColor: '#1a1a2e', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#2a2a3e',
  },
  suggestionText: { color: '#9b59b6', fontSize: 13, fontWeight: '500' },

  messageList: { padding: 16, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12, gap: 8 },
  msgRowUser: { flexDirection: 'row-reverse' },
  aiAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#2a1040', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#9b59b6',
  },
  bubble: {
    maxWidth: '75%', borderRadius: 18, padding: 12,
    backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2a2a3e',
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: '#9b59b6', borderColor: '#9b59b6',
    borderBottomLeftRadius: 18, borderBottomRightRadius: 4,
  },
  bubbleText: { fontSize: 14, color: '#ddd', lineHeight: 20 },
  bubbleTextUser: { color: '#fff' },
  bubbleTime: { fontSize: 10, color: '#555', marginTop: 4, textAlign: 'right' },
  bubbleTimeUser: { color: '#ddb8ff' },

  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  typingBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1a1a2e', borderRadius: 18, padding: 12,
    borderWidth: 1, borderColor: '#2a2a3e',
  },
  typingText: { color: '#666', fontSize: 13 },

  actionCard: {
    margin: 12, backgroundColor: '#0d2818', borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: '#2ecc71',
  },
  actionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  actionCardTitle: { fontSize: 14, fontWeight: '700', color: '#2ecc71' },
  actionCardDetail: { fontSize: 13, color: '#aaa', marginBottom: 12 },
  actionBtns: { flexDirection: 'row', gap: 10 },
  actionDismiss: {
    flex: 1, padding: 10, borderRadius: 10, alignItems: 'center',
    backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2a2a3e',
  },
  actionDismissText: { color: '#666', fontWeight: '600' },
  actionConfirm: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center', backgroundColor: '#2ecc71' },
  actionConfirmText: { color: '#000', fontWeight: '700' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#1a1a2e', borderTopWidth: 1, borderTopColor: '#2a2a3e',
    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
  },
  input: {
    flex: 1, backgroundColor: '#0f0f1a', borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10,
    color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#2a2a3e',
    maxHeight: 100,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#9b59b6', alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#2a2a3e' },
});
