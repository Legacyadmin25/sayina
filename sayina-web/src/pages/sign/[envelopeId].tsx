'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import ToastProvider from '@/components/ui/ToastProvider';
import PDFViewer from '@/components/ui/PDF/PDFViewer';
import { SignatureData } from '@/components/ui/PDF/FieldInteractor';
import { Field, Signer } from '@/lib/types/envelope';
import { verifyOTP, sendOTP, signEnvelope, getEnvelopeForSigning, checkOrganizationRequiresWatermark } from '@/lib/api/api';
import ComplianceConsent from '@/components/compliance/ComplianceConsent';
import Watermark from '@/components/compliance/Watermark';

// Define interfaces for component props and state
interface SigningData {
  envelope: {
    id: string;
    name: string;
    fileUrl: string;
    orgId: string;
  };
  signer: Signer & { id: number };
  fields: Field[];
  requiresOTP: boolean;
}

export default function SignEnvelope() {
  const router = useRouter();
  const { envelopeId } = router.query;
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [signingData, setSigningData] = useState<SigningData | null>(null);
  
  // OTP verification
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState<string | undefined>(undefined);
  const [otpSent, setOtpSent] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  
  // Signing state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Compliance state
  const [showComplianceConsent, setShowComplianceConsent] = useState(false);
  const [complianceData, setComplianceData] = useState<{ complianceGiven: boolean; complianceAt: string } | null>(null);
  const [showWatermark, setShowWatermark] = useState(false);
  
  // Load envelope data
  useEffect(() => {
    async function loadEnvelopeData() {
      if (!envelopeId || typeof envelopeId !== 'string') return;
      
      try {
        setIsLoading(true);
        setError(undefined);
        
        const data = await getEnvelopeForSigning(envelopeId);
        setSigningData(data);
        
        // Check if organization requires watermark (free tier)
        if (data.envelope.orgId) {
          try {
            const requiresWatermark = await checkOrganizationRequiresWatermark(data.envelope.orgId);
            setShowWatermark(requiresWatermark);
          } catch (err) {
            // Default to showing watermark if check fails
            setShowWatermark(true);
            console.error('Error checking watermark requirement:', err);
          }
        }
        
        // Always show compliance consent first before any other steps
        setShowComplianceConsent(true);
      } catch (err: any) {
        setError(err.message || 'Failed to load envelope data');
        toast.error('Failed to load document');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadEnvelopeData();
  }, [envelopeId]);
  
  // Handle compliance consent
  const handleComplianceConsent = (consentData: { complianceGiven: boolean; complianceAt: string }) => {
    // Store compliance data for later submission
    setComplianceData(consentData);
    setShowComplianceConsent(false);
    
    // If OTP is required, show the OTP modal after compliance consent
    if (signingData?.requiresOTP) {
      setShowOTPModal(true);
    }
  };
  
  // Handle OTP sending with toast notifications
  const handleSendOTP = async () => {
    if (!signingData) return;
    
    try {
      setIsVerifyingOTP(true);
      setOtpError(undefined);
      
      toast.loading('Sending verification code...');
      await sendOTP(signingData.envelope.id, signingData.signer.id);
      setOtpSent(true);
      toast.success('Verification code sent successfully!');
    } catch (err: any) {
      setOtpError(err.message || 'Failed to send OTP');
      toast.error('Failed to send verification code');
    } finally {
      setIsVerifyingOTP(false);
    }
  };
  
  // Handle OTP verification with toast notifications
  const handleVerifyOTP = async () => {
    if (!signingData || !otpCode) return;
    
    try {
      setIsVerifyingOTP(true);
      setOtpError(undefined);
      
      toast.loading('Verifying code...');
      await verifyOTP(signingData.envelope.id, signingData.signer.id, otpCode);
      setShowOTPModal(false);
      toast.success('Identity verified successfully!');
    } catch (err: any) {
      setOtpError(err.message || 'Invalid verification code');
      toast.error('Invalid verification code');
    } finally {
      setIsVerifyingOTP(false);
    }
  };
  
  // Handle signature submission
  const handleSignSubmit = async (signatureData: SignatureData[]) => {
    if (!signingData || !envelopeId || !complianceData) return;
    
    try {
      setIsSubmitting(true);
      setError(undefined);
      
      // Include compliance data in the signature submission
      await signEnvelope(
        signingData.envelope.id, 
        signingData.signer.id, 
        signatureData.map(data => ({
          fieldId: data.fieldId,
          value: data.value
        })),
        complianceData.complianceGiven,
        complianceData.complianceAt
      );
      
      toast.success('Document signed successfully!');
      setShowSuccess(true);
      
      // Redirect after 3 seconds
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit signed envelope');
      toast.error('Failed to submit signed document');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Loading Document</h2>
          <p className="text-secondary-500">Please wait while we prepare your document for signing.</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-xl text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{error}</p>
            <Button onClick={() => router.push('/')}>Return to Homepage</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!signingData) {
    return null;
  }
  
  return (
    <>
      <Head>
        <title>Sign Document | Sayina</title>
        <meta name="description" content="Sign your document securely with Sayina" />
      </Head>
      
      <ToastProvider />
      
      {/* Compliance Consent Screen */}
      {showComplianceConsent && signingData && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="max-w-4xl mx-auto py-8">
            <ComplianceConsent 
              onContinue={handleComplianceConsent}
              envelopeId={signingData.envelope.id}
              signerId={signingData.signer.id.toString()}
            />
          </div>
        </div>
      )}
      
      {/* OTP Verification Modal */}
      <Modal 
        isOpen={showOTPModal} 
        onClose={() => {}} // Can't close this modal, must verify
        title="Verify Your Identity"
      >
        <div className="p-4">
          <p className="mb-4">
            To ensure security, we need to verify your identity before you can sign this document.
          </p>
          
          {!otpSent ? (
            <div className="text-center">
              <p className="mb-4">Click below to receive a verification code via {signingData.signer.phone ? 'SMS' : 'email'}.</p>
              <Button 
                onClick={handleSendOTP}
                isLoading={isVerifyingOTP}
                className="w-full"
              >
                Send Verification Code
              </Button>
            </div>
          ) : (
            <div>
              <p className="mb-2">
                A verification code has been sent to your {signingData.signer.phone ? `phone (${signingData.signer.phone})` : `email (${signingData.signer.email})`}.
              </p>
              <Input
                label="Enter Verification Code"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                error={otpError}
                className="mb-4"
              />
              <Button 
                onClick={handleVerifyOTP}
                isLoading={isVerifyingOTP}
                className="w-full"
              >
                Verify Code
              </Button>
            </div>
          )}
        </div>
      </Modal>
      
      {/* Success Modal */}
      <Modal 
        isOpen={showSuccess} 
        onClose={() => {}}
        title="Document Signed Successfully!"
      >
        <div className="p-4 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">Thank You!</h3>
          <p className="mb-4">
            You have successfully signed this document. A copy will be emailed to you shortly.
          </p>
          <Button onClick={() => router.push('/')}>Return to Homepage</Button>
        </div>
      </Modal>
      
      {/* Main signing interface */}
      <div className="min-h-screen bg-secondary-50 flex flex-col">
        <header className="bg-white border-b border-secondary-200 py-4 px-6 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 relative">
              <Image 
                src="/logo.png" 
                alt="Sayina Logo" 
                width={32}
                height={32}
              />
            </div>
            <h1 className="text-lg font-semibold text-primary-700">Sayina E-Signature</h1>
          </div>
          
          <div>
            <Button variant="ghost" onClick={() => router.push('/')}>
              Cancel
            </Button>
          </div>
        </header>
        
        {/* South African Compliance Banner */}
        <div className="bg-blue-50 p-3 text-sm text-blue-800 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          This signing process complies with the South African ECT Act 25/2002 and POPIA regulations.
        </div>
        
        <main className="flex-1 p-4">
          <div className="container mx-auto">
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
              <div className="p-4 border-b border-secondary-200 flex justify-between items-center">
                <h2 className="text-xl font-medium">
                  {signingData.envelope.name}
                </h2>
              </div>
              
              <div className="h-[calc(100vh-16rem)] relative">
                {/* Watermark overlay for free tier */}
                <Watermark show={showWatermark} />
                
                <PDFViewer
                  documentUrl={signingData.envelope.fileUrl}
                  fields={signingData.fields}
                  signerId={signingData.signer.id}
                  mode="signer"
                  onSubmit={handleSignSubmit}
                  disabled={isSubmitting || !complianceData}
                />
              </div>
            </div>
          </div>
        </main>
        
        <footer className="bg-secondary-100 py-4 mt-auto">
          <div className="container mx-auto px-4 text-center text-sm text-secondary-500">
            <p>
              &copy; {new Date().getFullYear()} Sayina - A Proudly South African E-signature Platform
            </p>
            <p className="mt-1">
              Secure • Compliant • Local
            </p>
          </div>
        </footer>
      </div>
    </>
  );

// Define interfaces for component props and state
interface SigningData {
  envelope: {
    id: string;
    name: string;
    fileUrl: string;
    orgId: string;
  };
  signer: Signer & { id: number };
  fields: Field[];
  requiresOTP: boolean;
}

export default function SignEnvelope() {
  const router = useRouter();
  const { envelopeId } = router.query;
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signingData, setSigningData] = useState<SigningData | null>(null);
  
  // OTP verification
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  
  // Signing state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Compliance state
  const [showComplianceConsent, setShowComplianceConsent] = useState(false);
  const [complianceData, setComplianceData] = useState<{ complianceGiven: boolean; complianceAt: string } | null>(null);
  const [showWatermark, setShowWatermark] = useState(false);
  
  // Load envelope data
  useEffect(() => {
    async function loadEnvelopeData() {
      if (!envelopeId || typeof envelopeId !== 'string') return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const data = await getEnvelopeForSigning(envelopeId);
        setSigningData(data);
        
        // Check if organization requires watermark (free tier)
        if (data.envelope.orgId) {
          try {
            const requiresWatermark = await checkOrganizationRequiresWatermark(data.envelope.orgId);
            setShowWatermark(requiresWatermark);
          } catch (err) {
            // Default to showing watermark if check fails
            setShowWatermark(true);
            console.error('Error checking watermark requirement:', err);
          }
        }
        
        // Always show compliance consent first before any other steps
        setShowComplianceConsent(true);
      } catch (err: any) {
        setError(err.message || 'Failed to load envelope data');
        toast.error('Failed to load document');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadEnvelopeData();
  }, [envelopeId]);
  
  // Handle compliance consent
  const handleComplianceConsent = (consentData: { complianceGiven: boolean; complianceAt: string }) => {
    // Store compliance data for later submission
    setComplianceData(consentData);
    setShowComplianceConsent(false);
    
    // If OTP is required, show the OTP modal after compliance consent
    if (signingData?.requiresOTP) {
      setShowOTPModal(true);
    }
  };
  
  // Handle OTP sending with toast notifications
  const handleSendOTP = async () => {
    if (!signingData) return;
    
    try {
      setIsVerifyingOTP(true);
      setOtpError(null);
      
      toast.loading('Sending verification code...');
      await sendOTP(signingData.envelope.id, signingData.signer.id);
      setOtpSent(true);
      toast.success('Verification code sent successfully!');
    } catch (err: any) {
      setOtpError(err.message || 'Failed to send OTP');
      toast.error('Failed to send verification code');
    } finally {
      setIsVerifyingOTP(false);
    }
  };
  
  // Handle OTP verification with toast notifications
  const handleVerifyOTP = async () => {
    if (!signingData || !otpCode) return;
    
    try {
      setIsVerifyingOTP(true);
      setOtpError(null);
      
      toast.loading('Verifying code...');
      await verifyOTP(signingData.envelope.id, signingData.signer.id, otpCode);
      setShowOTPModal(false);
      toast.success('Identity verified successfully!');
    } catch (err: any) {
      setOtpError(err.message || 'Invalid verification code');
      toast.error('Invalid verification code');
    } finally {
      setIsVerifyingOTP(false);
    }
  };
  
  // Handle signature submission
  const handleSignSubmit = async (signatureData: SignatureData[]) => {
    if (!signingData || !envelopeId || !complianceData) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Include compliance data in the signature submission
      await signEnvelope(
        signingData.envelope.id, 
        signingData.signer.id, 
        signatureData.map(data => ({
          fieldId: data.fieldId,
          value: data.value
        })),
        complianceData.complianceGiven,
        complianceData.complianceAt
      );
      
      toast.success('Document signed successfully!');
      setShowSuccess(true);
      
      // Redirect after 3 seconds
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit signed envelope');
      toast.error('Failed to submit signed document');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Loading Document</h2>
          <p className="text-secondary-500">Please wait while we prepare your document for signing.</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-xl text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{error}</p>
            <Button onClick={() => router.push('/')}>Return to Homepage</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!signingData) {
    return null;
  }
  
  return (
    <>
      <Head>
        <title>Sign Document | Sayina</title>
        <meta name="description" content="Sign your document securely with Sayina" />
      </Head>
      
      <ToastProvider />
      
      {/* Compliance Consent Screen */}
      {showComplianceConsent && signingData && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="max-w-4xl mx-auto py-8">
            <ComplianceConsent 
              onContinue={handleComplianceConsent}
              envelopeId={signingData.envelope.id}
              signerId={signingData.signer.id.toString()}
            />
          </div>
        </div>
      )}
      
      {/* OTP Verification Modal */}
      <Modal 
        isOpen={showOTPModal} 
        onClose={() => {}} // Can't close this modal, must verify
        title="Verify Your Identity"
      >
        <div className="p-4">
          <p className="mb-4">
            To ensure security, we need to verify your identity before you can sign this document.
          </p>
          
          {!otpSent ? (
            <div className="text-center">
              <p className="mb-4">Click below to receive a verification code via {signingData.signer.phone ? 'SMS' : 'email'}.</p>
              <Button 
                onClick={handleSendOTP}
                isLoading={isVerifyingOTP}
                className="w-full"
              >
                Send Verification Code
              </Button>
            </div>
          ) : (
            <div>
              <p className="mb-2">
                A verification code has been sent to your {signingData.signer.phone ? `phone (${signingData.signer.phone})` : `email (${signingData.signer.email})`}.
              </p>
              <Input
                label="Enter Verification Code"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                error={otpError}
                className="mb-4"
              />
              <Button 
                onClick={handleVerifyOTP}
                isLoading={isVerifyingOTP}
                className="w-full"
              >
                Verify Code
              </Button>
            </div>
          )}
        </div>
      </Modal>
      
      {/* Success Modal */}
      <Modal 
        isOpen={showSuccess} 
        onClose={() => {}}
        title="Document Signed Successfully!"
      >
        <div className="p-4 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">Thank You!</h3>
          <p className="mb-4">
            You have successfully signed this document. A copy will be emailed to you shortly.
          </p>
          <Button onClick={() => router.push('/')}>Return to Homepage</Button>
        </div>
      </Modal>
      
      {/* Main signing interface */}
      <div className="min-h-screen bg-secondary-50 flex flex-col">
        <header className="bg-white border-b border-secondary-200 py-4 px-6 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 relative">
              <Image 
                src="/logo.png" 
                alt="Sayina Logo" 
                width={32}
                height={32}
              />
            </div>
            <h1 className="text-lg font-semibold text-primary-700">Sayina E-Signature</h1>
          </div>
          
          <div>
            <Button variant="ghost" onClick={() => router.push('/')}>
              Cancel
            </Button>
          </div>
        </header>
        
        {/* South African Compliance Banner */}
        <div className="bg-blue-50 p-3 text-sm text-blue-800 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          This signing process complies with the South African ECT Act 25/2002 and POPIA regulations.
        </div>
        
        <main className="flex-1 p-4">
          <div className="container mx-auto">
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
              <div className="p-4 border-b border-secondary-200 flex justify-between items-center">
                <h2 className="text-xl font-medium">
                  {signingData.envelope.name}
                </h2>
              </div>
              
              <div className="h-[calc(100vh-16rem)] relative">
                {/* Watermark overlay for free tier */}
                <Watermark show={showWatermark} />
                
                <PDFViewer
                  documentUrl={signingData.envelope.fileUrl}
                  fields={signingData.fields}
                  signerId={signingData.signer.id}
                  mode="signer"
                  onSubmit={handleSignSubmit}
                  disabled={isSubmitting || !complianceData}
                />
              </div>
            </div>
          </div>
        </main>
        
        <footer className="bg-secondary-100 py-4 mt-auto">
          <div className="container mx-auto px-4 text-center text-sm text-secondary-500">
            <p>
              &copy; {new Date().getFullYear()} Sayina - A Proudly South African E-signature Platform
            </p>
            <p className="mt-1">
              Secure • Compliant • Local
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}

// No longer need dynamic import as our new PDFViewer handles SSR concerns

interface SigningData {
  envelope: {
    id: string;
    name: string;
    fileUrl: string;
    orgId: string;
  };
  signer: Signer & { id: number };
  fields: Field[];
  requiresOTP: boolean;
}

export default function SignEnvelope() {
  const router = useRouter();
  const { envelopeId } = router.query;
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signingData, setSigningData] = useState<SigningData | null>(null);
  
  // OTP verification
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  
  // Signing state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Compliance state
  const [showComplianceConsent, setShowComplianceConsent] = useState(false);
  const [complianceData, setComplianceData] = useState<{ complianceGiven: boolean; complianceAt: string } | null>(null);
  const [showWatermark, setShowWatermark] = useState(false);
  
  // Load envelope data
  useEffect(() => {
    async function loadEnvelopeData() {
      if (!envelopeId || typeof envelopeId !== 'string') return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const data = await getEnvelopeForSigning(envelopeId);
        setSigningData(data);
        
        // Check if organization requires watermark (free tier)
        if (data.envelope.orgId) {
          const requiresWatermark = await checkOrganizationRequiresWatermark(data.envelope.orgId);
          setShowWatermark(requiresWatermark);
        }
        
        // Always show compliance consent first before any other steps
        setShowComplianceConsent(true);
        
        // If compliance consent is already shown and OTP is required, show the OTP modal
        if (data.requiresOTP && !showComplianceConsent) {
          setShowOTPModal(true);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load envelope data');
        toast.error('Failed to load document');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadEnvelopeData();
  }, [envelopeId]);
  
  // Handle signature submission
  const handleSignSubmit = async (signatureData: SignatureData[]) => {
    if (!signingData || !envelopeId || !complianceData) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Include compliance data in the signature submission
      await signEnvelope(
        signingData.envelope.id, 
        signingData.signer.id, 
        signatureData.map(data => ({
          fieldId: data.fieldId,
          value: data.value
        })),
        complianceData.complianceGiven,
        complianceData.complianceAt
      );
      
      toast.success('Document signed successfully!');
      setShowSuccess(true);
      
      // Redirect after 3 seconds
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit signed envelope');
      toast.error('Failed to submit signed document');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle compliance consent
  const handleComplianceConsent = (consentData: { complianceGiven: boolean; complianceAt: string }) => {
    // Store compliance data for later submission
    setComplianceData(consentData);
    setShowComplianceConsent(false);
    
    // If OTP is required, show the OTP modal after compliance consent
    if (signingData?.requiresOTP) {
      setShowOTPModal(true);
    }
  };
  
  // Handle OTP sending with toast notifications
  const handleSendOTP = async () => {
    if (!signingData) return;
    
    try {
      setIsVerifyingOTP(true);
      setOtpError(null);
      
      toast.loading('Sending verification code...');
      await sendOTP(signingData.envelope.id, signingData.signer.id);
      setOtpSent(true);
      toast.success('Verification code sent successfully!');
    } catch (err: any) {
      setOtpError(err.message || 'Failed to send OTP');
      toast.error('Failed to send verification code');
    } finally {
      setIsVerifyingOTP(false);
    }
  };
  
  // Handle OTP verification with toast notifications
  const handleVerifyOTP = async () => {
    if (!signingData || !otpCode) return;
    
    try {
      setIsVerifyingOTP(true);
      setOtpError(null);
      
      toast.loading('Verifying code...');
      await verifyOTP(signingData.envelope.id, signingData.signer.id, otpCode);
      setShowOTPModal(false);
      toast.success('Identity verified successfully!');
    } catch (err: any) {
      setOtpError(err.message || 'Invalid verification code');
      toast.error('Invalid verification code');
    } finally {
      setIsVerifyingOTP(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Loading Document</h2>
          <p className="text-secondary-500">Please wait while we prepare your document for signing.</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-xl text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{error}</p>
            <Button onClick={() => router.push('/')}>Return to Homepage</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!signingData) {
    return null;
  }
  
  return (
    <>
      <Head>
        <title>Sign Document | Sayina</title>
        <meta name="description" content="Sign your document securely with Sayina" />
      </Head>
      
      <ToastProvider />
      
      {/* Compliance Consent Screen */}
      {showComplianceConsent && signingData && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="max-w-4xl mx-auto py-8">
            <ComplianceConsent 
              onContinue={handleComplianceConsent}
              envelopeId={signingData.envelope.id}
              signerId={signingData.signer.id.toString()}
            />
          </div>
        </div>
      )}
      
      {/* OTP Verification Modal */}
      <Modal 
            </div>

            <div>
              <Button variant="ghost" onClick={() => router.push('/')}>
                Cancel
              </Button>
            </div>
          </header>

          {/* South African Compliance Banner */}
          <div className="bg-blue-50 p-3 text-sm text-blue-800 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      >
        <div className="p-4 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">Thank You!</h3>
          <p className="mb-4">
            You have successfully signed this document. A copy will be emailed to you shortly.
          </p>
          <Button onClick={() => router.push('/')}>Return to Homepage</Button>
        </div>
      </Modal>
      
        <footer className="bg-secondary-100 py-4 mt-auto">
          <div className="container mx-auto px-4 text-center text-sm text-secondary-500">
            <p>
              &copy; {new Date().getFullYear()} Sayina - A Proudly South African E-signature Platform
            </p>
            <p className="mt-1">
              Secure • Compliant • Local
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
