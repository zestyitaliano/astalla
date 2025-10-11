#!/usr/bin/env bash
set -euo pipefail
API_BASE_URL=${1:-http://localhost:4001}
TOKEN=${2:-}
if [ -z "$TOKEN" ]; then
  echo "Usage: $0 <api_base> <jwt>"
  exit 1
fi
curl -i -sS "$API_BASE_URL/admin/sources" \
  -H "Authorization: Bearer $TOKEN"
echo
