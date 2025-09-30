-- Seed data for Astalla Control
INSERT INTO "Org" (id, name) VALUES
  ('org_demo', 'Astalla Demo Org')
ON CONFLICT (id) DO NOTHING;

INSERT INTO "Property" (id, orgId, propertyCode, name, region, unitCount)
VALUES
  ('prop_north', 'org_demo', 'AST-NORTH', 'Astalla North', 'North', 120),
  ('prop_central', 'org_demo', 'AST-CENTRAL', 'Astalla Central', 'Central', 95),
  ('prop_south', 'org_demo', 'AST-SOUTH', 'Astalla South', 'South', 140)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "User" (id, email, name)
VALUES
  ('user_admin', 'admin@astalla.com', 'Org Admin'),
  ('user_regional', 'regional@astalla.com', 'Regional Manager')
ON CONFLICT (id) DO NOTHING;

INSERT INTO "UserOrgRole" (id, orgId, userId, role)
VALUES
  ('role_admin', 'org_demo', 'user_admin', 'ORG_ADMIN'),
  ('role_regional', 'org_demo', 'user_regional', 'REGIONAL')
ON CONFLICT (id) DO NOTHING;

-- Example leads, events, applications, leases, spend, conversions, reviews inserted via TypeScript seed script.
