import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Step4Props, Field, Signer } from '@/lib/types/envelope';

// Import PDFViewer dynamically to prevent SSR issues with react-pdf
const PDFViewer = dynamic(() => import('@/components/ui/PDF/PDFViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] flex items-center justify-center bg-secondary-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent mb-2"></div>
        <p className="text-secondary-500">Loading PDF Viewer...</p>
      </div>
    </div>
  )
});

// Using shared types from envelope.ts

export default function Step4Review({ data, onBack, onSubmit }: Step4Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Get field count by type
  const fieldCounts = data.fields.reduce((acc, field) => {
    acc[field.type] = (acc[field.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Get field count by signer
  const fieldsBySigner = data.fields.reduce((acc, field) => {
    acc[field.signerId] = (acc[field.signerId] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  // Handle submit
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit();
      setShowConfirmation(false);
      setShowSuccess(true);
    } catch (error) {
      console.error('Error sending envelope:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to send envelope. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Step 4: Review & Send</CardTitle>
          <CardDescription>
            Review the envelope details before sending it to the signers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-md font-medium text-secondary-900 mb-2">Document Preview</h3>
              <div className="border rounded-lg h-[400px] overflow-hidden">
                {data.file ? (
                  <PDFViewer
                    file={data.file}
                    fields={data.fields}
                    mode="signer"
                    watermark="PREVIEW"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary-50">
                    <p className="text-secondary-500">No document uploaded</p>
                  </div>
                )}
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="p-3 bg-secondary-50 rounded-lg">
                  <div className="text-xs text-secondary-500">Document Name</div>
                  <div className="font-medium truncate">{data.file?.name || 'No document'}</div>
                </div>
                <div className="p-3 bg-secondary-50 rounded-lg">
                  <div className="text-xs text-secondary-500">File Size</div>
                  <div className="font-medium">
                    {data.file ? `${(data.file.size / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-md font-medium text-secondary-900 mb-2">Signers</h3>
              <div className="space-y-3">
                {data.signers.map((signer, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{signer.name}</div>
                        <div className="text-sm text-secondary-500">{signer.email}</div>
                        {signer.phone && (
                          <div className="text-sm text-secondary-500">Phone: {signer.phone}</div>
                        )}
                      </div>
                      <div className="px-2 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
                        {fieldsBySigner[index] || 0} fields
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <h3 className="text-md font-medium text-secondary-900 mt-6 mb-2">Fields Summary</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border rounded-lg flex items-center space-x-3">
                  <div className="p-2 bg-primary-100 text-primary-500 rounded">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs text-secondary-500">Signatures</div>
                    <div className="font-medium">{fieldCounts.signature || 0}</div>
                  </div>
                </div>
                <div className="p-3 border rounded-lg flex items-center space-x-3">
                  <div className="p-2 bg-primary-100 text-primary-500 rounded">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs text-secondary-500">Text Fields</div>
                    <div className="font-medium">{fieldCounts.text || 0}</div>
                  </div>
                </div>
                <div className="p-3 border rounded-lg flex items-center space-x-3">
                  <div className="p-2 bg-primary-100 text-primary-500 rounded">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs text-secondary-500">Date Fields</div>
                    <div className="font-medium">{fieldCounts.date || 0}</div>
                  </div>
                </div>
                <div className="p-3 border rounded-lg flex items-center space-x-3">
                  <div className="p-2 bg-primary-100 text-primary-500 rounded">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs text-secondary-500">Checkboxes</div>
                    <div className="font-medium">{fieldCounts.checkbox || 0}</div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-md font-medium text-secondary-900 mb-2">Compliance</h3>
                <div className="p-3 bg-green-50 text-green-800 rounded-lg">
                  <div className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-medium">ECT Act 25/2002 Compliant</p>
                      <p className="text-sm mt-1">
                        This envelope meets the requirements of the Electronic Communications and Transactions Act.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="secondary" onClick={onBack}>
            Back
          </Button>
          <Button 
            onClick={() => setShowConfirmation(true)}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Sending...' : 'Send Envelope'}
          </Button>
        </CardFooter>
      </Card>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        title="Confirm Envelope"
        size="md"
      >
        <div className="py-2">
          <p className="text-secondary-600">
            You're about to send this document to {data.signers.length} signer{data.signers.length !== 1 ? 's' : ''}:
          </p>
          <ul className="mt-4 space-y-2">
            {data.signers.map((signer, i) => (
              <li key={i} className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center mr-3">
                  {i + 1}
                </div>
                <div>
                  <div className="font-medium">{signer.name}</div>
                  <div className="text-sm text-secondary-500">{signer.email}</div>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 p-3 bg-yellow-50 text-yellow-800 text-sm rounded-md">
            <div className="flex">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium">Important:</p>
                <p className="mt-1">
                  By clicking "Send", you confirm that you have the authority to send this document and that all signers have consented to receive electronic communications.
                </p>
              </div>
            </div>
          </div>
        </div>
        {submitError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {submitError}
          </div>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => { setShowConfirmation(false); setSubmitError(null); }}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting}>
            Send
          </Button>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Envelope Sent!"
        size="sm"
      >
        <div className="py-4 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-secondary-900">Envelope Successfully Sent!</h3>
          <p className="mt-2 text-secondary-600">
            Your document has been sent to all signers. You'll receive notifications as they view and sign the document.
          </p>
        </div>
        <div className="flex justify-center mt-4">
          <Button onClick={() => router.push('/envelopes')}>
            View My Envelopes
          </Button>
        </div>
      </Modal>
    </>
  );
}
