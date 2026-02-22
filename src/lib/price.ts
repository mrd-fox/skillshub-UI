/**
 * Price utility functions
 * Handles conversion between cents (backend) and euros (UI)
 */

import i18n from "@/i18n";

/**
 * Format price from cents to localized currency string
 * @param priceCents Price in cents (backend format)
 * @returns Formatted price string (e.g., "20,00 €") or "Gratuit" if null/undefined
 */
export function formatPriceFromCents(priceCents: number | null | undefined): string {
    if (priceCents === null || priceCents === undefined) {
        return i18n.t("common.free");
    }

    if (priceCents === 0) {
        return i18n.t("common.free");
    }

    const euros = priceCents / 100;
    return euros.toLocaleString("fr-FR", {style: "currency", currency: "EUR"});
}

/**
 * Parse euros string to cents (integer)
 * @param input User input string (euros with comma or dot decimal separator)
 * @returns Price in cents (integer) or null if invalid
 */
export function parsePriceEurosToCents(input: string): number | null {
    if (!input || input.trim().length === 0) {
        return null;
    }

    const normalized = input.trim().replace(",", ".");
    const parsed = parseFloat(normalized);

    if (Number.isNaN(parsed)) {
        return null;
    }

    if (parsed < 0) {
        return null;
    }

    if (parsed === 0) {
        return 0;
    }

    return Math.round(parsed * 100);
}

/**
 * Convert cents to euros string for form input
 * @param priceCents Price in cents
 * @returns Euros as string with 2 decimals (e.g., "20.00")
 */
export function centsToEurosString(priceCents: number | null | undefined): string {
    if (priceCents === null || priceCents === undefined) {
        return "";
    }

    const euros = priceCents / 100;
    return euros.toFixed(2);
}
