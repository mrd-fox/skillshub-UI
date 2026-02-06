import {useEffect, useMemo, useRef, useState} from "react";
import * as tus from "tus-js-client";

import {videoService} from "@/api/services";
import {confirmVideo, initVideo} from "@/api/videoApi";
import {InitVideoResponse} from "@/types/video.ts";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Progress} from "@/components/ui/progress";
import {Separator} from "@/components/ui/separator";
import {cn} from "@/lib/utils";
import VimeoPlayer from "@/components/video/VimeoPlayer.tsx";

type VideoStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED" | "EXPIRED" | "UNKNOWN";

type ChapterVideo = {
    videoId?: string | null;
    status?: VideoStatus | null;

    // Canonical internal uri persisted in DB. Example: "vimeo://1161124790"
    sourceUri?: string | null;

    vimeoId?: string | number | null;
    embedHash?: string | null;

    thumbnailUrl?: string | null;
    errorMessage?: string | null;
};

type Props = {
    courseId: string;
    sectionId: string;
    chapterId: string;

    video?: ChapterVideo | null;

    onRequestRefresh: () => void;

    className?: string;
};


function formatStatus(status?: VideoStatus | null): VideoStatus {
    if (!status) {
        return "UNKNOWN";
    }
    return status;
}

function buildSourceUri(video?: ChapterVideo | null): string | null {
    if (!video) {
        return null;
    }

    if (typeof video.sourceUri === "string" && video.sourceUri.trim().length > 0) {
        return video.sourceUri.trim();
    }

    if (video.vimeoId !== null && video.vimeoId !== undefined) {
        const id = String(video.vimeoId).trim();
        if (id.length > 0) {
            return `vimeo://${id}`;
        }
    }

    return null;
}

export default function ChapterVideoPanel(props: Props) {
    const {courseId, sectionId, chapterId, video, onRequestRefresh, className} = props;

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const tusUploadRef = useRef<tus.Upload | null>(null);

    const [file, setFile] = useState<File | null>(null);
    const [progressPct, setProgressPct] = useState<number>(0);
    const [message, setMessage] = useState<string>("En attente.");

    const [uploadLoading, setUploadLoading] = useState<boolean>(false);
    const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

    // Lazy player: instantiate only when user clicks
    const [previewEnabled, setPreviewEnabled] = useState<boolean>(false);

    const status = useMemo(() => {
        return formatStatus(video?.status ?? "UNKNOWN");
    }, [video?.status]);

    const hasVideo = useMemo(() => {
        if (!video) {
            return false;
        }
        if (!video.videoId) {
            return false;
        }
        return true;
    }, [video]);

    const sourceUri = useMemo(() => {
        return buildSourceUri(video);
    }, [video]);

    const isReady = useMemo(() => {
        return status === "READY";
    }, [status]);

    const isProcessingOrPending = useMemo(() => {
        if (status === "PENDING") {
            return true;
        } else if (status === "PROCESSING") {
            return true;
        } else {
            return false;
        }
    }, [status]);

    const isBusy = useMemo(() => {
        if (uploadLoading || deleteLoading) {
            return true;
        } else {
            return false;
        }
    }, [uploadLoading, deleteLoading]);

    const canUpload = useMemo(() => {
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
    }, [file, isBusy, isProcessingOrPending]);

    const canDelete = useMemo(() => {
        if (!hasVideo) {
            return false;
        }
        if (isBusy) {
            return false;
        }
        return true;
    }, [hasVideo, isBusy]);

    useEffect(() => {
        // Reset local state when chapter changes
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
                // Ignore abort errors
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
                // Ignore abort errors
            } finally {
                tusUploadRef.current = null;
            }
        }
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

        try {
            // 1) INIT
            const initRes = (await initVideo({
                courseId,
                sectionId,
                chapterId,
                sizeBytes: file.size,
            })) as InitVideoResponse;

            if (!initRes || !initRes.uploadUrl) {
                throw new Error("InitVideoResponse: missing uploadUrl.");
            }

            onRequestRefresh();

            // 2) UPLOAD (TUS)
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

            // 3) CONFIRM
            await confirmVideo({
                courseId,
                sectionId,
                chapterId,
            });

            setMessage("Confirm OK. Traitement en cours côté backend.");
            onRequestRefresh();

            setFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Upload failed.";
            setMessage(msg);
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
            {/* VIEWER */}
            <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-semibold">Viewer</h3>
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

                {/* Fixed-size frame: same dimensions for thumbnail/black/player */}
                <div className="w-full">
                    <div className="w-full overflow-hidden rounded-lg border bg-black">
                        <div className="aspect-video w-full">
                            {/* Content must always fill the fixed frame */}
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
                                                    Preview disponible. Clique sur <span
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
                                    {status === "PROCESSING" || status === "PENDING"
                                        ? "Traitement en cours. L’upload est verrouillé."
                                        : "Aucune vidéo prête. Upload requis."}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {!previewEnabled && isReady ? (
                    <div className="text-xs text-muted-foreground">
                        Preview disponible. Clique sur <span
                        className="font-medium text-foreground">Voir la vidéo</span>.
                    </div>
                ) : null}
            </div>

            <Separator className="my-4"/>

            {/* UPLOAD */}
            <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-semibold">Upload</h3>
                        <p className="text-xs text-muted-foreground">
                            Upload = init + TUS + confirm automatique. Pas de bouton confirm.
                        </p>
                    </div>

                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteVideo}
                        disabled={!canDelete}
                    >
                        Delete
                    </Button>
                </div>

                <div className="space-y-2">
                    <div className="text-xs font-medium">Fichier vidéo</div>
                    <Input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        onChange={onPickFile}
                        disabled={isBusy || isProcessingOrPending}
                    />
                    {isProcessingOrPending ? (
                        <div className="text-xs text-muted-foreground">
                            Upload bloqué : une vidéo est déjà en cours de traitement (PENDING/PROCESSING).
                        </div>
                    ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={handleUploadAll} disabled={!canUpload}>
                        {uploadLoading ? "Uploading..." : "Upload"}
                    </Button>

                    <Button variant="outline" onClick={handleResetLocal} disabled={isBusy}>
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