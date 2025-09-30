-- Seed data for local development
INSERT INTO "Org" (id, name) VALUES
  ('org-1', 'Astalla Residential'),
  ('org-2', 'Astalla West')
ON CONFLICT (id) DO NOTHING;

INSERT INTO "Property" (id, "orgId", "propertyCode", name, region, "unitCount") VALUES
  ('prop-1', 'org-1', 'AST-100', 'Astalla Heights', 'Austin', 210),
  ('prop-2', 'org-1', 'AST-200', 'Astalla Commons', 'Dallas', 165),
  ('prop-3', 'org-2', 'AST-300', 'Astalla Landing', 'Phoenix', 190)
ON CONFLICT (id) DO NOTHING;

-- Additional seed statements would populate leads, applications, leases, spend, conversions, and reviews.
