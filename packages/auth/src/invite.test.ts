import { describe, expect, it } from "vitest";

import { createInviteToken } from "./invite.js";
import type { AuthAdapter } from "./types.js";

/** Minimal adapter stub that records created tokens */
function stubAdapter(): AuthAdapter {
	return {
		getUserByEmail: async () => null,
		createToken: async () => {},
		// The remaining methods are not called by createInviteToken
	} as unknown as AuthAdapter;
}

describe("createInviteToken", () => {
	it("preserves baseUrl path prefix in invite URL", async () => {
		const result = await createInviteToken(
			{ baseUrl: "https://example.com/_emdash" },
			stubAdapter(),
			"test@example.com",
			30,
			"admin-user-id",
		);

		const url = new URL(result.url);
		expect(url.pathname).toBe("/_emdash/api/auth/invite/accept");
		expect(url.searchParams.get("token")).toBeTruthy();
	});

	it("works with plain baseUrl without path prefix", async () => {
		const result = await createInviteToken(
			{ baseUrl: "https://example.com" },
			stubAdapter(),
			"test@example.com",
			30,
			"admin-user-id",
		);

		const url = new URL(result.url);
		expect(url.pathname).toBe("/api/auth/invite/accept");
	});

	it("works with trailing slash on baseUrl", async () => {
		const result = await createInviteToken(
			{ baseUrl: "https://example.com/_emdash/" },
			stubAdapter(),
			"test@example.com",
			30,
			"admin-user-id",
		);

		const url = new URL(result.url);
		expect(url.pathname).toBe("/_emdash/api/auth/invite/accept");
	});
});
