import Player from "@vimeo/player";
import {useEffect, useMemo, useRef, useState} from "react";

type Props = {
    /**
     * Canonical URI from backend. Expected: "vimeo://{id}"
     */
    sourceUri: string;

    /**
     * Optional poster image. If provided, Vimeo can still show its own poster;
     * we keep it mainly for fallback UI.
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
     * Called when player fails to initialize or Vimeo rejects loading.
     */
    onError?: (message: string) => void;
};

function extractVimeoIdStrict(sourceUri: string): string | null {
    const trimmed = sourceUri.trim();
    if (!trimmed.startsWith("vimeo://")) {
        return null;
    }

    const id = trimmed.slice("vimeo://".length).trim();
    if (!id) {
        return null;
    }

    // Keep tolerant: some Vimeo ids are numeric, but we do not hard-validate.
    return id;
}

export default function VimeoPlayer(props: Props) {
    const {
        sourceUri,
        thumbnailUrl,
        aspectRatioPercent,
        autoplay,
        minimalUi,
        onError,
    } = props;

    const ratio = typeof aspectRatioPercent === "number" && aspectRatioPercent > 0 ? aspectRatioPercent : 56.25;
    const shouldAutoplay = autoplay === true;
    const useMinimalUi = minimalUi !== false;

    const vimeoId = useMemo(() => {
        return extractVimeoIdStrict(sourceUri);
    }, [sourceUri]);

    const containerRef = useRef<HTMLDivElement | null>(null);
    const playerRef = useRef<Player | null>(null);

    const [initError, setInitError] = useState<string | null>(null);

    useEffect(() => {
        setInitError(null);

        if (!vimeoId) {
            const msg = "Invalid sourceUri. Expected format: vimeo://{id}";
            setInitError(msg);
            if (onError) {
                onError(msg);
            }
            return;
        }

        const el = containerRef.current;
        if (!el) {
            return;
        }

        // Cleanup any previous instance
        if (playerRef.current) {
            try {
                playerRef.current.destroy();
            } catch {
                // ignore
            }
            playerRef.current = null;
        }

        // Create Vimeo Player instance
        const player = new Player(el, {
            id: vimeoId,
            responsive: true,
            autoplay: shouldAutoplay,
            byline: useMinimalUi ? false : true,
            title: useMinimalUi ? false : true,
            portrait: useMinimalUi ? false : true,
        });

        playerRef.current = player;

        player.on("error", (err: any) => {
            const msg = err?.message ?? "Vimeo player error.";
            setInitError(msg);
            if (onError) {
                onError(msg);
            }
        });

        // Optional: try to load quickly to surface errors early
        player
            .ready()
            .catch((e: any) => {
                const msg = e?.message ?? "Failed to initialize Vimeo player.";
                setInitError(msg);
                if (onError) {
                    onError(msg);
                }
            });

        return () => {
            if (playerRef.current) {
                try {
                    playerRef.current.destroy();
                } catch {
                    // ignore
                }
                playerRef.current = null;
            }
        };
    }, [vimeoId, shouldAutoplay, useMinimalUi, onError]);

    if (!vimeoId) {
        return (
            <div className="rounded-xl border bg-muted/10 p-4 text-sm text-muted-foreground">
                Impossible de lire la vidéo : sourceUri invalide.
            </div>
        );
    }

    if (initError) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <div className="font-medium">Erreur Vimeo</div>
                <div className="mt-1">{initError}</div>
                {thumbnailUrl ? (
                    <div className="mt-3 overflow-hidden rounded-lg border bg-white">
                        <img src={thumbnailUrl} alt="Video thumbnail" className="h-auto w-full"/>
                    </div>
                ) : null}
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="relative w-full overflow-hidden rounded-xl border bg-black">
                <div style={{paddingTop: `${ratio}%`}}/>
                <div ref={containerRef} className="absolute inset-0"/>
            </div>
        </div>
    );
}