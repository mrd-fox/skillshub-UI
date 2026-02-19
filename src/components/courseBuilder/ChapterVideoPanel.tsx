import {useEffect, useMemo, useRef, useState} from "react";
import * as tus from "tus-js-client";

import {videoService} from "@/api/services";
import {confirmVideo, initVideo} from "@/api/videoApi";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Progress} from "@/components/ui/progress";
import {Separator} from "@/components/ui/separator";
import {cn} from "@/lib/utils";
import VimeoPlayer from "@/components/video/VimeoPlayer.tsx";
import {useCourseBuilder} from "@/layout/tutor";
import {VideoResponse, VideoStatusEnum} from "@/types/video.ts";

type Props = {
    courseId: string;
    sectionId: string;
    chapterId: string;

    chapterTitle?: string;

    /**
     * This MUST be the backend DTO used everywhere in the UI.
     * No local "ChapterVideo" type allowed, otherwise TS mismatches.
     */
    video?: VideoResponse | null;

    /**
     * Caller refresh function (usually refreshCourse()).
     */
    onRequestRefresh: () => void;

    /**
     * When true, editing actions must be disabled.
     */
    readOnly?: boolean;

    /**
     * If present, explain why upload is disabled (e.g. chapter not persisted yet).
     */
    uploadDisabledReason?: string | null;

    className?: string;
};

function normalizeStatus(status: VideoStatusEnum | string | null | undefined): VideoStatusEnum | "UNKNOWN" {
    if (!status) {
        return "UNKNOWN";
    }

    // Keep it defensive: if backend adds a new value, UI stays stable
    if (status === "PENDING") {
        return "PENDING";
    } else if (status === "PROCESSING") {
        return "PROCESSING";
    } else if (status === "READY") {
        return "READY";
    } else if (status === "FAILED") {
        return "FAILED";
    } else if (status === "EXPIRED") {
        return "EXPIRED";
    } else if (status === "UPLOADED") {
        // Some implementations use UPLOADED as intermediate; treat as in-progress-like for UI
        return "UPLOADED";
    } else {
        return "UNKNOWN";
    }
}

/**
 * IMPORTANT:
 * Backend persists sourceUri in DB, UI must never require it to be returned by INIT.
 * But for Vimeo player, when READY we can build it from known fields if needed.
 */
function buildSourceUri(video: VideoResponse | null | undefined): string | null {
    if (!video) {
        return null;
    }

    // If backend exposes a canonical URI field, prefer it. Otherwise build from vimeoId when available.
    const anyVideo = video as unknown as { sourceUri?: string | null; vimeoId?: string | number | null };

    if (typeof anyVideo.sourceUri === "string" && anyVideo.sourceUri.trim().length > 0) {
        return anyVideo.sourceUri.trim();
    }

    if (anyVideo.vimeoId !== null && anyVideo.vimeoId !== undefined) {
        const id = String(anyVideo.vimeoId).trim();
        if (id.length > 0) {
            return `vimeo://${id}`;
        }
    }

    // Fallback: if the DTO exposes "uri" like "/videos/123", extract
    const maybeUri = (video as unknown as { uri?: string | null }).uri ?? null;
    if (typeof maybeUri === "string" && maybeUri.includes("/videos/")) {
        const parts = maybeUri.split("/videos/");
        const id = parts[1]?.split(/[/?#]/)[0]?.trim();
        if (id && id.length > 0) {
            return `vimeo://${id}`;
        }
    }

    return null;
}

function isInProgressStatus(status: VideoStatusEnum | "UNKNOWN"): boolean {
    if (status === "PENDING") {
        return true;
    } else if (status === "PROCESSING") {
        return true;
    } else if (status === "UPLOADED") {
        return true;
    } else {
        return false;
    }
}

export default function ChapterVideoPanel(props: Readonly<Props>) {
    const {
        courseId,
        sectionId,
        chapterId,
        chapterTitle,
        video,
        onRequestRefresh,
        readOnly,
        uploadDisabledReason,
        className,
    } = props;

    const {setCourse} = useCourseBuilder();

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const tusUploadRef = useRef<tus.Upload | null>(null);

    const [file, setFile] = useState<File | null>(null);
    const [progressPct, setProgressPct] = useState<number>(0);
    const [message, setMessage] = useState<string>("En attente.");

    const [uploadLoading, setUploadLoading] = useState<boolean>(false);
    const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

    const [previewEnabled, setPreviewEnabled] = useState<boolean>(false);

    const status = useMemo(() => {
        return normalizeStatus(video?.status);
    }, [video?.status]);

    const hasVideo = useMemo(() => {
        const anyVideo = video as unknown as { videoId?: string | null } | null;
        if (!anyVideo) {
            return false;
        }
        if (!anyVideo.videoId) {
            return false;
        }
        return true;
    }, [video]);

    const sourceUri = useMemo(() => {
        return buildSourceUri(video ?? null);
    }, [video]);

    const isReady = useMemo(() => {
        return status === "READY";
    }, [status]);

    const isProcessingOrPending = useMemo(() => {
        return isInProgressStatus(status);
    }, [status]);

    const isBusy = useMemo(() => {
        if (uploadLoading || deleteLoading) {
            return true;
        } else {
            return false;
        }
    }, [uploadLoading, deleteLoading]);

    const uploadDisabledByCaller = useMemo(() => {
        if (uploadDisabledReason && uploadDisabledReason.trim().length > 0) {
            return true;
        }
        return false;
    }, [uploadDisabledReason]);

    const canUpload = useMemo(() => {
        if (readOnly) {
            return false;
        }
        if (uploadDisabledByCaller) {
            return false;
        }
        if (!file) {
            return false;
        }
        if (isBusy) {
            return false;
        }
        if (isProcessingOrPending) {
            return false;
        }
        return true;
    }, [readOnly, uploadDisabledByCaller, file, isBusy, isProcessingOrPending]);

    const canDelete = useMemo(() => {
        if (readOnly) {
            return false;
        }
        if (!hasVideo) {
            return false;
        }
        if (isBusy) {
            return false;
        }
        if (isProcessingOrPending) {
            return false;
        }
        return true;
    }, [readOnly, hasVideo, isBusy, isProcessingOrPending]);

    useEffect(() => {
        setFile(null);
        setProgressPct(0);
        setMessage("En attente.");
        setPreviewEnabled(false);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }

        if (tusUploadRef.current) {
            try {
                tusUploadRef.current.abort(true);
            } catch {
                // ignore
            } finally {
                tusUploadRef.current = null;
            }
        }
    }, [courseId, sectionId, chapterId]);

    function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
        const picked = e.target.files?.[0];
        if (!picked) {
            setFile(null);
            return;
        }

        setFile(picked);
        setProgressPct(0);
        setMessage("Fichier sélectionné.");
    }

    function handleResetLocal() {
        setProgressPct(0);
        setMessage("En attente.");
        setFile(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }

        if (tusUploadRef.current) {
            try {
                tusUploadRef.current.abort(true);
            } catch {
                // ignore
            } finally {
                tusUploadRef.current = null;
            }
        }
    }

    function applyOptimisticVideoStatus(nextStatus: VideoStatusEnum) {
        setCourse((prev) => {
            if (!prev) {
                return prev;
            }

            const nextSections = (prev.sections ?? []).map((s) => {
                if (s.id !== sectionId) {
                    return s;
                }

                const nextChapters = (s.chapters ?? []).map((c) => {
                    if (c.id !== chapterId) {
                        return c;
                    }

                    const existingVideo = (c.video ?? null) as VideoResponse | null;

                    const nextVideo: VideoResponse = {
                        ...(existingVideo ?? ({} as VideoResponse)),
                        status: nextStatus,
                    };

                    return {
                        ...c,
                        video: nextVideo,
                    };
                });

                return {
                    ...s,
                    chapters: nextChapters,
                };
            });

            return {
                ...prev,
                sections: nextSections,
            };
        });
    }

    async function handleUploadAll() {
        if (!canUpload) {
            return;
        }
        if (!file) {
            return;
        }

        setUploadLoading(true);
        setMessage("Init + upload...");

        applyOptimisticVideoStatus("PENDING");

        try {
            const initRes = await initVideo({
                courseId,
                sectionId,
                chapterId,
                sizeBytes: file.size,
            });

            if (!initRes || !initRes.uploadUrl) {
                throw new Error("InitVideoResponse: missing uploadUrl.");
            }

            onRequestRefresh();

            await new Promise<void>((resolve, reject) => {
                const upload = new tus.Upload(file, {
                    uploadUrl: initRes.uploadUrl,
                    retryDelays: [0, 1000, 3000, 5000],
                    metadata: {
                        filename: file.name,
                        filetype: file.type,
                    },
                    onProgress: (bytesUploaded: number, bytesTotal: number) => {
                        if (bytesTotal <= 0) {
                            setProgressPct(0);
                            return;
                        }
                        const pct = Math.floor((bytesUploaded / bytesTotal) * 100);
                        setProgressPct(pct);
                    },
                    onError: (error: Error) => {
                        reject(error);
                    },
                    onSuccess: () => {
                        resolve();
                    },
                });

                tusUploadRef.current = upload;
                upload.start();
            });

            setMessage("Upload OK. Confirm...");

            await confirmVideo({
                courseId,
                sectionId,
                chapterId,
            });

            applyOptimisticVideoStatus("PROCESSING");

            setMessage("Confirm OK. Traitement en cours côté backend.");
            onRequestRefresh();

            setFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Upload failed.";
            setMessage(msg);
            onRequestRefresh();
        } finally {
            setUploadLoading(false);
        }
    }

    async function handleDeleteVideo() {
        if (!canDelete) {
            return;
        }

        setDeleteLoading(true);
        setMessage("Suppression vidéo...");

        try {
            await videoService.deleteVideo({courseId, sectionId, chapterId});
            setMessage("Vidéo supprimée.");
            setPreviewEnabled(false);
            onRequestRefresh();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Delete video failed.";
            setMessage(msg);
        } finally {
            setDeleteLoading(false);
        }
    }

    return (
        <div className={cn("rounded-lg border bg-card p-4", className)}>
            <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-semibold">
                            Viewer{chapterTitle ? (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">— {chapterTitle}</span>
                        ) : null}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            Statut vidéo : <span className="font-medium text-foreground">{status}</span>
                        </p>
                    </div>

                    {isReady ? (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewEnabled(true)}
                            disabled={previewEnabled}
                            title="Load and display the Vimeo player"
                        >
                            Voir la vidéo
                        </Button>
                    ) : null}
                </div>

                <div className="w-full">
                    <div className="w-full overflow-hidden rounded-lg border bg-black">
                        <div className="aspect-video w-full">
                            {isReady ? (
                                <>
                                    {!previewEnabled ? (
                                        <>
                                            {video?.thumbnailUrl ? (
                                                <img
                                                    src={video.thumbnailUrl}
                                                    alt="Video thumbnail"
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div
                                                    className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                                                    Preview disponible. Clique sur{" "}
                                                    <span
                                                        className="ml-1 font-medium text-foreground">Voir la vidéo</span>.
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {sourceUri ? (
                                                <div className="h-full w-full">
                                                    <VimeoPlayer
                                                        sourceUri={sourceUri}
                                                        embedHash={video?.embedHash ?? null}
                                                        thumbnailUrl={video?.thumbnailUrl ?? null}
                                                        minimalUi={true}
                                                        autoplay={false}
                                                        onError={(msg) => {
                                                            setMessage(msg);
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <div
                                                    className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                                                    Vidéo READY mais sourceUri introuvable.
                                                </div>
                                            )}
                                        </>
                                    )}
                                </>
                            ) : (
                                <div
                                    className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                                    {status === "PROCESSING" || status === "PENDING" || status === "UPLOADED"
                                        ? "Traitement en cours. La structure du cours doit être verrouillée."
                                        : "Aucune vidéo prête. Upload requis."}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Separator className="my-4"/>

            <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-semibold">Upload</h3>
                        <p className="text-xs text-muted-foreground">
                            Upload = init + TUS + confirm automatique.
                        </p>
                    </div>

                    <Button variant="destructive" size="sm" onClick={handleDeleteVideo} disabled={!canDelete}>
                        Delete
                    </Button>
                </div>

                {readOnly ? (
                    <div className="text-xs text-muted-foreground">
                        Upload et suppression désactivés : édition verrouillée.
                    </div>
                ) : null}

                {!readOnly && uploadDisabledByCaller ? (
                    <div className="text-xs text-muted-foreground">
                        {uploadDisabledReason}
                    </div>
                ) : null}

                <div className="space-y-2">
                    <div className="text-xs font-medium">Fichier vidéo</div>
                    <Input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        onChange={onPickFile}
                        disabled={isBusy || isProcessingOrPending || Boolean(readOnly) || uploadDisabledByCaller}
                    />
                    {isProcessingOrPending ? (
                        <div className="text-xs text-muted-foreground">
                            Upload bloqué : une vidéo est déjà en cours de traitement (PENDING/PROCESSING/UPLOADED).
                        </div>
                    ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={handleUploadAll} disabled={!canUpload}>
                        {uploadLoading ? "Uploading..." : "Upload"}
                    </Button>

                    <Button variant="outline" onClick={handleResetLocal} disabled={isBusy || Boolean(readOnly)}>
                        Reset
                    </Button>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="tabular-nums">{progressPct}%</span>
                    </div>
                    <Progress value={progressPct}/>
                </div>

                <div className="text-sm text-muted-foreground">{message}</div>
            </div>
        </div>
    );
}