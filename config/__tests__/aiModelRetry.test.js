jest.mock('../firebaseConfig', () => ({ auth: { currentUser: null } }));
jest.mock('expo-constants', () => ({ expoConfig: { extra: {} } }));

process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'test-key';
process.env.EXPO_PUBLIC_AI_PROXY_URL = '';

const { generateMoreFlashcards } = require('../AiModel');

function geminiReply(text) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }),
  };
}

beforeEach(() => {
  global.fetch = jest.fn();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

it('retries once when the first reply is not valid JSON', async () => {
  global.fetch
    .mockResolvedValueOnce(geminiReply('Sure! Here are your cards: {oops'))
    .mockResolvedValueOnce(geminiReply('{"flashcards":[{"front":"Q","back":"A"},{"front":"bad"}]}'));

  const cards = await generateMoreFlashcards({ courseTitle: 'T' });
  expect(cards).toEqual([{ front: 'Q', back: 'A' }]);
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

it('gives up with a friendly error after two unusable replies', async () => {
  global.fetch.mockResolvedValue(geminiReply('{"flashcards":[{"front":"only"}]}'));
  await expect(generateMoreFlashcards({ courseTitle: 'T' })).rejects.toThrow(
    'Could not generate new flashcards'
  );
  expect(global.fetch).toHaveBeenCalledTimes(2);
});
