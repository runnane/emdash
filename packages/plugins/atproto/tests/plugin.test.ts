import { describe, it, expect } from "vitest";

import { atprotoPlugin } from "../src/index.js";
import sandboxEntry from "../src/sandbox-entry.js";

describe("atprotoPlugin descriptor", () => {
	it("returns a valid PluginDescriptor", () => {
		const descriptor = atprotoPlugin();
		expect(descriptor.id).toBe("atproto");
		expect(descriptor.version).toBe("0.1.0");
		expect(descriptor.entrypoint).toBe("@emdash-cms/plugin-atproto/sandbox");
		expect(descriptor.adminPages).toHaveLength(1);
		expect(descriptor.adminWidgets).toHaveLength(1);
	});

	it("declares correct capabilities", () => {
		const descriptor = atprotoPlugin();
		expect(descriptor.capabilities).toContain("read:content");
		expect(descriptor.capabilities).toContain("network:fetch:any");
	});

	it("declares storage with publications collection", () => {
		const descriptor = atprotoPlugin();
		expect(descriptor.storage).toHaveProperty("publications");
		expect(descriptor.storage!.publications!.indexes).toContain("contentId");
		expect(descriptor.storage!.publications!.indexes).toContain("publishedAt");
	});
});

describe("sandbox entry", () => {
	it("has content:afterSave hook with errorPolicy continue", () => {
		const hook = sandboxEntry.hooks!["content:afterSave"];
		expect(hook).toBeDefined();
		expect((hook as { handler: unknown; errorPolicy: string }).errorPolicy).toBeUndefined();
	});

	it("has content:afterDelete hook", () => {
		expect(sandboxEntry.hooks!["content:afterDelete"]).toBeDefined();
	});

	it("has page:metadata hook", () => {
		expect(sandboxEntry.hooks!["page:metadata"]).toBeDefined();
	});

	it("has routes for status, test-connection, sync-publication", () => {
		expect(sandboxEntry.routes).toHaveProperty("status");
		expect(sandboxEntry.routes).toHaveProperty("test-connection");
		expect(sandboxEntry.routes).toHaveProperty("sync-publication");
		expect(sandboxEntry.routes).toHaveProperty("recent-syncs");
		expect(sandboxEntry.routes).toHaveProperty("verification");
	});
});
