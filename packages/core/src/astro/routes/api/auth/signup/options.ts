/**
 * POST /_emdash/api/auth/signup/options
 *
 * Generate passkey registration options for a self-signup user.
 * Validates the signup token before generating options.
 */

import type { APIRoute } from "astro";

export const prerender = false;

import { validateSignupToken, SignupError } from "@emdash-cms/auth";
import { createKyselyAdapter } from "@emdash-cms/auth/adapters/kysely";
import { generateRegistrationOptions } from "@emdash-cms/auth/passkey";
import { z } from "astro/zod";

import { apiError, apiSuccess, handleError } from "#api/error.js";
import { isParseError, parseBody } from "#api/parse.js";
import { createChallengeStore } from "#auth/challenge-store.js";
import { getPasskeyConfig } from "#auth/passkey-config.js";
import { OptionsRepository } from "#db/repositories/options.js";

const signupOptionsBody = z.object({
	token: z.string().min(1),
});

export const POST: APIRoute = async ({ request, locals }) => {
	const { emdash } = locals;

	if (!emdash?.db) {
		return apiError("NOT_CONFIGURED", "EmDash is not initialized", 500);
	}

	try {
		const body = await parseBody(request, signupOptionsBody);
		if (isParseError(body)) return body;

		// Validate signup token
		const adapter = createKyselyAdapter(emdash.db);
		const result = await validateSignupToken(adapter, body.token);

		// Get passkey config
		const url = new URL(request.url);
		const options = new OptionsRepository(emdash.db);
		const siteName = (await options.get<string>("emdash:site_title")) ?? undefined;
		const passkeyConfig = getPasskeyConfig(url, siteName);

		// Generate registration options with a temporary user
		const challengeStore = createChallengeStore(emdash.db);
		const tempUser = {
			id: `signup-${Date.now()}`,
			email: result.email,
			name: null,
		};

		const registrationOptions = await generateRegistrationOptions(
			passkeyConfig,
			tempUser,
			[],
			challengeStore,
		);

		return apiSuccess({ options: registrationOptions });
	} catch (error) {
		if (error instanceof SignupError) {
			const statusMap: Record<string, number> = {
				invalid_token: 404,
				token_expired: 410,
				user_exists: 409,
				domain_not_allowed: 403,
			};
			return apiError(error.code.toUpperCase(), error.message, statusMap[error.code] ?? 400);
		}

		return handleError(error, "Failed to generate registration options", "SIGNUP_OPTIONS_ERROR");
	}
};
