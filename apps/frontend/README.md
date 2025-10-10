# Frontend

## Auth Debug

- Required environment variables:
  - `NEXTAUTH_URL`
  - `NEXTAUTH_SECRET`
  - `NEXT_PUBLIC_API_BASE_URL`
- Optional overrides:
  - `API_BASE_URL` (server-only override; falls back to `NEXT_PUBLIC_API_BASE_URL` when unset)
  - `MOCK_MODE=false`
- View Vercel function logs:
  1. Open the Vercel dashboard for the frontend project.
  2. Choose the deployment you want to inspect.
  3. Select the **Functions** tab and open `api/auth/[...nextauth]` to stream the server logs.
- Test the backend registration endpoint with curl:

  ```bash
  curl -i -X POST "$API_BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"email":"user@example.com","password":"MyStrongPass1!","name":"Example User"}'
  ```

- Test the backend login endpoint with curl:

  ```bash
  curl -i -X POST "$API_BASE_URL/auth/basic-login" \
    -H "Content-Type: application/json" \
    -d '{"identifier":"user@example.com","password":"<password>"}'
  ```
