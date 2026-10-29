CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (length(btrim(code)) > 0),
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  address text,
  phone text,
  timezone text NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (length(btrim(name)) > 0),
  color text,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  phone text UNIQUE,
  password_hash text NOT NULL,
  system_role text NOT NULL DEFAULT 'user' CHECK (system_role IN ('user','admin')),
  must_change_password boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','locked','left')),
  last_login_at timestamptz,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE TABLE employee_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  display_name text,
  date_of_birth date,
  gender text,
  address text,
  avatar_url text,
  emergency_contact_name text,
  emergency_contact_phone text,
  bank_name text,
  bank_account text,
  note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE store_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  role_in_store text NOT NULL CHECK (role_in_store IN ('employee','manager')),
  employment_type text NOT NULL DEFAULT 'part_time' CHECK (employment_type IN ('full_time','part_time')),
  target_hours_week numeric(5,1),
  max_hours_week numeric(5,1) NOT NULL DEFAULT 48 CHECK (max_hours_week > 0),
  is_primary boolean NOT NULL DEFAULT false,
  joined_at date NOT NULL DEFAULT current_date,
  left_at date,
  UNIQUE (user_id, store_id)
);
CREATE INDEX store_memberships_store_role_idx ON store_memberships (store_id, role_in_store);

CREATE TABLE user_positions (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position_id uuid NOT NULL REFERENCES positions(id),
  skill_level smallint NOT NULL DEFAULT 1 CHECK (skill_level BETWEEN 1 AND 5),
  PRIMARY KEY (user_id, position_id)
);

CREATE TABLE shift_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_peak boolean NOT NULL DEFAULT false,
  is_unsocial boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (store_id, name)
);

CREATE TABLE staffing_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  shift_template_id uuid NOT NULL REFERENCES shift_templates(id),
  position_id uuid NOT NULL REFERENCES positions(id),
  min_count smallint NOT NULL CHECK (min_count >= 0),
  ideal_count smallint NOT NULL CHECK (ideal_count >= min_count),
  UNIQUE (store_id, weekday, shift_template_id, position_id)
);

CREATE TABLE store_settings (
  store_id uuid PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  max_hours_day numeric(4,1) NOT NULL DEFAULT 10 CHECK (max_hours_day > 0),
  min_rest_hours numeric(4,1) NOT NULL DEFAULT 10 CHECK (min_rest_hours >= 0),
  require_weekly_day_off boolean NOT NULL DEFAULT true,
  registration_deadline_weekday smallint NOT NULL DEFAULT 7 CHECK (registration_deadline_weekday BETWEEN 1 AND 7),
  registration_deadline_time time NOT NULL DEFAULT '20:00',
  solver_weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id bigserial PRIMARY KEY,
  actor_id uuid REFERENCES users(id),
  store_id uuid REFERENCES stores(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_entity_idx ON audit_logs (entity_type, entity_id);
CREATE INDEX audit_logs_store_created_idx ON audit_logs (store_id, created_at DESC);

CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf_token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON sessions (user_id);

CREATE TABLE login_attempts (
  identifier_hash text PRIMARY KEY,
  failure_count integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz
);
