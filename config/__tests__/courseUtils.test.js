import { getCreatedMillis, sortNewestFirst } from '../courseUtils';

describe('getCreatedMillis', () => {
  it('handles Firestore timestamps, {seconds}, dates and strings', () => {
    expect(getCreatedMillis({ toMillis: () => 42 })).toBe(42);
    expect(getCreatedMillis({ seconds: 2 })).toBe(2000);
    expect(getCreatedMillis(new Date(5))).toBe(5);
    expect(getCreatedMillis('1970-01-01T00:00:01Z')).toBe(1000);
  });
  it('returns 0 for missing or invalid values', () => {
    expect(getCreatedMillis(null)).toBe(0);
    expect(getCreatedMillis('not a date')).toBe(0);
  });
});

describe('sortNewestFirst', () => {
  it('sorts without mutating the input', () => {
    const input = [{ id: 'a', createdOn: { seconds: 1 } }, { id: 'b', createdOn: { seconds: 3 } }, { id: 'c' }];
    expect(sortNewestFirst(input).map((c) => c.id)).toEqual(['b', 'a', 'c']);
    expect(input.map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });
});
