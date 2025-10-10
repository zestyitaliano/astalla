# Frontend

## Auth Debug

- Required environment variables:
  - `NEXTAUTH_URL`
  - `NEXTAUTH_SECRET`
  - `NEXT_PUBLIC_API_BASE_URL`
  - `API_BASE_URL`
  - `MOCK_MODE=false`
- View Vercel function logs:
  1. Open the Vercel dashboard for the frontend project.
  2. Choose the deployment you want to inspect.
  3. Select the **Functions** tab and open `api/auth/[...nextauth]` to stream the server logs.
- Test the backend login endpoint with curl:

  ```bash
  curl -i -X POST "$API_BASE_URL/auth/basic-login" \
    -H "Content-Type: application/json" \
    -d '{"identifier":"user@example.com","password":"<password>"}'
  ```
