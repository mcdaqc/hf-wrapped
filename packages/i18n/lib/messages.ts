import { config } from "@repo/config";
import deepmerge from "deepmerge";
import type { Messages } from "../types";

// Turbopack/Next needs statically analyzable imports; map locales explicitly.
const localeImports = {
	en: () => import("../translations/en.json"),
	de: () => import("../translations/de.json"),
} as const;

type SupportedLocale = keyof typeof localeImports;

function resolveLocale(locale: string): SupportedLocale {
	if (locale in localeImports) {
		return locale as SupportedLocale;
	}
	// Fallback to default if requested locale is unsupported.
	return config.i18n.defaultLocale as SupportedLocale;
}

export const importLocale = async (locale: string): Promise<Messages> => {
	const resolved = resolveLocale(locale);
	return (await localeImports[resolved]()).default as Messages;
};

export const getMessagesForLocale = async (
	locale: string,
): Promise<Messages> => {
	const localeMessages = await importLocale(locale);
	if (locale === config.i18n.defaultLocale) {
		return localeMessages;
	}
	const defaultLocaleMessages = await importLocale(config.i18n.defaultLocale);
	return deepmerge(defaultLocaleMessages, localeMessages);
};
