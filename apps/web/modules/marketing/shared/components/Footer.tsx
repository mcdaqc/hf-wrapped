import { config } from "@repo/config";
import { Logo } from "@shared/components/Logo";

export function Footer() {
	return (
		<footer className="border-t py-4 text-foreground/60 text-xs">
			<div className="container flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<Logo className="h-6 w-auto opacity-80 grayscale" />
					<span>
						© {new Date().getFullYear()} {config.appName}. Built for
						the Hugging Face community.
					</span>
				</div>
			</div>
		</footer>
	);
}
