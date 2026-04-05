import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface ComplianceConsentProps {
  onContinue: (consentData: {
    complianceGiven: boolean;
    complianceAt: string;
  }) => void;
  envelopeId?: string;
  signerId?: string;
}

const ComplianceConsent: React.FC<ComplianceConsentProps> = ({
  onContinue,
  envelopeId,
  signerId
}) => {
  const router = useRouter();
  const [consentGiven, setConsentGiven] = useState(false);

  const handleConsent = () => {
    if (!consentGiven) {
      toast.error('You must agree to the compliance terms before continuing');
      return;
    }

    // Create compliance data with current timestamp
    const complianceData = {
      complianceGiven: true,
      complianceAt: new Date().toISOString()
    };

    onContinue(complianceData);
  };

  return (
    <div className="max-w-3xl mx-auto p-6" data-cy="compliance-consent">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <div className="rounded-full bg-primary-100 p-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <CardTitle className="text-2xl font-bold">Compliance Consent</CardTitle>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="mb-6">
            <p className="mb-4 text-secondary-700">
              By signing, you agree that this electronic signature is binding under South African law and regulations:
            </p>
            
            <div className="bg-primary-50 border-l-4 border-primary-500 p-4 rounded mb-4">
              <p className="font-medium text-secondary-800">
                By signing, I acknowledge that this electronic signature is legally binding under the Electronic Communications and Transactions Act 25 of 2002 (ECT Act) and I consent to the electronic record-keeping of my personal information in accordance with the Protection of Personal Information Act (POPIA).
              </p>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-secondary-600 mt-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p>
                Your IP address and the time of consent will be recorded as part of this legal process.
              </p>
            </div>
          </div>

          <div className="mb-6">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="h-5 w-5 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                required
                data-cy="compliance-checkbox"
              />
              <span className="text-secondary-700">I have read and agree to the above compliance terms</span>
            </label>
          </div>

          <div className="flex justify-between items-center mt-6 space-x-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              disabled={!consentGiven}
              onClick={handleConsent}
              data-cy="compliance-continue"
            >
              Continue to Sign
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComplianceConsent;
