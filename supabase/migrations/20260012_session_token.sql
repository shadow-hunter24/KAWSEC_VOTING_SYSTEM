-- Add session_token_hash to credential_verifiers
-- Used by cast-ballot to validate the session token issued by verify-credential.
ALTER TABLE credential_verifiers
  ADD COLUMN IF NOT EXISTS session_token_hash TEXT;
