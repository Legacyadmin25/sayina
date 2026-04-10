import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createEnvelope, addSignersToEnvelope, addFieldsToEnvelope, sendEnvelope, getEnvelope } from '@/lib/api/api';
import { EnvelopeState, Signer, Field } from '@/lib/types/envelope';

import Step1Upload from '@/components/envelopes/steps/Step1Upload';
import Step2Signers from '@/components/envelopes/steps/Step2Signers';
import Step3Fields from '@/components/envelopes/steps/Step3Fields';
import Step4Review from '@/components/envelopes/steps/Step4Review';

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
    error: null,
  });

  // Load existing draft envelope if ID provided in URL
  useEffect(() => {
    if (!existingEnvelopeId || typeof existingEnvelopeId !== 'string') return;

    const loadEnvelope = async () => {
      try {
        setEnvelope(prev => ({ ...prev, isLoading: true, error: null }));
        const data = await getEnvelope(existingEnvelopeId);
        setEnvelope({
          id: existingEnvelopeId,
          file: data.file,
          signers: data.signers || [],
          fields: data.fields || [],
          isLoading: false,
          error: null,
        });
        if (data.fields?.length > 0) setStep(3);
        else if (data.signers?.length > 0) setStep(2);
      } catch {
        // If we can't load, just start fresh — don't block the user
        setEnvelope(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadEnvelope();
  }, [existingEnvelopeId]);

  // Step progress indicator
  const steps = ['Upload', 'Signers', 'Fields', 'Review'];

  return (
    <div className="min-h-screen bg-secondary-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((label, i) => {
              const num = i + 1;
              const isComplete = step > num;
              const isCurrent = step === num;
              return (
                <div key={label} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                        isComplete
                          ? 'bg-primary-500 text-white'
                          : isCurrent
                          ? 'bg-primary-500 text-white ring-4 ring-primary-100'
                          : 'bg-secondary-200 text-secondary-500'
                      }`}
                    >
                      {isComplete ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        num
                      )}
                    </div>
                    <span className={`mt-1 text-xs font-medium ${isCurrent ? 'text-primary-600' : 'text-secondary-400'}`}>
                      {label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 mb-4 ${step > num ? 'bg-primary-500' : 'bg-secondary-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Loading overlay */}
        {envelope.isLoading && (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent mb-4" />
            <p className="text-secondary-600">Sending your envelope&hellip;</p>
          </div>
        )}

        {/* Step 1 — just save file locally, no API call */}
        {!envelope.isLoading && step === 1 && (
          <Step1Upload
            data={envelope}
            onNext={(file: File) => {
              setEnvelope(prev => ({ ...prev, file }));
              setStep(2);
            }}
          />
        )}

        {/* Step 2 — just save signers locally, no API call */}
        {!envelope.isLoading && step === 2 && (
          <Step2Signers
            data={envelope}
            onBack={() => setStep(1)}
            onNext={(signers: Signer[]) => {
              setEnvelope(prev => ({ ...prev, signers }));
              setStep(3);
            }}
          />
        )}

        {/* Step 3 — just save fields locally, no API call */}
        {!envelope.isLoading && step === 3 && (
          <Step3Fields
            data={envelope}
            onBack={() => setStep(2)}
            onNext={(fields: Field[]) => {
              setEnvelope(prev => ({ ...prev, fields }));
              setStep(4);
            }}
          />
        )}

        {/* Step 4 — all API calls happen here on submit */}
        {!envelope.isLoading && step === 4 && (
          <Step4Review
            data={envelope}
            onBack={() => setStep(3)}
            onSubmit={async () => {
              if (!envelope.file) return false;

              try {
                setEnvelope(prev => ({ ...prev, isLoading: true, error: null }));

                // Create envelope with PDF
                const { id } = await createEnvelope(envelope.file);

                // Add signers
                if (envelope.signers.length > 0) {
                  await addSignersToEnvelope(id, envelope.signers);
                }

                // Add fields
                if (envelope.fields.length > 0) {
                  await addFieldsToEnvelope(id, envelope.fields);
                }

                // Send
                await sendEnvelope(id);

                setEnvelope(prev => ({ ...prev, isLoading: false }));
                return true;
              } catch (error) {
                setEnvelope(prev => ({
                  ...prev,
                  isLoading: false,
                  error: error instanceof Error ? error.message : 'Failed to send envelope',
                }));
                return false;
              }
            }}
          />
        )}

        {/* Error banner (only shown on step 4 failures) */}
        {envelope.error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium">Could not send envelope</p>
              <p className="text-sm mt-1">{envelope.error}</p>
              <button
                className="text-sm underline mt-2"
                onClick={() => setEnvelope(prev => ({ ...prev, error: null }))}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
