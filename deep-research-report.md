# Audit d’implémentation AI – dépôt gabrielnadoncanada/saas-core-engine

## Executive summary

J’ai **commencé l’analyse via le connecteur GitHub (api_tool: github)**, puis j’ai parcouru le dépôt fichier par fichier (fetch) et complété avec quelques recherches ciblées (search) pour repérer les éléments AI. fileciteturn124file0L1-L1

Conclusion: **la majorité des briques AI “phase B” sont présentes** (endpoints, services, UI pages, ai-core provider, prompt registry, audit log, tools-lite, structured outputs), mais il reste des **écarts critiques** qui empêchent soit la compilation, soit le fonctionnement réel des métriques/quota:

- **/api/ai/chat est partiel et buggué**: variables hors scope, **pas de persistance AIUsage**, et **risque d’injection via role="system"** dans le payload utilisateur. fileciteturn123file0L1-L1  
- **/api/ai/tools/chain est partiel et buggué**: variable `exec` hors scope + type `Step.tool` incomplet (durationMs), ce qui casse la telemetry et/ou le build. fileciteturn123file4L1-L1  
- **Prisma schema contient les modèles AI**, mais il manque des **relations indispensables** (ex: `AIPrompt.versions`, `AIAuditLog.toolExecutions`) alors que le code les utilise. fileciteturn123file1L1-L1  
- **Migrations Prisma non commitées**: le dossier migrations contient seulement un `.gitkeep`, donc une DB neuve ne pourra pas être migrée correctement.  
- **Dependencies/config manquants/incomplets**: `packages/ai-core/package.json` et `packages/ai-core/tsconfig.json` sont **vides**, et `apps/web/package.json` ne déclare pas `recharts` ni `@ai-core` → build/typecheck risquent d’échouer.  
- **UI navigation incomplète**: route constants et sidebar n’exposent pas toutes les pages AI (ex: AI Audit / Prompts / Structured / Tools / Tools Chain).  
- **Composants UI “shadcn” absents** aux chemins importés (`apps/web/src/shared/ui/shadcn/*`) → les pages AI compilent difficilement.

## Méthodologie et périmètre de vérification

Démarche (GitHub connector, sans web):
- Découverte de la structure via `docs/folder-structure.md`.  
- Lecture (fetch) des fichiers AI “attendus”: schéma Prisma, services AI, endpoints `/api/ai/*`, package `packages/ai-core`, UI pages dashboard, composants UI AI, navigation routes/sidebar, manifests `package.json` et configs monorepo. fileciteturn3file0L1-L1

Fichiers lus (liste résumée, focus AI):
- Prisma: `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/.gitkeep`. fileciteturn123file1L1-L1  
- ai-core: `packages/ai-core/src/*` (provider/types/tools), `packages/ai-core/package.json` (vide), `packages/ai-core/tsconfig.json` (vide). fileciteturn125file2L1-L1  
- Endpoints: `apps/web/src/app/api/ai/chat|usage|audit|prompts|prompts/active|structured|tools|tools/chain`. fileciteturn123file0L1-L1  
- Server AI: `apps/web/src/server/ai/*` (policy/enforcement/quota/rate-limit/audit/prompts/tools/telemetry). fileciteturn124file0L1-L1  
- UI: pages `apps/web/src/app/(app)/dashboard/ai-*` + composants `apps/web/src/features/ai-*`.  
- Navigation: `apps/web/src/shared/constants/routes.ts`, `apps/web/src/shared/ui/layout/sidebar-nav.tsx`.  
- Dépendances: `apps/web/package.json`, `apps/web/next.config.js`, `apps/web/tsconfig.json`, root `package.json`, `turbo.json`.

Limite: certains fichiers “sensibles” (ex: `.env.example`, `apps/web/src/server/config/env.ts`) ont été bloqués par les checks du connecteur; je les marque donc **« non vérifiable »** et je donne les attentes exactes à valider.

## Cartographie fichier par fichier

### Provider abstraction et packages

| Fichier | Statut | Commentaires |
|---|---|---|
| `packages/ai-core/src/providers/openai.ts` | implemented | OpenAIProvider: `generate`, `streamEvents` avec `include_usage`, `generateStructured` via `json_schema`. fileciteturn125file2L1-L1 |
| `packages/ai-core/src/provider.ts` | implemented | Interface inclut `streamEvents` + `generateStructured`. |
| `packages/ai-core/src/types.ts` | implemented | Types `AIStreamEvent` + structured interfaces. |
| `packages/ai-core/src/tools/*` | implemented | Registry/executor/types ok. |
| `packages/ai-core/package.json` | **missing/empty** | Fichier existe mais contenu vide: package non “installable”. |
| `packages/ai-core/tsconfig.json` | **missing/empty** | Fichier existe mais contenu vide: build TS impossible. |

### Prisma (schéma + migrations)

| Fichier | Statut | Commentaires |
|---|---|---|
| `packages/db/prisma/schema.prisma` | **partial** | Modèles AI présents (AIUsage, AIRateLimitBucket, AIAuditLog, AIPrompt, AIPromptVersion, AIToolExecution) mais **relations manquantes** vs usage dans le code. fileciteturn123file1L1-L1 |
| `packages/db/prisma/migrations/` | **missing** | Seulement `.gitkeep` → aucune migration SQL committée. |

### Services AI (server)

| Fichier | Statut | Commentaires |
|---|---|---|
| `apps/web/src/server/ai/ai-policy.ts` | implemented | AI_POLICY (model+rpm+monthlyTokens) + normalizePlan. fileciteturn124file0L1-L1 |
| `apps/web/src/server/ai/ai-enforcement.ts` | implemented | Quota mensuel + RPM enforcement via AI_POLICY+rate-limit. fileciteturn124file1L1-L1 |
| `apps/web/src/server/ai/ai-rate-limit.service.ts` | implemented | DB bucket upsert + 429. |
| `apps/web/src/server/ai/ai-usage.service.ts` | partial | Utilise encore `AI_QUOTAS` (duplication) + fonction `enforceQuotaOrThrow` redondante vs ai-enforcement. |
| `apps/web/src/server/ai/ai-quota.ts` | partial | Sert de source de quota alors que AI_POLICY existe; devrait être réduit à `getMonthRange` ou lié à AI_POLICY. |
| `apps/web/src/server/ai/ai-audit.ts` | implemented | getRequestMeta ok. |
| `apps/web/src/server/ai/prompts/ai-prompts.service.ts` | **partial** | Utilise `AIPrompt.versions` (nested create) → **ne compilera pas** sans relation Prisma `versions`. |
| `apps/web/src/server/ai/tools/telemetry.ts` | implemented | time + timeout + redaction + clamp ok. |
| `apps/web/src/server/ai/tools/*` | implemented | Tools org/subscription/users + registry ok. |

### Endpoints Next.js (apps/web/src/app/api/ai/*)

| Endpoint | Statut | Commentaires |
|---|---|---|
| `/api/ai/chat` (`chat/route.ts`) | **partial (critique)** | SSE ok, enforcement ok, prompt registry ok, **mais**: variables hors scope, **pas de `AIUsage.create`**, injection via role system possible. fileciteturn123file0L1-L1 |
| `/api/ai/usage` (`usage/route.ts`) | partial | Calcule correctement daily/users, mais utilise AI_QUOTAS (pas AI_POLICY) et ne retourne pas model/rpm. |
| `/api/ai/audit` (`audit/route.ts`) | partial | Inclut `toolExecutions`… mais schema Prisma ne l’expose pas (relation manquante). fileciteturn123file2L1-L1 |
| `/api/ai/prompts` | partial | API ok, mais dépend du problème `AIPrompt.versions` côté Prisma. |
| `/api/ai/prompts/active` | partial | OK mais dépend du même problème Prisma. |
| `/api/ai/structured` | implemented | Enforcement + prompt registry + `generateStructured` + `AIUsage` + `AIAuditLog`. fileciteturn123file3L1-L1 |
| `/api/ai/tools` | implemented | Tool pick structured + exécution server + telemetry + AIUsage + audit + AIToolExecution. |
| `/api/ai/tools/chain` | **partial (critique)** | Chaining + timeline, mais bug `exec` hors scope + type tool incomplet. fileciteturn123file4L1-L1 |

### UI pages et composants AI

| Fichier | Statut | Commentaires |
|---|---|---|
| Pages `apps/web/src/app/(app)/dashboard/ai-*` | implemented | Pages existent pour AI Usage/Audit/Prompts/Structured/Tools/Tools Chain. |
| `apps/web/src/features/ai-usage/ui/ai-usage-panel.tsx` | partial | Recharts utilisé mais non déclaré dans `apps/web/package.json`. Dépend de composants UI shadcn manquants. |
| `apps/web/src/features/ai-audit/ui/ai-audit-panel.tsx` | partial | UI ok, mais dépend du endpoint audit qui dépend schema relation. |
| `apps/web/src/features/ai-prompts/ui/ai-prompts-panel.tsx` | partial | Dépend `Textarea` shadcn manquant + prompt service qui dépend relation Prisma. |
| `apps/web/src/features/ai-structured/ui/ai-structured-demo.tsx` | partial | Dépend `Textarea` shadcn manquant. |
| `apps/web/src/features/ai-tools/ui/ai-tools-demo.tsx` | partial | Dépend `Textarea` shadcn manquant. |
| `apps/web/src/features/ai-tools-chain/ui/ai-tools-chain-demo.tsx` | partial | Dépend `Textarea` shadcn manquant + endpoint chain buggué. |
| Navigation `routes.ts` + `sidebar-nav.tsx` | partial | `routes.app` manque `aiToolsChain`, sidebar n’affiche que “AI Usage”. |

## Fichiers attendus mais absents

| Fichier attendu | Statut | Raison attendue |
|---|---|---|
| `packages/db/prisma/migrations/<timestamp>_add_ai_*/migration.sql` | absent | Le repo n’a pas de migrations committées (seulement `.gitkeep`). |
| `apps/web/src/shared/ui/shadcn/button.tsx` | absent | Importé partout (AI UI + dashboard + sidebar), mais inexistant → build cassé. |
| `apps/web/src/shared/ui/shadcn/card.tsx` | absent | Idem. |
| `apps/web/src/shared/ui/shadcn/input.tsx` | absent | Utilisé par `AIChat`. |
| `apps/web/src/shared/ui/shadcn/textarea.tsx` | absent | Utilisé dans Prompts/Structured/Tools demos. |
| `apps/web/src/shared/ui/shadcn/separator.tsx` | absent | Utilisé dans la sidebar + panels. |
| `apps/web/src/shared/ui/shadcn/badge.tsx` | absent | Utilisé dans la sidebar. |
| `packages/ai-core/package.json` (contenu) | **vide** | Doit définir `name:@ai-core`, exports, scripts, deps (openai, zod...). |
| `packages/ai-core/tsconfig.json` (contenu) | **vide** | Doit être un tsconfig standard comme les autres packages. |

## Correctifs critiques avec diffs synthétiques

### Corriger Prisma: relations manquantes

Problème: `ai-prompts.service.ts` utilise `versions` en nested write et `/api/ai/audit` inclut `toolExecutions`, mais le schema Prisma ne contient pas ces champs.

**Remplacer/ajouter dans `packages/db/prisma/schema.prisma`**:

```diff
 model AIAuditLog {
   id             String   @id @default(cuid())
   organizationId String
   userId         String
@@
   @@index([organizationId, createdAt])
   @@index([userId, createdAt])
+
+  // needed for include: { toolExecutions: ... }
+  toolExecutions AIToolExecution[]
 }
@@
 model AIPrompt {
   id             String   @id @default(cuid())
   organizationId String
@@
   @@unique([organizationId, key])
   @@index([organizationId, key])
+
+  // needed for nested writes: versions: { create: ... }
+  versions AIPromptVersion[]
 }
```

### Corriger `/api/ai/chat`: persistance AIUsage + scope + injection prevention

**Symptômes actuels** (résumé):
- `promptChars` / `messageCount` utilisés dans le stream mais définis dans un scope différent → crash.
- Aucun `prisma.aIUsage.create(...)` → quota/usage dashboard faux.
- Le payload accepte `role: "system"` → l’utilisateur peut injecter un system prompt.

**Patch** (remplacer `apps/web/src/app/api/ai/chat/route.ts` par une version sécurisée; diff compact):

```diff
+import { z } from "zod";
 import { OpenAIProvider } from "@ai-core";
 import { estimateCost } from "@ai-core";
 import { prisma } from "@db";
 import { getRequestMeta } from "@/server/ai/ai-audit";
@@
 type Body = {
-  messages: { role: "system" | "user" | "assistant"; content: string }[];
+  messages: { role: "user" | "assistant"; content: string }[];
 };
+
+const BodySchema = z.object({
+  messages: z.array(
+    z.object({
+      role: z.enum(["user", "assistant"]),
+      content: z.string().min(1),
+    }),
+  ).min(1),
+});
@@
 export async function POST(req: Request) {
   const sessionUser = await getSessionUser();
   if (!sessionUser) return new Response("Unauthorized", { status: 401 });
 
-  const body = (await req.json()) as Body;
-  if (!Array.isArray(body?.messages))
-    return new Response("Invalid body", { status: 400 });
+  const raw = await req.json().catch(() => null);
+  const parsed = BodySchema.safeParse(raw);
+  if (!parsed.success) return new Response("Invalid body", { status: 400 });
+  const userMessages = parsed.data.messages;
 
+  // meta for blocked requests (no system prompt yet)
+  const blockedMeta = getRequestMeta(userMessages);
+
   let policy: {
@@
   };
   try {
-    const { messageCount, promptChars } = getRequestMeta(body.messages);
     policy = await enforceAiOrThrow(sessionUser.organizationId);
   } catch (e) {
@@
     await prisma.aIAuditLog.create({
       data: {
@@
-        promptChars,
-        messageCount,
+        promptChars: blockedMeta.promptChars,
+        messageCount: blockedMeta.messageCount,
@@
       },
     });
@@
   const provider = new OpenAIProvider(env.OPENAI_API_KEY);
   const model = policy.model;
+  const systemPrompt = await getActivePromptContent(
+    sessionUser.organizationId,
+    "chat.system",
+    DEFAULT_PROMPTS["chat.system"],
+  );
+
+  const messages = [{ role: "system" as const, content: systemPrompt }, ...userMessages];
+  const meta = getRequestMeta(messages);
 
   const encoder = new TextEncoder();
@@
       async start(controller) {
         let finalUsage: { inputTokens: number; outputTokens: number } | null =
           null;
 
         try {
-          const systemPrompt = await getActivePromptContent(
-            sessionUser.organizationId,
-            "chat.system",
-            DEFAULT_PROMPTS["chat.system"],
-          );
-
-          const messages = [
-            { role: "system" as const, content: systemPrompt },
-            ...body.messages,
-          ];
-
           const stream = provider.streamEvents({
             messages: messages,
             model,
             userId: sessionUser.id,
             orgId: sessionUser.organizationId,
           });
@@
           if (finalUsage) {
+            const cost = estimateCost(model, finalUsage.inputTokens, finalUsage.outputTokens);
+
+            await prisma.aIUsage.create({
+              data: {
+                userId: sessionUser.id,
+                organizationId: sessionUser.organizationId,
+                model,
+                inputTokens: finalUsage.inputTokens,
+                outputTokens: finalUsage.outputTokens,
+                costUsd: cost,
+              },
+            });
+
             await prisma.aIAuditLog.create({
               data: {
                 organizationId: sessionUser.organizationId,
                 userId: sessionUser.id,
                 model,
                 plan: policy.plan,
                 route: "/api/ai/chat",
-                promptChars,
-                messageCount,
+                promptChars: meta.promptChars,
+                messageCount: meta.messageCount,
                 inputTokens: finalUsage.inputTokens,
                 outputTokens: finalUsage.outputTokens,
-                costUsd: estimateCost(
-                  model,
-                  finalUsage.inputTokens,
-                  finalUsage.outputTokens,
-                ),
+                costUsd: cost,
                 status: "ok",
               },
             });
           }
@@
         } catch {
@@
           await prisma.aIAuditLog.create({
             data: {
@@
-              promptChars,
-              messageCount,
+              promptChars: meta.promptChars,
+              messageCount: meta.messageCount,
               inputTokens: 0,
               outputTokens: 0,
               costUsd: 0,
               status: "error",
               errorCode: "provider",
               errorMessage: "AI request failed",
             },
           });
         }
       },
     }),
```

### Corriger `/api/ai/tools/chain`: scope + Step.tool.durationMs

Problème: `exec` est défini dans un scope et réutilisé plus bas. Et `Step.tool` n’a pas `durationMs`.

**Patch minimal dans `apps/web/src/app/api/ai/tools/chain/route.ts`**:

```diff
 type Step = {
   step: number;
   pick: any;
-  tool?: { name: string; args: any; result?: any; error?: string };
+  tool?: { name: string; args: any; result?: any; error?: string; durationMs?: number };
   assistant?: { note?: string; partialAnswer?: string };
   usage?: { inputTokens: number; outputTokens: number };
   costUsd?: number;
 };
@@
       // Execute tool
       let toolResult: any = null;
       let toolError: string | null = null;
+      let toolDurationMs = 0;
 
       try {
-        const exec = await time(async () => {
+        const execResult = await time(async () => {
           const res = await withTimeout(
             executeTool(registry, pick.tool, pick.args, {
               userId: user.id,
               orgId: user.organizationId,
             }),
             2000,
           );
           return clampJsonSize(redact(res));
         });
-        toolResult = exec.error ? null : exec.value;
-        toolError = exec.error;
+        toolDurationMs = execResult.durationMs;
+        toolResult = execResult.error ? null : execResult.value;
+        toolError = execResult.error;
       } catch (e) {
         toolError = (e as Error).message;
       }
 
       step.tool = {
         name: pick.tool,
         args: pick.args,
         result: toolResult ?? undefined,
         error: toolError ?? undefined,
-        durationMs: exec.durationMs,
+        durationMs: toolDurationMs,
       };
```

### Routes + sidebar: exposer toutes les pages AI

**`apps/web/src/shared/constants/routes.ts`** (ajouter `aiToolsChain`):

```diff
   app: {
@@
     aiStructured: "/dashboard/ai-structured",
     aiTools: "/dashboard/ai-tools",
+    aiToolsChain: "/dashboard/ai-tools-chain",
   },
```

**`apps/web/src/shared/ui/layout/sidebar-nav.tsx`** (ajouter les items AI; exemple dans “Account” ou nouvelle section “AI”):

```diff
   {
     title: "Account",
     items: [
@@
       { href: routes.app.aiUsage, label: "AI Usage" },
+      { href: routes.app.aiAudit, label: "AI Audit" },
+      { href: routes.app.aiPrompts, label: "AI Prompts" },
+      { href: routes.app.aiStructured, label: "AI Structured" },
+      { href: routes.app.aiTools, label: "AI Tools" },
+      { href: routes.app.aiToolsChain, label: "AI Tools Chain" },
     ],
   },
```

### UI “shadcn” manquante: créer les fichiers minimaux

Les imports actuels pointent vers `apps/web/src/shared/ui/shadcn/*` (qui n’existe pas). Ajoute au minimum:

`apps/web/src/shared/ui/shadcn/button.tsx`
```tsx
"use client";
import * as React from "react";
import { cn } from "@/shared/lib/cn";

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "outline"; size?: "sm" | "md" }) {
  const { className, variant = "default", size = "md", ...rest } = props;
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl text-sm font-bold transition disabled:opacity-50",
        size === "sm" ? "h-8 px-3" : "h-10 px-4",
        variant === "outline" ? "border bg-transparent" : "bg-foreground text-background",
        className,
      )}
      {...rest}
    />
  );
}
```

`apps/web/src/shared/ui/shadcn/card.tsx`
```tsx
import * as React from "react";
import { cn } from "@/shared/lib/cn";

export function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("rounded-3xl border bg-card text-card-foreground", props.className)} />;
}
export function CardHeader(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("p-6", props.className)} />;
}
export function CardContent(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("p-6 pt-0", props.className)} />;
}
export function CardTitle(props: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 {...props} className={cn("text-sm font-extrabold", props.className)} />;
}
```

`apps/web/src/shared/ui/shadcn/input.tsx`
```tsx
"use client";
import * as React from "react";
import { cn } from "@/shared/lib/cn";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn("h-10 w-full rounded-xl border px-3 text-sm", className)} {...props} />
  ),
);
Input.displayName = "Input";
```

`apps/web/src/shared/ui/shadcn/textarea.tsx`
```tsx
"use client";
import * as React from "react";
import { cn } from "@/shared/lib/cn";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn("w-full rounded-2xl border px-3 py-2 text-sm", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";
```

`apps/web/src/shared/ui/shadcn/separator.tsx`
```tsx
import { cn } from "@/shared/lib/cn";
export function Separator(props: { className?: string }) {
  return <div className={cn("h-px w-full bg-border", props.className)} />;
}
```

`apps/web/src/shared/ui/shadcn/badge.tsx`
```tsx
import { cn } from "@/shared/lib/cn";
export function Badge(props: { children: React.ReactNode; variant?: "secondary"; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-1 text-xs font-bold", props.className)}>{props.children}</span>;
}
```

## Prisma: modèles attendus + migrations manquantes

### Modèles AI attendus

Selon `schema.prisma`, les modèles existent (AIUsage, AIRateLimitBucket, AIAuditLog, AIPrompt, AIPromptVersion, AIToolExecution). fileciteturn123file1L1-L1

Écarts:
- **Relations manquantes**:
  - `AIPrompt.versions` requis par nested write dans `ai-prompts.service.ts`.
  - `AIAuditLog.toolExecutions` requis par include dans `/api/ai/audit`.
- Index: tu as déjà des indexes pour audit log et rate limit; tu pourrais ajouter un index sur `AIUsage(organizationId, createdAt)` (optionnel, recommandé pour `/api/ai/usage`).

### Migrations Prisma attendues

Constat: `packages/db/prisma/migrations` ne contient pas de migration SQL (seulement `.gitkeep`).  
Attendu minimal (suggestion de noms):
- `packages/db/prisma/migrations/<timestamp>_init/migration.sql` (si tu n’as jamais commité de migration)
- ou `.../<timestamp>_add_ai_foundation/migration.sql` si l’infra de base existe déjà

SQL attendu (schématique, généré par Prisma — à titre indicatif):
```sql
CREATE TABLE "AIUsage" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "inputTokens" INTEGER NOT NULL,
  "outputTokens" INTEGER NOT NULL,
  "costUsd" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "AIRateLimitBucket" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "AIRateLimitBucket_organizationId_windowStart_key"
  ON "AIRateLimitBucket" ("organizationId", "windowStart");

CREATE TABLE "AIAuditLog" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "plan" TEXT NOT NULL,
  "route" TEXT NOT NULL,
  "promptChars" INTEGER NOT NULL,
  "messageCount" INTEGER NOT NULL,
  "inputTokens" INTEGER NOT NULL,
  "outputTokens" INTEGER NOT NULL,
  "costUsd" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AIAuditLog_organizationId_createdAt_idx" ON "AIAuditLog" ("organizationId","createdAt");

CREATE TABLE "AIPrompt" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "activeVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "AIPrompt_organizationId_key_key" ON "AIPrompt" ("organizationId","key");

CREATE TABLE "AIPromptVersion" (
  "id" TEXT PRIMARY KEY,
  "promptId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,
  CONSTRAINT "AIPromptVersion_promptId_fkey"
    FOREIGN KEY ("promptId") REFERENCES "AIPrompt"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "AIPromptVersion_promptId_version_key" ON "AIPromptVersion" ("promptId","version");

CREATE TABLE "AIToolExecution" (
  "id" TEXT PRIMARY KEY,
  "auditLogId" TEXT NOT NULL,
  "step" INTEGER NOT NULL,
  "toolName" TEXT NOT NULL,
  "durationMs" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AIToolExecution_auditLogId_fkey"
    FOREIGN KEY ("auditLogId") REFERENCES "AIAuditLog"("id") ON DELETE CASCADE
);
CREATE INDEX "AIToolExecution_auditLogId_idx" ON "AIToolExecution" ("auditLogId");
```

Commandes à exécuter (sans les exécuter ici):
```bash
pnpm --filter @db exec prisma migrate dev --name add_ai_foundation
pnpm --filter @db exec prisma generate
```

## Dépendances, config, sécurité et tests

### Dépendances et configs manquantes

- `apps/web/package.json`: ne contient pas `recharts` (utilisé par AI Usage panel) ni `@ai-core` (importé partout).  
  Commandes suggérées:
  ```bash
  pnpm --filter @web add recharts
  pnpm --filter @web add @ai-core@workspace:*
  ```
- `apps/web/next.config.js`: `transpilePackages` ne contient pas `@ai-core` (recommandé pour un workspace TS).  
- `packages/ai-core/package.json` et `packages/ai-core/tsconfig.json` sont vides → à compléter comme `@auth-core` (exports, build script, deps openai/zod/zod-to-json-schema).  
- Config env: **non vérifiable** (fichiers bloqués), mais le code attend au minimum:
  - `OPENAI_API_KEY`
  - (optionnel) `AI_DEFAULT_MODEL` si tu veux fallback global
  - (déjà utilisé ailleurs) `DATABASE_URL`, etc.

### Sécurité multi-tenant & prompt injection

Priorité sécurité:
- **Bloquer/filtrer `role:"system"` dans `/api/ai/chat`** (c’est la fail la plus évidente côté prompt injection).  
- Tools: bons garde-fous déjà en place (allowlist + ctx.orgId imposé + Zod args).  
- Amélioration (high): si un tool échoue dans `/api/ai/tools`, inclure l’erreur dans le contexte du “explain” (sinon la réponse peut être nonsense).

### Recommandations de tests (prioritaires)

Sans imposer un framework particulier (non spécifié), je recommande:

- Unit tests (critical/high):
  - `enforceAiOrThrow`: quota atteint → 402, rpm atteint → 429
  - `enforceRpmOrThrow`: increments + fenêtre minute
  - `getOrgMonthlyUsage`: agrégation tokens/cost
  - `ai-prompts.service`: create version + set active + rollback
  - `executeTool`: args invalides → throw
- Integration tests (high):
  - `/api/ai/chat`: refuse system role; SSE emits `delta`, `usage`, `done`; persiste AIUsage + audit.
  - `/api/ai/tools/chain`: 2-3 steps → persisted AIToolExecution rows; timeline cohérente.
- E2E (medium):
  - Dashboard pages AI chargent et affichent data (usage, audit, prompts).
  - Navigation sidebar contient toutes les entrées.

## Plan d’action priorisé

### Critical

- Fix Prisma relations + migrer DB
  - `packages/db/prisma/schema.prisma` (ajouter `versions`, `toolExecutions`)
  - Générer/commiter migrations (`prisma migrate dev`)
- Corriger `/api/ai/chat`
  - Persist `AIUsage`
  - Fix scope meta
  - Refuser `role:"system"`
- Corriger `/api/ai/tools/chain`
  - Fix scope `exec`, typer `durationMs`
- Rendre `@ai-core` “réel”
  - Compléter `packages/ai-core/package.json` + `tsconfig.json`
  - Ajouter `@ai-core` à `apps/web/package.json`
  - Ajouter `@ai-core` à `transpilePackages`

### High

- UI: navigation et DX
  - `apps/web/src/shared/constants/routes.ts` (ajouter `aiToolsChain`)
  - `apps/web/src/shared/ui/layout/sidebar-nav.tsx` (ajouter AI Audit/Prompts/Structured/Tools/Tools Chain)
- Dépendances UI + composants manquants
  - Installer `recharts`
  - Créer `apps/web/src/shared/ui/shadcn/*` (Button/Card/Input/Textarea/Separator/Badge)
- Unifier quota source-of-truth
  - Remplacer AI_QUOTAS par AI_POLICY dans `/api/ai/usage` et possiblement `ai-usage.service.ts` (éviter divergence)

### Medium

- Robustesse generateStructured
  - Ajouter fallback si `response_format: json_schema` n’est pas supporté (retry avec “Return ONLY JSON” + parse + zod)
- Headers cohérents
  - Ajouter `x-ai-plan`/`x-ai-model` aussi sur `/api/ai/tools` et `/api/ai/tools/chain` (debug)
- Ajouter suite de tests (unit/integration/e2e) selon recommandations ci-dessus

