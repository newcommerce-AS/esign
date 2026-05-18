# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: happy-path.spec.ts >> happy path: create → confirm → 2 signers sign → row deleted (404)
- Location: tests/e2e/happy-path.spec.ts:4:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Bekreftet')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Bekreftet')

```

```yaml
- banner:
  - link "esign forsiden":
    - /url: /
    - text: esign
  - navigation:
    - link "Hvordan":
      - /url: /#hvordan
    - link "Tillit":
      - /url: /#tillit
    - link "FAQ":
      - /url: /#faq
    - link "API & MCP":
      - /url: /#api
    - link "GitHub":
      - /url: https://github.com/newcommerce-no/esign
    - link "Start signering":
      - /url: /#start
- heading "Ugyldig eller utløpt bekreftelses-lenke" [level=1]
- paragraph: Lenken kan ha utløpt (gyldig i 24 timer), vært brukt allerede eller blitt kopiert ufullstendig fra e-posten.
- link "Opprett nytt oppdrag":
  - /url: /
- contentinfo:
  - text: esign © 2026 newcommerce.no
  - navigation:
    - link "Spesifikasjon":
      - /url: "#"
    - link "GitHub":
      - /url: https://github.com/newcommerce-no/esign
    - link "hei@newcommerce.no":
      - /url: mailto:hei@newcommerce.no
- alert
```

# Test source

```ts
  1  | import { test, expect, request } from "@playwright/test";
  2  | import { getSignTokensForRequest } from "./helpers";
  3  | 
  4  | test("happy path: create → confirm → 2 signers sign → row deleted (404)", async ({ page, baseURL }) => {
  5  |   const api = await request.newContext({ baseURL });
  6  |   const create = await api.post("/api/v1/signing-requests", {
  7  |     data: {
  8  |       sender_email: "ole+e2e@example.com",
  9  |       document: { filename: "test.txt", format: "text", content_base64: Buffer.from("E2E happy path content").toString("base64") },
  10 |       signers: [
  11 |         { name: "Sig One", email: "sig1+e2e@example.com" },
  12 |         { name: "Sig Two", email: "sig2+e2e@example.com" },
  13 |       ],
  14 |     },
  15 |   });
  16 |   expect(create.ok()).toBeTruthy();
  17 |   const body = await create.json();
  18 |   expect(body.status).toBe("awaiting_sender_confirm");
  19 |   expect(body.confirm_url).toContain("/confirm/");
  20 |   expect(body.signers).toHaveLength(2);
  21 | 
  22 |   await page.goto(body.confirm_url);
> 23 |   await expect(page.getByText("Bekreftet")).toBeVisible();
     |                                             ^ Error: expect(locator).toBeVisible() failed
  24 | 
  25 |   const signTokens = await getSignTokensForRequest(body.id);
  26 |   for (const s of signTokens) {
  27 |     await page.goto(`/sign/${s.signToken}`);
  28 |     await expect(page.getByText("har sendt deg")).toBeVisible();
  29 |     await page.locator('input[type="checkbox"]').check();
  30 |     await page.getByRole("button", { name: "Signer" }).click();
  31 |     await expect(page.getByText("dokumentet er signert", { exact: false })).toBeVisible({ timeout: 30_000 });
  32 |   }
  33 | 
  34 |   // After the last signer signs, completeIfDone fires synchronously and deletes the row.
  35 |   // The last sign POST response should carry completed: true.
  36 |   // Subsequent GET on the signing request should return 404 (row deleted).
  37 |   const statusAfter = await api.get(`/api/v1/signing-requests/${body.id}`, { headers: { "x-lookup-token": body.sender_lookup_token } });
  38 |   expect(statusAfter.status()).toBe(404);
  39 | });
  40 | 
```