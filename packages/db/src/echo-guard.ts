/**
 * Echo guard: prevents processing our own writes received back via Realtime.
 */
const recentLocalWrites = new Map<string, number>();

export function markLocalWrite(itemId: string, version: number): void {
  recentLocalWrites.set(itemId, version);
  // Clean up after 5 seconds
  setTimeout(() => recentLocalWrites.delete(itemId), 5000);
}

export function isEcho(itemId: string, version: number): boolean {
  return recentLocalWrites.get(itemId) === version;
}
