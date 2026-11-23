/** Milliseconds for a course's `createdOn` (Firestore Timestamp, {seconds}, Date or string). */
export function getCreatedMillis(createdOn) {
  if (!createdOn) return 0;
  if (typeof createdOn?.toMillis === 'function') return createdOn.toMillis();
  if (typeof createdOn?.seconds === 'number') return createdOn.seconds * 1000;
  const parsed = new Date(createdOn).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Newest first, without mutating the input. */
export function sortNewestFirst(courses) {
  return [...courses].sort((a, b) => getCreatedMillis(b?.createdOn) - getCreatedMillis(a?.createdOn));
}
