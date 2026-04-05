'use client';
import { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Field } from '@/lib/types/envelope';

// Define the signature data type
export interface SignatureData {
  fieldId: string;
  value: string | boolean | Date;
}

interface FieldInteractorProps {
  fields: Field[];
  onSubmit: (data: SignatureData[]) => void;
  currentPage: number;
  scale: number;
  signerId: number;
}

export default function FieldInteractor({ 
  fields, 
  onSubmit, 
  currentPage,
  scale,
  signerId
}: FieldInteractorProps) {
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const sigCanvasRefs = useRef<Record<string, SignatureCanvas | null>>({});
  
  // Register signature canvas ref
  const registerSignatureRef = (id: string, ref: SignatureCanvas | null) => {
    sigCanvasRefs.current[id] = ref;
  };
  
  // Handle field value change
  const handleFieldChange = (fieldId: string, value: any) => {
    setFieldValues(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };
  
  // Handle form submission
  const handleSubmit = () => {
    // Collect all field values
    const data: SignatureData[] = [];
    
    // Process signature canvases
    Object.entries(sigCanvasRefs.current).forEach(([fieldId, canvas]) => {
      if (canvas && !canvas.isEmpty()) {
        // Get signature as PNG data URL
        const signatureValue = canvas.toDataURL('image/png');
        data.push({
          fieldId,
          value: signatureValue
        });
      }
    });
    
    // Process other field values
    Object.entries(fieldValues).forEach(([fieldId, value]) => {
      data.push({
        fieldId,
        value
      });
    });
    
    // Submit data
    onSubmit(data);
  };
  
  // Get fields for current page and signer
  const currentFields = fields.filter(
    field => field.page === currentPage && field.signerId === signerId
  );

  return (
    <div className="absolute inset-0 z-10">
      {currentFields.map(field => (
        <div
          key={field.id}
          className="absolute border-2 border-primary-400 bg-primary-50"
          style={{
            left: field.x * scale,
            top: field.y * scale,
            width: field.width * scale,
            height: field.height * scale,
            transformOrigin: 'top left',
          }}
        >
          {field.type === 'signature' ? (
            <div className="w-full h-full bg-white">
              <SignatureCanvas
                ref={(ref) => registerSignatureRef(field.id, ref)}
                penColor="#DAB44A"
                canvasProps={{ 
                  width: field.width * scale, 
                  height: field.height * scale, 
                  className: 'border border-secondary-200' 
                }}
                clearOnResize={false}
              />
              <div className="absolute top-0 right-0">
                <button 
                  className="bg-white p-1 text-xs border border-secondary-200 rounded"
                  onClick={() => sigCanvasRefs.current[field.id]?.clear()}
                >
                  Clear
                </button>
              </div>
            </div>
          ) : field.type === 'date' ? (
            <input
              type="date"
              className="w-full h-full p-1 text-sm"
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              defaultValue={new Date().toISOString().split('T')[0]}
            />
          ) : field.type === 'checkbox' ? (
            <div className="w-full h-full flex items-center justify-center">
              <input
                type="checkbox"
                className="w-5 h-5"
                onChange={(e) => handleFieldChange(field.id, e.target.checked)}
              />
            </div>
          ) : (
            <input
              type="text"
              className="w-full h-full p-1 text-sm"
              placeholder="Enter text here..."
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
            />
          )}
        </div>
      ))}
      
      {currentFields.length > 0 && (
        <div className="fixed bottom-4 right-4">
          <button
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md shadow-md"
            onClick={handleSubmit}
          >
            Submit Signatures
          </button>
        </div>
      )}
    </div>
  );
}
