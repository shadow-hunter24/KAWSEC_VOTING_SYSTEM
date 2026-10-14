// ── KAWSEC Voting System — Core TypeScript Types ─────────────
// These interfaces match the Supabase database schema exactly.
// Update here whenever a migration changes the schema.

// ── Election lifecycle ────────────────────────────────────────
export type ElectionStatus =
  | 'draft'
  | 'approved'
  | 'open'
  | 'closed'
  | 'verified'
  | 'published'
  | 'cancelled';

export type GenderScope      = 'male' | 'female' | 'all';
export type EligibilityScope = 'school_wide' | 'house';
export type CandidateStatus  = 'pending' | 'approved' | 'rejected';

// ── School structure ─────────────────────────────────────────
export interface Department {
  id:         string;
  name:       string;
  code:       string;
  created_at: string;
}

export interface Class {
  id:            string;
  department_id: string;
  name:          string;
  year_group:    1 | 2 | 3;
  created_at:    string;
}

export interface House {
  id:         string;
  name:       string;
  code:       string;
  colour?:    string;
  created_at: string;
}

// ── Students ─────────────────────────────────────────────────
export interface Student {
  id:                 string;
  student_id_number:  string;   // school-issued ID
  full_name:          string;
  gender:             'male' | 'female';
  class_id:           string;
  house_id:           string | null;
  year_group:         1 | 2 | 3;
  is_active:          boolean;
  created_at:         string;
  updated_at:         string;
  // Joined fields (populated by select with FK expansion)
  classes?:           Class;
  houses?:            House;
}

// ── Credential types (frontend never sees verifier_hash) ──────
export interface CredentialAuthRequest {
  student_id_number: string;
  credential:        string;  // plaintext — sent to Edge Function over HTTPS only
  election_id:       string;
}

export interface CredentialAuthResponse {
  success:    boolean;
  student_id: string;
  full_name:  string;
  message?:   string;
}

// ── Elections ────────────────────────────────────────────────
export interface Election {
  id:               string;
  title:            string;
  status:           ElectionStatus;
  voting_opens_at:  string | null;
  voting_closes_at: string | null;
  description:      string | null;
  created_by:       string | null;
  approved_by:      string | null;
  approved_at:      string | null;
  created_at:       string;
  updated_at:       string;
}

// ── Positions ────────────────────────────────────────────────
export interface Position {
  id:                 string;
  election_id:        string;
  title:              string;
  role_group:         string;   // for grouping Male/Female of same role
  gender_scope:       GenderScope;
  eligibility_scope:  EligibilityScope;
  house_id:           string | null;
  sort_order:         number;
  created_at:         string;
  // Joined
  houses?:            House;
  candidates?:        Candidate[];
}

// ── Candidates ───────────────────────────────────────────────
export interface Candidate {
  id:              string;
  position_id:     string;
  student_id:      string;
  photo_url:       string | null;
  manifesto_text:  string | null;
  status:          CandidateStatus;
  approved_by:     string | null;
  approved_at:     string | null;
  rejected_reason: string | null;
  created_at:      string;
  // Joined
  students?:       Pick<Student, 'id' | 'full_name' | 'gender' | 'student_id_number'>;
}

// ── Voting ───────────────────────────────────────────────────
export interface VotingEntitlement {
  id:          string;
  election_id: string;
  student_id:  string;
  position_id: string;
  consumed:    boolean;
  consumed_at: string | null;
  created_at:  string;
}

// Ballot has NO student_id by design — ballot secrecy
export interface Ballot {
  id:           string;
  election_id:  string;
  position_id:  string;
  candidate_id: string;
  submitted_at: string;
}

// Cast ballot request — sent to Edge Function only
export interface CastBallotRequest {
  student_id:  string;    // used to consume entitlement
  election_id: string;
  votes: {
    position_id:  string;
    candidate_id: string;
  }[];
}

// ── Audit ────────────────────────────────────────────────────
export interface AuditEvent {
  id:          string;
  election_id: string | null;
  actor:       string;
  action:      string;
  details:     Record<string, unknown> | null;
  ip_address:  string | null;
  created_at:  string;
}

// ── Published results ────────────────────────────────────────
export interface PublishedResult {
  id:             string;
  election_id:    string;
  position_id:    string;
  position_title: string;
  candidate_id:   string;
  candidate_name: string;
  vote_count:     number;
  rank:           number;
  tie_flag:       boolean;
  panel_decision: string | null;
  published_at:   string;
  published_by:   string;
}

// ── Turnout (from get_election_turnout function) ──────────────
export interface TurnoutRow {
  position_id:    string;
  position_title: string;
  total_eligible: number;
  total_voted:    number;
  turnout_pct:    number;
}

// ── Tally (from tally_election_results function) ─────────────
export interface TallyRow {
  position_id:    string;
  position_title: string;
  candidate_id:   string;
  candidate_name: string;
  vote_count:     number;
  rank:           number;
}
