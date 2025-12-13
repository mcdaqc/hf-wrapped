"use client";

import { ProgressProvider } from "@bprogress/next/app";
import { config } from "@repo/config";
import { Toaster } from "@ui/components/toast";
import { ThemeProvider } from "next-themes";
import type { PropsWithChildren } from "react";

export function ClientProviders({ children }: PropsWithChildren) {
	return (
		<ProgressProvider
			height="4px"
			color="var(--color-primary)"
			options={{ showSpinner: false }}
			shallowRouting
			delay={250}
		>
			<ThemeProvider
				attribute="class"
				disableTransitionOnChange
				enableSystem
				defaultTheme={config.ui.defaultTheme}
				themes={config.ui.enabledThemes}
			>
				{children}

				<Toaster position="top-right" />
			</ThemeProvider>
		</ProgressProvider>
	);
}
