import React from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AttachmentStrip({ attachments, onRemove, pending = false }) {
  return (
    <View style={styles.container}>
      {/* Paperclip icon */}
      <View style={styles.clipRow}>
        <Ionicons name="attach" size={14} color="#8B7355" />
        <Text style={styles.clipLabel}>Attached</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {attachments.map((att, index) => (
          <View key={index} style={styles.attachItem}>
            {/* Paperclip visual */}
            <View style={styles.paperclip}>
              <View style={styles.paperclipInner} />
            </View>

            {att.type === 'photo' && att.preview ? (
              <Image source={{ uri: att.preview || att.cloudinaryUrl }} style={styles.thumbImage} />
            ) : att.type === 'photo' && att.cloudinaryUrl ? (
              <Image source={{ uri: att.cloudinaryUrl }} style={styles.thumbImage} />
            ) : (
              <View style={styles.thumbGeneric}>
                <Ionicons
                  name={att.type === 'audio' ? 'musical-notes' : att.type === 'video' ? 'videocam' : 'document'}
                  size={22}
                  color="#8B7355"
                />
                <Text style={styles.thumbLabel} numberOfLines={1}>
                  {att.type === 'audio' ? 'Audio' : att.type === 'video' ? 'Video' : 'File'}
                </Text>
              </View>
            )}

            {/* Remove button (only when pending / editing) */}
            {onRemove && (
              <TouchableOpacity style={styles.removeBtn} onPress={() => onRemove(index)}>
                <Ionicons name="close-circle" size={16} color="#e74c3c" />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e8dcc8',
    paddingTop: 12,
  },
  clipRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8,
  },
  clipLabel: { fontSize: 11, color: '#8B7355', fontWeight: '600', letterSpacing: 0.5 },

  attachItem: { marginRight: 12, alignItems: 'center', position: 'relative' },

  // Paperclip decoration
  paperclip: {
    width: 14, height: 28,
    borderWidth: 2, borderColor: '#c8a96e',
    borderRadius: 7, marginBottom: -8,
    alignSelf: 'center', zIndex: 2,
    backgroundColor: '#fffef5',
  },
  paperclipInner: {
    width: 6, height: 16,
    borderWidth: 2, borderColor: '#c8a96e',
    borderRadius: 3, margin: 2,
    backgroundColor: 'transparent',
  },

  thumbImage: {
    width: 72, height: 72,
    borderRadius: 6,
    borderWidth: 1, borderColor: '#e8dcc8',
  },
  thumbGeneric: {
    width: 72, height: 72,
    borderRadius: 6,
    backgroundColor: '#f5edd8',
    borderWidth: 1, borderColor: '#e8dcc8',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  thumbLabel: { fontSize: 10, color: '#8B7355' },
  removeBtn: {
    position: 'absolute', top: 20, right: -6, zIndex: 3,
    backgroundColor: '#fff', borderRadius: 10,
  },
});
