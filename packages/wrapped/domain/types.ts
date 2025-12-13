export type SubjectType = "user" | "organization";

export type RepoKind = "model" | "dataset" | "space";

export interface RepoStats {
	id: string;
	kind: RepoKind;
	name: string;
	author: string;
	task?: string;
	tags?: string[];
	likes?: number;
	downloads?: number;
	updatedAt?: string;
	createdAt?: string;
	private?: boolean;
}

export interface PaperStats {
	id: string;
	title: string;
	summary?: string;
	submitter?: string;
	publishedAt?: string;
	link?: string;
}

export interface WrappedProfile {
	handle: string;
	displayName?: string;
	avatarUrl?: string;
	bio?: string;
	subjectType: SubjectType;
}

export interface ActivitySnapshot {
	models: RepoStats[];
	datasets: RepoStats[];
	spaces: RepoStats[];
	papers: PaperStats[];
	totalDownloads: number;
	totalLikes: number;
	totalRepos: number;
	topTags: string[];
	busiestMonth?: string;
}

export interface StoryMetric {
	label: string;
	value: string;
	accent?: "primary" | "secondary";
}

export interface StorySlide {
	id: string;
	kind:
		| "intro"
		| "summary"
		| "models"
		| "datasets"
		| "spaces"
		| "papers"
		| "badges"
		| "archetype"
		| "cta"
		| "share";
	title: string;
	subtitle: string;
	metrics?: StoryMetric[];
	highlights?: string[];
}

export interface WrappedResult {
	profile: WrappedProfile;
	year: number;
	activity: ActivitySnapshot;
	archetype: string;
	badges: string[];
	slides: StorySlide[];
	cached: boolean;
	generatedAt: string;
	source: "cache" | "live";
}

export interface WrappedCacheEntry extends WrappedResult {
	id: string;
}

export interface GenerateWrappedInput {
	handle: string;
	year: number;
	subjectType?: SubjectType | "auto";
	allowRefresh?: boolean;
}
