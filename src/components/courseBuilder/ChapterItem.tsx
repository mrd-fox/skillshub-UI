import {Input} from "@/components/ui/input.tsx";
import {Textarea} from "@/components/ui/textarea.tsx";
import {Label} from "@/components/ui/label.tsx";

export function ChapterItem({number}: { number: number }) {
    return (
        <div className="space-y-4 p-4 border rounded-md bg-white shadow-sm mt-2">
            <div className="space-y-2">
                <h3 className="text-md font-semibold text-indigo-600">
                    Chapitre {number}
                </h3>
                <Input placeholder="Titre du chapitre"/>
                <Textarea placeholder="Résumé du chapitre (optionnel)"/>
                <div className="flex items-center gap-2">
                    <Label htmlFor={`video-${number}`}>Vidéo</Label>
                    <Input id={`video-${number}`} type="file" accept="video/*"/>
                </div>
            </div>
        </div>
    );
}