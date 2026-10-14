# KAWSEC Voting System — Database Migrations

Run these SQL files **in order** in Supabase → SQL Editor.

| File | What it creates |
|---|---|
| `20260001_school_structure.sql` | `departments`, `classes`, `houses` + demo seed data |
| `20260002_students.sql` | `students`, `credential_verifiers`, `credential_attempts` |
| `20260003_elections.sql` | `elections`, `positions`, `candidates` + demo election |
| `20260004_voting.sql` | `voting_entitlements`, `ballots`, `audit_events`, `published_results` + helper functions |

## How to run

1. Open your Supabase project → **SQL Editor**
2. Paste and run each file **in numbered order** (0001 → 0002 → 0003 → 0004)
3. Each file is safe to re-run (uses `IF NOT EXISTS` / `ON CONFLICT DO NOTHING`)

## Before going live

- [ ] Delete all demo seed data (`DELETE FROM students WHERE student_id_number LIKE 'KAWSEC/2024/%'`)
- [ ] Replace demo house names with actual KAWSEC house names
- [ ] Replace demo departments with actual KAWSEC departments
- [ ] Import real student register via the bulk import tool (Phase 3)
- [ ] Verify RLS policies with the Supabase policy tester
- [ ] Never expose the `service_role` key in the frontend

## Schema diagram

```
departments ──< classes ──< students >── houses
                                │
                         credential_verifiers
                                │
elections ──< positions ──< candidates
     │              │
     │         voting_entitlements >── students
     │
     └──< ballots (NO student_id — ballot secrecy)
     └──< audit_events
     └──< published_results
```
