import { Input } from "@/components/ui/input";
import { VideoUpload } from "./VideoUpload";

export function ChapterItem() {
    return (
        <div className="space-y-2 p-2 border rounded-md">
            <Input placeholder="Titre du chapitre" />
            <VideoUpload />
        </div>
    );
}