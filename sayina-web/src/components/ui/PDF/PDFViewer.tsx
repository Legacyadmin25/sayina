'use client';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import DocumentViewer from './DocumentViewer';
import FieldPlacer from './FieldPlacer';
import FieldInteractor, { SignatureData } from './FieldInteractor';
import { Field } from '@/lib/types/envelope';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';

interface PDFViewerProps {
  file?: File | null;
  url?: string;
  mode: 'builder' | 'signer';
  fields: Field[];
  onFieldChange?: (fields: Field[]) => void;
  onSignSubmit?: (data: SignatureData[]) => void;
  watermark?: string;
  signerId?: number;
  documentId?: string;
}

export default function PDFViewer({
  file,
  url,
  mode,
  fields,
  onFieldChange,
  onSignSubmit,
  watermark,
  signerId = 0,
  documentId
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [activeTool, setActiveTool] = useState<'signature' | 'text' | 'date' | 'checkbox'>('signature');
  const [isPlacing, setIsPlacing] = useState(false);
  const [activeSignerId, setActiveSignerId] = useState(signerId);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedUrl, setTranslatedUrl] = useState<string | null>(null);
  const [showTranslated, setShowTranslated] = useState(false);
  const [translateProgress, setTranslateProgress] = useState(0);
  
  const { t, getAvailableLanguages, currentLanguage } = useTranslation();
  
  // Determine the source for the PDF (file or URL)
  const pdfSource = file || url;
  
  // Handle document load success
  const handleDocumentLoadSuccess = (pages: number) => {
    setNumPages(pages);
  };
  
  // Navigation functions
  const goToPrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };
  
  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, numPages));
  };
  
  // Zoom functions
  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 3.0));
  };
  
  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.5));
  };
  
  const resetZoom = () => {
    setScale(1.0);
  };
  
  // Handle field changes with error handling
  const handleFieldChange = (updatedFields: Field[]) => {
    try {
      if (onFieldChange) {
        onFieldChange(updatedFields);
      }
    } catch (error) {
      toast.error('Failed to update fields');
      console.error('Error updating fields:', error);
    }
  };
  
  // Handle signature submission with error handling
  const handleSignSubmit = (data: SignatureData[]) => {
    try {
      if (onSignSubmit) {
        onSignSubmit(data);
        toast.success('Signatures submitted successfully');
      }
    } catch (error) {
      toast.error('Failed to submit signatures');
      console.error('Error submitting signatures:', error);
    }
  };

  // Handle tool selection for field placement
  const handleToolSelect = (tool: 'signature' | 'text' | 'date' | 'checkbox') => {
    setActiveTool(tool);
    setIsPlacing(true);
  };
  
  // Handle document translation
  const translateDocument = async (targetLanguage: string) => {
    if (!documentId) {
      toast.error(t('document_id_required'));
      return;
    }
    
    setIsTranslating(true);
    setTranslateProgress(10);
    
    try {
      const response = await axios.post(`/api/v1/documents/${documentId}/translate`, {
        targetLanguage
      });
      
      setTranslateProgress(100);
      
      if (response.data.success) {
        setTranslatedUrl(response.data.data.translatedPdfUrl);
        setShowTranslated(true);
        toast.success(t('document_translated_success'));
      } else {
        toast.error(t('document_translation_failed'));
      }
    } catch (error) {
      console.error('Translation error:', error);
      toast.error(t('document_translation_failed'));
    } finally {
      setIsTranslating(false);
    }
  };
  
  if (!pdfSource) {
    return (
      <div className="flex items-center justify-center h-full bg-secondary-50">
        <p className="text-secondary-500">No document to display</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="bg-white border-b border-secondary-200 p-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={goToPrevPage} 
            disabled={currentPage <= 1}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </Button>
          
          <span className="text-sm">
            {currentPage} / {numPages || '?'}
          </span>
          
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={goToNextPage} 
            disabled={!numPages || currentPage >= numPages}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={zoomOut} 
            disabled={scale <= 0.5}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </Button>
          
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={zoomIn} 
            disabled={scale >= 3}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 01-1 1h-1a1 1 0 110-2h1v-3a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </Button>
          
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={resetZoom}
          >
            Reset
          </Button>
          
          {/* Translation Button */}
          {documentId && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isTranslating}
                  className="ml-2"
                >
                  {isTranslating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('translating')} ({translateProgress}%)
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578l-.355 1.772a1 1 0 01-.983.776H6.416a1 1 0 01-.983-.776L5.078 6H3a1 1 0 110-2h3V3a1 1 0 011-1zm-.5 5a.5.5 0 100 1h1a.5.5 0 100-1h-1zm.5 2.5a.5.5 0 01.5.5v3a.5.5 0 01-1 0v-3a.5.5 0 01.5-.5zm2 0a.5.5 0 01.5.5v3a.5.5 0 01-1 0v-3a.5.5 0 01.5-.5z" clipRule="evenodd" />
                      </svg>
                      {t('translate')}
                    </>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2">
                <div className="space-y-2">
                  <h3 className="font-medium text-sm">{t('select_language')}</h3>
                  <Select
                    onValueChange={(value) => translateDocument(value)}
                    defaultValue={currentLanguage}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('select_language')} />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableLanguages().map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </PopoverContent>
            </Popover>
          )}
          
          {/* Toggle between original and translated view */}
          {translatedUrl && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowTranslated(!showTranslated)}
              className="ml-2"
            >
              {showTranslated ? t('view_original') : t('view_translated')}
            </Button>
          )}
        </div>

        {mode === 'builder' && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={activeTool === 'signature' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => handleToolSelect('signature')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              Signature
            </Button>
            
            <Button
              variant={activeTool === 'text' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => handleToolSelect('text')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              Text
            </Button>
            
            <Button
              variant={activeTool === 'date' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => handleToolSelect('date')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              Date
            </Button>
            
            <Button
              variant={activeTool === 'checkbox' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => handleToolSelect('checkbox')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Checkbox
            </Button>
          </div>
        )}
      </div>

      {/* PDF Viewer + field overlay */}
      <div className="flex-1 relative overflow-auto">
        {/* Render the actual PDF document */}
        <DocumentViewer
          file={showTranslated && translatedUrl ? translatedUrl : (pdfSource as File | string)}
          onLoadSuccess={handleDocumentLoadSuccess}
          currentPage={currentPage}
          scale={scale}
          watermark={watermark}
        />

        {/* Overlay: field placer (builder) or field interactor (signer) */}
        {mode === 'builder' ? (
          <FieldPlacer
            currentPage={currentPage}
            scale={scale}
            activeTool={activeTool}
            isPlacing={isPlacing}
            setIsPlacing={setIsPlacing}
            activeSignerId={activeSignerId}
            fields={fields}
            onChange={handleFieldChange}
          />
        ) : (
          <FieldInteractor
            currentPage={currentPage}
            scale={scale}
            fields={fields}
            signerId={signerId}
            onSubmit={handleSignSubmit}
          />
        )}
      </div>
    </div>
  );
}
