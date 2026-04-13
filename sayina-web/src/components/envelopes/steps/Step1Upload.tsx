import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Step1Props } from '@/lib/types/envelope';

// Accepted MIME types
const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
];

const ACCEPTED_EXTENSIONS = '.pdf,.doc,.docx,.jpg,.jpeg,.png';

const FILE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  'application/pdf': { label: 'PDF', color: 'bg-red-100 text-red-600' },
  'application/msword': { label: 'DOC', color: 'bg-blue-100 text-blue-600' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { label: 'DOCX', color: 'bg-blue-100 text-blue-600' },
  'image/jpeg': { label: 'JPG', color: 'bg-green-100 text-green-600' },
  'image/png': { label: 'PNG', color: 'bg-green-100 text-green-600' },
};

export default function Step1Upload({ data, onNext }: Step1Props) {
  const [file, setFile] = useState<File | null>(data.file);
  const [isDragging, setIsDragging] = useState(false);
  const [typeError, setTypeError] = useState('');

  const handleFile = (f: File) => {
    setTypeError('');
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setTypeError('Unsupported file type. Please upload a PDF, Word document (.doc/.docx), or image (.jpg/.png).');
      return;
    }
    setFile(f);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  };

  const typeInfo = file ? FILE_TYPE_LABELS[file.type] : null;
  const isNonPdf = file && file.type !== 'application/pdf';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Step 1: Upload Document</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center ${
            isDragging ? 'border-primary-500 bg-primary-50' : 'border-secondary-300'
          } transition-all`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center space-y-4 pointer-events-none">
            <div className="p-3 bg-primary-100 text-primary-500 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-medium text-secondary-900">
                {isDragging ? 'Drop your document here' : 'Drag and drop your document here'}
              </p>
              <p className="text-sm text-secondary-500 mt-1">or click to browse</p>
            </div>
          </div>
          <input
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            onChange={handleFileChange}
            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
          />
        </div>

        {/* Accepted formats strip */}
        <div className="mt-3 flex flex-wrap gap-2 justify-center">
          {[
            { ext: 'PDF', color: 'bg-red-50 text-red-500 border-red-200' },
            { ext: 'DOCX', color: 'bg-blue-50 text-blue-500 border-blue-200' },
            { ext: 'DOC', color: 'bg-blue-50 text-blue-500 border-blue-200' },
            { ext: 'JPG', color: 'bg-green-50 text-green-500 border-green-200' },
            { ext: 'PNG', color: 'bg-green-50 text-green-500 border-green-200' },
          ].map(({ ext, color }) => (
            <span key={ext} className={`text-xs font-semibold px-2 py-0.5 rounded border ${color}`}>{ext}</span>
          ))}
          <span className="text-xs text-secondary-400 self-center">· Max 20 MB</span>
        </div>

        {typeError && (
          <p className="mt-2 text-sm text-red-600 text-center">{typeError}</p>
        )}

        {file && (
          <div className="mt-4 p-4 bg-secondary-50 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`px-2 py-1 rounded text-xs font-bold ${typeInfo?.color || 'bg-gray-100 text-gray-600'}`}>
                {typeInfo?.label || 'FILE'}
              </div>
              <div>
                <p className="font-medium text-secondary-900 truncate max-w-xs">{file.name}</p>
                <p className="text-xs text-secondary-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            <button onClick={() => setFile(null)} className="text-secondary-500 hover:text-secondary-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        {/* Note for non-PDF uploads */}
        {isNonPdf && (
          <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
            <svg className="h-4 w-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
            </svg>
            <span>Word and image files are automatically converted to PDF before sending. Your original file is not modified.</span>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button disabled={!file} onClick={() => file && onNext(file)}>
            Next: Add Signers
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
