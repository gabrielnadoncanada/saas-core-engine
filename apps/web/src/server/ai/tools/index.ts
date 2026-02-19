import "server-only";

import { ToolRegistry } from "@ai-core";

import { orgGetTool } from "./tools/org.get";
import { subscriptionGetTool } from "./tools/subscription.get";
import { usersListTool } from "./tools/users.list";

export function buildToolRegistry() {
  const r = new ToolRegistry();
  r.register(orgGetTool);
  r.register(subscriptionGetTool);
  r.register(usersListTool);
  return r;
}
