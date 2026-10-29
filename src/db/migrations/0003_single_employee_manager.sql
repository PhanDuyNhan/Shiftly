-- An employee has one active home store and one accountable manager.
-- Existing additional memberships are retained as ended history. Prefer the
-- explicitly primary store; otherwise use the earliest joined store by code.
ALTER TABLE store_memberships ADD COLUMN managed_by uuid REFERENCES users(id);

WITH ranked AS (
  SELECT m.id,row_number() OVER (
    PARTITION BY m.user_id ORDER BY m.is_primary DESC,m.joined_at,s.code,m.id
  ) AS rank
  FROM store_memberships m JOIN stores s ON s.id=m.store_id
  WHERE m.role_in_store='employee' AND m.left_at IS NULL
)
UPDATE store_memberships m SET left_at=current_date,is_primary=false
FROM ranked r WHERE m.id=r.id AND r.rank>1;

UPDATE store_memberships m SET is_primary=true
WHERE m.role_in_store='employee' AND m.left_at IS NULL;

UPDATE store_memberships m SET managed_by=COALESCE(
  (SELECT manager.user_id FROM store_memberships manager JOIN users u ON u.id=manager.user_id
    WHERE manager.store_id=m.store_id AND manager.role_in_store='manager'
      AND manager.left_at IS NULL AND u.status='active'
    ORDER BY (manager.user_id=(SELECT created_by FROM users WHERE id=m.user_id)) DESC,manager.id LIMIT 1),
  (SELECT id FROM users WHERE system_role='admin' AND status='active' ORDER BY created_at,id LIMIT 1)
)
WHERE m.role_in_store='employee' AND m.left_at IS NULL;

CREATE UNIQUE INDEX store_memberships_one_active_employee_home
  ON store_memberships(user_id) WHERE role_in_store='employee' AND left_at IS NULL;
CREATE INDEX store_memberships_manager_reports_idx
  ON store_memberships(managed_by) WHERE role_in_store='employee' AND left_at IS NULL;
ALTER TABLE store_memberships ADD CONSTRAINT active_employee_has_manager
  CHECK (role_in_store<>'employee' OR left_at IS NOT NULL OR managed_by IS NOT NULL);
