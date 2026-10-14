# KAWSEC Voting System — Test Plan

> Phase 6 — Testing, Resilience and Pilot

---

## 1. Pre-Test Setup

1. Run all 7 migrations in Supabase SQL Editor (0001 → 0007)
2. Deploy Edge Functions: `generate-credential`, `verify-credential`, `cast-ballot`
3. Create an IT Coordinator account in Supabase → Authentication → Users
4. Run `npm run dev` and open http://localhost:5173

---

## 2. Authentication Tests

### TC-01: IT Coordinator login — valid credentials
- Go to `/admin`
- Enter valid Supabase Auth email + password
- **Expected:** Redirected to `/admin/dashboard`, user email shown in header
- **Pass criterion:** Dashboard loads with correct email displayed

### TC-02: IT Coordinator login — wrong password
- Enter incorrect password
- **Expected:** Error message "Incorrect email or password"
- **Pass criterion:** No redirect, error shown, no dashboard access

### TC-03: Protected route — unauthenticated
- Open `/admin/dashboard` in a new incognito window (no session)
- **Expected:** Redirected to `/admin` login page
- **Pass criterion:** Dashboard does not load without auth

### TC-04: Session persistence
- Log in, close tab, reopen `/admin/dashboard`
- **Expected:** Still logged in (Supabase session persists via localStorage)

### TC-05: Sign out
- Click "Sign Out" in dashboard
- **Expected:** Redirected to `/admin`, session cleared
- **Pass criterion:** `/admin/dashboard` redirects back to login after sign out

---

## 3. Student Voting Flow Tests

### TC-06: Valid student ID — open election
- Go to `/vote`
- Enter `KAWSEC/2024/001`
- **Expected:** Credential generated, step 2 shown with student name

### TC-07: Invalid student ID
- Enter `KAWSEC/9999/999` (doesn't exist)
- **Expected:** Error "Student ID not found"

### TC-08: Rate limiting
- Enter a valid ID 4 times in quick succession
- **Expected:** 4th attempt returns "Too many attempts" error

### TC-09: Valid credential
- Complete step 1, enter the generated credential
- **Expected:** Navigated to `/vote/ballot` with ballot loaded

### TC-10: Wrong credential
- Enter an incorrect credential on step 2
- **Expected:** Error "Incorrect credential"

### TC-11: Position-by-position voting
- Select a candidate on each position screen
- **Expected:** Progress bar advances, can navigate back to change selection
- Back button returns to previous position with selection preserved

### TC-12: Ballot review screen
- Complete all positions, reach `/vote/review`
- **Expected:** All selections shown, correct candidate names, correct positions

### TC-13: Ballot submission
- Confirm ballot on review screen
- **Expected:** `/vote/complete` shown with non-revealing receipt (no candidate names)
- `ballot_count` matches number of eligible positions

### TC-14: Double vote prevention
- After voting, try to log in again with the same student ID
- **Expected:** Error "You have already completed voting"

### TC-15: Concurrent vote attempt
- Open two browser tabs simultaneously for the same student
- Submit ballot from both tabs at approximately the same time
- **Expected:** Only one ballot recorded, second gets "already voted" error

---

## 4. Admin Function Tests

### TC-16: Bulk student import — valid CSV
- Go to `/admin/students/import`
- Upload `kawsec_students_template.csv` with 3 valid rows
- **Expected:** Preview shows 3 green rows, import succeeds

### TC-17: Bulk import — invalid CSV
- Upload a CSV with missing columns
- **Expected:** Error shown, import button disabled

### TC-18: Candidate management — add + approve
- Go to `/admin/candidates`
- Add a candidate for Head Boy using a valid student ID
- Approve the candidate
- **Expected:** Status changes to "approved", candidate visible on ballot

### TC-19: Election settings — create and open
- Go to `/admin/elections`
- Create new election, approve, open
- **Expected:** Status transitions correctly, entitlements generated

### TC-20: Turnout dashboard
- Open `/admin/turnout` while voting is active
- **Expected:** Shows eligible/voted counts per position, NO candidate names or totals

### TC-21: Tally and publish
- After election closes, go to `/admin/tally/:id`
- Review results, resolve any ties, click Publish
- **Expected:** `/results` page shows official published results

### TC-22: Audit log
- Go to `/admin/audit`
- **Expected:** Actions from all tests above appear in log (ballot.cast, student.authenticated, etc.)

---

## 5. Security Tests

### TC-23: Ballot table privacy
- In Supabase SQL Editor, run: `SELECT * FROM ballots;`
- **Expected:** 0 rows returned (RLS blocks anon/auth direct read)
- Confirm no `student_id` column exists in the table

### TC-24: Credential verifier privacy
- Run: `SELECT * FROM credential_verifiers;`
- **Expected:** 0 rows returned (RLS blocks all direct API access)

### TC-25: Service role key not exposed
- Open browser DevTools → Network tab
- Vote and observe all requests
- **Expected:** No request header or response body contains the service role key

### TC-26: Admin route protection
- Without logging in, try to fetch `/admin/elections`
- **Expected:** Redirected to login, no election data visible

---

## 6. Connectivity / Resilience Tests

### TC-27: Network interruption during vote submission
- Start ballot submission, disconnect Wi-Fi mid-request
- Reconnect and retry
- **Expected:** Either vote recorded once (idempotent) or "already voted" error — no duplicate

### TC-28: Expired election window
- Try to vote after `voting_closes_at` has passed
- **Expected:** `cast-ballot` Edge Function returns "Voting has closed"

---

## 7. Acceptance Criteria (Mock Election Sign-off)

- [ ] All TCs 01–28 pass
- [ ] Tally reconciliation: `COUNT(ballots)` per candidate matches `published_results.vote_count`
- [ ] Total ballots = total consumed entitlements
- [ ] No student ID appears in the `ballots` table
- [ ] IT Coordinator can sign in, manage, and publish without developer intervention
- [ ] School management reviews and approves mock election results
