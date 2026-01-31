import {useCallback, useMemo, useRef, useState} from "react";
import * as tus from "tus-js-client";

import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";

import {confirmVideo, initVideo, publishVideo} from "@/api/videoApi";
import type {InitVideoResponse, VideoResponse, VideoStatusEnum} from "@/types/video";
import {extractVimeoId} from "@/types/video";
import VimeoPlayer from "@/components/video/VimeoPlayer.tsx";

type Props = {
    courseId: string;
    sectionId: string;
    chapterId: string;
    chapterTitle?: string;

    /**
     * Current video state coming from the course GET response.
     * Keep it loose for now because CourseBuilderLayout still uses older types.
     */
    video?: Partial<VideoResponse> | null;

    /**
     * Called after INIT/CONFIRM/PUBLISH succeed to refresh course state.
     */
    onRefresh?: () => Promise<void>;
};

type LocalUploadState =
    | { kind: "idle" }
    | { kind: "initializing" }
    | { kind: "uploading"; percent: number }
    | { kind: "confirming" }
    | { kind: "done" }
    | { kind: "error"; message: string };

function statusBadgeVariant(
    status: VideoStatusEnum | undefined | null
): "default" | "secondary" | "destructive" | "outline" {
    if (!status) {
        return "outline";
    }

    if (status === "READY") {
        return "default";
    } else if (status === "PUBLISHED") {
        return "default";
    } else if (status === "FAILED") {
        return "destructive";
    } else if (status === "REJECTED") {
        return "destructive";
    } else if (status === "EXPIRED") {
        return "destructive";
    } else {
        return "secondary";
    }
}

function formatStatusLabel(status: VideoStatusEnum | undefined | null): string {
    if (!status) {
        return "NO_VIDEO";
    }
    return status;
}

function canPreview(status: VideoStatusEnum | undefined | null): boolean {
    if (!status) {
        return false;
    }

    if (status === "READY") {
        return true;
    } else if (status === "IN_REVIEW") {
        return true;
    } else if (status === "PUBLISHED") {
        return true;
    } else {
        return false;
    }
}

export function ChapterVideoPanel(props: Props) {
    const {courseId, sectionId, chapterId, chapterTitle, video, onRefresh} = props;

    const [file, setFile] = useState<File | null>(null);
    const [initResult, setInitResult] = useState<InitVideoResponse | null>(null);
    const [uploadState, setUploadState] = useState<LocalUploadState>({kind: "idle"});
    const [publishLoading, setPublishLoading] = useState(false);

    const uploadRef = useRef<tus.Upload | null>(null);

    const currentStatus = (video?.status as VideoStatusEnum | undefined) ?? undefined;

    const currentVideoId = useMemo(() => {
        const fromVideo = typeof video?.id === "string" ? (video.id as string) : null;
        const fromInit = typeof initResult?.videoId === "string" ? initResult.videoId : null;
        return fromVideo ?? fromInit ?? null;
    }, [video?.id, initResult?.videoId]);

    const sourceUri = useMemo(() => {
        // Backend is source of truth: sourceUri must come from refreshed course state.
        // initResult may not include sourceUri by design.
        const fromVideo = typeof video?.sourceUri === "string" ? (video.sourceUri as string) : null;
        const fromInit = typeof initResult?.sourceUri === "string" ? initResult.sourceUri : null;
        return fromVideo ?? fromInit ?? null;
    }, [video?.sourceUri, initResult?.sourceUri]);

    const thumbnailUrl = useMemo(() => {
        const fromVideo = typeof video?.thumbnailUrl === "string" ? (video.thumbnailUrl as string) : null;
        const fromInit = typeof initResult?.thumbnailUrl === "string" ? initResult.thumbnailUrl : null;
        return fromVideo ?? fromInit ?? null;
    }, [video?.thumbnailUrl, initResult?.thumbnailUrl]);

    const embedHash = useMemo(() => {
        // Backend is source of truth: embedHash comes from the refreshed course state.
        // Keep it defensive because VideoResponse type may lag behind backend contract.
        const v: any = video as any;
        if (v && typeof v.embedHash === "string") {
            const trimmed = v.embedHash.trim();
            if (trimmed.length > 0) {
                return trimmed;
            } else {
                return null;
            }
        } else {
            return null;
        }
    }, [video]);

    const derivedVimeoId = useMemo(() => {
        return extractVimeoId(sourceUri ?? undefined);
    }, [sourceUri]);

    const stopCurrentUpload = useCallback(() => {
        const current = uploadRef.current;
        if (current) {
            try {
                current.abort(true);
            } catch {
                // ignore
            }
        }
        uploadRef.current = null;
    }, []);

    const startTusUpload = useCallback(
        async (selectedFile: File, init: InitVideoResponse) => {
            if (!init || !init.uploadUrl) {
                setUploadState({kind: "error", message: "INIT response missing uploadUrl."});
                return;
            }

            stopCurrentUpload();
            setUploadState({kind: "uploading", percent: 0});

            const upload = new tus.Upload(selectedFile, {
                endpoint: init.uploadUrl,
                retryDelays: [0, 1000, 3000, 5000],
                metadata: {
                    filename: selectedFile.name,
                    filetype: selectedFile.type,
                },
                onError: (error) => {
                    setUploadState({kind: "error", message: error?.message ?? "Upload failed."});
                },
                onProgress: (bytesUploaded, bytesTotal) => {
                    if (bytesTotal > 0) {
                        const percent = Math.round((bytesUploaded / bytesTotal) * 100);
                        setUploadState({kind: "uploading", percent});
                    }
                },
                onSuccess: async () => {
                    setUploadState({kind: "confirming"});
                    try {
                        await confirmVideo({courseId, sectionId, chapterId});

                        setUploadState({kind: "done"});

                        if (typeof onRefresh === "function") {
                            await onRefresh();
                        }
                    } catch (e: any) {
                        setUploadState({
                            kind: "error",
                            message: e?.message ?? "Confirm failed.",
                        });
                    }
                },
            });

            uploadRef.current = upload;

            try {
                upload.start();
            } catch (e: any) {
                setUploadState({kind: "error", message: e?.message ?? "Upload start failed."});
            }
        },
        [courseId, sectionId, chapterId, onRefresh, stopCurrentUpload]
    );

    const onPickFile = useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
        const files = evt.target.files;
        if (!files || files.length === 0) {
            setFile(null);
            return;
        }
        setFile(files[0]);
    }, []);

    const onInitUpload = useCallback(async () => {
        if (!file) {
            setUploadState({kind: "error", message: "Choose a file first."});
            return;
        }

        setUploadState({kind: "initializing"});
        setInitResult(null);

        try {
            const init = await initVideo({
                courseId,
                sectionId,
                chapterId,
                sizeBytes: file.size,
            });

            setInitResult(init);
            await startTusUpload(file, init);
        } catch (e: any) {
            setUploadState({
                kind: "error",
                message: e?.message ?? "Init failed.",
            });
        }
    }, [file, courseId, sectionId, chapterId, startTusUpload]);

    const onPublish = useCallback(async () => {
        if (!currentVideoId) {
            return;
        }

        setPublishLoading(true);
        try {
            await publishVideo({videoId: currentVideoId});

            if (typeof onRefresh === "function") {
                await onRefresh();
            }
        } finally {
            setPublishLoading(false);
        }
    }, [currentVideoId, courseId, sectionId, chapterId, onRefresh]);

    const statusHint = useMemo(() => {
        if (!currentStatus) {
            return "Aucune vidéo. Initialise un upload pour associer une vidéo à ce chapitre.";
        }

        if (currentStatus === "PENDING") {
            return "Vidéo en attente : upload non confirmé ou en cours de reprise.";
        } else if (currentStatus === "UPLOADED") {
            return "Upload terminé côté provider. En attente de traitement.";
        } else if (currentStatus === "PROCESSING") {
            return "Traitement en cours côté Vimeo. Le backend poll automatiquement.";
        } else if (currentStatus === "IN_REVIEW") {
            return "Vimeo demande une revue (privacy / contenus).";
        } else if (currentStatus === "READY") {
            return "Vidéo prête. Prévisualisation disponible.";
        } else if (currentStatus === "PUBLISHED") {
            return "Vidéo publiée.";
        } else if (currentStatus === "FAILED") {
            return "Traitement échoué.";
        } else if (currentStatus === "REJECTED") {
            return "Vidéo rejetée.";
        } else if (currentStatus === "EXPIRED") {
            return "Session d’upload expirée. Réinitialise l’upload.";
        } else {
            return "État vidéo inconnu.";
        }
    }, [currentStatus]);

    const reviewMessage = useMemo(() => {
        if (currentStatus === "IN_REVIEW") {
            return "Vimeo a mis la vidéo en revue. Vérifie les paramètres privacy et les restrictions d’intégration.";
        } else {
            return null;
        }
    }, [currentStatus]);

    const canPublish = useMemo(() => {
        if (!currentStatus) {
            return false;
        }

        if (currentStatus === "READY") {
            return true;
        } else if (currentStatus === "IN_REVIEW") {
            return false;
        } else if (currentStatus === "PUBLISHED") {
            return false;
        } else {
            return false;
        }
    }, [currentStatus]);

    return (
        <Card>
            <CardHeader className="space-y-1">
                <CardTitle className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="truncate">{chapterTitle ?? "Video"}</div>
                        <div className="text-xs font-normal text-muted-foreground">
                            Chapter: {chapterId}
                        </div>
                    </div>

                    <Badge variant={statusBadgeVariant(currentStatus)}>
                        {formatStatusLabel(currentStatus)}
                    </Badge>
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">{statusHint}</div>

                {/* Preview */}
                {canPreview(currentStatus) && sourceUri && derivedVimeoId ? (
                    <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">Prévisualisation</div>
                        <VimeoPlayer
                            sourceUri={sourceUri}
                            embedHash={embedHash}
                            thumbnailUrl={thumbnailUrl}
                            minimalUi={true}
                            autoplay={false}
                        />
                    </div>
                ) : null}

                {reviewMessage ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        {reviewMessage}
                    </div>
                ) : null}

                <div className="space-y-2 rounded-lg border p-3">
                    <div className="text-sm font-medium">Upload</div>

                    <div className="grid gap-2">
                        <Label htmlFor="videoFile">Fichier vidéo</Label>
                        <Input
                            id="videoFile"
                            type="file"
                            accept="video/*"
                            onChange={onPickFile}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            onClick={onInitUpload}
                            disabled={
                                !file ||
                                uploadState.kind === "initializing" ||
                                uploadState.kind === "uploading" ||
                                uploadState.kind === "confirming"
                            }
                        >
                            Init + Upload + Confirm
                        </Button>

                        {canPublish ? (
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={onPublish}
                                disabled={publishLoading}
                            >
                                {publishLoading ? "Publishing..." : "Publish"}
                            </Button>
                        ) : (
                            <Button type="button" variant="secondary" disabled={true}>
                                Publish
                            </Button>
                        )}

                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                stopCurrentUpload();
                                setUploadState({kind: "idle"});
                                setInitResult(null);
                                setFile(null);
                            }}
                        >
                            Reset
                        </Button>
                    </div>

                    <div className="text-sm text-muted-foreground">
                        {uploadState.kind === "idle" ? (
                            <div>En attente.</div>
                        ) : null}

                        {uploadState.kind === "initializing" ? (
                            <div>INIT en cours…</div>
                        ) : null}

                        {uploadState.kind === "uploading" ? (
                            <div>Upload en cours… {uploadState.percent}%</div>
                        ) : null}

                        {uploadState.kind === "confirming" ? (
                            <div>CONFIRM en cours…</div>
                        ) : null}

                        {uploadState.kind === "done" ? (
                            <div>Upload terminé. Rafraîchis le cours si besoin.</div>
                        ) : null}

                        {uploadState.kind === "error" ? (
                            <div className="text-destructive">Erreur: {uploadState.message}</div>
                        ) : null}
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground">
                        <div>VideoId: {currentVideoId ?? "-"}</div>
                        <div>SourceUri: {sourceUri ?? "-"}</div>
                        <div>VimeoId: {derivedVimeoId ?? "-"}</div>
                        <div>EmbedHash: {embedHash ?? "-"}</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
