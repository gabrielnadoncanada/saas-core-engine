"use client";

import type { MembershipRole } from "@contracts";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type OrgOption = {
  organizationId: string;
  name: string;
  role: MembershipRole;
};

type OrgListResponse = {
  ok: boolean;
  activeOrganizationId?: string;
  organizations?: OrgOption[];
};

export function OrgSwitcher() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/org/list", { cache: "no-store" });
        const json = (await res.json()) as OrgListResponse;
        const organizations = json.organizations ?? [];

        setOrgs(organizations);
        const selectedId = json.activeOrganizationId ?? organizations[0]?.organizationId ?? "";
        setActiveOrgId(selectedId);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function onSwitch(nextOrgId: string) {
    if (!nextOrgId || nextOrgId === activeOrgId) return;

    setIsSwitching(true);
    try {
      const res = await fetch("/api/org/switch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ organizationId: nextOrgId }),
      });

      if (!res.ok) return;

      setActiveOrgId(nextOrgId);
      router.refresh();
    } finally {
      setIsSwitching(false);
    }
  }

  if (isLoading || orgs.length <= 1) return null;

  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="hidden sm:inline">Workspace</span>
      <select
        className="h-9 rounded-xl border bg-background px-3 text-sm text-foreground"
        value={activeOrgId}
        disabled={isSwitching}
        onChange={(event) => {
          void onSwitch(event.target.value);
        }}
      >
        {orgs.map((org) => (
          <option key={org.organizationId} value={org.organizationId}>
            {org.name}
          </option>
        ))}
      </select>
    </label>
  );
}
