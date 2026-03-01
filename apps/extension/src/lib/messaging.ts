// Message types for extension communication

export type MessageType =
  | "UNLOCK_VAULT"
  | "LOCK_VAULT"
  | "GET_VAULT_STATE"
  | "GET_VAULT_ITEMS"
  | "GET_MATCHING_ITEMS"
  | "ADD_ITEM"
  | "FILL_CREDENTIALS"
  | "GENERATE_PASSWORD"
  | "SYNC_VAULT"
  | "CAPTURE_CREDENTIALS";

export interface Message<T = unknown> {
  type: MessageType;
  payload?: T;
}

export interface UnlockPayload {
  masterPassword: string;
}

export interface MatchingItemsPayload {
  domain: string;
}

export interface AddItemPayload {
  itemType: string;
  name: string;
  domain: string | null;
  payload: unknown;
}

export interface FillCredentialsPayload {
  itemId: string;
  tabId: number;
}

export interface GeneratePasswordPayload {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

export interface CaptureCredentialsPayload {
  url: string;
  username: string;
  password: string;
}

// Send message to service worker
export async function sendMessage<T = unknown>(
  type: MessageType,
  payload?: unknown
): Promise<T> {
  const response = await chrome.runtime.sendMessage({ type, payload });
  if (response?.error) {
    throw new Error(response.error);
  }
  return response as T;
}

// Message handler helper for service worker
export function createMessageHandler(
  handlers: Partial<Record<MessageType, (payload: unknown) => Promise<unknown>>>
) {
  return async (
    message: Message,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ) => {
    const handler = handlers[message.type];
    if (!handler) {
      sendResponse({ error: "Unknown message type" });
      return;
    }

    try {
      const result = await handler(message.payload);
      sendResponse(result);
    } catch (err) {
      sendResponse({ error: (err as Error).message });
    }

    return true; // Keep channel open for async response
  };
}
