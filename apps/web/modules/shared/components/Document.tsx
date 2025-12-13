import { ClientProviders } from "@shared/components/ClientProviders";
import { cn } from "@ui/lib";
import { Geist } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { PropsWithChildren } from "react";

const sansFont = Geist({
	weight: ["400", "500", "600", "700"],
	subsets: ["latin"],
	variable: "--font-sans",
});

export async function Document({
	children,
	locale,
}: PropsWithChildren<{ locale: string }>) {
	return (
		<html
			lang={locale}
			suppressHydrationWarning
			className={sansFont.className}
		>
			<body
				className={cn(
					"min-h-screen bg-background text-foreground antialiased",
				)}
			>
				<NuqsAdapter>
					<ClientProviders>{children}</ClientProviders>
				</NuqsAdapter>
			</body>
		</html>
	);
}
