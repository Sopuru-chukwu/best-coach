import * as Speech from 'expo-speech';

export const SPEECH_RATES = [0.85, 1.0, 1.25];

export function cleanForSpeech(text = '') {
  return String(text)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/[#*_•]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildLessonSpeechScript(lesson) {
  if (!lesson) return '';
  const parts = [];
  if (lesson.topic) parts.push(`${lesson.topic}.`);
  if (lesson.intuition) parts.push(`Intuition: ${cleanForSpeech(lesson.intuition)}.`);
  if (lesson.explain) parts.push(cleanForSpeech(lesson.explain));
  if (lesson.example) parts.push(`Worked example: ${cleanForSpeech(lesson.example)}.`);
  if (lesson.commonMistake) {
    parts.push(`Common mistake to avoid: ${cleanForSpeech(lesson.commonMistake)}.`);
  }
  if (lesson.keyTakeaway) {
    parts.push(`Key takeaway: ${cleanForSpeech(lesson.keyTakeaway)}.`);
  }
  return parts.join(' ');
}

export function stopSpeaking() {
  try {
    Speech.stop();
  } catch {
    // ignore
  }
}

export function speakText(text, { rate = 1.0, onDone, onStopped, onError } = {}) {
  const cleaned = cleanForSpeech(text);
  if (!cleaned) return;
  stopSpeaking();
  try {
    Speech.speak(cleaned, {
      language: 'en-US',
      rate,
      pitch: 1.0,
      onDone,
      onStopped,
      onError,
    });
  } catch (err) {
    onError?.(err);
  }
}
