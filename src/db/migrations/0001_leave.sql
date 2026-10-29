-- Requires foundation tables users, stores and audit_logs from feature 002.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

CREATE TABLE leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (length(btrim(name)) > 0),
  is_paid boolean NOT NULL DEFAULT false,
  requires_attachment boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  store_id uuid NOT NULL REFERENCES stores(id),
  leave_type_id uuid NOT NULL REFERENCES leave_types(id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text NOT NULL,
  attachment_url text,
  status leave_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leave_requests_date_order CHECK (end_date >= start_date),
  CONSTRAINT leave_requests_reason_required CHECK (length(btrim(reason)) > 0),
  CONSTRAINT leave_requests_rejection_note CHECK (
    status <> 'rejected' OR length(btrim(coalesce(review_note, ''))) > 0
  )
);

CREATE INDEX leave_requests_store_status_start_idx ON leave_requests (store_id, status, start_date);
CREATE INDEX leave_requests_user_start_idx ON leave_requests (user_id, start_date);

ALTER TABLE leave_requests
  ADD CONSTRAINT leave_requests_no_active_overlap
  EXCLUDE USING gist (
    user_id WITH =,
    store_id WITH =,
    daterange(start_date, end_date, '[]') WITH &&
  ) WHERE (status IN ('pending', 'approved'));
