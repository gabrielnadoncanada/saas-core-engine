import "server-only";

import { toIso, toIsoOrNull } from "./convert";

import type {
  InvitationSummary,
  InvitationSummaryWire,
  MembershipSummary,
  MembershipSummaryWire,
  OrganizationSummary,
  OrganizationSummaryWire,
} from "@contracts";

export function organizationToWire(o: OrganizationSummary): OrganizationSummaryWire {
  return {
    id: o.id,
    name: o.name,
    createdAt: toIso(o.createdAt),
  };
}

export function membershipToWire(m: MembershipSummary): MembershipSummaryWire {
  return {
    id: m.id,
    userId: m.userId,
    organizationId: m.organizationId,
    role: m.role,
    createdAt: toIso(m.createdAt),
  };
}

export function invitationToWire(i: InvitationSummary): InvitationSummaryWire {
  return {
    id: i.id,
    organizationId: i.organizationId,
    email: i.email,
    role: i.role,
    createdAt: toIso(i.createdAt),
    expiresAt: toIso(i.expiresAt),
    acceptedAt: toIsoOrNull(i.acceptedAt),
  };
}
