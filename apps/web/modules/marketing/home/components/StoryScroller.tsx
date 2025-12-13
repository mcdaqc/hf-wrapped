"use client";

import * as Scrollytelling from "@bsmnt/scrollytelling";
import { useGSAP } from "@gsap/react";
import type { StorySlide, WrappedResult } from "@repo/wrapped";
import { Button } from "@ui/components/button";
import { cn } from "@ui/lib";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/all";
import { DownloadIcon, ShareIcon } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const BASE_SIZE = 1080;
const BASE_PADDING = 16;

function getTimeline({
	start,
	end,
	overlap = 0.3,
	chunks,
}: {
	start: number;
	end: number;
	overlap?: number;
	chunks: number;
}) {
	const duration = end - start;
	const chunk = duration / chunks;
	const raw = Array.from({ length: chunks }).map((_, i) => ({
		start: start + i * chunk,
		end: start + (i + 1) * chunk,
	}));
	if (overlap <= 0) {
		return raw;
	}

	const overlapDuration = duration * overlap;
	const per = overlapDuration / raw.length;
	const adjusted = raw.map((slot, i) => ({
		start: slot.start - per * i,
		end: slot.end - per * i,
	}));
	const first = adjusted[0]?.start ?? start;
	const last = adjusted[adjusted.length - 1]?.end ?? end;
	const scale = duration / (last - first || duration);

	return adjusted.map((slot) => ({
		start: Math.max(start, start + (slot.start - first) * scale),
		end: Math.min(end, start + (slot.end - first) * scale),
	}));
}

type MediaPalette = {
	gradient: string;
	accent: string;
};

const archetypeHighlights: Partial<Record<ArchetypeKey, string[]>> = {
	"Model Maestro": ["Innovative", "Precise", "Impactful"],
	"Dataset Architect": ["Structured", "Reliable", "Curious"],
	"Space Storyteller": ["Interactive", "Engaging", "Creative"],
	"Research Curator": ["Analytical", "Insightful", "Rigorous"],
	"HF Explorer": ["Versatile", "Adaptive", "Curious"],
};

const palettes: Record<StorySlide["kind"], MediaPalette> = {
	intro: {
		gradient:
			"radial-gradient(circle at 18% 24%, rgba(59,130,246,0.36), transparent 32%), radial-gradient(circle at 78% 18%, rgba(236,72,153,0.32), transparent 34%), linear-gradient(135deg, #0b1224, #0b0f1a)",
		accent: "from-sky-400 to-fuchsia-400",
	},
	summary: {
		gradient:
			"radial-gradient(circle at 15% 20%, rgba(34,197,94,0.34), transparent 32%), radial-gradient(circle at 80% 10%, rgba(59,130,246,0.30), transparent 36%), linear-gradient(145deg, #0a1818, #0d1220)",
		accent: "from-emerald-400 to-sky-400",
	},
	models: {
		gradient:
			"radial-gradient(circle at 25% 25%, rgba(99,102,241,0.32), transparent 32%), radial-gradient(circle at 80% 0%, rgba(236,72,153,0.30), transparent 34%), linear-gradient(135deg, #0b0f1f, #0d1024)",
		accent: "from-indigo-400 to-pink-400",
	},
	datasets: {
		gradient:
			"radial-gradient(circle at 15% 35%, rgba(34,211,238,0.30), transparent 32%), radial-gradient(circle at 85% 20%, rgba(59,130,246,0.24), transparent 34%), linear-gradient(135deg, #081926, #0b1624)",
		accent: "from-cyan-400 to-sky-400",
	},
	spaces: {
		gradient:
			"radial-gradient(circle at 20% 25%, rgba(248,113,113,0.28), transparent 32%), radial-gradient(circle at 70% 10%, rgba(251,191,36,0.26), transparent 34%), linear-gradient(135deg, #1a0f0f, #1d0f16)",
		accent: "from-amber-400 to-rose-400",
	},
	papers: {
		gradient:
			"radial-gradient(circle at 18% 35%, rgba(94,234,212,0.28), transparent 34%), radial-gradient(circle at 70% 15%, rgba(168,85,247,0.28), transparent 36%), linear-gradient(135deg, #0d1b1f, #0f1826)",
		accent: "from-teal-400 to-purple-400",
	},
	badges: {
		gradient:
			"radial-gradient(circle at 22% 28%, rgba(250,204,21,0.32), transparent 32%), radial-gradient(circle at 78% 14%, rgba(59,130,246,0.30), transparent 36%), linear-gradient(135deg, #14110f, #0f1621)",
		accent: "from-yellow-300 to-sky-400",
	},
	archetype: {
		gradient:
			"radial-gradient(circle at 20% 30%, rgba(236,72,153,0.30), transparent 34%), radial-gradient(circle at 80% 12%, rgba(99,102,241,0.28), transparent 36%), linear-gradient(135deg, #0f0f1a, #0d1224)",
		accent: "from-pink-400 to-indigo-400",
	},
	cta: {
		gradient:
			"radial-gradient(circle at 12% 24%, rgba(34,197,94,0.30), transparent 32%), radial-gradient(circle at 76% 12%, rgba(59,130,246,0.30), transparent 36%), linear-gradient(135deg, #0f1512, #0e1620)",
		accent: "from-emerald-400 to-sky-400",
	},
	share: {
		gradient:
			"radial-gradient(circle at 20% 25%, rgba(96,165,250,0.30), transparent 30%), radial-gradient(circle at 78% 18%, rgba(52,211,153,0.32), transparent 36%), linear-gradient(135deg, #0c101a, #0a0f1c)",
		accent: "from-sky-400 to-emerald-300",
	},
};

function sanitizeHighlights(tags: string[]): string[] {
	const banned = ["gradio", "en", "region:us", "region:eu", "demo"];
	const filtered = tags.filter((tag) => !banned.includes(tag.toLowerCase()));
	return filtered.length > 0 ? filtered : ["Keep exploring", "Stay curious"];
}

type ArchetypeKey =
	| "Model Maestro"
	| "Dataset Architect"
	| "Space Storyteller"
	| "Research Curator"
	| "HF Explorer";

const archetypeImage: Record<ArchetypeKey, string> = {
	"Model Maestro": "/images/huggies/NEW_modelmaestro.png",
	"Dataset Architect": "/images/huggies/NEW_datasetarchitect.png",
	"Space Storyteller": "/images/huggies/NEW_spacestoryteller.png",
	"Research Curator": "/images/huggies/NEW_researchcurator.png",
	"HF Explorer": "/images/huggies/Huggy Hi.png",
};

const gifMap: Partial<Record<StorySlide["kind"], string[]>> = {
	intro: ["/images/huggies/Huggy Pop.gif"],
	summary: ["/images/huggies/Vibing Huggy.gif"],
	models: ["/images/huggies/Doodle Huggy.gif"],
	spaces: [],
	datasets: [],
	papers: [],
	cta: ["/images/huggies/Huggy Pop.gif"],
	share: [],
};

const badgeImage: Record<string, string> = {
	"Model Powerhouse": "/images/huggies/Optimum Huggy.png",
	"Community Favorite": "/images/huggies/NEW_communityfavorite.png",
	"Research Beacon": "/images/huggies/NEW_researchbeacon.png",
	"Spaces Trailblazer": "/images/huggies/Rocket Huggy.png",
	"Data Shaper": "/images/huggies/Manager Huggy.png",
	"Model Builder": "/images/huggies/Transformer20Huggy.png",
	"HF Explorer": "/images/huggies/Huggy Hi.png",
};

const archetypeAccents: Record<ArchetypeKey, string> = {
	"Model Maestro": "from-indigo-400 to-sky-400",
	"Dataset Architect": "from-[#e85048] to-[#ff9a7d]",
	"Space Storyteller": "from-sky-300 to-cyan-400",
	"Research Curator": "from-purple-500 to-violet-400",
	"HF Explorer": "from-emerald-400 to-lime-300",
};

function imageForSlide(
	slide: StorySlide,
	wrapped: WrappedResult,
	badge: string,
): { src?: string; isGif: boolean } {
	if (slide.kind !== "badges" && slide.kind !== "archetype") {
		const gifPool = gifMap[slide.kind];
		if (gifPool && gifPool.length > 0) {
			const gif = gifPool[0];
			return { src: gif, isGif: true };
		}
	}
	switch (slide.kind) {
		case "intro":
			return { src: "/images/huggies/Huggy Hi.png", isGif: false };
		case "summary":
			return { src: "/images/huggies/X-ray Huggy.png", isGif: false };
		case "models":
			return {
				src: "/images/huggies/Transformer20Huggy.png",
				isGif: false,
			};
		case "datasets":
			return { src: "/images/huggies/Growing20Huggy.png", isGif: false };
		case "spaces":
			return { src: "/images/huggies/Rocket Huggy.png", isGif: false };
		case "papers":
			return { src: "/images/huggies/Paper Huggy.png", isGif: false };
		case "archetype": {
			const key =
				(wrapped.archetype as ArchetypeKey) in archetypeImage
					? (wrapped.archetype as ArchetypeKey)
					: ("HF Explorer" as ArchetypeKey);
			return { src: archetypeImage[key], isGif: false };
		}
		case "badges":
			return {
				src: badgeImage[badge] ?? "/images/huggies/Huggy Hi.png",
				isGif: false,
			};
		case "cta":
			return { src: "/images/huggies/Huggy Sunny.png", isGif: false };
		case "share": {
			const byArchetype =
				(wrapped.archetype as ArchetypeKey) in archetypeImage
					? archetypeImage[wrapped.archetype as ArchetypeKey]
					: undefined;
			return {
				src: byArchetype ?? "/images/huggies/Huggy Sunny.png",
				isGif: false,
			};
		}
		default:
			return { src: undefined, isGif: false };
	}
}

function truncateHandle(handle: string, max = 25): string {
	if (handle.length <= max) {
		return handle;
	}
	return `${handle.slice(0, max - 1)}…`;
}

function ellipsize(value: string, max = 40): string {
	if (value.length <= max) {
		return value;
	}
	return `${value.slice(0, max - 3)}...`;
}

function pickBadge(activity: WrappedResult["activity"]): string {
	if (activity.totalDownloads > 1_000_000) {
		return "Model Powerhouse";
	}
	if (activity.totalLikes > 5_000) {
		return "Community Favorite";
	}
	if (activity.papers.length >= 2) {
		return "Research Beacon";
	}
	if (activity.spaces.length >= 3) {
		return "Spaces Trailblazer";
	}
	if (activity.datasets.length >= 5) {
		return "Data Shaper";
	}
	if (activity.models.length >= 3) {
		return "Model Builder";
	}
	return "HF Explorer";
}

function badgeReason(badge: string): string {
	switch (badge) {
		case "Model Powerhouse":
			return "1M+ downloads across your work";
		case "Community Favorite":
			return "5k+ likes from the community";
		case "Research Beacon":
			return "Shared multiple research papers";
		case "Spaces Trailblazer":
			return "Built 3+ interactive spaces";
		case "Data Shaper":
			return "Published 5+ datasets";
		case "Model Builder":
			return "Created 3+ models";
		case "HF Explorer":
		default:
			return "Exploring across repos and topics";
	}
}

function buildBadgeMetrics(
	badge: string,
	wrapped: WrappedResult,
	fmt: Intl.NumberFormat,
): { label: string; value: string }[] {
	const activity = wrapped.activity;

	switch (badge) {
		case "Model Powerhouse":
			return [
				{
					label: "Downloads",
					value: fmt.format(activity.totalDownloads),
				},
				{
					label: "Models",
					value: fmt.format(activity.models.length || 1),
				},
			];
		case "Community Favorite":
			return [
				{
					label: "Likes",
					value: fmt.format(activity.totalLikes),
				},
				{
					label: "Repos",
					value: fmt.format(activity.totalRepos),
				},
			];
		case "Research Beacon":
			return [
				{
					label: "Papers",
					value: fmt.format(activity.papers.length),
				},
				{
					label: "Repos",
					value: fmt.format(activity.totalRepos),
				},
			];
		case "Spaces Trailblazer":
			return [
				{
					label: "Spaces",
					value: fmt.format(activity.spaces.length),
				},
				{
					label: "Likes",
					value: fmt.format(activity.totalLikes),
				},
			];
		case "Data Shaper":
			return [
				{
					label: "Datasets",
					value: fmt.format(activity.datasets.length),
				},
				{
					label: "Downloads",
					value: fmt.format(activity.totalDownloads),
				},
			];
		case "Model Builder":
			return [
				{
					label: "Models",
					value: fmt.format(activity.models.length),
				},
				{
					label: "Downloads",
					value: fmt.format(activity.totalDownloads),
				},
			];
		case "HF Explorer":
		default:
			return [
				{
					label: "Repos",
					value: fmt.format(activity.totalRepos),
				},
				{
					label: "Downloads",
					value: fmt.format(activity.totalDownloads),
				},
			];
	}
}

function buildSlides(wrapped: WrappedResult): StorySlide[] {
	const fmt = new Intl.NumberFormat("en-US", { notation: "compact" });
	const badge = pickBadge(wrapped.activity);
	const topModels = wrapped.activity.models.slice(0, 3);
	const topDatasets = wrapped.activity.datasets.slice(0, 3);
	const topSpaces = wrapped.activity.spaces.slice(0, 3);
	const topPapers = wrapped.activity.papers.slice(0, 2);

	return [
		{
			id: "intro",
			kind: "intro",
			title: `Your ${wrapped.year} Hugging Face Wrapped`,
			subtitle: wrapped.profile.displayName ?? wrapped.profile.handle,
			metrics: [
				{
					label: "Repositories",
					value: wrapped.activity.totalRepos.toString(),
				},
				{
					label: "Downloads",
					value: fmt.format(wrapped.activity.totalDownloads),
				},
			],
			highlights: wrapped.activity.topTags.slice(0, 3),
		},
		{
			id: "summary",
			kind: "summary",
			title: "Activity pulse",
			subtitle: "Models, datasets, spaces, papers",
			metrics: [
				{
					label: "Models",
					value: wrapped.activity.models.length.toString(),
				},
				{
					label: "Datasets",
					value: wrapped.activity.datasets.length.toString(),
				},
				{
					label: "Spaces",
					value: wrapped.activity.spaces.length.toString(),
				},
				{
					label: "Papers",
					value: wrapped.activity.papers.length.toString(),
				},
			],
			highlights: [
				wrapped.activity.busiestMonth
					? `Busiest month: ${wrapped.activity.busiestMonth}`
					: "Consistent all year",
			],
		},
		...(topModels.length
			? [
					{
						id: "models",
						kind: "models",
						title: "Models that led",
						subtitle: "Most downloaded & loved",
						metrics: topModels.map((repo) => ({
							label: repo.name,
							value: `${fmt.format(repo.downloads ?? 0)} downloads`,
						})),
						highlights: wrapped.activity.topTags.slice(0, 2),
					} satisfies StorySlide,
				]
			: []),
		...(topDatasets.length
			? [
					{
						id: "datasets",
						kind: "datasets",
						title: "Datasets that fueled",
						subtitle: "Community favorites",
						metrics: topDatasets.map((repo) => ({
							label: repo.name,
							value: `${fmt.format(repo.downloads ?? 0)} pulls`,
						})),
						highlights: wrapped.activity.topTags.slice(0, 2),
					} satisfies StorySlide,
				]
			: []),
		...(topSpaces.length
			? [
					{
						id: "spaces",
						kind: "spaces",
						title: "Spaces that told the story",
						subtitle: "Interactive apps that resonated",
						metrics: topSpaces.map((repo) => ({
							label: repo.name,
							value: `${fmt.format(repo.likes ?? 0)} likes`,
						})),
						highlights: wrapped.activity.topTags.slice(0, 2),
					} satisfies StorySlide,
				]
			: []),
		...(topPapers.length
			? [
					{
						id: "papers",
						kind: "papers",
						title: "Research you shared",
						subtitle: "Papers and findings",
						metrics: topPapers.map((paper) => ({
							label: paper.title,
							value: paper.publishedAt
								? new Date(paper.publishedAt)
										.getFullYear()
										.toString()
								: "Published",
						})),
					} satisfies StorySlide,
				]
			: []),
		{
			id: "archetype",
			kind: "archetype",
			title: "Your archetype",
			subtitle: wrapped.archetype,
			metrics: [
				{
					label: "Downloads",
					value: fmt.format(wrapped.activity.totalDownloads),
				},
				{
					label: "Likes",
					value: fmt.format(wrapped.activity.totalLikes),
				},
			],
			highlights: sanitizeHighlights(
				archetypeHighlights[wrapped.archetype as ArchetypeKey] ??
					(wrapped.activity.topTags ?? []).slice(0, 3),
			),
		},
		{
			id: "badges",
			kind: "badges",
			title: "Your badge this year",
			subtitle: badge,
			metrics: buildBadgeMetrics(badge, wrapped, fmt),
			highlights: [badgeReason(badge)],
		},
		{
			id: "share",
			kind: "share",
			title: `@${truncateHandle(wrapped.profile.handle)}`,
			subtitle: `Your Hugging Face 🤗 in ${wrapped.year} `,
			metrics: [
				{
					label: "Badge",
					value: badge,
				},
				{
					label: "Archetype",
					value: wrapped.archetype,
				},
				{
					label:
						wrapped.activity.papers.length >
						Math.max(
							wrapped.activity.models.length,
							wrapped.activity.datasets.length,
							wrapped.activity.spaces.length,
						)
							? "Papers"
							: "Repos",
					value:
						wrapped.activity.papers.length >
						Math.max(
							wrapped.activity.models.length,
							wrapped.activity.datasets.length,
							wrapped.activity.spaces.length,
						)
							? fmt.format(wrapped.activity.papers.length)
							: fmt.format(wrapped.activity.totalRepos),
				},
				{
					label: "Downloads",
					value: fmt.format(wrapped.activity.totalDownloads),
				},
				{
					label: "Likes",
					value: fmt.format(wrapped.activity.totalLikes),
				},
				{
					label: "Top model",
					value:
						wrapped.activity.models[0]?.name ??
						"No model yet — create one!",
				},
				{
					label: "Top dataset",
					value:
						wrapped.activity.datasets[0]?.name ??
						"No dataset yet — publish one!",
				},
				{
					label: "Top space",
					value:
						wrapped.activity.spaces[0]?.name ??
						"No space yet — launch one!",
				},
			],
			highlights: [
				...(wrapped.activity.topTags.slice(0, 1) ?? []),
				"huggingface.co/spaces/hf-wrapped/2025",
			],
		},
	];
}

export function StoryScroller({ wrapped }: { wrapped: WrappedResult }) {
	const slides = useMemo<StorySlide[]>(() => buildSlides(wrapped), [wrapped]);
	const panelsRef = useRef<Map<string, HTMLElement>>(new Map());
	const [isDownloading, setIsDownloading] = useState(false);
	const scrollerRef = useRef<HTMLDivElement | null>(null);
	const progressRef = useRef<HTMLDivElement | null>(null);
	const currentIndexRef = useRef(0);
	const badgeRef = useRef(pickBadge(wrapped.activity));
	const [scale, setScale] = useState(1);
	const scaleRef = useRef<HTMLDivElement | null>(null);
	const disableAnim = isDownloading;

	useGSAP(() => {
		gsap.registerPlugin(ScrollTrigger);
		const scroller = scrollerRef.current;

		// lock page scroll; route all scroll to the stories container
		const prevHtmlOverflow =
			typeof document !== "undefined"
				? document.documentElement.style.overflow
				: "";
		const prevBodyOverflow =
			typeof document !== "undefined" ? document.body.style.overflow : "";
		if (typeof document !== "undefined") {
			document.documentElement.style.overflow = "hidden";
			document.body.style.overflow = "hidden";
		}

		ScrollTrigger.defaults({
			scroller: scroller ?? undefined,
		});

		return () => {
			ScrollTrigger.defaults({
				scroller: undefined,
			});
			if (typeof document !== "undefined") {
				document.documentElement.style.overflow = prevHtmlOverflow;
				document.body.style.overflow = prevBodyOverflow;
			}
		};
	}, []);

	useEffect(() => {
		const scroller = scrollerRef.current;
		if (!scroller) {
			return;
		}
		const handleScroll = () => {
			const max = scroller.scrollHeight - scroller.clientHeight;
			const ratio = max > 0 ? scroller.scrollTop / max : 0;
			if (progressRef.current) {
				progressRef.current.style.height = `${
					Math.min(1, Math.max(0, ratio)) * 100
				}%`;
			}
			const pct = ratio * 100;
			const idx = segments.findIndex(
				(slot) => pct >= slot.start && pct < slot.end,
			);
			currentIndexRef.current = idx >= 0 ? idx : 0;
		};
		scroller.addEventListener("scroll", handleScroll, { passive: true });
		handleScroll();
		return () => {
			scroller.removeEventListener("scroll", handleScroll);
		};
	}, []);

	const recomputeScale = useCallback(() => {
		if (typeof window === "undefined") {
			return;
		}
		const availableWidth = window.innerWidth - BASE_PADDING * 2;
		const availableHeight = window.innerHeight - BASE_PADDING * 2;
		const ratio = Math.min(
			availableWidth / BASE_SIZE,
			availableHeight / BASE_SIZE,
		);
		// keep the layout rigid and only scale down when space is limited
		const next = Math.min(1, ratio);
		setScale(Number.isFinite(next) && next > 0 ? next : 1);
	}, []);

	useEffect(() => {
		recomputeScale();
		window.addEventListener("resize", recomputeScale);
		return () => {
			window.removeEventListener("resize", recomputeScale);
		};
	}, [recomputeScale]);

	const downloadSlide = useCallback(async () => {
		const slideId = slides[currentIndexRef.current]?.id;
		const target =
			(slideId ? panelsRef.current.get(slideId) : undefined) ??
			panelsRef.current.values().next().value;
		if (!target) {
			return;
		}

		setIsDownloading(true);
		try {
			const { toPng } = await import("html-to-image");
			const prev = {
				transform: target.style.transform,
				opacity: target.style.opacity,
				filter: target.style.filter,
				transition: target.style.transition,
			};
			const offsetX = "-480px";
			const offsetY = "-40px";
			target.style.transform = `translate(${offsetX}, ${offsetY})`;
			target.style.opacity = "1";
			target.style.filter = "none";
			target.style.transition = "none";
			const dataUrl = await toPng(target, {
				cacheBust: true,
				pixelRatio: 2,
				backgroundColor: "transparent",
				style: {
					transform: `translate(${offsetX}, ${offsetY})`,
					opacity: "1",
					filter: "none",
					transformOrigin: "top left",
				},
			});
			target.style.transform = prev.transform;
			target.style.opacity = prev.opacity;
			target.style.filter = prev.filter;
			target.style.transition = prev.transition;

			const link = document.createElement("a");
			link.download = `${wrapped.profile.handle}-story.png`;
			link.href = dataUrl;
			link.click();
		} catch (error) {
			console.error("Failed to export story", error);
		} finally {
			setIsDownloading(false);
		}
	}, [wrapped.profile.handle]);

	const segments = useMemo(
		() =>
			getTimeline({
				start: 0,
				end: 100,
				overlap: 0.18,
				chunks: Math.max(slides.length, 1),
			}),
		[slides.length],
	);

	return (
		<div
			className="relative mx-auto grid min-h-screen w-full place-items-center overflow-hidden pb-10"
			style={{
				fontFamily: "BasementGrotesque, var(--font-sans, sans-serif)",
			}}
		>
			<div
				ref={scrollerRef}
				className="sticky top-0 h-screen overflow-x-hidden overflow-y-auto overscroll-contain"
				style={{
					scrollbarWidth: "none",
					touchAction: "auto",
					scrollBehavior: "smooth",
				}}
			>
				<Scrollytelling.Root defaults={{ ease: "power1.out" }}>
					<Scrollytelling.Pin
						childHeight="100vh"
						pinSpacerHeight={`${slides.length * 110}vh`}
						pinSpacerClassName="rounded-3xl"
					>
						<div className="flex h-full w-full items-center justify-center">
							<div
								ref={scaleRef}
								className="relative"
								style={{
									width: `${BASE_SIZE}px`,
									height: `${BASE_SIZE}px`,
									transform: `scale(${scale})`,
									transformOrigin: "center center",
									padding: `${BASE_PADDING}px`,
								}}
							>
								<div className="pointer-events-none absolute -right-3 top-1/2 z-20 flex -translate-y-1/2 items-center justify-center text-white/80">
									<div className="relative h-10 w-6 rounded-full border border-white/50">
										<span className="absolute left-1/2 top-2 h-2 w-1 -translate-x-1/2 rounded-full bg-white/80 animate-bounce" />
									</div>
								</div>

								<div className="absolute left-8 top-8 z-20 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
									<span className="rounded-full bg-white/10 px-3 py-1">
										{wrapped.profile.displayName ??
											`@${wrapped.profile.handle}`}
									</span>
									<span className="rounded-full bg-white/10 px-3 py-1">
										Hugging Face Wrapped {wrapped.year}
									</span>
								</div>

								<div className="absolute right-8 top-8 z-20 flex gap-2">
									<Button
										size="sm"
										variant="secondary"
										className="border border-white/30 bg-white/10 text-white shadow-sm transition hover:bg-white/20"
										onClick={downloadSlide}
										disabled={isDownloading}
									>
										<DownloadIcon className="mr-2 size-4" />
										{isDownloading
											? "Exporting…"
											: "Export PNG"}
									</Button>
									<Button
										size="sm"
										variant="secondary"
										className="border border-white/30 bg-white/10 text-white shadow-sm transition hover:bg-white/20"
										onClick={async () => {
											const url =
												typeof window !== "undefined"
													? window.location.href
													: "";
											if (navigator.share && url) {
												await navigator
													.share({ url })
													.catch(() => {});
											} else if (
												navigator.clipboard &&
												url
											) {
												await navigator.clipboard
													.writeText(url)
													.catch(() => {});
											}
										}}
									>
										<ShareIcon className="mr-2 size-4" />
										Share
									</Button>
								</div>

								<div className="relative flex h-full w-full items-center justify-center px-8 py-8">
									<div className="relative mx-auto flex aspect-square w-[98%] max-w-[1200px] items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-black/35 shadow-[0_18px_55px_-35px_rgba(59,130,246,0.35)] backdrop-blur-sm">
										<div className="pointer-events-none absolute -left-8 inset-y-0 z-30 w-1 rounded-full bg-white/10">
											<div
												ref={progressRef}
												className="absolute left-0 top-0 w-full rounded-full bg-white"
											/>
										</div>

										{slides.map((slide, index) => {
											const slot = segments[index] ?? {
												start: 0,
												end: 100,
											};
											const mid =
												slot.start +
												(slot.end - slot.start) * 0.55;
											const tail =
												slot.start +
												(slot.end - slot.start) * 0.9;
											const palette =
												palettes[slide.kind] ??
												palettes.intro;
											const archetypeKey =
												(wrapped.archetype as ArchetypeKey) in
												archetypeAccents
													? (wrapped.archetype as ArchetypeKey)
													: ("HF Explorer" as ArchetypeKey);
											const imageSrc = imageForSlide(
												slide,
												wrapped,
												badgeRef.current,
											);
											const mediaLeft = index % 2 === 1;
											const isShare =
												slide.kind === "share";
											const accentFill = `bg-gradient-to-br ${
												archetypeAccents[
													archetypeKey
												] ?? palette.accent
											}`;
											const hasAccentRail = false;
											const isSingleColumn =
												slide.kind === "archetype" ||
												slide.kind === "badges";
											const isBadge =
												slide.kind === "badges";
											const isArchetype =
												slide.kind === "archetype";
											const shareLink =
												isShare &&
												(slide.highlights ?? []).find(
													(h) =>
														h.includes(
															"huggingface.co/spaces/hf-wrapped/2025",
														),
												);
											const filteredHighlights = shareLink
												? (
														slide.highlights ?? []
													).filter(
														(h) => h !== shareLink,
													)
												: slide.highlights;

											return (
												<Scrollytelling.Animation
													// eslint-disable-next-line react/no-array-index-key
													key={slide.id + index}
													tween={[
														{
															start: slot.start,
															end: mid,
															fromTo: [
																{
																	opacity: 0,
																	y: 80,
																	scale: 0.97,
																},
																{
																	opacity: 1,
																	y: 0,
																	scale: 1,
																},
															],
														},
														{
															start: mid,
															end: tail,
															to: {
																opacity: 0,
																y: -60,
																scale: 0.985,
															},
														},
													]}
												>
													<article
														ref={(node) => {
															if (node) {
																panelsRef.current.set(
																	slide.id,
																	node,
																);
															}
														}}
														className={cn(
															"absolute left-1/2 top-10 grid aspect-square w-[94%] max-w-[1140px] -translate-x-1/2 items-start overflow-hidden rounded-[30px] border border-white/12 bg-black/35 p-9 shadow-[0_28px_95px_-55px_rgba(59,130,246,0.5)] backdrop-blur-xl ring-1 ring-white/5",
															isSingleColumn
																? "grid-cols-1 gap-6"
																: "grid-cols-[1.05fr,0.95fr] grid-rows-[auto,1fr] gap-4",
															mediaLeft &&
																!isSingleColumn
																? "[&>div:nth-child(2)]:order-1 [&>div:nth-child(1)]:order-2"
																: "",
														)}
														style={{
															willChange:
																"transform, opacity",
															backgroundImage:
																palette.gradient,
														}}
													>
														{hasAccentRail ? (
															<span
																className={cn(
																	"absolute inset-y-0 left-0 w-[6px] rounded-full opacity-90",
																	accentFill,
																)}
															/>
														) : null}
														<div className="absolute left-8 right-8 top-8 z-10 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-white/70">
															<div className="flex items-center gap-2">
																<span className="rounded-full bg-white/15 px-3 py-1 text-white/80">
																	{slide.kind}
																</span>
																{isShare &&
																shareLink ? (
																	<span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/80">
																		{
																			shareLink
																		}
																	</span>
																) : null}
															</div>
															<span className="rounded-full bg-white/15 px-3 py-1 text-white/80">
																{index + 1} /{" "}
																{slides.length}
															</span>
														</div>

														{slide.kind ===
															"intro" &&
														wrapped.profile
															.avatarUrl ? (
															<div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/30 px-4 py-3">
																<Image
																	src={
																		wrapped
																			.profile
																			.avatarUrl
																	}
																	alt={
																		wrapped
																			.profile
																			.handle
																	}
																	width={48}
																	height={48}
																	className="size-12 rounded-full border border-white/20 object-cover"
																/>
																<div className="flex flex-col text-sm">
																	<span className="font-semibold text-white">
																		{wrapped
																			.profile
																			.displayName ??
																			wrapped
																				.profile
																				.handle}
																	</span>
																	<span className="text-white/70">
																		@
																		{
																			wrapped
																				.profile
																				.handle
																		}
																	</span>
																</div>
															</div>
														) : null}

														{isShare ? (
															<header className="col-span-1 space-y-4 px-2 pt-10 w-full overflow-hidden">
																{disableAnim ? (
																	<h2 className="block w-full truncate whitespace-nowrap text-5xl font-semibold leading-tight text-white mt-8">
																		{
																			slide.title
																		}
																	</h2>
																) : (
																	<Scrollytelling.Animation
																		tween={{
																			start: slot.start,
																			end: mid,
																			fromTo: [
																				{
																					opacity: 0,
																					y: 40,
																				},
																				{
																					opacity: 1,
																					y: 0,
																				},
																			],
																		}}
																	>
																		<h2 className="block w-full truncate whitespace-nowrap text-5xl font-semibold leading-tight text-white mt-8">
																			{
																				slide.title
																			}
																		</h2>
																	</Scrollytelling.Animation>
																)}
																{slide.subtitle ? (
																	disableAnim ? (
																		<p className="wrap-break-word font-semibold text-white/85 text-[50px] sm:text-[58px]">
																			{
																				slide.subtitle
																			}
																		</p>
																	) : (
																		<Scrollytelling.Animation
																			tween={{
																				start:
																					slot.start +
																					(mid -
																						slot.start) *
																						0.2,
																				end: mid,
																				fromTo: [
																					{
																						opacity: 0,
																						y: 30,
																					},
																					{
																						opacity: 1,
																						y: 0,
																					},
																				],
																			}}
																		>
																			<p
																				className={cn(
																					"wrap-break-word font-semibold text-white/85",
																					isShare
																						? "text-[50px] sm:text-[58px]"
																						: "text-[50px]",
																				)}
																			>
																				{
																					slide.subtitle
																				}
																			</p>
																		</Scrollytelling.Animation>
																	)
																) : null}
															</header>
														) : null}

														{isSingleColumn ? (
															<div className="grid h-full w-full grid-cols-1 place-items-center gap-5 pt-8 text-center">
																<div className="flex h-full w-full max-w-[880px] flex-col items-center justify-center gap-5 px-4">
																	<header className="space-y-4">
																		<Scrollytelling.Animation
																			tween={{
																				start: slot.start,
																				end: mid,
																				fromTo: [
																					{
																						opacity: 0,
																						y: 32,
																					},
																					{
																						opacity: 1,
																						y: 0,
																					},
																				],
																			}}
																		>
																			<h2 className="text-balance text-5xl font-bold leading-tight sm:text-6xl">
																				{
																					slide.title
																				}
																			</h2>
																		</Scrollytelling.Animation>
																		{slide.subtitle ? (
																			<Scrollytelling.Animation
																				tween={{
																					start:
																						slot.start +
																						(mid -
																							slot.start) *
																							0.2,
																					end: mid,
																					fromTo: [
																						{
																							opacity: 0,
																							y: 28,
																						},
																						{
																							opacity: 1,
																							y: 0,
																						},
																					],
																				}}
																			>
																				<p
																					className={cn(
																						"text-white/80",
																						isBadge ||
																							isArchetype
																							? "text-3xl font-semibold leading-tight"
																							: "text-xl",
																					)}
																				>
																					{
																						slide.subtitle
																					}
																				</p>
																			</Scrollytelling.Animation>
																		) : null}
																	</header>

																	{imageSrc?.src && (
																		<div className="flex w-full items-center justify-center">
																			<Image
																				src={
																					imageSrc.src
																				}
																				alt={`${slide.kind} visual`}
																				width={
																					560
																				}
																				height={
																					560
																				}
																				unoptimized={
																					imageSrc.isGif
																				}
																				className="max-h-[460px] max-w-[460px] object-contain"
																			/>
																		</div>
																	)}

																	{slide.metrics &&
																		slide
																			.metrics
																			.length >
																			0 && (
																			<div className="flex w-full flex-col items-center gap-4">
																				{[
																					"models",
																					"datasets",
																					"spaces",
																					"papers",
																				].includes(
																					slide.kind,
																				) ? (
																					<ul className="flex w-full max-w-[760px] flex-col gap-4">
																						{slide.metrics.map(
																							(
																								metric,
																								idx,
																							) => (
																								<li
																									key={`${slide.id}-${metric.label}`}
																									className="group relative flex items-center justify-between gap-4 overflow-hidden rounded-2xl border border-white/12 bg-white/5 px-6 py-5 shadow-lg shadow-black/25 backdrop-blur"
																									data-story-metric
																								>
																									<div className="flex min-w-0 flex-col gap-2 text-left">
																										<p className="truncate text-base uppercase tracking-wide text-white/85">
																											{
																												metric.label
																											}
																										</p>
																										<p className="text-3xl font-semibold text-white">
																											{
																												metric.value
																											}
																										</p>
																									</div>
																									<span className="rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-[12px] uppercase tracking-wide text-white/80">
																										#
																										{idx +
																											1}
																									</span>
																								</li>
																							),
																						)}
																					</ul>
																				) : (
																					<ul className="grid w-full max-w-[780px] grid-cols-2 gap-4">
																						{slide.metrics.map(
																							(
																								metric,
																							) => (
																								<li
																									key={`${slide.id}-${metric.label}`}
																									className="group relative overflow-hidden rounded-2xl border border-white/12 bg-white/5 px-6 py-5 shadow-lg shadow-black/25 backdrop-blur"
																									data-story-metric
																								>
																									<p className="truncate text-base uppercase tracking-wide text-white/85">
																										{
																											metric.label
																										}
																									</p>
																									<p className="text-3xl font-semibold text-white">
																										{
																											metric.value
																										}
																									</p>
																								</li>
																							),
																						)}
																					</ul>
																				)}
																			</div>
																		)}

																	{filteredHighlights &&
																		filteredHighlights.filter(
																			(
																				item,
																			) => {
																				const banned =
																					[
																						"gradio",
																						"en",
																						"region:us",
																						"region:eu",
																						"demo",
																					];
																				return !banned.includes(
																					item.toLowerCase(),
																				);
																			},
																		)
																			.length >
																			0 && (
																			<div className="flex flex-wrap justify-center gap-2">
																				{filteredHighlights
																					.filter(
																						(
																							item,
																						) => {
																							const banned =
																								[
																									"gradio",
																									"en",
																									"region:us",
																									"region:eu",
																									"demo",
																								];
																							return !banned.includes(
																								item.toLowerCase(),
																							);
																						},
																					)
																					.map(
																						(
																							item,
																						) => (
																							<span
																								key={
																									item
																								}
																								className={cn(
																									item.includes(
																										"huggingface.co/spaces/hf-wrapped/2025",
																									)
																										? "truncate bg-transparent px-0 py-0 text-white/90"
																										: "truncate rounded-full border border-white/20 bg-white/5 shadow-sm shadow-black/20 transition hover:-translate-y-[1px] hover:border-white/35 hover:bg-white/10",
																									!item.includes(
																										"huggingface.co/spaces/hf-wrapped/2025",
																									) &&
																										(isShare
																											? "px-9 py-3.5 text-2xl font-semibold text-white"
																											: "px-4 py-1.5 text-sm font-semibold text-white/90"),
																								)}
																								data-story-badge
																							>
																								{
																									item
																								}
																							</span>
																						),
																					)}
																			</div>
																		)}

																	{imageSrc?.src && (
																		<div className="flex w-full items-center justify-center">
																			<Image
																				src={
																					imageSrc.src
																				}
																				alt={`${slide.kind} visual`}
																				width={
																					520
																				}
																				height={
																					520
																				}
																				unoptimized={
																					imageSrc.isGif
																				}
																				className="max-h-[420px] max-w-[420px] object-contain"
																			/>
																		</div>
																	)}
																</div>
															</div>
														) : (
															<div
																className={cn(
																	"grid h-full w-full grid-cols-2 gap-4",
																	isShare
																		? "pt-6"
																		: "pt-10",
																)}
															>
																<div
																	className={cn(
																		"flex flex-col gap-5",
																		isShare
																			? "px-1"
																			: "",
																	)}
																>
																	{!isShare ? (
																		<header className="space-y-4">
																			{disableAnim ? (
																				<h2 className="text-balance text-5xl font-bold leading-tight sm:text-6xl">
																					{
																						slide.title
																					}
																				</h2>
																			) : (
																				<Scrollytelling.Animation
																					tween={{
																						start: slot.start,
																						end: mid,
																						fromTo: [
																							{
																								opacity: 0,
																								y: 32,
																							},
																							{
																								opacity: 1,
																								y: 0,
																							},
																						],
																					}}
																				>
																					<h2 className="text-balance text-5xl font-bold leading-tight sm:text-6xl">
																						{
																							slide.title
																						}
																					</h2>
																				</Scrollytelling.Animation>
																			)}
																			{slide.subtitle ? (
																				disableAnim ? (
																					<p
																						className={cn(
																							"text-white/80",
																							isShare
																								? "text-2xl sm:text-3xl"
																								: "text-xl",
																						)}
																					>
																						{
																							slide.subtitle
																						}
																					</p>
																				) : (
																					<Scrollytelling.Animation
																						tween={{
																							start:
																								slot.start +
																								(mid -
																									slot.start) *
																									0.2,
																							end: mid,
																							fromTo: [
																								{
																									opacity: 0,
																									y: 28,
																								},
																								{
																									opacity: 1,
																									y: 0,
																								},
																							],
																						}}
																					>
																						<p
																							className={cn(
																								"text-white/80",
																								isShare
																									? "text-2xl sm:text-3xl"
																									: "text-xl",
																							)}
																						>
																							{
																								slide.subtitle
																							}
																						</p>
																					</Scrollytelling.Animation>
																				)
																			) : null}
																		</header>
																	) : null}

																	{slide.metrics &&
																		slide
																			.metrics
																			.length >
																			0 && (
																			<div
																				className={cn(
																					"space-y-3",
																					isShare
																						? "col-span-1"
																						: "",
																				)}
																			>
																				{[
																					"models",
																					"datasets",
																					"spaces",
																					"papers",
																				].includes(
																					slide.kind,
																				) ? (
																					<ul className="flex flex-col gap-4">
																						{slide.metrics.map(
																							(
																								metric,
																								idx,
																							) => (
																								<li
																									key={`${slide.id}-${metric.label}`}
																									className="group relative flex items-center justify-between gap-4 overflow-hidden rounded-2xl border border-white/12 bg-white/5 px-6 py-5 shadow-lg shadow-black/25 backdrop-blur"
																									data-story-metric
																								>
																									<div className="flex min-w-0 flex-col gap-1">
																										<p className="truncate text-base font-semibold text-white">
																											{
																												metric.label
																											}
																										</p>
																										<p className="text-sm text-white/65">
																											{
																												metric.value
																											}
																										</p>
																									</div>
																									<span className="rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-[12px] uppercase tracking-wide text-white/80">
																										#
																										{idx +
																											1}
																									</span>
																								</li>
																							),
																						)}
																					</ul>
																				) : isShare ? (
																					<div className="space-y-3">
																						<div className="grid grid-cols-1 gap-3">
																							{(
																								slide.metrics ??
																								[]
																							)
																								.filter(
																									(
																										m,
																									) =>
																										m.label ===
																										"Badge",
																								)
																								.map(
																									(
																										metric,
																									) => (
																										<div
																											key={
																												metric.label
																											}
																											className="rounded-2xl border border-white/12 bg-white/5 px-6 py-5 shadow-inner shadow-black/10"
																										>
																											<p className="text-base uppercase tracking-wide text-white/80">
																												{
																													metric.label
																												}
																											</p>
																											<p className="truncate whitespace-nowrap text-2xl font-semibold leading-tight text-white">
																												{
																													metric.value
																												}
																											</p>
																										</div>
																									),
																								)}
																						</div>
																						<div className="grid grid-cols-3 gap-3">
																							{((
																								slide.metrics ??
																								[]
																							).some(
																								(
																									m,
																								) =>
																									m.label ===
																									"Papers",
																							)
																								? [
																										"Papers",
																										"Downloads",
																										"Likes",
																									]
																								: [
																										"Repos",
																										"Downloads",
																										"Likes",
																									]
																							).map(
																								(
																									label,
																								) => {
																									const metric =
																										(
																											slide.metrics ??
																											[]
																										).find(
																											(
																												m,
																											) =>
																												m.label ===
																												label,
																										);
																									if (
																										!metric
																									) {
																										return null;
																									}
																									return (
																										<div
																											key={
																												metric.label
																											}
																											className="rounded-2xl border border-white/12 bg-white/5 px-6 py-5 shadow-inner shadow-black/10"
																										>
																											<p className="truncate text-sm uppercase tracking-wide text-white/75">
																												{
																													metric.label
																												}
																											</p>
																											<p className="truncate whitespace-nowrap text-3xl font-semibold text-white">
																												{ellipsize(
																													metric.value,
																													40,
																												)}
																											</p>
																										</div>
																									);
																								},
																							)}
																						</div>
																						<div className="space-y-3">
																							{[
																								"Top dataset",
																								"Top model",
																								"Top space",
																							].map(
																								(
																									label,
																								) => {
																									const metric =
																										(
																											slide.metrics ??
																											[]
																										).find(
																											(
																												m,
																											) =>
																												m.label ===
																												label,
																										);
																									if (
																										!metric
																									) {
																										return null;
																									}
																									return (
																										<div
																											key={
																												metric.label
																											}
																											className="rounded-2xl border border-white/12 bg-white/5 px-6 py-5 shadow-inner shadow-black/10"
																										>
																											<p className="truncate text-sm uppercase tracking-wide text-white/75">
																												{
																													metric.label
																												}
																											</p>
																											<p className="truncate whitespace-nowrap text-2xl font-semibold text-white">
																												{ellipsize(
																													metric.value,
																													40,
																												)}
																											</p>
																										</div>
																									);
																								},
																							)}
																						</div>
																					</div>
																				) : (
																					<ul className="grid grid-cols-2 gap-4">
																						{slide.metrics.map(
																							(
																								metric,
																							) => (
																								<li
																									key={`${slide.id}-${metric.label}`}
																									className="group relative overflow-hidden rounded-2xl border border-white/12 bg-white/5 px-6 py-5 shadow-lg shadow-black/25 backdrop-blur"
																									data-story-metric
																								>
																									<p className="truncate text-sm uppercase tracking-wide text-white/70">
																										{
																											metric.label
																										}
																									</p>
																									<p className="text-2xl font-semibold text-white">
																										{
																											metric.value
																										}
																									</p>
																								</li>
																							),
																						)}
																					</ul>
																				)}
																			</div>
																		)}

																	{filteredHighlights &&
																		filteredHighlights.filter(
																			(
																				item,
																			) => {
																				const banned =
																					[
																						"gradio",
																						"en",
																						"region:us",
																						"region:eu",
																						"demo",
																					];
																				return !banned.includes(
																					item.toLowerCase(),
																				);
																			},
																		)
																			.length >
																			0 && (
																			<div className="col-span-2 flex flex-wrap gap-2">
																				{filteredHighlights
																					.filter(
																						(
																							item,
																						) => {
																							const banned =
																								[
																									"gradio",
																									"en",
																									"region:us",
																									"region:eu",
																									"demo",
																								];
																							return !banned.includes(
																								item.toLowerCase(),
																							);
																						},
																					)
																					.map(
																						(
																							item,
																						) => (
																							<span
																								key={
																									item
																								}
																								className={cn(
																									item.includes(
																										"huggingface.co/spaces/hf-wrapped/2025",
																									)
																										? "truncate bg-transparent px-3 py-0 text-white/90"
																										: "truncate rounded-full border border-white/20 bg-white/5 shadow-sm shadow-black/20 transition hover:-translate-y-[1px] hover:border-white/35 hover:bg-white/10",
																									!item.includes(
																										"huggingface.co/spaces/hf-wrapped/2025",
																									) &&
																										(isShare
																											? "px-2 py-3.5 text-1xl font-semibold text-white"
																											: "px-4 py-1.5 text-sm font-semibold text-white/90"),
																								)}
																								data-story-badge
																							>
																								{
																									item
																								}
																							</span>
																						),
																					)}
																			</div>
																		)}
																</div>

																<div
																	className={cn(
																		"relative flex h-full w-full items-center justify-center",
																		isShare
																			? "col-span-1 flex-col items-start justify-start gap-4 px-2"
																			: mediaLeft
																				? "order-1"
																				: "order-2",
																	)}
																>
																	{isShare ? (
																		<div className="flex w-full max-w-full flex-col gap-4">
																			<div className="w-full max-w-full overflow-hidden rounded-2xl border border-white/12 bg-white/5 px-5 py-4 text-left text-white shadow-inner shadow-black/10">
																				<p className="text-sm uppercase tracking-wide text-white/70">
																					Archetype
																				</p>
																				<p className="truncate whitespace-nowrap text-3xl font-semibold leading-tight text-white">
																					{
																						(
																							slide.metrics ??
																							[]
																						).find(
																							(
																								m,
																							) =>
																								m.label ===
																								"Archetype",
																						)
																							?.value
																					}
																				</p>
																			</div>
																			<div className="flex min-h-[420px] w-full max-w-full items-center justify-center overflow-hidden rounded-2xl border border-transparent bg-transparent px-6 py-6">
																				{imageSrc?.src ? (
																					<Image
																						src={
																							imageSrc.src
																						}
																						alt={`${slide.kind} visual`}
																						width={
																							520
																						}
																						height={
																							520
																						}
																						unoptimized={
																							imageSrc.isGif
																						}
																						className="h-auto w-full max-w-[440px] object-contain"
																					/>
																				) : (
																					<span className="text-sm text-white/60">
																						Image
																						unavailable
																					</span>
																				)}
																			</div>
																		</div>
																	) : (
																		imageSrc?.src && (
																			<Image
																				src={
																					imageSrc.src
																				}
																				alt={`${slide.kind} visual`}
																				width={
																					520
																				}
																				height={
																					520
																				}
																				unoptimized={
																					imageSrc.isGif
																				}
																				className="max-h-[420px] max-w-[420px] object-contain"
																			/>
																		)
																	)}
																</div>
															</div>
														)}
													</article>
												</Scrollytelling.Animation>
											);
										})}
									</div>
								</div>
							</div>
						</div>
					</Scrollytelling.Pin>
				</Scrollytelling.Root>
			</div>
		</div>
	);
}
