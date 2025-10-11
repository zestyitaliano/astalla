#!/usr/bin/env bash
set -euo pipefail
API_BASE_URL=${1:-http://localhost:4001}
echo "Login → $API_BASE_URL/auth/basic-login"
curl -i -sS -X POST "$API_BASE_URL/auth/basic-login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@astalla.com","password":"Astalla2025!"}'
echo
