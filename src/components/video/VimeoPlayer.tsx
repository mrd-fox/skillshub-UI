import {useMemo, useState} from "react";
import {buildVimeoPlayerUrlFromSourceUri, DEFAULT_VIMEO_PLAYER_PARAMS, extractVimeoId,} from "@/types/video";

type Props = {
    /**
     * Canonical URI from backend. Expected: "vimeo://{id}"
     */
    sourceUri: string;

    /**
     * Backend-provided hash required for restricted/unlisted embeds.
     * This must be preferred over any UI env map.
     * Example: "0c7b965c73"
     */
    embedHash?: string | null;

    /**
     * Optional poster image used for fallback UI.
     */
    thumbnailUrl?: string | null;

    /**
     * Responsive player height ratio (default 16:9).
     * Example: 56.25 for 16:9, 75 for 4:3
     */
    aspectRatioPercent?: number;

    /**
     * Autoplay is usually a bad idea. Default false.
     */
    autoplay?: boolean;

    /**
     * Hide byline/title/portrait. Default true.
     */
    minimalUi?: boolean;

    /**
     * Called when player fails to load (iframe error is limited; we simulate via onLoad/onError)
     */
    onError?: (message: string) => void;
};

function readVimeoHashMapFromEnv(): Record<string, string> {
    // English comment: Vimeo restricted embeds may require the "h" hash.
    // This env map is a fallback only. Source of truth must be backend embedHash when available.
    const raw = (import.meta as any).env?.VITE_VIMEO_EMBED_HASH_MAP;

    if (!raw || typeof raw !== "string") {
        return {};
    }

    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") {
            return {};
        }

        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed)) {
            if (typeof k === "string" && typeof v === "string") {
                const kk = k.trim();
                const vv = v.trim();
                if (kk.length > 0 && vv.length > 0) {
                    out[kk] = vv;
                }
            }
        }

        return out;
    } catch {
        return {};
    }
}

export default function VimeoPlayer(props: Props) {
    const {
        sourceUri,
        embedHash,
        thumbnailUrl,
        aspectRatioPercent,
        autoplay,
        minimalUi,
        onError,
    } = props;

    const ratio =
        typeof aspectRatioPercent === "number" && aspectRatioPercent > 0
            ? aspectRatioPercent
            : 56.25; // 16:9 default

    const shouldAutoplay = autoplay === true;
    const useMinimalUi = minimalUi !== false;

    const vimeoId = useMemo(() => {
        return extractVimeoId(sourceUri);
    }, [sourceUri]);

    const privateHash = useMemo(() => {
        if (!vimeoId) {
            return null;
        }

        // 1) Prefer backend-provided embedHash (source of truth)
        if (typeof embedHash === "string") {
            const trimmed = embedHash.trim();
            if (trimmed.length > 0) {
                return trimmed;
            }
        }

        // 2) Fallback to env map for MVP / legacy content
        const map = readVimeoHashMapFromEnv();
        const hash = map[vimeoId];

        if (hash && hash.trim().length > 0) {
            return hash.trim();
        } else {
            return null;
        }
    }, [vimeoId, embedHash]);

    const iframeSrc = useMemo(() => {
        if (!vimeoId) {
            return null;
        }

        const params = {
            ...DEFAULT_VIMEO_PLAYER_PARAMS,
            // Vimeo params are 0/1 typically, keep it consistent:
            autoplay: shouldAutoplay ? 1 : 0,
        };

        // If minimalUi is disabled, we keep defaults but allow Vimeo UI
        if (!useMinimalUi) {
            // English comment: removing these params lets Vimeo show standard UI elements.
            delete (params as any).title;
            delete (params as any).byline;
            delete (params as any).portrait;
            delete (params as any).badge;
        }

        return buildVimeoPlayerUrlFromSourceUri(sourceUri, {
            privateHash,
            params,
        });
    }, [vimeoId, sourceUri, privateHash, shouldAutoplay, useMinimalUi]);

    const [failed, setFailed] = useState(false);

    if (!iframeSrc) {
        return (
            <div className="w-full rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                Impossible de construire l’URL Vimeo (sourceUri invalide).
            </div>
        );
    }

    if (failed) {
        return (
            <div className="w-full rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                <div className="font-medium text-foreground">Lecture indisponible</div>
                <div className="mt-1">
                    Vimeo a refusé l’intégration (embed restreint) ou l’iframe a échoué à charger.
                </div>
                {thumbnailUrl ? (
                    <div className="mt-3">
                        <img
                            src={thumbnailUrl}
                            alt="Vignette vidéo"
                            className="w-full rounded-lg border object-cover"
                        />
                    </div>
                ) : null}
            </div>
        );
    }

    return (
        <div className="w-full overflow-hidden rounded-xl border bg-black">
            <div
                className="relative w-full"
                style={{paddingTop: `${ratio}%`}}
            >
                <iframe
                    src={iframeSrc}
                    className="absolute inset-0 h-full w-full"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    title="Vimeo player"
                    onLoad={() => {
                        // English comment: onLoad does not guarantee playback, but at least iframe loaded.
                    }}
                    onError={() => {
                        setFailed(true);
                        if (typeof onError === "function") {
                            onError("Vimeo iframe failed to load.");
                        }
                    }}
                />
            </div>
        </div>
    );
}
