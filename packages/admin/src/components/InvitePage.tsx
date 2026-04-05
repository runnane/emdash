/**
 * Invite Page - Accept an invite and create an account
 *
 * This component is NOT wrapped in the admin Shell.
 * It's a standalone public page for accepting invitations.
 *
 * Flow:
 * 1. Token in URL → verify invite
 * 2. Show passkey registration to create account
 */

import { Button, Input, Loader } from "@cloudflare/kumo";
import { Link } from "@tanstack/react-router";
import * as React from "react";

import { verifyInviteToken, type InviteVerifyResult } from "../lib/api";
import { PasskeyRegistration } from "./auth/PasskeyRegistration";
import { LogoLockup } from "./Logo.js";

// ============================================================================
// Types
// ============================================================================

type InviteStep = "loading" | "verify" | "error";

// ============================================================================
// Step Components
// ============================================================================

interface VerifyStepProps {
	verifyResult: InviteVerifyResult;
	token: string;
}

function handleInviteSuccess() {
	window.location.href = "/_emdash/admin";
}

function VerifyStep({ verifyResult, token }: VerifyStepProps) {
	const [name, setName] = React.useState("");

	return (
		<div className="space-y-6">
			<div className="text-center">
				<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mx-auto mb-4">
					<svg
						className="w-8 h-8 text-green-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
					</svg>
				</div>
				<h2 className="text-xl font-semibold">You've been invited!</h2>
				<p className="text-kumo-subtle mt-2">
					Create your account as{" "}
					<span className="font-medium text-kumo-default">{verifyResult.roleName}</span>
				</p>
			</div>

			{/* Email display (read-only) */}
			<Input label="Email" value={verifyResult.email} disabled className="bg-kumo-tint" />

			{/* Name input (optional) */}
			<Input
				label="Your name (optional)"
				type="text"
				value={name}
				onChange={(e) => setName(e.target.value)}
				placeholder="Jane Doe"
				autoComplete="name"
			/>

			{/* Passkey registration */}
			<div className="pt-4 border-t">
				<h3 className="text-sm font-medium mb-3">Create your passkey</h3>
				<p className="text-sm text-kumo-subtle mb-4">
					Passkeys are a secure, passwordless way to sign in using your device's biometrics, PIN, or
					security key.
				</p>

				<PasskeyRegistration
					optionsEndpoint="/_emdash/api/setup/admin"
					verifyEndpoint="/_emdash/api/auth/invite/complete"
					onSuccess={handleInviteSuccess}
					buttonText="Create Account"
					additionalData={{ token, name: name || undefined }}
				/>
			</div>
		</div>
	);
}

interface ErrorStepProps {
	message: string;
	code?: string;
}

function ErrorStep({ message, code }: ErrorStepProps) {
	return (
		<div className="space-y-6 text-center">
			<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-kumo-danger/10 mx-auto">
				<svg
					className="w-8 h-8 text-kumo-danger"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
					/>
				</svg>
			</div>

			<div>
				<h2 className="text-xl font-semibold text-kumo-danger">
					{code === "TOKEN_EXPIRED"
						? "Invite expired"
						: code === "INVALID_TOKEN"
							? "Invalid invite"
							: code === "USER_EXISTS"
								? "Account exists"
								: "Something went wrong"}
				</h2>
				<p className="text-kumo-subtle mt-2">{message}</p>
			</div>

			<div className="space-y-2">
				{code === "USER_EXISTS" && (
					<Link to="/login">
						<Button className="w-full">Sign in instead</Button>
					</Link>
				)}
				<Link to="/login">
					<Button variant="ghost" className="w-full">
						Back to login
					</Button>
				</Link>
			</div>
		</div>
	);
}

// ============================================================================
// Main Component
// ============================================================================

export function InvitePage() {
	const [step, setStep] = React.useState<InviteStep>("loading");
	const [error, setError] = React.useState<string | undefined>();
	const [errorCode, setErrorCode] = React.useState<string | undefined>();
	const [verifyResult, setVerifyResult] = React.useState<InviteVerifyResult | null>(null);
	const [token, setToken] = React.useState<string | null>(null);

	React.useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const urlToken = params.get("token");

		if (!urlToken) {
			setError("No invite token provided");
			setStep("error");
			return;
		}

		setToken(urlToken);
		void verifyToken(urlToken);
	}, []);

	const verifyToken = async (tokenToVerify: string) => {
		try {
			const result = await verifyInviteToken(tokenToVerify);
			setVerifyResult(result);
			setStep("verify");
		} catch (err) {
			const verifyError = err instanceof Error ? err : new Error(String(err));
			const errorWithCode = verifyError as Error & { code?: string };
			setError(verifyError.message);
			setErrorCode(typeof errorWithCode.code === "string" ? errorWithCode.code : undefined);
			setStep("error");
		}
	};

	if (step === "loading") {
		return (
			<div className="min-h-screen flex items-center justify-center bg-kumo-base">
				<div className="text-center">
					<Loader />
					<p className="mt-4 text-kumo-subtle">Verifying your invite...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-kumo-base p-4">
			<div className="w-full max-w-md">
				{/* Header */}
				<div className="text-center mb-8">
					<LogoLockup className="h-10 mx-auto mb-2" />
					<h1 className="text-2xl font-semibold text-kumo-default">
						{step === "verify" && "Accept Invite"}
						{step === "error" && "Oops!"}
					</h1>
				</div>

				{/* Form Card */}
				<div className="bg-kumo-base border rounded-lg shadow-sm p-6">
					{step === "verify" && verifyResult && token && (
						<VerifyStep verifyResult={verifyResult} token={token} />
					)}

					{step === "error" && (
						<ErrorStep message={error ?? "An unknown error occurred"} code={errorCode} />
					)}
				</div>
			</div>
		</div>
	);
}

export default InvitePage;
