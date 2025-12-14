import {
	assignBadges,
	buildActivitySnapshot,
	buildSlides,
	deriveArchetype,
} from "../domain/aggregate";
import type { GenerateWrappedInput, WrappedResult } from "../domain/types";
import {
	readCachedWrapped,
	writeWrappedSnapshot,
} from "../infrastructure/dataset-client";
import { fetchHubActivity } from "../infrastructure/hub-client";

const FREEZE_DATE = new Date("2026-01-01T00:00:00.000Z");

export async function generateWrapped(
	input: GenerateWrappedInput,
): Promise<WrappedResult> {
	const year = input.year ?? new Date().getUTCFullYear();
	const normalized: GenerateWrappedInput = {
		handle: input.handle.trim(),
		year,
		subjectType: input.subjectType ?? "auto",
		allowRefresh: input.allowRefresh ?? false,
	};

	if (!normalized.allowRefresh) {
		const cached = await readCachedWrapped(normalized);
		if (cached) {
			return { ...cached, cached: true, source: "cache" };
		}
	}

	if (!isRefreshAllowed(normalized.year) && normalized.allowRefresh) {
		throw new Error("Refresh window is closed for this year");
	}

	const activity = await fetchHubActivity(
		normalized.handle,
		normalized.subjectType === "auto"
			? "user"
			: (normalized.subjectType ?? "user"),
		normalized.year,
	);

	const snapshot = buildActivitySnapshot(
		activity.models,
		activity.datasets,
		activity.spaces,
		activity.papers,
	);
	const archetype = deriveArchetype(snapshot);
	const badges = assignBadges(snapshot);
	const slides = buildSlides({
		profile: activity.profile,
		year: normalized.year,
		activity: snapshot,
		archetype,
		badges,
	});

	const result: WrappedResult = {
		profile: activity.profile,
		year: normalized.year,
		activity: snapshot,
		archetype,
		badges,
		slides,
		cached: false,
		generatedAt: new Date().toISOString(),
		source: "live",
	};

	await writeWrappedSnapshot(result);

	return result;
}

function isRefreshAllowed(year: number): boolean {
	const now = new Date();
	if (year < now.getUTCFullYear()) {
		return now < FREEZE_DATE;
	}
	return now < FREEZE_DATE;
}
