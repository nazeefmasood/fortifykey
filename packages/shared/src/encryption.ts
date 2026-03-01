import type { EncryptedField } from "./types";

/**
 * Derive a 256-bit AES key from master password using PBKDF2.
 */
export async function deriveKey(
  masterPassword: string,
  salt: Uint8Array,
  iterations: number = 600_000
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(masterPassword),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true, // extractable for vault key wrapping
    ["encrypt", "decrypt"]
  );
}

/**
 * Generate a random 256-bit vault key.
 */
export async function generateVaultKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt the vault key with the master-derived key.
 */
export async function encryptVaultKey(
  vaultKey: CryptoKey,
  masterKey: CryptoKey
): Promise<EncryptedField> {
  const rawVaultKey = await crypto.subtle.exportKey("raw", vaultKey);
  return encrypt(new Uint8Array(rawVaultKey), masterKey);
}

/**
 * Decrypt the vault key using the master-derived key.
 */
export async function decryptVaultKey(
  encryptedVaultKey: EncryptedField,
  masterKey: CryptoKey
): Promise<CryptoKey> {
  const rawBytes = await decryptToBytes(encryptedVaultKey, masterKey);
  return crypto.subtle.importKey(
    "raw",
    rawBytes.buffer as ArrayBuffer,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt a plaintext string with AES-256-GCM.
 */
export async function encryptString(
  plaintext: string,
  key: CryptoKey
): Promise<EncryptedField> {
  const encoded = new TextEncoder().encode(plaintext);
  return encrypt(encoded, key);
}

/**
 * Decrypt an EncryptedField back to a string.
 */
export async function decryptString(
  encrypted: EncryptedField,
  key: CryptoKey
): Promise<string> {
  const bytes = await decryptToBytes(encrypted, key);
  return new TextDecoder().decode(bytes);
}

/**
 * Encrypt a JSON-serializable payload (for vault items).
 */
export async function encryptPayload(
  payload: unknown,
  key: CryptoKey
): Promise<EncryptedField> {
  const json = JSON.stringify(payload);
  return encryptString(json, key);
}

/**
 * Decrypt an EncryptedField back to a parsed JSON payload.
 */
export async function decryptPayload<T>(
  encrypted: EncryptedField,
  key: CryptoKey
): Promise<T> {
  const json = await decryptString(encrypted, key);
  return JSON.parse(json) as T;
}

/**
 * Generate a random salt for PBKDF2.
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Convert Uint8Array to base64 string.
 */
export function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Convert base64 string to Uint8Array.
 */
export function fromBase64(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

// ===== Internal helpers =====

async function encrypt(
  data: Uint8Array,
  key: CryptoKey
): Promise<EncryptedField> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    data.buffer as ArrayBuffer
  );

  return {
    ct: toBase64(new Uint8Array(cipherBuffer)),
    iv: toBase64(iv),
    v: 1,
  };
}

async function decryptToBytes(
  encrypted: EncryptedField,
  key: CryptoKey
): Promise<Uint8Array> {
  const iv = fromBase64(encrypted.iv);
  const cipherBytes = fromBase64(encrypted.ct);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    cipherBytes.buffer as ArrayBuffer
  );

  return new Uint8Array(decrypted);
}
