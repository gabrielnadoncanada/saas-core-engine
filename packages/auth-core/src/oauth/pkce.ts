import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

const BASE64URL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function base64urlFromBytes(bytes: Uint8Array): string {
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

export function codeChallengeS256(codeVerifier: string): string {
  const bytes = new TextEncoder().encode(codeVerifier);
  const digest = sha256(bytes);
  return base64urlFromBytes(digest);
}

// For authorization-code flows, a nonce derived from PKCE verifier lets us
// validate ID tokens without persisting extra server-side state.
export function oidcNonceFromCodeVerifier(codeVerifier: string): string {
  return codeChallengeS256(codeVerifier);
}

export function sha256Hex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  return bytesToHex(sha256(bytes));
}
