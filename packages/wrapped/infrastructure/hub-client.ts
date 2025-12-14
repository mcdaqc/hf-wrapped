import type {
	PaperStats,
	RepoKind,
	RepoStats,
	SubjectType,
	WrappedProfile,
} from "../domain/types";

const HUB_BASE_URL = "https://huggingface.co";
// To cap page size, set a number (e.g., 200). Leave undefined to fetch all pages.
const DEFAULT_LIMIT: number | undefined = undefined;

function buildHandleCandidates(handle: string): string[] {
	const trimmed = handle.trim();
	const noAt = trimmed.replace(/^@/, "");
	const lower = trimmed.toLowerCase();
	const lowerNoAt = noAt.toLowerCase();
	// Deduplicate while preserving order
	return Array.from(new Set([trimmed, noAt, lower, lowerNoAt]));
}

type HubRepoResponse = {
	id: string;
	likes?: number;
	downloads?: number;
	tags?: string[];
	private?: boolean;
	author?: string;
	lastModified?: string;
	createdAt?: string;
	task?: string;
};

type HubUser = {
	name?: string;
	avatarUrl?: string;
	bio?: string;
};

export type HubActivityResponse = {
	profile: WrappedProfile;
	models: RepoStats[];
	datasets: RepoStats[];
	spaces: RepoStats[];
	papers: PaperStats[];
};

export async function detectSubjectType(
	handle: string,
): Promise<{ subjectType: SubjectType; profile: WrappedProfile }> {
	const candidates = buildHandleCandidates(handle);
	let lastError: unknown;

	for (const candidate of candidates) {
		try {
			const org = await safeJsonFetch<HubUser>(
				`${HUB_BASE_URL}/api/organizations/${candidate}`,
			);
			if (org) {
				return {
					subjectType: "organization",
					profile: {
						handle: candidate,
						displayName: org.name ?? candidate,
						avatarUrl: org.avatarUrl,
						bio: org.bio,
						subjectType: "organization",
					},
				};
			}

			const user = await safeJsonFetch<HubUser>(
				`${HUB_BASE_URL}/api/users/${candidate}`,
			);
			if (user) {
				return {
					subjectType: "user",
					profile: {
						handle: candidate,
						displayName: user.name ?? candidate,
						avatarUrl: user.avatarUrl,
						bio: user.bio,
						subjectType: "user",
					},
				};
			}
		} catch (error) {
			// Guardamos el último error para reportarlo si ninguna variante funciona
			lastError = error;
		}
	}

	throw new Error(
		`Handle not found on Hugging Face Hub (tried: ${candidates.join(
			", ",
		)})${lastError ? ` — last error: ${(lastError as Error).message}` : ""}`,
	);
}

export async function fetchHubActivity(
	handle: string,
	subjectType: SubjectType,
	year: number,
	profileOverride?: WrappedProfile,
): Promise<HubActivityResponse> {
	let profile: WrappedProfile;
	let resolvedSubjectType: SubjectType = subjectType;

	if (profileOverride) {
		profile = profileOverride;
	} else {
		try {
			const detected = await detectSubjectType(handle);
			profile = detected.profile;
			resolvedSubjectType = detected.subjectType;
		} catch {
			const base = handle.trim().replace(/^@/, "");
			const normalized = base.toLowerCase();
			profile = {
				handle: normalized,
				displayName: base || normalized,
				subjectType: subjectType,
			};
		}
	}

	const canonicalAuthor = profile.handle.replace(/^@/, "");
	const inputAuthor = handle.trim().replace(/^@/, "");
	const authorCandidates = Array.from(
		new Set([
			// As resolved by detectSubjectType
			canonicalAuthor,
			canonicalAuthor.toLowerCase(),
			// As provided by the user (preserve casing)
			inputAuthor,
			inputAuthor.toLowerCase(),
		]),
	);

	console.log(
		"[wrapped] fetchHubActivity",
		JSON.stringify({
			inputHandle: handle,
			resolvedSubjectType,
			authorCandidates,
		}),
	);

	const [models, datasets, spaces, papers] = await Promise.all([
		fetchReposWithFallback("model", authorCandidates, year),
		fetchReposWithFallback("dataset", authorCandidates, year),
		fetchReposWithFallback("space", authorCandidates, year),
		fetchPapersWithFallback(authorCandidates),
	]);

	const filteredModels = collectYearSortedDesc(models, year);
	const filteredDatasets = collectYearSortedDesc(datasets, year);
	const filteredSpaces = collectYearSortedDesc(spaces, year);

	console.log(
		"[wrapped] fetchHubActivity results",
		JSON.stringify({
			models: filteredModels.length,
			datasets: filteredDatasets.length,
			spaces: filteredSpaces.length,
			papers: papers.length,
		}),
	);

	return {
		profile: { ...profile, subjectType: resolvedSubjectType },
		models: filteredModels,
		datasets: filteredDatasets,
		spaces: filteredSpaces,
		papers,
	};
}

async function fetchRepos(
	kind: RepoKind,
	author: string,
	year?: number,
): Promise<RepoStats[]> {
	const results: RepoStats[] = [];
	let nextUrl: string | undefined;
	const limitParam =
		typeof DEFAULT_LIMIT === "number" ? `&limit=${DEFAULT_LIMIT}` : "";
	const baseUrl = `${HUB_BASE_URL}/api/${kind}s?author=${author}${limitParam}&full=true&sort=createdAt&direction=-1`;
	nextUrl = baseUrl;

	while (true) {
		if (!nextUrl) {
			break;
		}

		const raw = await safeJsonFetch<
			| HubRepoResponse[]
			| { items?: HubRepoResponse[]; next?: string; cursor?: string }
		>(nextUrl);
		if (!raw) {
			break;
		}

		const { items, nextCursor } = normalizeRepoPage(raw);
		if (!items || items.length === 0) {
			break;
		}

		results.push(
			...items.map((repo) => ({
				id: repo.id,
				name: repo.id.split("/")[1] ?? repo.id,
				kind,
				author,
				likes: repo.likes ?? 0,
				downloads: repo.downloads ?? 0,
				tags: repo.tags,
				private: repo.private,
				updatedAt: repo.lastModified,
				createdAt: repo.createdAt,
				task: repo.task,
			})),
		);

		if (year) {
			const lastWithDate = [...items]
				.reverse()
				.find((repo) => typeof repo.createdAt === "string");
			if (lastWithDate?.createdAt) {
				const lastYear = new Date(
					lastWithDate.createdAt,
				).getUTCFullYear();
				if (!Number.isNaN(lastYear) && lastYear < year) {
					break;
				}
			}
		}

		if (!nextCursor) {
			break;
		}

		if (nextCursor.startsWith("http")) {
			nextUrl = nextCursor;
		} else {
			nextUrl = `${baseUrl}&cursor=${encodeURIComponent(nextCursor)}`;
		}
	}

	return results;
}

async function fetchReposWithFallback(
	kind: RepoKind,
	authors: string[],
	year?: number,
): Promise<RepoStats[]> {
	for (const author of authors) {
		try {
			const repos = await fetchRepos(kind, author, year);
			console.log(
				`[wrapped] fetchRepos ${kind}`,
				JSON.stringify({ author, count: repos.length }),
			);
			if (repos.length > 0) {
				return repos;
			}
		} catch (error) {
			console.error(
				`[wrapped] fetchRepos ${kind} failed`,
				JSON.stringify({
					author,
					error: (error as Error).message,
				}),
			);
		}
	}
	// If all attempts return empty, return the last attempt (or empty)
	return [];
}

async function fetchPapers(handle: string): Promise<PaperStats[]> {
	const url = `${HUB_BASE_URL}/api/daily_papers?submitter=${handle}&limit=20`;
	const papers =
		await safeJsonFetch<
			Array<{
				arxivId: string;
				title: string;
				summary?: string;
				submitter?: string;
				publishedAt?: string;
				url?: string;
			}>
		>(url);
	if (!papers) {
		return [];
	}
	return papers.map((paper) => ({
		id: paper.arxivId,
		title: paper.title,
		summary: paper.summary,
		submitter: paper.submitter,
		publishedAt: paper.publishedAt,
		link: paper.url ?? `${HUB_BASE_URL}/papers/${paper.arxivId}`,
	}));
}

async function fetchPapersWithFallback(
	handles: string[],
): Promise<PaperStats[]> {
	for (const handle of handles) {
		try {
			const papers = await fetchPapers(handle);
			console.log(
				"[wrapped] fetchPapers",
				JSON.stringify({ handle, count: papers.length }),
			);
			if (papers.length > 0) {
				return papers;
			}
		} catch (error) {
			console.error(
				"[wrapped] fetchPapers failed",
				JSON.stringify({
					handle,
					error: (error as Error).message,
				}),
			);
		}
	}
	return [];
}

async function safeJsonFetch<T>(url: string): Promise<T | null> {
	try {
		const response = await fetch(url, {
			headers: {
				accept: "application/json",
			},
		});
		if (!response.ok) {
			throw new Error(
				`Request failed ${response.status} ${response.statusText} for ${url}`,
			);
		}
		return (await response.json()) as T;
	} catch (error) {
		throw new Error(
			`Failed to fetch ${url}: ${(error as Error).message ?? "unknown error"}`,
		);
	}
}

function normalizeRepoPage(
	raw:
		| HubRepoResponse[]
		| { items?: HubRepoResponse[]; next?: string; cursor?: string },
): { items: HubRepoResponse[]; nextCursor?: string } {
	if (Array.isArray(raw)) {
		return { items: raw, nextCursor: undefined };
	}
	const items = Array.isArray(raw.items) ? raw.items : [];
	const nextCursor = typeof raw.next === "string" ? raw.next : raw.cursor;
	return { items, nextCursor };
}

function collectYearSortedDesc<T extends { createdAt?: string }>(
	items: T[],
	year: number,
): T[] {
	const results: T[] = [];
	for (const item of items) {
		if (!item.createdAt) {
			continue;
		}
		const yr = new Date(item.createdAt).getUTCFullYear();
		if (Number.isNaN(yr)) {
			continue;
		}
		if (yr < year) {
			break;
		}
		if (yr === year) {
			results.push(item);
		}
	}
	return results;
}
