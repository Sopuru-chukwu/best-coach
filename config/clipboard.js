import { Share } from 'react-native';

export async function copyOrShareText(text, title = 'Code Snippet') {
  if (!text) return 'empty';
  try {
    if (typeof navigator !== 'undefined' && navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return 'copied';
    }
  } catch {
    // Fall through to native share sheet
  }

  try {
    await Share.share({ message: text, title });
    return 'shared';
  } catch {
    return 'failed';
  }
}
