export type ElectionStatus = 'draft' | 'approved' | 'open' | 'closed' | 'verified' | 'published' | 'cancelled';
export type GenderScope = 'male' | 'female' | 'all';
export type EligibilityScope = 'school_wide' | 'house';
export type CandidateStatus = 'pending' | 'approved' | 'rejected';

export interface Election {
  id: string;
  title: string;
  status: ElectionStatus;
  voting_opens_at: string;
  voting_closes_at: string;
  created_by: string;
}

export interface Position {
  id: string;
  election_id: string;
  title: string;
  gender_scope: GenderScope;
  eligibility_scope: EligibilityScope;
  house_id?: string;
}

export interface Candidate {
  id: string;
  position_id: string;
  student_id: string;
  full_name: string;
  photo_url?: string;
  manifesto_text?: string;
  status: CandidateStatus;
}

export interface Student {
  id: string;
  student_id_number: string;
  full_name: string;
  class_id: string;
  house_id: string;
  gender: 'male' | 'female';
  is_active: boolean;
}

export interface PublishedResult {
  id: string;
  election_id: string;
  position_id: string;
  position_title: string;
  candidate_id: string;
  candidate_name: string;
  vote_count: number;
  rank: number;
  tie_flag: boolean;
}
