import type {
	PaperStats,
	RepoKind,
	RepoStats,
	SubjectType,
	WrappedProfile,
} from "../domain/types";

const HUB_BASE_URL = "https://huggingface.co";
const DEFAULT_LIMIT = 50;

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
		fetchReposWithFallback("model", authorCandidates),
		fetchReposWithFallback("dataset", authorCandidates),
		fetchReposWithFallback("space", authorCandidates),
		fetchPapersWithFallback(authorCandidates),
	]);

	console.log(
		"[wrapped] fetchHubActivity results",
		JSON.stringify({
			models: models.length,
			datasets: datasets.length,
			spaces: spaces.length,
			papers: papers.length,
		}),
	);

	return {
		profile: { ...profile, subjectType: resolvedSubjectType },
		models,
		datasets,
		spaces,
		papers,
	};
}

async function fetchRepos(
	kind: RepoKind,
	author: string,
): Promise<RepoStats[]> {
	const url = `${HUB_BASE_URL}/api/${kind}s?author=${author}&limit=${DEFAULT_LIMIT}&full=true&sort=downloads&direction=-1`;
	const repos = await safeJsonFetch<HubRepoResponse[]>(url);
	if (!repos) return [];
	return repos.map((repo) => ({
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
	}));
}

async function fetchReposWithFallback(
	kind: RepoKind,
	authors: string[],
): Promise<RepoStats[]> {
	for (const author of authors) {
		try {
			const repos = await fetchRepos(kind, author);
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
	if (!papers) return [];
	return papers.map((paper) => ({
		id: paper.arxivId,
		title: paper.title,
		summary: paper.summary,
		submitter: paper.submitter,
		publishedAt: paper.publishedAt,
		link: paper.url ?? `${HUB_BASE_URL}/papers/${paper.arxivId}`,
	}));
}

async function fetchPapersWithFallback(handles: string[]): Promise<PaperStats[]> {
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
