import type {
	ActivitySnapshot,
	PaperStats,
	RepoKind,
	RepoStats,
	StorySlide,
	WrappedProfile,
} from "./types";

const MONTH_NAMES = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

export function buildActivitySnapshot(
	models: RepoStats[],
	datasets: RepoStats[],
	spaces: RepoStats[],
	papers: PaperStats[],
): ActivitySnapshot {
	const all = [...models, ...datasets, ...spaces];
	const totalDownloads = all.reduce(
		(acc, item) => acc + (item.downloads ?? 0),
		0,
	);
	const totalLikes = all.reduce((acc, item) => acc + (item.likes ?? 0), 0);
	const totalRepos = all.length;

	const tagFrequency = new Map<string, number>();
	all.forEach((repo) => {
		repo.tags?.forEach((tag) => {
			tagFrequency.set(tag, (tagFrequency.get(tag) ?? 0) + 1);
		});
	});
	const topTags = [...tagFrequency.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 6)
		.map(([tag]) => tag);

	const busiestMonth = findBusiestMonth(all);

	return {
		models,
		datasets,
		spaces,
		papers,
		totalDownloads,
		totalLikes,
		totalRepos,
		topTags,
		busiestMonth,
	};
}

function findBusiestMonth(repos: RepoStats[]): string | undefined {
	const monthHits = new Array(12).fill(0);
	repos.forEach((repo) => {
		const dateString = repo.updatedAt ?? repo.createdAt;
		if (!dateString) {
			return;
		}
		const date = new Date(dateString);
		if (Number.isNaN(date.valueOf())) {
			return;
		}
		monthHits[date.getUTCMonth()] += 1;
	});
	const topIndex = monthHits.findIndex(
		(count) => count === Math.max(...monthHits),
	);
	return topIndex >= 0 ? MONTH_NAMES[topIndex] : undefined;
}

export function deriveArchetype(activity: ActivitySnapshot): string {
	const modelWeight =
		activity.models.length * 2 +
		sumMetric(activity.models, "downloads") * 0.000001;
	const datasetWeight =
		activity.datasets.length * 2 +
		sumMetric(activity.datasets, "downloads") * 0.000001;
	const spaceWeight =
		activity.spaces.length * 2 +
		sumMetric(activity.spaces, "likes") * 0.001;
	const paperWeight = activity.papers.length * 3;

	const weights = [
		{ label: "Model Maestro", weight: modelWeight },
		{ label: "Dataset Architect", weight: datasetWeight },
		{ label: "Space Storyteller", weight: spaceWeight },
		{ label: "Research Curator", weight: paperWeight },
	];

	return (
		weights.sort((a, b) => b.weight - a.weight)[0]?.label ?? "HF Explorer"
	);
}

function sumMetric(repos: RepoStats[], key: "downloads" | "likes"): number {
	return repos.reduce((acc, repo) => acc + (repo[key] ?? 0), 0);
}

export function assignBadges(activity: ActivitySnapshot): string[] {
	const badges: string[] = [];
	if (activity.totalDownloads > 1_000_000) {
		badges.push("Top 1M+ downloads");
	}
	if (activity.totalLikes > 5_000) {
		badges.push("Community favorite");
	}
	if (activity.models.length >= 10) {
		badges.push("Model builder");
	}
	if (activity.datasets.length >= 5) {
		badges.push("Data shaper");
	}
	if (activity.spaces.length >= 3) {
		badges.push("Spaces storyteller");
	}
	if (activity.busiestMonth) {
		badges.push(`Peak month: ${activity.busiestMonth}`);
	}
	if (activity.topTags.length > 0) {
		badges.push(
			`Signature tags: ${activity.topTags.slice(0, 3).join(", ")}`,
		);
	}
	return badges;
}

export function buildSlides(params: {
	profile: WrappedProfile;
	year: number;
	activity: ActivitySnapshot;
	archetype: string;
	badges: string[];
}): StorySlide[] {
	const { profile, year, activity, archetype, badges } = params;
	const fmt = new Intl.NumberFormat("en-US", { notation: "compact" });

	const topModels = sortReposForRanking(activity.models, "model").slice(0, 3);
	const topDatasets = sortReposForRanking(activity.datasets, "dataset").slice(
		0,
		3,
	);
	const topSpaces = sortReposForRanking(activity.spaces, "space").slice(0, 3);

	const slides: StorySlide[] = [
		{
			id: "intro",
			kind: "intro",
			title: `Your ${year} Hugging Face Wrapped`,
			subtitle: `Hello ${profile.displayName ?? profile.handle}!`,
			metrics: [
				{
					label: "Total repositories",
					value: activity.totalRepos.toString(),
					accent: "primary",
				},
				{
					label: "Total downloads",
					value: fmt.format(activity.totalDownloads),
				},
			],
			highlights: activity.topTags.slice(0, 3),
		},
		{
			id: "summary",
			kind: "summary",
			title: "Activity pulse",
			subtitle: "Across models, datasets, spaces and papers",
			metrics: [
				{ label: "Models", value: activity.models.length.toString() },
				{
					label: "Datasets",
					value: activity.datasets.length.toString(),
				},
				{ label: "Spaces", value: activity.spaces.length.toString() },
				{ label: "Papers", value: activity.papers.length.toString() },
			],
			highlights: [
				activity.busiestMonth
					? `Busiest month: ${activity.busiestMonth}`
					: "Consistent contributions all year",
			],
		},
		{
			id: "models",
			kind: "models",
			title: "Top models",
			subtitle:
				topModels.length > 0
					? "Most loved by downloads & likes"
					: "No public models yet",
			metrics: topModels.map((model) => ({
				label: model.name,
				value: `${fmt.format(model.downloads ?? 0)} downloads`,
			})),
			highlights: activity.topTags.slice(0, 2),
		},
		{
			id: "datasets",
			kind: "datasets",
			title: "Top datasets",
			subtitle:
				topDatasets.length > 0
					? "Fueling experiments everywhere"
					: "No public datasets yet",
			metrics: topDatasets.map((dataset) => ({
				label: dataset.name,
				value: `${fmt.format(dataset.downloads ?? 0)} downloads`,
			})),
		},
		{
			id: "spaces",
			kind: "spaces",
			title: "Spaces that sparked engagement",
			subtitle:
				topSpaces.length > 0
					? "Most engaging demos"
					: "No public Spaces yet",
			metrics: topSpaces.map((space) => ({
				label: space.name,
				value: `${fmt.format(space.likes ?? 0)} likes`,
			})),
		},
		{
			id: "badges",
			kind: "badges",
			title: "Badges earned",
			subtitle:
				badges.length > 0
					? "Your year at a glance"
					: "Fresh start — badges await",
			highlights: badges.slice(0, 6),
		},
		{
			id: "archetype",
			kind: "archetype",
			title: "Your archetype",
			subtitle: archetype,
			metrics: [
				{
					label: "Downloads",
					value: fmt.format(activity.totalDownloads),
					accent: "primary",
				},
				{
					label: "Likes",
					value: fmt.format(activity.totalLikes),
				},
				{
					label: "Repos",
					value: activity.totalRepos.toString(),
				},
			],
			highlights: activity.topTags.slice(0, 3),
		},
		{
			id: "cta",
			kind: "cta",
			title: "Share it",
			subtitle: "Download the slides or share your Space link",
			metrics: [
				{
					label: "Models",
					value: activity.models.length.toString(),
				},
				{
					label: "Datasets",
					value: activity.datasets.length.toString(),
				},
				{
					label: "Spaces",
					value: activity.spaces.length.toString(),
				},
			],
		},
	];

	return slides;
}

function sortReposForRanking(repos: RepoStats[], kind: RepoKind): RepoStats[] {
	const withKindPriority = [...repos];

	const createdAtMs = (repo: RepoStats) => {
		const ts = repo.createdAt ?? repo.updatedAt;
		const ms = ts ? Date.parse(ts) : Number.NaN;
		if (Number.isNaN(ms)) {
			return 0;
		}
		return ms;
	};

	withKindPriority.sort((a, b) => {
		const downloadsDiff = (b.downloads ?? 0) - (a.downloads ?? 0);
		const likesDiff = (b.likes ?? 0) - (a.likes ?? 0);
		const recencyDiff = createdAtMs(b) - createdAtMs(a);
		const nameDiff = a.name.localeCompare(b.name);

		if (kind === "space") {
			// Spaces focus on engagement (likes), then downloads if present.
			if (likesDiff !== 0) {
				return likesDiff;
			}
			if (downloadsDiff !== 0) {
				return downloadsDiff;
			}
			if (recencyDiff !== 0) {
				return recencyDiff;
			}
			return nameDiff;
		}

		// Models/datasets: downloads first, likes second, recency third.
		if (downloadsDiff !== 0) {
			return downloadsDiff;
		}
		if (likesDiff !== 0) {
			return likesDiff;
		}
		if (recencyDiff !== 0) {
			return recencyDiff;
		}
		return nameDiff;
	});

	return withKindPriority;
}
