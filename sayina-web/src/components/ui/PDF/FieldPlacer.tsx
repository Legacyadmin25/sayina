'use client';
import { useState, useRef } from 'react';
import Draggable from 'react-draggable';
import { Field } from '@/lib/types/envelope';
import { cn } from '@/lib/utils';

interface FieldPlacerProps {
  fields: Field[];
  onChange: (fields: Field[]) => void;
  currentPage: number;
  scale: number;
  activeTool: 'signature' | 'text' | 'date' | 'checkbox';
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
  setIsPlacing
}: FieldPlacerProps) {
  const [fieldBeingResized, setFieldBeingResized] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Update field position
  const updateFieldPosition = (fieldId: string, x: number, y: number) => {
    const updatedFields = fields.map(field => {
      if (field.id === fieldId) {
        return { ...field, x, y };
      }
      return field;
    });
    
    onChange(updatedFields);
  };
  
  // Update field dimensions
  const updateFieldDimensions = (fieldId: string, width: number, height: number) => {
    const updatedFields = fields.map(field => {
      if (field.id === fieldId) {
        return { ...field, width, height };
      }
      return field;
    });
    
    onChange(updatedFields);
  };
  
  // Handle adding a new field
  const handleAddField = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlacing || !containerRef.current) return;
    
    // Get container position and dimensions
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Calculate relative position within the page
    const x = (e.clientX - containerRect.left) / scale;
    const y = (e.clientY - containerRect.top) / scale;
    
    // Create new field
    const newField: Field = {
      id: `field-${activeTool}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type: activeTool,
      x,
      y,
      width: activeTool === 'signature' ? 150 : 100,
      height: activeTool === 'signature' ? 50 : 30,
      page: currentPage,
      signerId: activeSignerId,
    };
    
    // Update fields
    onChange([...fields, newField]);
    
    // Reset placing mode
    setIsPlacing(false);
  };
  
  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent, fieldId: string) => {
    e.stopPropagation();
    setFieldBeingResized(fieldId);
  };
  
  // Handle resize
  const handleResize = (e: MouseEvent) => {
    if (!fieldBeingResized || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const field = fields.find(f => f.id === fieldBeingResized);
    
    if (!field) return;
    
    const width = Math.max(50, ((e.clientX - containerRect.left) / scale) - field.x);
    const height = Math.max(30, ((e.clientY - containerRect.top) / scale) - field.y);
    
    updateFieldDimensions(fieldBeingResized, width, height);
  };
  
  // Handle resize end
  const handleResizeEnd = () => {
    setFieldBeingResized(null);
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', handleResizeEnd);
  };
  
  // Add event listeners for resize
  if (fieldBeingResized) {
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', handleResizeEnd);
  }
  
  // Remove field
  const removeField = (e: React.MouseEvent, fieldId: string) => {
    e.stopPropagation();
    const updatedFields = fields.filter(field => field.id !== fieldId);
    onChange(updatedFields);
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "absolute inset-0 z-10", 
        isPlacing ? "cursor-crosshair" : "pointer-events-none"
      )}
      onClick={handleAddField}
    >
      {fields
        .filter(field => field.page === currentPage)
        .map(field => (
          <Draggable
            key={field.id}
            position={{ x: field.x * scale, y: field.y * scale }}
            scale={scale}
            onStop={(_, data) => {
              updateFieldPosition(field.id, data.x / scale, data.y / scale);
            }}
            disabled={isPlacing}
          >
            <div
              className={cn(
                'absolute border-2 flex items-center justify-center select-none cursor-move',
                fieldBeingResized === field.id ? 'border-primary-500 z-10' : 'border-dashed border-secondary-400',
                'hover:border-primary-500'
              )}
              style={{
                width: field.width * scale,
                height: field.height * scale,
              }}
            >
              <div className="text-xs text-secondary-500 uppercase font-light">
                {field.type}
              </div>
              
              {/* Resize handle */}
              <div 
                className="absolute bottom-0 right-0 w-3 h-3 bg-primary-500 cursor-se-resize"
                onMouseDown={(e) => handleResizeStart(e, field.id)}
              />
              
              {/* Delete button */}
              <div
                className="absolute -top-2 -right-2 bg-white rounded-full p-1 border border-secondary-300 cursor-pointer"
                onClick={(e) => removeField(e, field.id)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-secondary-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </Draggable>
        ))}
    </div>
  );
}
