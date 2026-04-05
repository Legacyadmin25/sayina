import React, { useState, useEffect, useRef } from 'react';
import { cn } from './utils/cn';

// This component will use react-pdf in the actual implementation
// For now, we're creating a skeleton with the right interface

export interface PDFViewerProps {
  file: string | Uint8Array | ArrayBuffer; // URL, base64 data, or binary data
  className?: string;
  onLoadSuccess?: (numPages: number) => void;
  onLoadError?: (error: Error) => void;
  showControls?: boolean;
  showAnnotationTools?: boolean;
  enableFieldDetection?: boolean;
  scale?: number;
  pageNumber?: number;
  renderTextLayer?: boolean;
  renderAnnotationLayer?: boolean;
  watermark?: {
    text: string;
    opacity?: number;
    fontSize?: number;
    color?: string;
    angle?: number;
  };
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  file,
  className,
  onLoadSuccess,
  onLoadError,
  showControls = true,
  showAnnotationTools = false,
  enableFieldDetection = false,
  scale = 1.0,
  pageNumber = 1,
  renderTextLayer = true,
  renderAnnotationLayer = true,
  watermark,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(pageNumber);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Simulate PDF loading
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        // In a real implementation, this would be handled by react-pdf
        const mockNumPages = 5; // Mock 5 pages
        setNumPages(mockNumPages);
        setLoading(false);
        onLoadSuccess?.(mockNumPages);
      } catch (err) {
        setError(err as Error);
        setLoading(false);
        onLoadError?.(err as Error);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [file, onLoadSuccess, onLoadError]);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, numPages));
  };

  const handleZoomIn = () => {
    // This would adjust the scale in a real implementation
    console.log('Zoom in');
  };

  const handleZoomOut = () => {
    // This would adjust the scale in a real implementation
    console.log('Zoom out');
  };

  const renderWatermark = () => {
    if (!watermark) return null;

    return (
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          opacity: watermark.opacity || 0.3,
          transform: `rotate(${watermark.angle || -45}deg)`,
          zIndex: 10,
        }}
      >
        <div
          className="text-center whitespace-nowrap"
          style={{
            color: watermark.color || '#888888',
            fontSize: watermark.fontSize || 48,
          }}
        >
          {watermark.text}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-96 bg-gray-100 rounded-lg', className)}>
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-gray-300 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-gray-300 rounded mb-2"></div>
          <div className="h-3 w-24 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-96 bg-red-50 rounded-lg', className)}>
        <div className="text-red-500 mb-2">Failed to load PDF</div>
        <div className="text-sm text-gray-500">{error.message}</div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col border border-gray-200 rounded-lg overflow-hidden', className)}>
      {showControls && (
        <div className="flex items-center justify-between p-2 bg-gray-100 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-50"
              aria-label="Previous page"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <span className="text-sm">
              Page {currentPage} of {numPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage >= numPages}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-50"
              aria-label="Next page"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleZoomOut}
              className="p-1 rounded hover:bg-gray-200"
              aria-label="Zoom out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg>
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1 rounded hover:bg-gray-200"
              aria-label="Zoom in"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="11" y1="8" x2="11" y2="14"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg>
            </button>
            {showAnnotationTools && (
              <button
                className="p-1 rounded hover:bg-gray-200"
                aria-label="Annotation tools"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
              </button>
            )}
            {enableFieldDetection && (
              <button
                className="p-1 rounded hover:bg-gray-200"
                aria-label="Detect fields"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12h6"></path>
                  <path d="M22 12h-6"></path>
                  <path d="M12 2v6"></path>
                  <path d="M12 22v-6"></path>
                  <path d="M20 16l-4-4 4-4"></path>
                  <path d="M4 8l4 4-4 4"></path>
                  <path d="M16 4l-4 4-4-4"></path>
                  <path d="M8 20l4-4 4 4"></path>
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-auto bg-gray-50"
        style={{ minHeight: '500px' }}
      >
        {/* This would be replaced with actual PDF rendering in a real implementation */}
        <div className="flex items-center justify-center h-full">
          <div className="bg-white shadow-md rounded-md p-8 max-w-lg w-full mx-auto relative">
            <div className="h-6 w-3/4 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
            <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
            <div className="h-4 w-2/3 bg-gray-200 rounded mb-6"></div>
            
            <div className="h-32 w-full bg-gray-200 rounded mb-6"></div>
            
            <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
            <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
            <div className="h-4 w-4/5 bg-gray-200 rounded mb-6"></div>
            
            <div className="h-16 w-full bg-gray-200 rounded mb-6"></div>
            
            <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
            <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
            <div className="h-4 w-5/6 bg-gray-200 rounded"></div>
            
            {renderWatermark()}
          </div>
        </div>
      </div>
    </div>
  );
};

export { PDFViewer };
