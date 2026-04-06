import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import ToastProvider from '@/components/ui/ToastProvider';
import { Field, Signer } from '@/lib/types/envelope';
import { verifyOTP, sendOTP, getEnvelopeForSigning, checkOrganizationRequiresWatermark } from '@/lib/api/api';
import ComplianceConsent from '@/components/compliance/ComplianceConsent';
import Watermark from '@/components/compliance/Watermark';

interface SigningData {
  envelope: { id: string; name: string; fileUrl: string; orgId: string };
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
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showComplianceConsent, setShowComplianceConsent] = useState(false);
  const [showWatermark, setShowWatermark] = useState(false);

  useEffect(() => {
    async function load() {
      if (!envelopeId || typeof envelopeId !== 'string') return;
      try {
        setIsLoading(true);
        const data = await getEnvelopeForSigning(envelopeId);
        setSigningData(data);
        if (data.envelope.orgId) {
          const rw = await checkOrganizationRequiresWatermark(data.envelope.orgId);
          setShowWatermark(rw);
        }
        setShowComplianceConsent(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load document';
        setError(msg);
        toast.error('Failed to load document');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [envelopeId]);

  const handleComplianceConsent = (c: { complianceGiven: boolean; complianceAt: string }) => {
    setShowComplianceConsent(false);
    if (signingData?.requiresOTP) setShowOTPModal(true);
  };

  const handleVerifyOTP = async () => {
    if (!signingData || !otpCode) return;
    try {
      setIsVerifyingOTP(true);
      setOtpError(null);
      await verifyOTP(signingData.envelope.id, signingData.signer.id, otpCode);
      setShowOTPModal(false);
      toast.success('Identity verified!');
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  const handleSendOTP = async () => {
    if (!signingData) return;
    try {
      setIsVerifyingOTP(true);
      await sendOTP(signingData.envelope.id, signingData.signer.id);
      toast.success('Code sent!');
    } catch {
      toast.error('Failed to send code');
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
          <h2 className="text-xl font-semibold">Loading Document</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader><CardTitle className="text-red-600">Error</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-4">{error}</p>
            <Button onClick={() => router.push('/')}>Return to Homepage</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!signingData) return null;

  if (showComplianceConsent) {
    return (
      <>
        <Head><title>Sign Document | Sayina</title></Head>
        <ToastProvider />
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="max-w-4xl mx-auto py-8">
            <ComplianceConsent
              onContinue={handleComplianceConsent}
              envelopeId={signingData.envelope.id}
              signerId={signingData.signer.id.toString()}
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Sign Document | Sayina</title>
        <meta name="description" content="Sign your document securely with Sayina" />
      </Head>
      <ToastProvider />
      {showWatermark && <Watermark text="SAYINA FREE TIER" />}

      <Modal isOpen={showOTPModal} onClose={() => setShowOTPModal(false)} title="Identity Verification" size="sm">
        <div className="py-2">
          <p className="text-gray-600 mb-4">Enter the verification code sent to you.</p>
          <input
            type="text"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
            placeholder="6-digit code"
            className="w-full border rounded px-3 py-2 mb-2"
            maxLength={6}
          />
          {otpError && <p className="text-red-500 text-sm mb-2">{otpError}</p>}
          <div className="flex gap-2 mt-4">
            <Button variant="secondary" onClick={handleSendOTP} disabled={isVerifyingOTP}>
              Resend Code
            </Button>
            <Button onClick={handleVerifyOTP} disabled={isVerifyingOTP || !otpCode}>
              {isVerifyingOTP ? 'Verifying...' : 'Verify'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showSuccess} onClose={() => router.push('/')} title="Document Signed!" size="sm">
        <div className="py-4 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">Thank You!</h3>
          <p className="mb-4">You have successfully signed this document.</p>
          <Button onClick={() => router.push('/')}>Return to Homepage</Button>
        </div>
      </Modal>

      <div className="min-h-screen flex flex-col bg-gray-50">
        <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-blue-600 text-xl">Sayina</span>
            <span className="text-gray-500">|</span>
            <span className="text-gray-700">{signingData.envelope.name}</span>
          </div>
          <Button variant="ghost" onClick={() => router.push('/')}>Cancel</Button>
        </header>
        <div className="bg-blue-50 p-3 text-sm text-blue-800 text-center">
          ECT Act 25/2002 Compliant — Your signature is legally binding in South Africa
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="max-w-lg w-full">
            <CardHeader><CardTitle>Ready to Sign</CardTitle></CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Document: <strong>{signingData.envelope.name}</strong></p>
              <p className="text-gray-600 mb-6">
                You have <strong>{signingData.fields.length}</strong> field(s) to complete.
              </p>
            </CardContent>
          </Card>
        </div>
        <footer className="bg-gray-100 py-4 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Sayina — A Proudly South African E-signature Platform</p>
          <p className="mt-1">Secure | Compliant | Local</p>
        </footer>
      </div>
    </>
  );
}
