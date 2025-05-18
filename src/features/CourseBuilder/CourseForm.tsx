import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function CourseForm() {
    return (
        <form className="space-y-4">
            <Input placeholder="Titre du cours" />
            <Textarea placeholder="Description du cours" />
            <Input placeholder="Catégorie" />
            <Input placeholder="Prix (€)" type="number" />
            <Button type="submit">Sauvegarder le brouillon</Button>
        </form>
    );
}