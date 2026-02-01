import {Button} from "@/components/ui/button";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {cn} from "@/lib/utils";

type Props = {
    label: string;
    disabled: boolean;
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    icon: React.ReactNode;
};

export function MoveButton({label, disabled, onClick, icon}: Props) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn("h-8 w-8 rounded-md", disabled && "opacity-50")}
                    onClick={onClick}
                    disabled={disabled}
                    aria-label={label}
                    aria-disabled={disabled}
                >
                    {icon}
                </Button>
            </TooltipTrigger>
            <TooltipContent side="top" align="center">
                <span className="text-xs">{label}</span>
            </TooltipContent>
        </Tooltip>
    );
}