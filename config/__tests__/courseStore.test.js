jest.mock('../firebaseConfig', () => ({ db: {} }));

const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'col'),
  doc: jest.fn((_db, _col, id) => ({ id })),
  getDoc: (...args) => mockGetDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  query: jest.fn(() => 'q'),
  where: jest.fn(),
}));

const mockLoadCached = jest.fn();
const mockSaveCached = jest.fn();
jest.mock('../offlineCache', () => ({
  loadCachedCourses: (...args) => mockLoadCached(...args),
  saveCachedCourses: (...args) => mockSaveCached(...args),
}));

const store = require('../courseStore');

beforeEach(() => {
  store.__resetCourseStoreForTests();
  jest.clearAllMocks();
});

describe('courseRouteParams', () => {
  it('caches the course and returns only its id', () => {
    const course = { docId: 'abc', courseTitle: 'T' };
    expect(store.courseRouteParams(course)).toEqual({ courseId: 'abc' });
    expect(store.getCachedCourse('abc')).toBe(course);
  });
});

describe('updateCachedCourse', () => {
  it('merges a patch and notifies subscribers', () => {
    store.rememberCourse({ docId: 'a', completedChapter: [0] });
    const listener = jest.fn();
    store.subscribeToCourses(listener);
    store.updateCachedCourse('a', (prev) => ({ completedChapter: [...prev.completedChapter, 1] }));
    expect(store.getCachedCourse('a').completedChapter).toEqual([0, 1]);
    expect(listener).toHaveBeenCalledWith('a');
  });
  it('ignores unknown courses', () => {
    expect(store.updateCachedCourse('missing', { x: 1 })).toBeNull();
  });
});

describe('fetchCourse', () => {
  it('loads from Firestore and caches', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true, id: 'x', data: () => ({ courseTitle: 'X' }) });
    expect(await store.fetchCourse('x')).toEqual({ courseTitle: 'X', docId: 'x' });
    expect(store.getCachedCourse('x').courseTitle).toBe('X');
  });
  it('returns null when missing', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    expect(await store.fetchCourse('nope')).toBeNull();
  });
});

describe('fetchMyCourses', () => {
  it('returns newest first and saves offline', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'old', data: () => ({ createdOn: { seconds: 1 } }) },
        { id: 'new', data: () => ({ createdOn: { seconds: 9 } }) },
      ],
    });
    const { courses, fromCache } = await store.fetchMyCourses('me@x.com');
    expect(courses.map((c) => c.docId)).toEqual(['new', 'old']);
    expect(fromCache).toBe(false);
    expect(mockSaveCached).toHaveBeenCalledWith('me@x.com', courses);
    expect(store.getCachedCourse('new')).toBeTruthy();
  });

  it('falls back to the offline copy', async () => {
    mockGetDocs.mockRejectedValue(new Error('offline'));
    mockLoadCached.mockResolvedValue([{ docId: 'c1' }]);
    const result = await store.fetchMyCourses('me@x.com');
    expect(result).toEqual({ courses: [{ docId: 'c1' }], fromCache: true });
  });

  it('throws when offline with no cached copy', async () => {
    mockGetDocs.mockRejectedValue(new Error('offline'));
    mockLoadCached.mockResolvedValue([]);
    await expect(store.fetchMyCourses('me@x.com')).rejects.toThrow('offline');
  });
});
