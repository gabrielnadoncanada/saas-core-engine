import { randomBytes } from "@noble/hashes/utils";

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function randomTokenBase64Url(byteLength = 32): string {
  const bytes = randomBytes(byteLength);
  return base64UrlEncode(bytes);
}