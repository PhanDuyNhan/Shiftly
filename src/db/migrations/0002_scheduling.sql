CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE availability_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  start_time time NOT NULL,
  end_time time NOT NULL,
  kind text NOT NULL DEFAULT 'busy' CHECK (kind IN ('busy','available')),
  valid_from date NOT NULL DEFAULT current_date,
  valid_to date,
  reason text,
  CHECK (end_time > start_time),
  CHECK (valid_to IS NULL OR valid_to >= valid_from)
);
CREATE INDEX availability_rules_user_weekday_idx ON availability_rules (user_id,weekday);

CREATE TABLE availability_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  on_date date NOT NULL,
  start_time time,
  end_time time,
  kind text NOT NULL CHECK (kind IN ('busy','available')),
  reason text,
  CHECK ((start_time IS NULL) = (end_time IS NULL)),
  CHECK (start_time IS NULL OR end_time > start_time)
);
CREATE INDEX availability_exceptions_user_date_idx ON availability_exceptions (user_id,on_date);

CREATE TABLE shift_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  shift_template_id uuid NOT NULL REFERENCES shift_templates(id),
  preference smallint NOT NULL CHECK (preference IN (-1,1,2)),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id,work_date,shift_template_id)
);
CREATE INDEX shift_preferences_store_date_idx ON shift_preferences (store_id,work_date);

CREATE TABLE schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id),
  week_start date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  published_at timestamptz,
  published_by uuid REFERENCES users(id),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id,week_start),
  CHECK (EXTRACT(ISODOW FROM week_start) = 1)
);
CREATE INDEX schedules_store_week_idx ON schedules (store_id,week_start);

CREATE TABLE shift_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  shift_template_id uuid NOT NULL REFERENCES shift_templates(id),
  position_id uuid NOT NULL REFERENCES positions(id),
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  min_count smallint NOT NULL CHECK (min_count >= 0),
  ideal_count smallint NOT NULL CHECK (ideal_count >= min_count),
  CHECK (end_at > start_at),
  UNIQUE (schedule_id,work_date,shift_template_id,position_id)
);

CREATE TABLE shift_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL REFERENCES shift_slots(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('auto','manual','swap','claimed')),
  is_pinned boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','needs_cover','cancelled')),
  note text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slot_id,user_id),
  CONSTRAINT shift_assignments_no_assigned_overlap EXCLUDE USING gist (
    user_id WITH =,
    tstzrange(start_at,end_at,'[)') WITH &&
  ) WHERE (status = 'assigned')
);
CREATE INDEX shift_assignments_user_start_idx ON shift_assignments (user_id,start_at);

CREATE TABLE schedule_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  algorithm text NOT NULL DEFAULT 'greedy' CHECK (algorithm='greedy'),
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','succeeded','failed')),
  score numeric,
  runtime_ms integer,
  unfilled_slots integer,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  fairness jsonb,
  triggered_by uuid NOT NULL REFERENCES users(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE TABLE schedule_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  version integer NOT NULL,
  snapshot jsonb NOT NULL,
  reason text NOT NULL CHECK (length(btrim(reason))>0),
  changed_by uuid REFERENCES users(id),
  changed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (schedule_id,version)
);
