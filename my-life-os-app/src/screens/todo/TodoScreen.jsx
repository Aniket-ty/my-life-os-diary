// At top
import { useRef } from 'react';
import FloatingAIButton from '../../components/ai/FloatingAIButton';
import GlobalAISheet from '../../components/ai/GlobalAISheet';
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  StatusBar, RefreshControl, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useTodoStore } from '../../stores/todoStore';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';

const PRIORITIES = ['low', 'medium', 'high'];
const PRIORITY_COLORS = { low: '#2ecc71', medium: '#f39c12', high: '#e74c3c' };
const CATEGORIES = ['fitness', 'health', 'work', 'personal', 'other'];

export default function TodoScreen() {
  const { todos, loading, fetchTodos, createTodo, deleteTodo, completeTodo, uncompleteTodo } = useTodoStore();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('personal');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchTodos(); }, []);
  const aiSheetRef = useRef(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTodos();
    setRefreshing(false);
  };

  const handleCreate = async () => {
    if (!title.trim()) return Alert.alert('Required', 'Please enter a task title.');
    setSaving(true);
    try {
      await createTodo({ title: title.trim(), description: description.trim() || null, priority, category });
      setTitle(''); setDescription(''); setPriority('medium'); setCategory('personal');
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (todo) => {
    if (todo.isCompleted) await uncompleteTodo(todo.id);
    else await completeTodo(todo.id);
  };

  const confirmDelete = (id) => {
    Alert.alert('Delete Task', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTodo(id) },
    ]);
  };

  const filtered = todos.filter((t) => {
    if (filter === 'active') return !t.isCompleted;
    if (filter === 'done') return t.isCompleted;
    if (CATEGORIES.includes(filter)) return t.category === filter;
    return true;
  });

  const pending = todos.filter((t) => !t.isCompleted).length;

  const renderTodo = ({ item }) => (
    <TouchableOpacity
      style={[styles.todoCard, item.isCompleted && styles.todoCardDone]}
      onLongPress={() => confirmDelete(item.id)}
      activeOpacity={0.85}
    >
      {/* Priority strip */}
      <View style={[styles.priorityStrip, { backgroundColor: PRIORITY_COLORS[item.priority] }]} />

      <View style={styles.todoContent}>
        {/* Checkbox */}
        <TouchableOpacity style={styles.checkbox} onPress={() => handleToggle(item)}>
          <View style={[styles.checkCircle, item.isCompleted && styles.checkCircleDone]}>
            {item.isCompleted && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
        </TouchableOpacity>

        <View style={styles.todoText}>
          <Text style={[styles.todoTitle, item.isCompleted && styles.todoTitleDone]}>
            {item.title}
          </Text>
          {item.description ? (
            <Text style={styles.todoDesc} numberOfLines={1}>{item.description}</Text>
          ) : null}
          <View style={styles.todoMeta}>
            {item.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
            )}
            {item.dueDate && (
              <Text style={styles.dueDate}>
                📅 {moment(item.dueDate).format('MMM D')}
              </Text>
            )}
            {item.isRecurring && (
              <Text style={styles.recurBadge}>🔁 {item.recurPattern}</Text>
            )}
          </View>
        </View>

        <TouchableOpacity onPress={() => confirmDelete(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="trash-outline" size={16} color="#333" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>To-Do</Text>
          <Text style={styles.headerSub}>{pending} task{pending !== 1 ? 's' : ''} remaining</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {['all', 'active', 'done', ...CATEGORIES].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderTodo}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3498db" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>✅</Text>
            <Text style={styles.emptyText}>All clear!</Text>
            <Text style={styles.emptySubText}>Tap + to add a new task</Text>
          </View>
        }
      />

      {/* Add Task Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Task</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Task title *"
              placeholderTextColor="#555"
              value={title}
              onChangeText={setTitle}
              autoFocus
            />
            <TextInput
              style={[styles.modalInput, { minHeight: 60 }]}
              placeholder="Description (optional)"
              placeholderTextColor="#555"
              value={description}
              onChangeText={setDescription}
              multiline
            />

            {/* Priority */}
            <Text style={styles.modalLabel}>Priority</Text>
            <View style={styles.priorityRow}>
              {PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.priorityBtn, priority === p && { borderColor: PRIORITY_COLORS[p], backgroundColor: PRIORITY_COLORS[p] + '22' }]}
                  onPress={() => setPriority(p)}
                >
                  <Text style={[styles.priorityBtnText, priority === p && { color: PRIORITY_COLORS[p] }]}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Category */}
            <Text style={styles.modalLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.categoryBtn, category === c && styles.categoryBtnActive]}
                  onPress={() => setCategory(c)}
                >
                  <Text style={[styles.categoryBtnText, category === c && styles.categoryBtnTextActive]}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.createBtnText}>Add Task</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <FloatingAIButton onPress={() => aiSheetRef.current?.expand()} />
<GlobalAISheet sheetRef={aiSheetRef} context="todo" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, backgroundColor: '#1a1a2e',
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 13, color: '#3498db', marginTop: 2 },
  addBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#3498db', alignItems: 'center', justifyContent: 'center',
  },
  filterScroll: { paddingHorizontal: 16, paddingVertical: 12, maxHeight: 52 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
    backgroundColor: '#1a1a2e', marginRight: 8, borderWidth: 1, borderColor: '#2a2a3e',
  },
  filterChipActive: { backgroundColor: '#3498db', borderColor: '#3498db' },
  filterText: { fontSize: 13, color: '#666', fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 4 },
  todoCard: {
    backgroundColor: '#1a1a2e', borderRadius: 14, marginBottom: 10,
    flexDirection: 'row', overflow: 'hidden',
    borderWidth: 1, borderColor: '#2a2a3e',
  },
  todoCardDone: { opacity: 0.5 },
  priorityStrip: { width: 4 },
  todoContent: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  checkbox: { padding: 2 },
  checkCircle: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: '#3a3a5a',
    alignItems: 'center', justifyContent: 'center',
  },
  checkCircleDone: { backgroundColor: '#3498db', borderColor: '#3498db' },
  todoText: { flex: 1 },
  todoTitle: { fontSize: 15, fontWeight: '600', color: '#fff', marginBottom: 2 },
  todoTitleDone: { textDecorationLine: 'line-through', color: '#555' },
  todoDesc: { fontSize: 12, color: '#555', marginBottom: 4 },
  todoMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  categoryBadge: { backgroundColor: '#2a2a3e', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  categoryText: { fontSize: 10, color: '#888', textTransform: 'capitalize' },
  dueDate: { fontSize: 11, color: '#888' },
  recurBadge: { fontSize: 11, color: '#888' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#444', marginBottom: 6 },
  emptySubText: { fontSize: 13, color: '#333' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  modal: {
    backgroundColor: '#1a1a2e', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  modalInput: {
    backgroundColor: '#0f0f1a', borderRadius: 10, padding: 14,
    color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#2a2a3e', marginBottom: 12,
  },
  modalLabel: { fontSize: 12, color: '#888', fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' },
  priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  priorityBtn: {
    flex: 1, padding: 10, borderRadius: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#2a2a3e',
  },
  priorityBtnText: { fontSize: 13, color: '#666', fontWeight: '600' },
  categoryBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#0f0f1a', marginRight: 8, borderWidth: 1, borderColor: '#2a2a3e',
  },
  categoryBtnActive: { backgroundColor: '#3498db22', borderColor: '#3498db' },
  categoryBtnText: { fontSize: 13, color: '#666', fontWeight: '600' },
  categoryBtnTextActive: { color: '#3498db' },
  createBtn: {
    backgroundColor: '#3498db', borderRadius: 12, padding: 16, alignItems: 'center',
  },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
