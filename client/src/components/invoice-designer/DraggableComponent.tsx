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

    const isResizing = useRef(false);
    const resizeStart = useRef({ x: 0, y: 0, initialWidth: 0, initialHeight: 0 });

    const handleResizeDown = (e: React.PointerEvent) => {
        e.stopPropagation();
        isResizing.current = true;
        resizeStart.current = {
            x: e.clientX,
            y: e.clientY,
            initialWidth: section.width || nodeRef.current?.offsetWidth || 200,
            initialHeight: section.height || nodeRef.current?.offsetHeight || 100,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handleResizeMove = (e: React.PointerEvent) => {
        if (!isResizing.current) return;
        e.stopPropagation();
        const deltaX = (e.clientX - resizeStart.current.x) / zoomScale;
        const deltaY = (e.clientY - resizeStart.current.y) / zoomScale;

        let newW = Math.max(50, Math.round(resizeStart.current.initialWidth + deltaX));
        let newH = Math.max(20, Math.round(resizeStart.current.initialHeight + deltaY));

        if (gridSize > 0) {
            newW = Math.round(newW / gridSize) * gridSize;
            newH = Math.round(newH / gridSize) * gridSize;
        }

        onUpdate({ width: newW, height: newH });
    };

    const handleResizeUp = (e: React.PointerEvent) => {
        if (!isResizing.current) return;
        isResizing.current = false;
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    return (
        <div
            ref={nodeRef}
            style={{
                position: "absolute",
                left: localPos.x,
                top: localPos.y,
                width: section.width ? `${section.width}px` : "auto",
                height: section.height ? `${section.height}px` : "auto",
                overflow: (section as any).lockSize ? "hidden" : undefined,
                maxHeight: ((section as any).lockSize && section.height) ? `${section.height}px` : undefined,
                maxWidth: ((section as any).lockSize && section.width) ? `${section.width}px` : undefined,
                zIndex: isSelected ? 50 : 10,
                cursor: readOnly ? "default" : "move",
                boxSizing: "border-box",
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

            {!readOnly && isSelected && (
                <div
                    className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground p-1 rounded-sm shadow-md cursor-se-resize z-50 hover:bg-primary/90 pointer-events-auto"
                    onPointerDown={handleResizeDown}
                    onPointerMove={handleResizeMove}
                    onPointerUp={handleResizeUp}
                    onPointerCancel={handleResizeUp}
                    title="Drag to resize width and height"
                >
                    <svg className="w-3 h-3 fill-current" viewBox="0 0 16 16">
                        <path d="M14 14V9h-2v3H9v2h5zM14 6V1h-5v2h3v3h2zM2 14v-5H0v5h5v-2H2z" />
                    </svg>
                </div>
            )}

            {!readOnly && isSelected && (
                <div className="absolute top-0 left-0 bg-primary/20 text-primary font-bold text-[8px] px-1 py-0.5 rounded-br border-b border-r border-primary/30 z-50 pointer-events-none whitespace-nowrap">
                    {Math.round(localPos.x)}, {Math.round(localPos.y)} ({section.width || 'auto'} x {section.height || 'auto'}) {(section as any).lockSize ? '[LOCKED]' : ''}
                    {(section.styles?.paddingTop || section.styles?.paddingBottom || section.styles?.paddingLeft || section.styles?.paddingRight) && (
                        <span className="ml-1 opacity-70">
                            (P: {section.styles?.paddingTop?.replace('px','') || '0'}/{section.styles?.paddingRight?.replace('px','') || '0'}/{section.styles?.paddingBottom?.replace('px','') || '0'}/{section.styles?.paddingLeft?.replace('px','') || '0'})
                        </span>
                    )}
                </div>
            )}

            <div className="pointer-events-none w-full h-full">
                {children}
            </div>
        </div>
    );
}
