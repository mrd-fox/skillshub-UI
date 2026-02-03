import {useEffect, useMemo, useRef, useState} from "react";
import * as tus from "tus-js-client";

import api from "@/api/axios.ts";
import {confirmVideo, initVideo} from "@/api/videoApi";
import {InitVideoResponse} from "@/types/video.ts";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Progress} from "@/components/ui/progress";
import {Separator} from "@/components/ui/separator";
import {cn} from "@/lib/utils";

type VideoStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED" | "EXPIRED" | "UNKNOWN";

type ChapterVideo = {
    videoId?: string | null;
    status?: VideoStatus | null;

    // Internal canonical uri persisted in DB. Example: "vimeo://1161124790"
    sourceUri?: string | null;

    // Optional metadata (depending on backend response)
    vimeoId?: string | number | null;
    embedHash?: string | null;

    errorMessage?: string | null;
};

type Props = {
    courseId: string;
    sectionId: string;
    chapterId: string;

    // Video is part of the chapter payload (backend is source of truth)
    video?: ChapterVideo | null;

    // Parent refetches the course (single source of truth)
    onRequestRefresh: () => void;

    className?: string;
};

function buildVideoBasePath(courseId: string, sectionId: string, chapterId: string): string {
    // NOTE: api instance already includes "/api" prefix.
    return `/course/${courseId}/sections/${sectionId}/chapters/${chapterId}/video`;
}

function formatStatus(status?: VideoStatus | null): string {
    if (!status) {
        return "UNKNOWN";
    }
    return status;
}

export default function ChapterVideoPanel(props: Props) {
    const {courseId, sectionId, chapterId, video, onRequestRefresh, className} = props;

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const tusUploadRef = useRef<tus.Upload | null>(null);

    const [file, setFile] = useState<File | null>(null);
    const [uploadUrl, setUploadUrl] = useState<string | null>(null);
    const [progressPct, setProgressPct] = useState<number>(0);
    const [message, setMessage] = useState<string>("En attente.");

    const [initLoading, setInitLoading] = useState<boolean>(false);
    const [uploadLoading, setUploadLoading] = useState<boolean>(false);
    const [confirmLoading, setConfirmLoading] = useState<boolean>(false);
    const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

    const hasVideo = useMemo(() => {
        if (!video) {
            return false;
        }
        if (!video.videoId) {
            return false;
        }
        return true;
    }, [video]);

    const computedStatus = useMemo(() => {
        return formatStatus(video?.status ?? "UNKNOWN");
    }, [video?.status]);

    const isBusy = useMemo(() => {
        if (initLoading || uploadLoading || confirmLoading || deleteLoading) {
            return true;
        }
        return false;
    }, [initLoading, uploadLoading, confirmLoading, deleteLoading]);

    const canInit = useMemo(() => {
        if (!file) {
            return false;
        }
        if (isBusy) {
            return false;
        }
        return true;
    }, [file, isBusy]);

    const canUpload = useMemo(() => {
        if (!file) {
            return false;
        }
        if (!uploadUrl) {
            return false;
        }
        if (isBusy) {
            return false;
        }
        return true;
    }, [file, uploadUrl, isBusy]);

    const canConfirm = useMemo(() => {
        // Backend is source of truth; confirm endpoint does not require sourceUri from UI.
        // We only allow confirm if a video exists in backend state.
        if (!hasVideo) {
            return false;
        }
        if (isBusy) {
            return false;
        }
        return true;
    }, [hasVideo, isBusy]);

    const canDeleteVideo = useMemo(() => {
        if (!hasVideo) {
            return false;
        }
        if (isBusy) {
            return false;
        }
        return true;
    }, [hasVideo, isBusy]);

    useEffect(() => {
        // Reset local upload UI when chapter changes
        setFile(null);
        setUploadUrl(null);
        setProgressPct(0);
        setMessage("En attente.");

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

    async function handleInit() {
        if (!canInit) {
            return;
        }
        if (!file) {
            return;
        }

        setInitLoading(true);
        setMessage("Init...");

        try {
            const res = (await initVideo({
                courseId,
                sectionId,
                chapterId,
                sizeBytes: file.size,
            })) as InitVideoResponse;

            if (!res || !("uploadUrl" in res) || !res.uploadUrl) {
                throw new Error("InitVideoResponse: missing uploadUrl.");
            }

            setUploadUrl(res.uploadUrl);

            // Critical: refresh after INIT so UI reloads backend state (videoId/sourceUri/status).
            onRequestRefresh();

            setMessage("Init OK. Prêt pour upload.");
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Init failed.";
            setMessage(msg);
        } finally {
            setInitLoading(false);
        }
    }

    async function handleUpload() {
        if (!canUpload) {
            return;
        }
        if (!file || !uploadUrl) {
            return;
        }

        setUploadLoading(true);
        setMessage("Upload en cours...");

        try {
            const upload = new tus.Upload(file, {
                uploadUrl,
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
                    setMessage(error?.message ?? "Upload failed.");
                    setUploadLoading(false);
                },
                onSuccess: () => {
                    setMessage("Upload OK. Tu peux confirmer.");
                    setUploadLoading(false);

                    // Refresh is useful (backend may update status/fields after upload).
                    onRequestRefresh();
                },
            });

            tusUploadRef.current = upload;
            upload.start();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Upload failed.";
            setMessage(msg);
            setUploadLoading(false);
        }
    }

    async function handleConfirm() {
        if (!canConfirm) {
            return;
        }

        setConfirmLoading(true);
        setMessage("Confirm...");

        try {
            await confirmVideo({
                courseId,
                sectionId,
                chapterId,
            });

            setMessage("Confirm OK. Polling backend démarré.");
            onRequestRefresh();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Confirm failed.";
            setMessage(msg);
        } finally {
            setConfirmLoading(false);
        }
    }

    async function handleDeleteVideo() {
        if (!canDeleteVideo) {
            return;
        }

        setDeleteLoading(true);
        setMessage("Suppression vidéo...");

        try {
            const basePath = buildVideoBasePath(courseId, sectionId, chapterId);

            // NOTE: videoApi.ts does not contain delete yet, so we call the api instance directly here.
            // If you add deleteVideo() in videoApi later, replace this with a proper import.
            await api.delete(`${basePath}`);

            setMessage("Vidéo supprimée.");
            onRequestRefresh();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Delete video failed.";
            setMessage(msg);
        } finally {
            setDeleteLoading(false);
        }
    }

    function handleResetLocal() {
        setProgressPct(0);
        setUploadUrl(null);
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

    return (
        <div className={cn("rounded-lg border bg-card p-4", className)}>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-sm font-semibold">Upload</h3>
                    <p className="text-xs text-muted-foreground">
                        Flow: init → upload (TUS) → confirm → polling backend.
                    </p>
                </div>

                <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteVideo}
                    disabled={!canDeleteVideo}
                    title="Delete the video attached to this chapter"
                >
                    Delete video
                </Button>
            </div>

            <Separator className="my-4"/>

            <div className="space-y-3">
                <div className="space-y-2">
                    <div className="text-xs font-medium">Fichier vidéo</div>
                    <Input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        onChange={onPickFile}
                        disabled={isBusy}
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={handleInit} disabled={!canInit}>
                        {initLoading ? "Init..." : "Init"}
                    </Button>

                    <Button onClick={handleUpload} disabled={!canUpload}>
                        {uploadLoading ? "Uploading..." : "Upload (TUS)"}
                    </Button>

                    <Button onClick={handleConfirm} disabled={!canConfirm}>
                        {confirmLoading ? "Confirm..." : "Confirm"}
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

                <Separator className="my-2"/>

                <div className="space-y-1 text-xs text-muted-foreground">
                    <div>
                        <span className="font-medium text-foreground">VideoId:</span>{" "}
                        {video?.videoId ?? "-"}
                    </div>
                    <div>
                        <span className="font-medium text-foreground">SourceUri:</span>{" "}
                        {video?.sourceUri ?? "-"}
                    </div>
                    <div>
                        <span className="font-medium text-foreground">VimeoId:</span>{" "}
                        {video?.vimeoId ?? "-"}
                    </div>
                    <div>
                        <span className="font-medium text-foreground">EmbedHash:</span>{" "}
                        {video?.embedHash ?? "-"}
                    </div>
                    <div>
                        <span className="font-medium text-foreground">Backend status:</span>{" "}
                        {computedStatus}
                    </div>
                    {video?.errorMessage ? (
                        <div className="text-destructive">
                            <span className="font-medium">Error:</span> {video.errorMessage}
                        </div>
                    ) : null}
                </div>

                <div className="pt-2 text-xs text-muted-foreground">
                    Publish is course-level only. No publish action exists here.
                </div>
            </div>
        </div>
    );
}
