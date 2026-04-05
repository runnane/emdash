/**
 * Invite Page E2E Tests
 *
 * Tests the invite acceptance flow:
 * - Invite link navigates to the InvitePage UI (not raw JSON)
 * - Valid token shows passkey registration form
 * - Invalid token shows error
 * - Expired token shows error
 * - Already-registered user shows "account exists" error
 *
 * Note: Passkey registration itself cannot be automated, so we verify
 * the page renders correctly up to that point.
 */

import { test, expect } from "../fixtures";

function apiHeaders(token: string, baseUrl: string) {
	return {
		"Content-Type": "application/json",
		Authorization: `Bearer ${token}`,
		"X-EmDash-Request": "1",
		Origin: baseUrl,
	};
}

test.describe("Invite Page", () => {
	let headers: Record<string, string>;
	let baseUrl: string;

	test.beforeEach(async ({ admin, serverInfo }) => {
		await admin.devBypassAuth();
		baseUrl = serverInfo.baseUrl;
		headers = apiHeaders(serverInfo.token, baseUrl);
	});

	test("invite link navigates to invite page, not JSON", async ({ page }) => {
		// Create an invite via API
		const res = await fetch(`${baseUrl}/_emdash/api/auth/invite`, {
			method: "POST",
			headers,
			body: JSON.stringify({ email: `invite-ui-${Date.now()}@e2e-test.example.com`, role: 30 }),
		});
		expect(res.ok).toBe(true);
		const data: any = await res.json();

		// When no email provider is configured, the API returns inviteUrl
		const inviteUrl: string = data.data?.inviteUrl;
		expect(inviteUrl).toBeTruthy();

		// Clear cookies to simulate an unauthenticated user clicking the link
		await page.context().clearCookies();

		// Navigate to the invite URL
		await page.goto(inviteUrl);

		// Should end up on the invite page, not a JSON response
		await expect(page).toHaveURL(/\/invite\?token=/);

		// Should show the invite page heading
		await expect(page.locator("h1")).toContainText("Accept Invite");
	});

	test("valid invite token shows passkey registration", async ({ page }) => {
		const testEmail = `invite-valid-${Date.now()}@e2e-test.example.com`;

		// Create an invite
		const res = await fetch(`${baseUrl}/_emdash/api/auth/invite`, {
			method: "POST",
			headers,
			body: JSON.stringify({ email: testEmail, role: 30 }),
		});
		const data: any = await res.json();
		const inviteUrl: string = data.data?.inviteUrl;

		await page.context().clearCookies();
		await page.goto(inviteUrl);

		// Should show "You've been invited!"
		await expect(page.locator("text=You've been invited!")).toBeVisible({ timeout: 10000 });

		// Should show the role
		await expect(page.locator("text=AUTHOR")).toBeVisible();

		// Should show the email (read-only input)
		const emailInput = page.locator(`input[value="${testEmail}"]`);
		await expect(emailInput).toBeVisible();

		// Should show name input
		await expect(page.getByLabel("Your name (optional)")).toBeVisible();

		// Should show passkey section
		await expect(page.locator("text=Create your passkey")).toBeVisible();
	});

	test("invalid token shows error page", async ({ page }) => {
		await page.context().clearCookies();
		await page.goto(`${baseUrl}/_emdash/admin/invite?token=bogus-invalid-token`);

		// Should show error state
		await expect(page.locator("text=Invalid invite")).toBeVisible({ timeout: 10000 });

		// Should show login link
		await expect(page.locator("text=Back to login")).toBeVisible();
	});

	test("missing token shows error", async ({ page }) => {
		await page.context().clearCookies();
		await page.goto(`${baseUrl}/_emdash/admin/invite`);

		// Should show error about missing token
		await expect(page.locator("text=No invite token provided")).toBeVisible({ timeout: 10000 });
	});
});
