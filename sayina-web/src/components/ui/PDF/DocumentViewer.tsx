'use client';
import { useState, useEffect, useRef } from 'react';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Initialize PDF.js worker — served locally from /public for instant load (no CDN)
import { pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface DocumentViewerProps {
  file: File | string;
  onLoadSuccess?: (numPages: number) => void;
  currentPage?: number;
  scale?: number;
  watermark?: string;
}

export default function DocumentViewer({ 
  file, 
  onLoadSuccess, 
  currentPage = 1,
  scale = 1.0,
  watermark 
}: DocumentViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Handle document load success
  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    if (onLoadSuccess) {
      onLoadSuccess(numPages);
    }
  };

  // Update container dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-10">
          <div className="p-4 bg-white rounded-lg shadow-lg flex items-center space-x-3">
            <svg className="animate-spin h-5 w-5 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-secondary-600">Loading PDF...</span>
          </div>
        </div>
      )}

      <Document
        file={file}
        onLoadSuccess={handleDocumentLoadSuccess}
        error={
          <div className="text-center p-6">
            <p className="text-red-500">Failed to load PDF. Please ensure it's a valid PDF document.</p>
          </div>
        }
        loading={null}
      >
        {/* Pass scale directly to Page so react-pdf sizes the canvas correctly */}
        <Page
          pageNumber={currentPage}
          scale={scale}
          renderTextLayer={false}
          renderAnnotationLayer={false}
        />
      </Document>

      {/* Watermark if provided */}
      {watermark && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 text-4xl font-bold text-secondary-400"
          style={{ transform: 'rotate(-45deg)' }}
        >
          {watermark}
        </div>
      )}
    </div>
  );
}
