import { generateWrapped } from "@repo/wrapped";
import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
	handle: z.string().trim().min(2).max(80),
	subjectType: z.enum(["user", "organization", "auto"]).optional(),
	year: z.number().int().min(2000).max(2100).optional(),
	allowRefresh: z.boolean().optional(),
});

const rateLimitEnabled = process.env.WRAPPED_RATE_LIMIT_ENABLED === "true";
const windowMs =
	Number.parseInt(process.env.WRAPPED_RATE_LIMIT_WINDOW_MS ?? "60000", 10) ||
	60000;
const maxRequests =
	Number.parseInt(process.env.WRAPPED_RATE_LIMIT_MAX ?? "30", 10) || 30;
const hits = new Map<string, number[]>();

function track(ip: string) {
	const now = Date.now();
	const entries =
		hits.get(ip)?.filter((timestamp) => now - timestamp < windowMs) ?? [];
	entries.push(now);
	hits.set(ip, entries);
	return entries.length;
}

export async function POST(req: Request) {
	const ip =
		req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
		req.headers.get("x-real-ip") ??
		"unknown";

	if (rateLimitEnabled && track(ip) > maxRequests) {
		return NextResponse.json(
			{ error: "Rate limit exceeded" },
			{ status: 429 },
		);
	}

	let body: unknown;
	try {
		body = await req.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const parsed = requestSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid input", details: parsed.error.format() },
			{ status: 400 },
		);
	}

	const payload = parsed.data;
	const year = payload.year ?? new Date().getUTCFullYear();

	try {
		const result = await generateWrapped({
			...payload,
			year,
		});
		return NextResponse.json(result, { status: 200 });
	} catch (error) {
		console.error("Wrapped generation failed:", error);
		const message =
			(error as Error).message ?? "Failed to generate wrapped";
		// If handle is not found, return 404 for clarity
		if (message.toLowerCase().includes("handle not found")) {
			return NextResponse.json({ error: message }, { status: 404 });
		}
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
