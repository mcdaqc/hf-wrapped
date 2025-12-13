import { Hero } from "@marketing/home/components/Hero";
import { setRequestLocale } from "next-intl/server";

export default async function Home({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	setRequestLocale(locale);

	return (
		<div className="flex min-h-screen flex-col overflow-hidden bg-background">
			<Hero />
			<style>
				{`
					nav[data-test="navigation"],
					footer {
						display: none !important;
					}
				`}
			</style>
		</div>
	);
}
