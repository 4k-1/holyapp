CREATE TABLE IF NOT EXISTS permission (
  key VARCHAR(80) PRIMARY KEY,
  label VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS role_permission (
  role user_role NOT NULL,
  permission_key VARCHAR(80) NOT NULL REFERENCES permission(key) ON DELETE CASCADE,
  allowed BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (role, permission_key)
);

INSERT INTO permission (key, label, description, sort_order) VALUES
  ('view_own_profile', 'View own profile', 'See personal account details.', 10),
  ('update_own_profile', 'Update own profile', 'Edit name, contact, and address on the signed-in account.', 20),
  ('view_sacramental_timeline', 'View sacramental timeline', 'Parishioners can see baptism, confirmation, marriage, and burial records matched to them.', 30),
  ('manage_certificate_requests', 'Manage certificate requests', 'Work the parish certificate request queue.', 40),
  ('manage_sacramental_records', 'Manage sacramental records', 'Search, create, and edit register entries.', 50),
  ('manage_staff_accounts', 'Manage staff accounts', 'Add or deactivate parish office accounts.', 60),
  ('manage_parish_settings', 'Manage parish settings', 'Edit parish profile, fees, and certificate configuration.', 70),
  ('view_platform', 'View platform overview', 'See parishes and accounts across HolyApp.', 80),
  ('manage_role_permissions', 'Manage role permissions', 'Change what each role is allowed to do.', 90)
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permission (role, permission_key, allowed) VALUES
  ('parish_admin', 'view_own_profile', true),
  ('parish_admin', 'update_own_profile', true),
  ('parish_admin', 'view_sacramental_timeline', false),
  ('parish_admin', 'manage_certificate_requests', true),
  ('parish_admin', 'manage_sacramental_records', true),
  ('parish_admin', 'manage_staff_accounts', true),
  ('parish_admin', 'manage_parish_settings', true),
  ('parish_admin', 'view_platform', false),
  ('parish_admin', 'manage_role_permissions', false),
  ('parish_staff', 'view_own_profile', true),
  ('parish_staff', 'update_own_profile', true),
  ('parish_staff', 'view_sacramental_timeline', false),
  ('parish_staff', 'manage_certificate_requests', true),
  ('parish_staff', 'manage_sacramental_records', true),
  ('parish_staff', 'manage_staff_accounts', false),
  ('parish_staff', 'manage_parish_settings', false),
  ('parish_staff', 'view_platform', false),
  ('parish_staff', 'manage_role_permissions', false),
  ('parishioner', 'view_own_profile', true),
  ('parishioner', 'update_own_profile', true),
  ('parishioner', 'view_sacramental_timeline', true),
  ('parishioner', 'manage_certificate_requests', false),
  ('parishioner', 'manage_sacramental_records', false),
  ('parishioner', 'manage_staff_accounts', false),
  ('parishioner', 'manage_parish_settings', false),
  ('parishioner', 'view_platform', false),
  ('parishioner', 'manage_role_permissions', false)
ON CONFLICT (role, permission_key) DO NOTHING;
