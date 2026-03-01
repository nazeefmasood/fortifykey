// Schema & DB instance
export { db, FortifyKeyDB } from "./schema";
export type {
  LocalVaultItem,
  LocalCategory,
  LocalSyncQueue,
  LocalMetadata,
} from "./schema";

// Sync
export { pushChanges, pullChanges, initialSync } from "./sync";

// Realtime
export {
  startRealtimeSync,
  stopRealtimeSync,
} from "./realtime";
export type { VaultItemChange } from "./realtime";

// Echo guard
export { markLocalWrite, isEcho } from "./echo-guard";
