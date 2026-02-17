import { randomBytes } from "@noble/hashes/utils";

const BASE64URL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function base64UrlEncode(bytes: Uint8Array): string {
  let out = "";
  let i = 0;

  while (i + 2 < bytes.length) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8) | bytes[i + 2]!;
    out += BASE64URL_ALPHABET[(n >>> 18) & 63];
    out += BASE64URL_ALPHABET[(n >>> 12) & 63];
    out += BASE64URL_ALPHABET[(n >>> 6) & 63];
    out += BASE64URL_ALPHABET[n & 63];
    i += 3;
  }

  const remaining = bytes.length - i;
  if (remaining === 1) {
    const n = bytes[i]!;
    out += BASE64URL_ALPHABET[(n >>> 2) & 63];
    out += BASE64URL_ALPHABET[(n & 0b11) << 4];
  } else if (remaining === 2) {
    const n = (bytes[i]! << 8) | bytes[i + 1]!;
    out += BASE64URL_ALPHABET[(n >>> 10) & 63];
    out += BASE64URL_ALPHABET[(n >>> 4) & 63];
    out += BASE64URL_ALPHABET[(n & 0b1111) << 2];
  }

  return out;
}

export function randomTokenBase64Url(byteLength = 32): string {
  const bytes = randomBytes(byteLength);
  return base64UrlEncode(bytes);
}
