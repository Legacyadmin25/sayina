'use client';
import { useState, useRef, useCallback } from 'react';
import { Field, FieldType } from '@/lib/types/envelope';
import { cn } from '@/lib/utils';

// Default sizes per field type
const FIELD_DEFAULTS: Record<FieldType, { width: number; height: number; label: string }> = {
  signature: { width: 160, height: 56,  label: 'Signature' },
  initials:  { width: 80,  height: 48,  label: 'Initials'  },
  text:      { width: 160, height: 32,  label: 'Text'      },
  date:      { width: 120, height: 32,  label: 'Date'      },
  checkbox:  { width: 24,  height: 24,  label: 'Checkbox'  },
  dropdown:  { width: 160, height: 32,  label: 'Dropdown'  },
  stamp:     { width: 80,  height: 80,  label: 'Stamp'     },
};

const FIELD_COLOURS: Record<FieldType, string> = {
  signature: '#3B82F6',
  initials:  '#8B5CF6',
  text:      '#6B7280',
  date:      '#10B981',
  checkbox:  '#F59E0B',
  dropdown:  '#EC4899',
  stamp:     '#EF4444',
};

interface FieldPlacerProps {
  fields: Field[];
  onChange: (fields: Field[]) => void;
  currentPage: number;
  scale: number;
  activeTool: FieldType;
  activeSignerId: number;
  isPlacing: boolean;
  setIsPlacing: (isPlacing: boolean) => void;
}

export default function FieldPlacer({
  fields,
  onChange,
  currentPage,
  scale,
  activeTool,
  activeSignerId,
  isPlacing,
  setIsPlacing,
}: FieldPlacerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Place a new field on click ───────────────────────────────────────────────
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlacing || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    const defaults = FIELD_DEFAULTS[activeTool];
    const newField: Field = {
      id: `field-${activeTool}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: activeTool,
      x,
      y,
      width: defaults.width,
      height: defaults.height,
      page: currentPage,
      signerId: activeSignerId,
      label: defaults.label,
      required: true,
      options: activeTool === 'dropdown' ? ['Option 1', 'Option 2', 'Option 3'] : undefined,
    };
    onChange([...fields, newField]);
    setIsPlacing(false);
  };

  // ── Remove a field ───────────────────────────────────────────────────────────
  const removeField = (e: React.MouseEvent, fieldId: string) => {
    e.stopPropagation();
    onChange(fields.filter(f => f.id !== fieldId));
  };

  return (
    <div
      ref={containerRef}
      className={cn('absolute inset-0 z-10', isPlacing ? 'cursor-crosshair' : '')}
      onClick={handleContainerClick}
    >
      {fields
        .filter(f => f.page === currentPage)
        .map(field => (
          <DraggableField
            key={field.id}
            field={field}
            scale={scale}
            isPlacing={isPlacing}
            containerRef={containerRef}
            onMove={(id, x, y) =>
              onChange(fields.map(f => f.id === id ? { ...f, x, y } : f))
            }
            onResize={(id, w, h) =>
              onChange(fields.map(f => f.id === id ? { ...f, width: w, height: h } : f))
            }
            onRemove={removeField}
          />
        ))}
    </div>
  );
}

// ── Individual draggable/resizable field ─────────────────────────────────────
interface DraggableFieldProps {
  field: Field;
  scale: number;
  isPlacing: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, w: number, h: number) => void;
  onRemove: (e: React.MouseEvent, id: string) => void;
}

function DraggableField({ field, scale, isPlacing, containerRef, onMove, onResize, onRemove }: DraggableFieldProps) {
  const colour = FIELD_COLOURS[field.type];

  // ── Drag ──────────────────────────────────────────────────────────────────
  const dragStart = useRef<{ mx: number; my: number; fx: number; fy: number } | null>(null);

  const handleDragPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (isPlacing) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { mx: e.clientX, my: e.clientY, fx: field.x, fy: field.y };
  }, [isPlacing, field.x, field.y]);

  const handleDragPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    e.stopPropagation();
    const dx = (e.clientX - dragStart.current.mx) / scale;
    const dy = (e.clientY - dragStart.current.my) / scale;
    onMove(field.id, dragStart.current.fx + dx, dragStart.current.fy + dy);
  }, [field.id, scale, onMove]);

  const handleDragPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    dragStart.current = null;
  }, []);

  // ── Resize ────────────────────────────────────────────────────────────────
  const resizeStart = useRef<{ mx: number; my: number; fw: number; fh: number } | null>(null);

  const handleResizePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeStart.current = { mx: e.clientX, my: e.clientY, fw: field.width, fh: field.height };
  }, [field.width, field.height]);

  const handleResizePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeStart.current) return;
    e.stopPropagation();
    const dw = (e.clientX - resizeStart.current.mx) / scale;
    const dh = (e.clientY - resizeStart.current.my) / scale;
    onResize(field.id,
      Math.max(24, resizeStart.current.fw + dw),
      Math.max(20, resizeStart.current.fh + dh),
    );
  }, [field.id, scale, onResize]);

  const handleResizePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    resizeStart.current = null;
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        left: field.x * scale,
        top: field.y * scale,
        width: field.width * scale,
        height: field.height * scale,
        border: `2px dashed ${colour}`,
        backgroundColor: colour + '18',
        borderRadius: 4,
        overflow: 'hidden',
        cursor: isPlacing ? 'crosshair' : 'move',
        userSelect: 'none',
        touchAction: 'none',
        zIndex: 10,
      }}
      onPointerDown={handleDragPointerDown}
      onPointerMove={handleDragPointerMove}
      onPointerUp={handleDragPointerUp}
    >
      {/* Label */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: colour,
        fontSize: Math.max(9, 11 * scale),
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        pointerEvents: 'none',
        padding: '0 4px',
      }}>
        {field.label || field.type}
      </div>

      {/* Resize handle (bottom-right corner) */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 12,
          height: 12,
          backgroundColor: colour,
          cursor: 'se-resize',
          touchAction: 'none',
          borderTopLeftRadius: 3,
        }}
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
      />

      {/* Delete button (top-right) */}
      <div
        style={{
          position: 'absolute',
          top: -10,
          right: -10,
          backgroundColor: 'white',
          border: '1px solid #d1d5db',
          borderRadius: '50%',
          width: 18,
          height: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        }}
        onPointerDown={e => e.stopPropagation()}
        onClick={e => onRemove(e, field.id)}
      >
        <svg width="10" height="10" viewBox="0 0 20 20" fill="#6b7280">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
        </svg>
      </div>
    </div>
  );
}
