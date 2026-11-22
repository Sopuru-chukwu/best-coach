import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import React, { useRef, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import Colors from '../../constant/Colors';
import { askCoach } from '../../config/AiModel';
import { useTheme } from '../../context/ThemeContext';

const QUICK_PROMPTS = [
  'Explain this more simply',
  'Give me another real-world example',
  'Why does this matter?',
  'Quiz me on this section',
];

export default function AskCoachModal({
  visible,
  onClose,
  courseTitle,
  chapterName,
  currentLesson,
  level,
  style,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const { colors } = useTheme();
  const scrollRef = useRef(null);

  const sendQuestion = async (questionText) => {
    const trimmed = questionText.trim();
    if (!trimmed || sending) return;

    const nextHistory = [...messages, { role: 'user', text: trimmed }];
    setMessages(nextHistory);
    setInput('');
    setSending(true);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const reply = await askCoach({
        courseTitle,
        chapterName,
        currentLesson,
        level,
        style,
        chatHistory: messages,
        userQuestion: trimmed,
      });

      setMessages((prev) => [...prev, { role: 'coach', text: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'coach',
          text: `Sorry, I couldn't respond right now (${err?.message || 'network error'}). Please try again.`,
        },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Ask Coach</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
              {currentLesson?.topic || chapterName || courseTitle}
            </Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.chatArea}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="sparkles" size={32} color={colors.primary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Stuck or curious about this section?
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                Ask a follow-up question or tap a quick prompt below.
              </Text>
              <View style={styles.quickList}>
                {QUICK_PROMPTS.map((q) => (
                  <Pressable
                    key={q}
                    style={[
                      styles.quickChip,
                      { borderColor: colors.primary, backgroundColor: colors.primarySoft },
                    ]}
                    onPress={() => sendQuestion(q)}
                  >
                    <Text style={[styles.quickChipText, { color: colors.primary }]}>{q}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {messages.map((msg, idx) => (
            <View
              key={idx}
              style={[
                styles.bubble,
                msg.role === 'user'
                  ? [styles.userBubble, { backgroundColor: colors.primary }]
                  : [styles.coachBubble, { backgroundColor: colors.cardAlt }],
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  msg.role === 'user'
                    ? styles.userText
                    : { color: colors.text },
                ]}
              >
                {msg.text}
              </Text>
            </View>
          ))}

          {sending && (
            <View
              style={[
                styles.bubble,
                styles.coachBubble,
                { backgroundColor: colors.cardAlt, flexDirection: 'row', gap: 8, alignItems: 'center' },
              ]}
            >
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.bubbleText, { color: colors.text }]}>Coach is thinking...</Text>
            </View>
          )}
        </ScrollView>

        <View
          style={[
            styles.inputBar,
            { borderTopColor: colors.border, backgroundColor: colors.background },
          ]}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask your coach anything about this lesson..."
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              {
                borderColor: colors.border,
                backgroundColor: colors.inputBg,
                color: colors.text,
              },
            ]}
            multiline
            maxLength={500}
            editable={!sending}
          />
          <Pressable
            onPress={() => sendQuestion(input)}
            disabled={sending || !input.trim()}
            style={[
              styles.sendBtn,
              { backgroundColor: colors.primary },
              (!input.trim() || sending) && { opacity: 0.45 },
            ]}
          >
            <Ionicons name="send" size={20} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.WHITE,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontFamily: 'outfit-bold',
    fontSize: 22,
    color: Colors.BLACK,
  },
  headerSubtitle: {
    fontFamily: 'outfit',
    fontSize: 14,
    color: Colors.GRAY,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  chatArea: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 24,
  },
  emptyTitle: {
    fontFamily: 'outfit-bold',
    fontSize: 19,
    marginTop: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'outfit',
    fontSize: 15,
    color: Colors.GRAY,
    textAlign: 'center',
    marginTop: 4,
  },
  quickList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
  },
  quickChip: {
    borderWidth: 1,
    borderColor: Colors.PRIMARY,
    borderRadius: 99,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#f0f7ff',
  },
  quickChipText: {
    fontFamily: 'outfit',
    fontSize: 14,
    color: Colors.PRIMARY,
  },
  bubble: {
    maxWidth: '88%',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.PRIMARY,
    borderBottomRightRadius: 4,
  },
  coachBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.BG_GRAY,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontFamily: 'outfit',
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: Colors.WHITE,
  },
  coachText: {
    color: Colors.BLACK,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: Colors.WHITE,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: 'outfit',
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: Colors.PRIMARY,
    padding: 12,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
