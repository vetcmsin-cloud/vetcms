import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { InvoiceSection } from "./types";
import { X, Move } from "lucide-react";

interface DraggableComponentProps {
    section: InvoiceSection;
    isSelected: boolean;
    onSelect: () => void;
    onUpdate: (updates: Partial<InvoiceSection>) => void;
    onRemove: () => void;
    zoomScale: number;
    children: React.ReactNode;
    readOnly?: boolean;
    gridSize?: number;
}

export function DraggableComponent({
    section,
    isSelected,
    onSelect,
    onUpdate,
    onRemove,
    zoomScale,
    children,
    readOnly,
    gridSize = 0
}: DraggableComponentProps) {
    const nodeRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const hasMoved = useRef(false);
    const startPos = useRef({ x: 0, y: 0, initialSectionX: 0, initialSectionY: 0 });

    const [localPos, setLocalPos] = useState({ x: section.x || 0, y: section.y || 0 });

    useEffect(() => {
        if (!isDragging.current) {
            setLocalPos({ x: section.x || 0, y: section.y || 0 });
        }
    }, [section.x, section.y]);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (readOnly) return;

        isDragging.current = true;
        hasMoved.current = false;

        startPos.current = {
            x: e.clientX,
            y: e.clientY,
            initialSectionX: localPos.x,
            initialSectionY: localPos.y
        };

        e.currentTarget.setPointerCapture(e.pointerId);

        if (!isSelected) {
            onSelect();
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging.current) return;

        hasMoved.current = true;

        const deltaX = (e.clientX - startPos.current.x) / zoomScale;
        const deltaY = (e.clientY - startPos.current.y) / zoomScale;

        let newX = startPos.current.initialSectionX + deltaX;
        let newY = startPos.current.initialSectionY + deltaY;

        if (gridSize > 0) {
            newX = Math.round(newX / gridSize) * gridSize;
            newY = Math.round(newY / gridSize) * gridSize;
        }

        setLocalPos({ x: newX, y: newY });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDragging.current) return;
        isDragging.current = false;
        e.currentTarget.releasePointerCapture(e.pointerId);

        if (hasMoved.current && (localPos.x !== section.x || localPos.y !== section.y)) {
            onUpdate({ x: localPos.x, y: localPos.y });
        }
    };

    return (
        <div
            ref={nodeRef}
            style={{
                position: "absolute",
                left: localPos.x,
                top: localPos.y,
                width: section.width ? section.width : "auto",
                height: section.height ? section.height : "auto",
                zIndex: isSelected ? 50 : 10,
                cursor: readOnly ? "default" : "move",
            }}
            onClick={(e) => {
                e.stopPropagation();
                onSelect();
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={cn(
                "group relative border-2 transition-colors",
                isSelected ? "border-primary bg-primary/5" : "border-transparent hover:border-dashed hover:border-primary/50",
                readOnly && "border-none hover:border-none bg-transparent"
            )}
        >
            {!readOnly && isSelected && (
                <div className="absolute -top-3 -left-3 bg-primary text-primary-foreground p-1 rounded-full shadow-sm cursor-move z-50 pointer-events-none">
                    <Move className="w-3 h-3" />
                </div>
            )}

            {!readOnly && isSelected && (
                <div
                    className="absolute -top-3 -right-3 bg-destructive text-destructive-foreground p-1 rounded-full shadow-sm cursor-pointer z-50 hover:bg-destructive/90 pointer-events-auto"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                >
                    <X className="w-3 h-3" />
                </div>
            )}

            <div className="pointer-events-none w-full h-full">
                {children}
            </div>
        </div>
    );
}
