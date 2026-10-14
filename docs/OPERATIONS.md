# KAWSEC Voting System — Operations Guide

> Election Day Runbook for IT Coordinator and School Management

---

## 1. Pre-Election Checklist (1 week before)

- [ ] All SQL migrations run (0001–0007) in Supabase
- [ ] Edge Functions deployed: `generate-credential`, `verify-credential`, `cast-ballot`
- [ ] Student register imported via `/admin/students/import`
- [ ] All candidate applications submitted, reviewed, and approved
- [ ] Election created in `/admin/elections` with correct open/close times
- [ ] Election approved (entitlements generated)
- [ ] Mock election completed and results reconciled (TEST_PLAN.md)
- [ ] IT Coordinator account confirmed working in Supabase Auth
- [ ] 40 ICT lab PCs tested — all can reach the voting URL
- [ ] School Wi-Fi tested under load (have 40+ tabs open simultaneously)
- [ ] Paper fallback ballot prepared and locked in a secure location
- [ ] Incident escalation contacts confirmed

---

## 2. Election Morning (1 hour before voting opens)

1. Sign in to `/admin` with IT Coordinator credentials
2. Go to **Election Settings** — confirm election is in `approved` state
3. Go to **Turnout Dashboard** — confirm 0 votes, correct eligible counts per position
4. Have all 40 ICT lab PCs open the voting URL `https://your-domain/vote`
5. Confirm the `voting_opens_at` time is correct — voting auto-opens at that time
6. Brief supervising teachers on the credential hand-out process:
   - Students enter their Student ID → system generates credential on screen
   - Teacher confirms student identity before student sees credential
   - Student enters credential and votes privately

---

## 3. During Voting

### Monitoring
- Keep **Turnout Dashboard** open and refresh every 30 minutes
- Watch for unusual patterns (many failed attempts from one station)

### IT Coordinator responsibilities
- Handle lost/forgotten credential requests — go to Supabase → `credential_verifiers`, find the student's row, set `revoked = true`, then have student re-enter their Student ID to get a new credential
- Log all credential revocations in the Audit Log

### If a student reports voting twice
- This should be impossible by design
- Check `voting_entitlements` for their `student_id` — all `consumed` should be `true`
- Check `audit_events` for `ballot.cast` entries

### Paper fallback trigger conditions
- If the system is unreachable for > 10 minutes
- If more than 10% of students cannot authenticate
- If the database shows signs of data corruption
- **Trigger:** Announce paper fallback, lock digital system, retrieve paper ballots

---

## 4. Closing Voting

1. Wait for `voting_closes_at` time — system auto-rejects new ballots
2. OR manually close in **Election Settings** → "Close Voting" button
3. Note the final turnout numbers from the dashboard
4. Announce to students that voting has closed

---

## 5. Tally and Result Publication

1. Go to **Election Settings** → click **"Mark Verified"** on the closed election
2. Go to **Tally & Publish** (`/admin/tally/:electionId`)
3. Review all vote counts carefully
4. If any position shows a **TIE**:
   - Convene the panel (IT Coordinator + Election Officer + Head Teacher)
   - Enter the panel decision in the input field
   - Document the decision in the school records
5. When satisfied, click **"Publish Official Results"**
6. Verify results appear on `/results` page
7. Print PDF report: on `/results`, click "Export / Print PDF"

---

## 6. Post-Election

- [ ] Export PDF results and submit to school administration
- [ ] Check Audit Log for any anomalies
- [ ] Reconcile: `SELECT COUNT(*) FROM ballots WHERE election_id = '<id>'` should equal total consumed entitlements
- [ ] Archive: export `published_results`, `audit_events` to school records
- [ ] Delete test/mock data if still present
- [ ] Review credential_attempts for any suspicious rate-limit hits
- [ ] Conduct post-election debrief with teachers and IT staff

---

## 7. Incident Contacts

| Incident | Contact |
|---|---|
| System unreachable | IT Coordinator + Supabase Status (status.supabase.com) |
| Student cannot authenticate | IT Coordinator (credential revoke + reissue) |
| Suspected double voting | IT Coordinator + Election Officer (check audit log) |
| Results dispute | Panel: IT Coordinator + Election Officer + Head Teacher |
| Data breach suspicion | Immediately suspend access, contact school management |

---

## 8. Useful SQL Queries (run in Supabase SQL Editor)

```sql
-- Total ballots cast in an election
SELECT COUNT(*) FROM ballots WHERE election_id = '<election_id>';

-- Turnout per position
SELECT * FROM get_election_turnout('<election_id>');

-- Tally results
SELECT * FROM tally_election_results('<election_id>');

-- Students who have not yet voted
SELECT s.student_id_number, s.full_name
FROM students s
JOIN voting_entitlements ve ON ve.student_id = s.id
WHERE ve.election_id = '<election_id>'
  AND ve.consumed = false
  AND s.is_active = true;

-- Recent audit events
SELECT actor, action, details, created_at
FROM audit_events
WHERE election_id = '<election_id>'
ORDER BY created_at DESC
LIMIT 50;
```

---

## 9. Data Retention

After the election is complete and results are confirmed:
- Keep `published_results` and `audit_events` permanently (school records)
- Delete `credential_verifiers` and `credential_attempts` (30 days post-election)
- Review Ghana Data Protection Act 2012 (Act 843) requirements before deleting any student data
