'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createEnvelope, addSignersToEnvelope, addFieldsToEnvelope, sendEnvelope, getEnvelope } from '@/lib/api/api';
import { Button } from '@/components/ui/Button';
import { EnvelopeState, Signer, Field } from '@/lib/types/envelope';

// Import step components
import Step1Upload from '@/components/envelopes/steps/Step1Upload';
import Step2Signers from '@/components/envelopes/steps/Step2Signers';
import Step3Fields from '@/components/envelopes/steps/Step3Fields';
import Step4Review from '@/components/envelopes/steps/Step4Review';

// Types imported from @/lib/types/envelope.ts

export default function CreateEnvelope() {
  const router = useRouter();
  const { id: existingEnvelopeId } = router.query;
  
  const [step, setStep] = useState(1);
  const [envelope, setEnvelope] = useState<EnvelopeState>({ 
    id: null,
    file: null, 
    signers: [], 
    fields: [],
    isLoading: false,
    error: null
  });
  
  // Load existing envelope if ID is provided in the URL
  useEffect(() => {
    const loadEnvelope = async () => {
      if (existingEnvelopeId && typeof existingEnvelopeId === 'string') {
        try {
          setEnvelope(prev => ({ ...prev, isLoading: true, error: null }));
          const data = await getEnvelope(existingEnvelopeId);
          setEnvelope({
            id: existingEnvelopeId,
            file: data.file,
            signers: data.signers || [],
            fields: data.fields || [],
            isLoading: false,
            error: null
          });
          
          // If envelope has fields, start at step 3
          if (data.fields && data.fields.length > 0) {
            setStep(3);
          }
          // If envelope has signers but no fields, start at step 2
          else if (data.signers && data.signers.length > 0) {
            setStep(2);
          }
        } catch (error) {
          console.error('Error loading envelope:', error);
          setEnvelope(prev => ({ 
            ...prev, 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to load envelope' 
          }));
        }
      }
    };
    
    loadEnvelope();
  }, [existingEnvelopeId]);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      {envelope.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded mb-4">
          <div className="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium">Error</p>
              <p className="text-sm mt-1">{envelope.error}</p>
              <Button 
                variant="link" 
                className="mt-2 p-0 h-auto" 
                onClick={() => router.push('/dashboard')}
              >
                Return to Dashboard
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {envelope.isLoading && (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent mb-4"></div>
          <p className="text-secondary-600">Loading envelope...</p>
        </div>
      )}
      
      {!envelope.isLoading && !envelope.error && step === 1 && (
        <Step1Upload
          data={envelope}
          onNext={async (file: File) => {
            try {
              setEnvelope(prev => ({ ...prev, isLoading: true, error: null }));
              const { id } = await createEnvelope(file);
              setEnvelope({ ...envelope, id, file, isLoading: false });
              setStep(2);
            } catch (error) {
              console.error('Error creating envelope:', error);
              setEnvelope(prev => ({ 
                ...prev, 
                isLoading: false, 
                error: error instanceof Error ? error.message : 'Failed to create envelope' 
              }));
            }
          }}
        />
      )}
      {!envelope.isLoading && !envelope.error && step === 2 && (
        <Step2Signers
          data={envelope}
          onBack={() => setStep(1)}
          onNext={async (signers: Signer[]) => {
            try {
              if (!envelope.id) {
                throw new Error('Envelope ID is missing. Please restart the process.');
              }
              
              setEnvelope(prev => ({ ...prev, isLoading: true, error: null }));
              await addSignersToEnvelope(envelope.id, signers);
              setEnvelope({ ...envelope, signers, isLoading: false });
              setStep(3);
            } catch (error) {
              console.error('Error adding signers:', error);
              setEnvelope(prev => ({ 
                ...prev, 
                isLoading: false, 
                error: error instanceof Error ? error.message : 'Failed to add signers' 
              }));
            }
          }}
        />
      )}
      {!envelope.isLoading && !envelope.error && step === 3 && (
        <Step3Fields
          data={envelope}
          onBack={() => setStep(2)}
          onNext={async (fields: Field[]) => {
            try {
              if (!envelope.id) {
                throw new Error('Envelope ID is missing. Please restart the process.');
              }
              
              setEnvelope(prev => ({ ...prev, isLoading: true, error: null }));
              await addFieldsToEnvelope(envelope.id, fields);
              setEnvelope({ ...envelope, fields, isLoading: false });
              setStep(4);
            } catch (error) {
              console.error('Error adding fields:', error);
              setEnvelope(prev => ({ 
                ...prev, 
                isLoading: false, 
                error: error instanceof Error ? error.message : 'Failed to add fields' 
              }));
            }
          }}
        />
      )}
      {!envelope.isLoading && !envelope.error && step === 4 && (
        <Step4Review
          data={envelope}
          onBack={() => setStep(3)}
          onSubmit={async () => {
            try {
              if (!envelope.id) {
                throw new Error('Envelope ID is missing. Please restart the process.');
              }
              
              await sendEnvelope(envelope.id);
              return true; // Return success to show success modal
            } catch (error) {
              console.error('Error sending envelope:', error);
              alert(error instanceof Error ? error.message : 'Failed to send envelope');
              return false; // Return failure to show error in modal
            }
          }}
        />
      )}
    </div>
  );
}
