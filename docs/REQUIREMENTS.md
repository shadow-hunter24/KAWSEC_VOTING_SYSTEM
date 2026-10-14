# KAWSEC Voting System — Requirements

> Version: Phase 2
> School: Nkawkaw Senior High School (KAWSEC), Ghana

---

## Functional Requirements

### FR-1: Student Authentication
- FR-1.1: A student enters their school-issued Student ID to begin
- FR-1.2: The system generates a one-time voting credential tied to that Student ID and election
- FR-1.3: The student enters the credential to authenticate
- FR-1.4: Authentication rate-limits to 3 attempts per Student ID per 10 minutes
- FR-1.5: Credentials are single-use per election; re-authentication after the window closes is blocked
- FR-1.6: Lost credentials are recovered only through a supervised IT Coordinator reset

### FR-2: Ballot Voting
- FR-2.1: Authenticated students are presented with positions one at a time
- FR-2.2: Each position shows approved candidate cards with photo and manifesto
- FR-2.3: The student selects one candidate per position
- FR-2.4: A review screen shows all selections before final confirmation
- FR-2.5: Submission is atomic — either all positions are recorded or none
- FR-2.6: A student cannot submit a partial ballot (all eligible positions required)
- FR-2.7: After submission, the student receives a non-revealing confirmation (no candidate names shown)
- FR-2.8: A student cannot vote twice — the entitlement is consumed atomically on first submission

### FR-3: Eligibility
- FR-3.1: School-wide positions: all active students are eligible
- FR-3.2: House Captain positions: only students assigned to that house are eligible
- FR-3.3: Eligibility is enforced server-side — frontend display is informational only

### FR-4: Candidate Management
- FR-4.1: Admin adds candidates with name, photo, and manifesto
- FR-4.2: Candidates must be approved by the IT Coordinator before appearing on the ballot
- FR-4.3: Rejected candidates are notified with a reason
- FR-4.4: Candidate list is frozen when the election is approved — no changes after voting opens

### FR-5: Election Lifecycle
- FR-5.1: Elections follow: draft → approved → open → closed → verified → published
- FR-5.2: Voting opens and closes automatically at scheduled times
- FR-5.3: Manual override (early open/close) available to IT Coordinator
- FR-5.4: Cancelled elections retain their data for audit purposes

### FR-6: Results
- FR-6.1: Candidate totals are hidden during voting
- FR-6.2: IT Coordinator triggers tally after voting closes
- FR-6.3: Tied positions are flagged; panel decision is recorded before publishing
- FR-6.4: IT Coordinator approves and publishes results
- FR-6.5: Published results are visible on the public results page
- FR-6.6: A PDF report can be exported after publication

### FR-7: Administration
- FR-7.1: Turnout dashboard shows eligible count, voted count, and % per position (no candidate totals)
- FR-7.2: Bulk student import via CSV/Excel with preview and duplicate detection
- FR-7.3: Audit log records all privileged actions (tamper-evident, insert-only)
- FR-7.4: IT Coordinator can revoke and reissue credentials with audit trail

---

## Non-Functional Requirements

### NFR-1: Security
- NFR-1.1: Service-role key never exposed to the browser
- NFR-1.2: All ballot writes go through a Supabase Edge Function (server-side)
- NFR-1.3: Credential verifiers stored as bcrypt/argon2 hashes only
- NFR-1.4: Ballot table has no student_id column (ballot secrecy by design)
- NFR-1.5: RLS policies enforce access control at database level

### NFR-2: Performance
- NFR-2.1: Supports full school voting concurrently (40 supervised stations + personal devices)
- NFR-2.2: Ballot submission completes within 3 seconds under normal load
- NFR-2.3: Results page loads within 2 seconds

### NFR-3: Accessibility
- NFR-3.1: WCAG 2.1 AA minimum
- NFR-3.2: Touch targets minimum 44×44px (tablet-optimised)
- NFR-3.3: Keyboard navigable throughout
- NFR-3.4: Screen reader compatible (ARIA labels, live regions)

### NFR-4: Reliability
- NFR-4.1: Idempotent ballot submission — network retries cannot produce duplicate votes
- NFR-4.2: Supabase point-in-time recovery enabled
- NFR-4.3: Paper fallback procedure documented and ready

### NFR-5: Privacy
- NFR-5.1: Ghana Data Protection Act 2012 (Act 843) compliance
- NFR-5.2: Student data used only for election purposes
- NFR-5.3: Credentials and vote choices never logged together
- NFR-5.4: Data retention policy defined and enforced after election
