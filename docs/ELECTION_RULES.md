# KAWSEC Voting System — Election Rules

> Status: Confirmed by project owner (Phase 0 complete)
> School: Nkawkaw Senior High School (KAWSEC), Ghana

---

## 1. Prefect Positions

Every role has a **Male** and **Female** position — 7 roles × 2 = **14 ballot positions total**.

| # | Role Group | Male Title | Female Title | Eligibility |
|---|---|---|---|---|
| 1 | School Prefect | Head Boy | Head Girl | Whole school |
| 2 | Compound Prefect | Compound Prefect (Male) | Compound Prefect (Female) | Whole school |
| 3 | Sports Prefect | Sports Prefect (Male) | Sports Prefect (Female) | Whole school |
| 4 | House Captain | [House] Captain (Male) | [House] Captain (Female) | House members only |
| 5 | School Chaplain | School Chaplain (Male) | School Chaplain (Female) | Whole school |
| 6 | Entertainment Prefect | Entertainment Prefect (Male) | Entertainment Prefect (Female) | Whole school |
| 7 | Dining Hall Prefect | Dining Hall Prefect (Male) | Dining Hall Prefect (Female) | Whole school |

## 2. Voting Eligibility

- **School-wide positions (rows 1–3, 5–7):** Every active registered student votes.
- **House Captain (row 4):** Only students belonging to that specific house vote for their house's captain positions. A student in Nkrumah House only votes for Nkrumah House Captain (Male) and Nkrumah House Captain (Female).

## 3. Voting Method

- Students vote **position by position** — one screen per position.
- A ballot is only accepted after the student has selected a candidate for **every eligible position**.
- **Abstention is not permitted.** Every eligible position must be voted on.

## 4. Tie Resolution

- Ties are resolved by **panel decision**.
- The panel consists of: IT Coordinator + Election Officer + School Management representative.
- Tied results are flagged in the system. The IT Coordinator enters the panel decision before publishing results.

## 5. Voter Authentication

- Each student has a **school-issued Student ID** (format TBD — e.g. `KAWSEC/2024/001`).
- On election day, entering the Student ID triggers **automatic generation of a one-time voting credential**.
- The credential is shown once and must be used during that session.
- Credentials are single-use per election. Rate limiting: max 3 attempts per Student ID per 10 minutes.
- Recovery (lost credential) requires supervised reset by the IT Coordinator.

## 6. Concurrency

- Multiple students may vote simultaneously.
- The school has 40 ICT lab computers as supervised voting stations.
- Students may also vote on personal devices over school Wi-Fi or mobile data.
- Peak load = full school voting in a supervised window (exact duration TBD).

## 7. Result Publication

- Candidate vote totals are **hidden from everyone** (including admins) while voting is open.
- Admins see **aggregate turnout only** (total submitted / total eligible per position) during voting.
- After voting closes, the IT Coordinator runs the tally, reviews results, handles any ties, and clicks **Publish Results**.
- Results go live on the public results page only after IT Coordinator approval.

---

## Open Items (Still Needed from School)

- [ ] Exact Student ID format
- [ ] Actual house names at KAWSEC
- [ ] Actual department and class names
- [ ] Whether Form 1, 2, and 3 all vote or only specific year groups
- [ ] Whether voting is restricted to supervised ICT lab only or any device
- [ ] Voting window duration (e.g. 9am–1pm on a specific day)
- [ ] Who specifically sits on the tie-resolution panel
- [ ] Data retention period for student records and ballots
