/* eslint-disable no-console */

const LOGIN_TIMEOUT_MS = 8000;
const baseUrl = (process.env.API_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

if (!baseUrl) {
  console.error("[verify-auth] Missing API_BASE_URL environment variable");
  process.exit(1);
}

async function postJson(url: string, body: Record<string, unknown>) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS);

  try {
    return await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function main() {
  const email = `verify-${Date.now()}@example.com`;
  const password = "AuthTest2025!";
  const name = "Verify Auth";

  const registerUrl = `${baseUrl}/auth/register`;
  console.log(`[verify-auth] POST ${registerUrl}`);

  let registerOk = false;
  try {
    const registerResponse = await postJson(registerUrl, { email, password, name });
    console.log(`[verify-auth] register status=${registerResponse.status}`);

    if (registerResponse.status === 409) {
      console.warn("[verify-auth] register returned conflict - continuing");
      registerOk = true;
    } else if (registerResponse.ok) {
      registerOk = true;
    } else {
      const body = await safeReadJson(registerResponse);
      console.error("[verify-auth] register failed", body);
    }
  } catch (error) {
    console.error("[verify-auth] register request threw", error);
  }

  const loginUrl = `${baseUrl}/auth/basic-login`;
  console.log(`[verify-auth] POST ${loginUrl}`);

  let loginOk = false;
  try {
    const loginResponse = await postJson(loginUrl, { identifier: email, password });
    console.log(`[verify-auth] login status=${loginResponse.status}`);

    if (loginResponse.status === 200) {
      const body = await safeReadJson(loginResponse);
      if (body && typeof body === "object" && typeof (body as { token?: unknown }).token === "string") {
        loginOk = true;
      } else {
        console.error("[verify-auth] login response missing token", body);
      }
    } else {
      const body = await safeReadJson(loginResponse);
      console.error("[verify-auth] login failed", body);
    }
  } catch (error) {
    console.error("[verify-auth] login request threw", error);
  }

  const passed = registerOk && loginOk;
  if (passed) {
    console.log("[verify-auth] PASS - register+login flow succeeded");
    process.exit(0);
  }

  console.error("[verify-auth] FAIL - see logs above");
  process.exit(1);
}

async function safeReadJson(response: any) {
  try {
    return await response.clone().json();
  } catch (error) {
    console.warn("[verify-auth] failed to parse JSON", error);
    return null;
  }
}

main().catch((error) => {
  console.error("[verify-auth] unexpected error", error);
  process.exit(1);
});
