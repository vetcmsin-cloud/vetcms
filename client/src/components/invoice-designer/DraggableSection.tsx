import * as React from "react";
import { Reorder, useDragControls } from "framer-motion";
import { GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DraggableSectionProps {
    section: any;
    isSelected?: boolean;
    onSelect?: () => void;
    onRemove?: () => void;
    children: React.ReactNode;
}

export function DraggableSection({
    section,
    isSelected,
    onSelect,
    onRemove,
    children,
}: DraggableSectionProps) {
    const controls = useDragControls();

    return (
        <Reorder.Item
            value={section}
            id={section.id}
            dragListener={false}
            dragControls={controls}
            className={cn(
                "relative group transition-all rounded-sm",
                isSelected ? "ring-2 ring-primary z-10" : "hover:ring-1 hover:ring-primary/50"
            )}
            onClick={(e: any) => {
                e.stopPropagation();
                onSelect?.();
            }}
        >
            {/* Drag Handle - Only visible on hover/select */}
            <div
                className={cn(
                    "absolute -left-8 top-0 bottom-0 w-6 flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none opacity-0 group-hover:opacity-100 transition-opacity",
                    isSelected && "opacity-100"
                )}
                onPointerDown={(e: any) => controls.start(e)}
            >
                <GripVertical className="h-5 w-5" />
            </div>

            {/* Content */}
            <div className={cn("min-h-[20px]", !section.isVisible && "opacity-50 grayscale")}>
                {children}
            </div>

            {/* Remove Button - Only visible on hover/select */}
            {onRemove && (
                <div className={cn(
                    "absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity",
                    isSelected && "opacity-100"
                )}>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove();
                        }}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </Reorder.Item>
    );
}
