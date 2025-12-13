/// <reference path="./node.d.ts" />
import type {
	GenerateWrappedInput,
	SubjectType,
	WrappedCacheEntry,
	WrappedResult,
} from "../domain/types";

/**
 * Dataset cache placeholder.
 *
 * This module is intentionally neutral: reads are public-only and writes are
 * disabled by default. To enable persistence in a Hugging Face dataset, set:
 * - WRAPPED_DATASET_ID="username/dataset-name"
 * - HF_TOKEN with write permissions for that dataset
 * - WRAPPED_DATASET_WRITE=true
 *
 * You can create the dataset via the Hub API:
 * curl -X POST https://huggingface.co/api/repos/create \\
 *   -H "Authorization: Bearer $HF_TOKEN" \\
 *   -d '{"type":"dataset","name":"hf-wrapped-2025"}'
 */

const DATASET_ID = process.env.WRAPPED_DATASET_ID;
const WRITE_ENABLED = process.env.WRAPPED_DATASET_WRITE === "true";
const HUB_BASE_URL = "https://huggingface.co";
const DATA_DIR = process.env.WRAPPED_DATASET_DIR ?? "data";
// Per-user/year JSON (avoids concurrent writes on a single file)

export async function readCachedWrapped(
	input: GenerateWrappedInput,
): Promise<WrappedCacheEntry | null> {
	if (!DATASET_ID) {
		return null;
	}

	const subjectCandidates: SubjectType[] =
		input.subjectType && input.subjectType !== "auto"
			? [input.subjectType]
			: ["user", "organization"];

	for (const subjectType of subjectCandidates) {
		const url = buildResolveUrl({
			handle: input.handle,
			year: input.year,
			subjectType,
		});
		const cached = await safeJsonFetch<WrappedCacheEntry>(url);
		if (cached) {
			return cached;
		}
	}

	return null;
}

export async function writeWrappedSnapshot(
	result: WrappedResult,
): Promise<void> {
	if (!DATASET_ID || !WRITE_ENABLED) {
		return;
	}
	const token = process.env.HF_TOKEN;
	if (!token) {
		return;
	}

	await writePerUserJson(result, token);
}

function buildResolveUrl(params: {
	handle: string;
	year: number;
	subjectType: SubjectType;
}) {
	const path = buildCachePath(params);
	const encodedPath = encodeURIComponent(path).replace(/%2F/g, "/");
	return `${HUB_BASE_URL}/datasets/${DATASET_ID}/resolve/main/${encodedPath}`;
}

async function safeJsonFetch<T>(url: string): Promise<T | null> {
	try {
		const response = await fetch(url, {
			headers: { accept: "application/json" },
			next: { revalidate: 120 },
		} as RequestInit & { next?: { revalidate?: number } });
		if (!response.ok) {
			return null;
		}
		return (await response.json()) as T;
	} catch {
		return null;
	}
}

async function writePerUserJson(
	result: WrappedResult,
	token: string,
): Promise<void> {
	const path = buildCachePath({
		handle: result.profile.handle,
		year: result.year,
		subjectType: result.profile.subjectType,
	});

	const payload = JSON.stringify(result);
	const contentBase64 = Buffer.from(payload, "utf-8").toString("base64");

	const response = await fetch(
		`${HUB_BASE_URL}/api/datasets/${DATASET_ID}/commit?repo_type=dataset`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
				accept: "application/json",
			},
			body: JSON.stringify({
				operations: [
					{
						operation: "add_or_update",
						path_in_repo: path,
						content: contentBase64,
						encoding: "base64",
					},
				],
				commit_message: "Add wrapped snapshot",
				summary: "Add wrapped snapshot",
			}),
		},
	);

	if (!response.ok) {
		const text = await response.text().catch(() => "");
		console.error(
			"[wrapped] Failed to write snapshot",
			JSON.stringify({
				status: response.status,
				statusText: response.statusText,
				path,
				body: text.slice(0, 500),
			}),
		);
		return;
	}

	let info: unknown = null;
	try {
		info = await response.json();
	} catch {
		// ignore
	}

	console.log(
		"[wrapped] Snapshot stored",
		JSON.stringify({
			dataset: DATASET_ID,
			path,
			status: response.status,
			info,
		}),
	);
}

function buildCachePath(params: {
	handle: string;
	year: number;
	subjectType: SubjectType;
}) {
	const fileName = `${params.year}-${params.subjectType}-${params.handle}.json`;
	return `${DATA_DIR}/${fileName}`;
}
