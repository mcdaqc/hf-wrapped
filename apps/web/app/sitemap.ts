import { config } from "@repo/config";
import { getBaseUrl } from "@repo/utils";
import type { MetadataRoute } from "next";

const baseUrl = getBaseUrl();
const locales = config.i18n.enabled
	? Object.keys(config.i18n.locales)
	: [config.i18n.defaultLocale];

export default function sitemap(): MetadataRoute.Sitemap {
	return locales.map((locale) => ({
		url: new URL(`/${locale}`, baseUrl).href,
		lastModified: new Date(),
	}));
}
