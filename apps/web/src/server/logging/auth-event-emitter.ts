import "server-only";

import type { AuthEvent, AuthEventEmitter } from "@auth-core";

function serializeEvent(event: AuthEvent) {
  return {
    ...event,
    at: event.at.toISOString(),
  };
}

export const authEventEmitter: AuthEventEmitter = {
  emit(event) {
    const payload = serializeEvent(event);
    if (event.type === "auth.login.failed") {
      console.warn("auth_event", payload);
      return;
    }
    console.info("auth_event", payload);
  },
};

