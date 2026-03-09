
## Audit Summary

All three gaps are confirmed. Here is the exact plan:

---

### Fix 1 — SavedJobs: Use real `expires_at` instead of 30-day estimate

**Files**: `src/components/candidate/SavedJobsSection.tsx`

**Problem locations**:
- `ExpiryBadge` (line 29): calculates `daysRemaining = 30 - daysSincePosted` — pure estimate
- `SavedCard` (line 101–103): same `daysRemaining` calculation used for urgency accent
- Query (line 207–215): does NOT fetch `expires_at` from `jobs`
- Stats `useMemo` (line 241): same hardcoded 30-day logic
- Sort `useMemo` (line 272–274): same hardcoded 30-day sort logic

**Changes**:
1. Add `expires_at` to the Supabase select query on `jobs`
2. Rewrite `ExpiryBadge` to accept `expiresAt: string | null` and calculate days from `expires_at` directly (fallback: treat as no expiry if null)
3. Update `SavedCard` to pass `expiresAt={job.expires_at}` and compute `daysRemaining` from `expires_at`
4. Update stats `useMemo` to use `expires_at`-based days remaining
5. Update sort `useMemo` for `'expiring'` sort to use `expires_at`

**Logic**: If `expires_at` is null → no expiry warning shown. If `expires_at` is in the past → "Expired". If ≤3 days → urgent. If ≤7 days → warning.

---

### Fix 2 — Dashboard unread message count: eliminate sequential conversation→messages queries

**Files**: `src/pages/CandidateDashboard.tsx`, `src/pages/EmployerDashboard.tsx`

**Problem**: Both dashboards do:
1. `SELECT id FROM conversations WHERE participant_1=X OR participant_2=X` (sequential, not parallel)
2. Then conditionally `SELECT COUNT(*) FROM messages WHERE conversation_id IN (...)` — gated on step 1

**Solution**: Create a DB function `get_unread_message_count(p_user_id uuid)` via migration that does both in a single SQL query:
```sql
SELECT COUNT(*) FROM messages m
JOIN conversations c ON m.conversation_id = c.id
WHERE (c.participant_1 = p_user_id OR c.participant_2 = p_user_id)
  AND m.is_read = false
  AND m.sender_id != p_user_id;
```

Then replace both sequential blocks in both dashboards with a single `supabase.rpc('get_unread_message_count', { p_user_id: user.id })` call, which can be parallelized with other dashboard queries via `Promise.all`.

**CandidateDashboard**: Currently the conversation fetch + message count happen before the `Promise.all` block (lines 66–87). Move them inside `Promise.all` as an RPC call.

**EmployerDashboard**: Same pattern (lines 100–105). Replace with single RPC in parallel.

---

### Fix 3 — `usePresence.ts`: Fix `setTyping` channel leak

**File**: `src/hooks/usePresence.ts`

**Problem** (line 136):
```ts
supabase.channel(`typing-${convId}`).send(...)
```
`supabase.channel()` creates a **new channel object** each call. The send goes to an unsubscribed channel. The actual subscribed channel (created in the `useEffect` at line 84) is a different object reference. This causes:
- Messages never actually reach other clients
- Supabase may accumulate ghost channel registrations

**Fix**: Store the typing channel ref in a `useRef` instead of creating it ad-hoc:
1. Change `const [channel, setChannel]` for the typing channel to `const typingChannelRef = useRef<RealtimeChannel | null>(null)`
2. In the typing `useEffect`, assign `typingChannelRef.current = typingChannel` instead of using state
3. In `setTyping` callback, use `typingChannelRef.current?.send(...)` — reusing the already-subscribed channel
4. Keep the `useEffect` cleanup (removeChannel) unchanged

The presence channel (`online-users`) is stored correctly in state already — only the typing channel has this bug.

---

### Summary of files changed

| Fix | Files | Migration? |
|-----|-------|-----------|
| SavedJobs `expires_at` | `src/components/candidate/SavedJobsSection.tsx` | No |
| Unread count DB function | `src/pages/CandidateDashboard.tsx`, `src/pages/EmployerDashboard.tsx` | Yes — new `get_unread_message_count` RPC |
| `setTyping` channel reuse | `src/hooks/usePresence.ts` | No |
