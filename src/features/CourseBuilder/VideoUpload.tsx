import { Button } from "@/components/ui/button";

export function VideoUpload() {
    return (
        <div className="flex flex-col gap-2">
            <label className="text-sm">Vidéo du chapitre</label>
            <input type="file" accept="video/*" />
            <Button variant="secondary">Uploader</Button>
        </div>
    );
}