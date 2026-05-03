## Agent Front Integration Review

### Scope
Review focused on `/Users/alexguerrero/Developer/Maingoo-Front` integration with the current `ms-agent` surface exposed by gateway after removing automations/cron/notifications.

### Verification
- TypeScript check: `./node_modules/.bin/tsc -p tsconfig.app.json --noEmit` passed.
- Build: `npm run build` passed with existing Angular budget/CommonJS warnings.
- Confirmed no remaining `automation`, `automations`, or `/automations` references under `src/app` / `src/environments`.

### Resolved

#### P1 - Removed stale automations UI/API dependency
`/agents` no longer calls the removed `/api/agent/automations` endpoints. The page now reuses the active chat experience and the obsolete automations service was removed.

#### P1 - Removed stale automation permission gate
The `/agents` route and menu entries now require only `agent.use`. The removed `automations.*` permission constants were deleted from the front enum.

#### P3 - Switched chat attachments to multipart upload
Text messages still use `POST /api/agent/run`. File/image/audio/pdf attachments now use `POST /api/agent/run/file` with `FormData`, matching the gateway upload endpoint.

### Intentionally Not Implemented

#### P2 - Audit/usage fields not shown in final-user front
The backend returns `usage`, `runSteps`, `toolInvocations`, and `usageSummary`, but those metrics are intentionally reserved for the internal admin panel.

#### P2 - Previous conversations not exposed in final-user UI yet
The service still has conversation history methods, but the final-user UI does not show previous conversations by design for now.
