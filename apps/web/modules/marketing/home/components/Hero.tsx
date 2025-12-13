"use client";

import { useGSAP } from "@gsap/react";
import type { WrappedResult } from "@repo/wrapped";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import gsap from "gsap";
import { ArrowRightIcon, GithubIcon, Loader2Icon } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { StoryScroller } from "./StoryScroller";

const defaultHandle = process.env.NEXT_PUBLIC_WRAPPED_DEFAULT_HANDLE ?? "";
const defaultSubjectType =
	process.env.NEXT_PUBLIC_WRAPPED_DEFAULT_SUBJECT_TYPE ?? "auto";

const demoWrapped: WrappedResult = {
	profile: {
		handle: "hf-demo",
		displayName: "HF Demo",
		subjectType: "user",
	},
	year: 2025,
	activity: {
		models: [],
		datasets: [],
		spaces: [],
		papers: [],
		totalDownloads: 120_000,
		totalLikes: 800,
		totalRepos: 6,
		topTags: ["text-generation", "vision", "audio"],
		busiestMonth: "June",
	},
	archetype: "Model Maestro",
	badges: ["Top 1M+ downloads", "Community favorite", "Peak month: June"],
	slides: [
		{
			id: "intro",
			kind: "intro",
			title: "Your 2025 Hugging Face Wrapped",
			subtitle: "hf-demo",
			metrics: [
				{ label: "Repositories", value: "6", accent: "primary" },
				{ label: "Downloads", value: "120k" },
			],
			highlights: ["text-generation", "vision", "audio"],
		},
		{
			id: "models",
			kind: "models",
			title: "Top models",
			subtitle: "Most downloaded",
			metrics: [
				{ label: "hf-demo/sdxl", value: "55k downloads" },
				{ label: "hf-demo/tts", value: "38k downloads" },
			],
		},
		{
			id: "archetype",
			kind: "archetype",
			title: "Archetype",
			subtitle: "Model Maestro",
			metrics: [
				{ label: "Likes", value: "800" },
				{ label: "Busiest month", value: "June" },
			],
			highlights: ["Community favorite", "Peak month: June"],
		},
	],
	cached: false,
	generatedAt: new Date().toISOString(),
	source: "live",
};

export function Hero() {
	const [handle, setHandle] = useState(defaultHandle);
	const [wrapped, setWrapped] = useState<WrappedResult>(demoWrapped);
	const [isPending, startTransition] = useTransition();
	const [hasSubmitted, setHasSubmitted] = useState(false);
	const heroRef = useRef<HTMLDivElement | null>(null);
	const panelRef = useRef<HTMLDivElement | null>(null);

	useGSAP(() => {
		if (heroRef.current) {
			gsap.to(heroRef.current, {
				backgroundPosition: "110% 90%",
				scale: 1.005,
				duration: 14,
				repeat: -1,
				yoyo: true,
				ease: "sine.inOut",
			});
		}
		if (panelRef.current) {
			gsap.from(panelRef.current, {
				opacity: 0,
				y: 30,
				scale: 0.98,
				duration: 0.6,
				ease: "power3.out",
			});
		}
	});

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!handle.trim()) {
			toast.error("Enter a Hugging Face handle to generate the story.");
			return;
		}

		startTransition(async () => {
			try {
				const response = await fetch("/api/wrapped", {
					method: "POST",
					body: JSON.stringify({
						handle: handle.trim(),
						year: 2025,
						subjectType: "auto",
						allowRefresh: true,
					}),
				});

				const payload = (await response.json()) as
					| { error?: string }
					| WrappedResult;

				if (!response.ok || "error" in payload) {
					throw new Error(
						(payload as { error?: string }).error ??
							"Failed to generate wrapped",
					);
				}

				setWrapped(payload as WrappedResult);
				setHasSubmitted(true);
			} catch (error) {
				toast.error((error as Error).message);
			}
		});
	}

	useEffect(() => {
		if (!defaultHandle) {
			return;
		}
		startTransition(async () => {
			try {
				const response = await fetch("/api/wrapped", {
					method: "POST",
					body: JSON.stringify({
						handle: defaultHandle,
						year: 2025,
						subjectType: defaultSubjectType,
						allowRefresh: false,
					}),
				});
				const payload = (await response.json()) as
					| { error?: string }
					| WrappedResult;
				if (!response.ok || "error" in payload) {
					return;
				}
				setWrapped(payload as WrappedResult);
			} catch {
				// ignore prefetch errors
			}
		});
	}, []);

	return (
		<section
			ref={heroRef}
			className="relative flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.10),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(236,72,153,0.10),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.94),rgba(15,23,42,0.98))] bg-size-[200%_200%] px-4 py-10"
			id="generator"
		>
			<div
				ref={panelRef}
				className={`relative z-10 w-full ${
					hasSubmitted
						? "max-w-none"
						: "max-w-[560px] md:max-w-[720px]"
				}`}
			>
				{!hasSubmitted ? (
					<form
						onSubmit={onSubmit}
						className="flex flex-col gap-7 rounded-3xl border border-primary/15 bg-card/85 p-8 shadow-[0_30px_80px_-40px_rgba(59,130,246,0.65)] backdrop-blur transition duration-500 hover:shadow-[0_30px_90px_-35px_rgba(59,130,246,0.85)]"
					>
						<div className="flex flex-col items-center gap-3 text-center">
							<h1 className="flex flex-wrap items-center justify-center gap-3 text-3xl font-bold text-foreground md:text-4xl">
								<span>Your 2025 in</span>
								<Image
									src="/images/huggies/hf-logo-with-white-title.png"
									alt="Hugging Face"
									width={220}
									height={60}
									className="h-10 w-auto drop-shadow-[0_8px_25px_rgba(0,0,0,0.35)] md:h-12"
									priority
								/>
							</h1>
							<p className="text-foreground/70 text-sm md:text-base">
								Drop your username. Watch 2025 unfold.
							</p>
							<Button
								asChild
								variant="outline"
								size="sm"
								className="mt-2"
							>
								<a
									href="https://github.com/mcdaqc/hf-wrapped/"
									target="_blank"
									rel="noreferrer"
									className="flex items-center gap-2"
								>
									<GithubIcon className="size-4" />
									View on GitHub
								</a>
							</Button>
						</div>
						<div className="space-y-2">
							<Input
								id="handle-input"
								aria-label="Username"
								placeholder="@huggingface"
								value={handle}
								onChange={(event) =>
									setHandle(event.target.value)
								}
								required
								autoFocus
								className="h-12 text-base"
							/>
						</div>
						<Button
							type="submit"
							size="lg"
							className="relative h-12 overflow-hidden rounded-full px-6 text-base font-semibold text-white shadow-[0_18px_55px_-30px_rgba(236,72,153,0.85)] transition duration-300 hover:scale-[1.01] focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
							disabled={isPending}
						>
							<span className="absolute inset-[-55%] animate-[spin_6s_linear_infinite] bg-[conic-gradient(at_50%_50%,#f97316,#f43f5e,#a855f7,#22d3ee,#22c55e,#f97316)] opacity-80" />
							<span className="absolute inset-[2px] rounded-full bg-[linear-gradient(90deg,rgba(2,6,23,0.9),rgba(15,23,42,0.9),rgba(2,6,23,0.9))]" />
							{isPending ? (
								<span className="relative flex items-center justify-center">
									<Loader2Icon className="mr-2 size-4 animate-spin" />
									Generating…
								</span>
							) : (
								<span className="relative flex items-center justify-center gap-2">
									See my recap
									<ArrowRightIcon className="size-4" />
								</span>
							)}
						</Button>
					</form>
				) : (
					<div className="mx-auto w-full max-w-none">
						<StoryScroller wrapped={wrapped} />
					</div>
				)}
			</div>
		</section>
	);
}
