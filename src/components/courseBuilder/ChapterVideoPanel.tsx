// src/components/courseBuilder/ChapterVideoPanel.tsx

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
        const fromVideo = typeof video?.sourceUri === "string" ? (video.sourceUri as string) : null;
        const fromInit = typeof initResult?.sourceUri === "string" ? initResult.sourceUri : null;
        return fromVideo ?? fromInit ?? null;
    }, [video?.sourceUri, initResult?.sourceUri]);

    const thumbnailUrl = useMemo(() => {
        const fromVideo = typeof video?.thumbnailUrl === "string" ? (video.thumbnailUrl as string) : null;
        const fromInit = typeof initResult?.thumbnailUrl === "string" ? initResult.thumbnailUrl : null;
        return fromVideo ?? fromInit ?? null;
    }, [video?.thumbnailUrl, initResult?.thumbnailUrl]);

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
            if (!init.uploadUrl) {
                setUploadState({kind: "error", message: "Missing uploadUrl from init response."});
                return;
            }

            setUploadState({kind: "uploading", percent: 0});

            const upload = new tus.Upload(selectedFile, {
                uploadUrl: init.uploadUrl,
                retryDelays: [0, 1000, 3000, 5000],
                metadata: {
                    filename: selectedFile.name,
                    filetype: selectedFile.type,
                },
                onError: (error) => {
                    setUploadState({
                        kind: "error",
                        message: error?.message ?? "Upload failed.",
                    });
                },
                onProgress: (bytesUploaded, bytesTotal) => {
                    if (bytesTotal <= 0) {
                        return;
                    }
                    const percent = Math.round((bytesUploaded / bytesTotal) * 100);
                    setUploadState({kind: "uploading", percent});
                },
                onSuccess: async () => {
                    setUploadState({kind: "confirming"});

                    try {
                        const initSourceUri = init.sourceUri;
                        if (!initSourceUri || initSourceUri.trim().length === 0) {
                            setUploadState({
                                kind: "error",
                                message: "Upload finished but init response did not provide a sourceUri.",
                            });
                            return;
                        }

                        await confirmVideo({
                            courseId,
                            sectionId,
                            chapterId,
                            sourceUri: initSourceUri,
                        });

                        setUploadState({kind: "done"});

                        if (onRefresh) {
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
            upload.start();
        },
        [courseId, sectionId, chapterId, onRefresh]
    );

    const handleInitAndUpload = useCallback(async () => {
        if (!file) {
            setUploadState({kind: "error", message: "Select a video file first."});
            return;
        }

        stopCurrentUpload();
        setUploadState({kind: "initializing"});

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
            setUploadState({kind: "error", message: e?.message ?? "Init failed."});
        }
    }, [file, stopCurrentUpload, courseId, sectionId, chapterId, startTusUpload]);

    const handleCancelUpload = useCallback(() => {
        stopCurrentUpload();
        setUploadState({kind: "idle"});
    }, [stopCurrentUpload]);

    const handlePublishRequest = useCallback(async () => {
        if (!currentVideoId) {
            return;
        }

        setPublishLoading(true);
        try {
            await publishVideo({videoId: currentVideoId});

            if (onRefresh) {
                await onRefresh();
            }
        } catch (e: any) {
            setUploadState({
                kind: "error",
                message: e?.message ?? "Publish request failed.",
            });
        } finally {
            setPublishLoading(false);
        }
    }, [currentVideoId, onRefresh]);

    const statusHint = useMemo(() => {
        if (!currentStatus) {
            return "Aucune vidéo associée à ce chapitre.";
        }

        if (currentStatus === "PENDING") {
            return "Vidéo initialisée. Upload à effectuer.";
        } else if (currentStatus === "PROCESSING") {
            return "Upload confirmé. Traitement Vimeo en cours.";
        } else if (currentStatus === "READY") {
            return "Vidéo prête. Tu peux demander la publication (passage en revue).";
        } else if (currentStatus === "IN_REVIEW") {
            return "Demande envoyée. Vidéo en attente de validation admin.";
        } else if (currentStatus === "PUBLISHED") {
            return "Vidéo publiée (visible côté étudiant).";
        } else if (currentStatus === "REJECTED") {
            return "Vidéo rejetée. Corrige et ré-uploade puis redemande la publication.";
        } else if (currentStatus === "FAILED") {
            return "Échec technique du traitement. Ré-uploade la vidéo.";
        } else if (currentStatus === "EXPIRED") {
            return "Upload expiré (confirm non reçu à temps). Ré-uploade la vidéo.";
        } else {
            return "";
        }
    }, [currentStatus]);

    const errorMessage = useMemo(() => {
        const fromLocal = uploadState.kind === "error" ? uploadState.message : null;
        const fromVideo = typeof video?.errorMessage === "string" ? (video.errorMessage as string) : null;
        const fromInit = typeof initResult?.errorMessage === "string" ? initResult.errorMessage : null;
        return fromLocal ?? fromVideo ?? fromInit;
    }, [uploadState, video?.errorMessage, initResult?.errorMessage]);

    const reviewMessage = useMemo(() => {
        const v = video as any;
        if (v && typeof v.reviewMessage === "string" && v.reviewMessage.trim().length > 0) {
            return v.reviewMessage;
        }
        return null;
    }, [video]);

    const canStartUpload = useMemo(() => {
        if (!currentStatus) {
            return true;
        }

        if (currentStatus === "PENDING") {
            return true;
        }

        if (currentStatus === "FAILED") {
            return true;
        }

        if (currentStatus === "EXPIRED") {
            return true;
        }

        if (currentStatus === "REJECTED") {
            return true;
        }

        return false;
    }, [currentStatus]);

    return (
        <Card className="border-muted/60">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <CardTitle className="text-base">Vidéo</CardTitle>
                        {chapterTitle ? (
                            <div className="mt-1 truncate text-xs text-muted-foreground">{chapterTitle}</div>
                        ) : null}
                    </div>

                    <Badge variant={statusBadgeVariant(currentStatus)}>{formatStatusLabel(currentStatus)}</Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">{statusHint}</div>

                {/* Preview */}
                {canPreview(currentStatus) && sourceUri && derivedVimeoId ? (
                    <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">Prévisualisation</div>
                        <VimeoPlayer sourceUri={sourceUri} thumbnailUrl={thumbnailUrl} minimalUi={true}
                                     autoplay={false}/>
                    </div>
                ) : null}

                {reviewMessage ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        {reviewMessage}
                    </div>
                ) : null}

                {errorMessage ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {errorMessage}
                    </div>
                ) : null}

                {/* Actions: Publish request */}
                {currentStatus === "READY" && currentVideoId ? (
                    <div className="flex items-center gap-2">
                        <Button type="button" onClick={handlePublishRequest} disabled={publishLoading}>
                            {publishLoading ? "Envoi…" : "Demander publication"}
                        </Button>
                    </div>
                ) : null}

                {/* Upload controls */}
                {canStartUpload ? (
                    <div className="space-y-2">
                        <Label className="text-sm">Fichier vidéo</Label>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Input
                                type="file"
                                accept="video/*"
                                onChange={(e) => {
                                    const f = e.target.files?.[0] ?? null;
                                    setFile(f);
                                    setUploadState({kind: "idle"});
                                }}
                            />

                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    onClick={handleInitAndUpload}
                                    disabled={
                                        !file ||
                                        uploadState.kind === "initializing" ||
                                        uploadState.kind === "uploading" ||
                                        uploadState.kind === "confirming"
                                    }
                                >
                                    {currentStatus === "FAILED" || currentStatus === "EXPIRED" || currentStatus === "REJECTED"
                                        ? "Ré-uploader"
                                        : "Démarrer"}
                                </Button>

                                {uploadState.kind === "uploading" || uploadState.kind === "confirming" ? (
                                    <Button type="button" variant="secondary" onClick={handleCancelUpload}>
                                        Annuler
                                    </Button>
                                ) : null}
                            </div>
                        </div>

                        {uploadState.kind === "initializing" ? (
                            <div className="text-xs text-muted-foreground">Initialisation…</div>
                        ) : null}

                        {uploadState.kind === "uploading" ? (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Upload Vimeo (TUS)</span>
                                    <span>{uploadState.percent}%</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-muted">
                                    <div className="h-2 rounded-full bg-primary"
                                         style={{width: `${uploadState.percent}%`}}/>
                                </div>
                            </div>
                        ) : null}

                        {uploadState.kind === "confirming" ? (
                            <div className="text-xs text-muted-foreground">Confirmation…</div>
                        ) : null}

                        {initResult?.uploadExpiresAt ? (
                            <div className="text-xs text-muted-foreground">
                                Expire: {new Date(initResult.uploadExpiresAt).toLocaleString()}
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className="rounded-lg border bg-muted/10 p-3 text-xs text-muted-foreground">
                        Actions désactivées pour ce statut.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}