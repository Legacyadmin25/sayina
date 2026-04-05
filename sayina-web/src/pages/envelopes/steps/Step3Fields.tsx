'use client';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { detectFields } from '@/lib/api/api';
import { Step3Props, Field } from '@/lib/types/envelope';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import PDFViewer from '@/components/ui/PDF/PDFViewer';

// Using shared types from envelope.ts

export default function Step3Fields({ data, onBack, onNext }: Step3Props) {
  const [fields, setFields] = useState<Field[]>(data.fields);
  const [isDetectingFields, setIsDetectingFields] = useState(false);
  const [activeSignerId, setActiveSignerId] = useState(0);

  // Function to detect fields using AI
  const handleDetectFields = async () => {
    if (!data.file) return;
    
    setIsDetectingFields(true);
    
    try {
      // Call the AI field detection API
      const detectedFields = await detectFields(data.file);
      
      // Map the API response to our field format
      const formattedFields = detectedFields.map((field: any) => ({
        id: `field-${field.type}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        type: field.type as 'signature' | 'text' | 'date' | 'checkbox',
        x: field.x,
        y: field.y,
        width: field.width || 150, // Default width if not provided
        height: field.height || 50, // Default height if not provided
        page: field.page || 1,
        signerId: field.signerId || activeSignerId,
      }));
      
      // Add the detected fields to existing fields
      setFields(prevFields => [...prevFields, ...formattedFields]);
      
      // Show success message with toast
      toast.success(`${formattedFields.length} fields detected successfully!`);
    } catch (error) {
      console.error('Error detecting fields:', error);
      toast.error('Error detecting fields. Please try placing them manually.');
    } finally {
      setIsDetectingFields(false);
    }
  };

  // Function to validate fields before proceeding
  const validateFields = () => {
    if (fields.length === 0) {
      alert('Please add at least one field to the document.');
      return false;
    }
    
    // Check if each signer has at least one field
    const signerIds = data.signers.map((_, index) => index);
    const fieldSignerIds = fields.map(field => field.signerId);
    
    const missingSigner = signerIds.find(id => !fieldSignerIds.includes(id));
    
    if (missingSigner !== undefined) {
      alert(`Signer ${missingSigner + 1} has no fields assigned. Please add fields for all signers.`);
      return false;
    }
    
    return true;
  };

  const handleFieldsChange = (updatedFields: Field[]) => {
    setFields(updatedFields);
    toast.success('Fields updated');
  };
  
  const handleContinue = () => {
    try {
      onNext(fields);
    } catch (error) {
      console.error('Error saving fields:', error);
      toast.error('Error saving fields. Please try again.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">Step 3: Position Fields</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDetectFields}
              disabled={isDetectingFields}
            >
              {isDetectingFields ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-500 border-t-transparent mr-2"></div>
                  Detecting...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
                  </svg>
                  Detect Fields with AI
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="text-sm font-medium text-secondary-700 mb-2">Current Signer:</div>
          <div className="flex items-center space-x-2 overflow-x-auto py-1">
            {data.signers.map((signer, index) => (
              <button
                key={index}
                className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
                  activeSignerId === index
                    ? 'bg-primary-500 text-white'
                    : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
                }`}
                onClick={() => setActiveSignerId(index)}
              >
                {signer.name || `Signer ${index + 1}`}
              </button>
            ))}
          </div>
        </div>

        <div className="text-sm text-secondary-500 mb-2">
          <span className="font-medium">Instructions:</span> Click on a field type in the toolbar, then click on the document where you want to place it. Fields can be dragged and resized.
        </div>

        <div className="border rounded-lg h-[600px] relative">
          {data.file ? (
            <div className="h-[600px]">
              <PDFViewer 
                file={data.file} 
                mode="builder"
                fields={fields} 
                onFieldChange={handleFieldsChange}
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary-50">
              <p className="text-secondary-500">No document uploaded. Please go back to Step 1.</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-between">
          <Button variant="secondary" onClick={onBack}>
            Back
          </Button>
          <Button onClick={handleContinue} disabled={fields.length === 0}>Review & Send
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
