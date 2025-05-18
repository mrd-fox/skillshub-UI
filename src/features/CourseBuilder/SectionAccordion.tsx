import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { ChapterItem } from "./ChapterItem";
import { Button } from "@/components/ui/button";

export function SectionAccordion() {
    return (
        <div className="space-y-2">
            <Accordion type="single" collapsible>
                <AccordionItem value="section-1" title="Section 1">
                    <ChapterItem />
                </AccordionItem>
            </Accordion>
            <Button variant="outline">+ Ajouter une section</Button>
        </div>
    );
}