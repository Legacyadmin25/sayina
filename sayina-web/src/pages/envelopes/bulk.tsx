import { useState, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useRouter } from 'next/router';

const API = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';

interface Signer {
  name: string;
  email: string;
  phone?: string;
}

type Step = 'upload' | 'signers' | 'review' | 'result';

export default function BulkSendPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [signers, setSigners] = useState<Signer[]>([]);
  const [manualSigner, setManualSigner] = useState<Signer>({ name: '', email: '', phone: '' });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (f.size > 10 * 1024 * 1024) {
        setError('File must be under 10MB');
        return;
      }
      setFile(f);
      setError('');
    }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.trim().split('\n');
      const header = lines[0].toLowerCase();
      const hasHeader = header.includes('name') || header.includes('email');
      const startIdx = hasHeader ? 1 : 0;

      const parsed: Signer[] = [];
      for (let i = startIdx; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length >= 2 && cols[1].includes('@')) {
          parsed.push({ name: cols[0], email: cols[1], phone: cols[2] || '' });
        }
      }

      if (parsed.length === 0) {
        setError('No valid signers found in CSV. Format: Name, Email, Phone (optional)');
        return;
      }

      setSigners(prev => [...prev, ...parsed]);
      setCsvFile(f);
      setError('');
    };
    reader.readAsText(f);
  };

  const addManualSigner = () => {
    if (!manualSigner.name.trim() || !manualSigner.email.trim()) {
      setError('Name and email are required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manualSigner.email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (signers.some(s => s.email.toLowerCase() === manualSigner.email.toLowerCase())) {
      setError('This email is already added');
      return;
    }
    setSigners(prev => [...prev, { ...manualSigner }]);
    setManualSigner({ name: '', email: '', phone: '' });
    setError('');
  };

  const removeSigner = (idx: number) => {
    setSigners(prev => prev.filter((_, i) => i !== idx));
  };

  const handleBulkSend = async () => {
    if (!file || signers.length === 0) return;
    setLoading(true);
    setError('');

    try {
      // Create individual envelopes for each signer with the same document
      const envelopes = signers.map(signer => ({
        name: `${file.name} - ${signer.name}`,
        signers: [{ name: signer.name, email: signer.email, phone: signer.phone }],
      }));

      // Use the wizard endpoint for each signer (most reliable)
      let successCount = 0;
      let failCount = 0;
      const details: any[] = [];

      for (const env of envelopes) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('signers', JSON.stringify(env.signers));
          formData.append('fields', JSON.stringify([]));

          const res = await fetch(`${API}/envelopes/wizard`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });

          const data = await res.json();
          if (data.success) {
            successCount++;
            details.push({ signer: env.signers[0].name, status: 'sent', id: data.data?.envelope?.id });
          } else {
            failCount++;
            details.push({ signer: env.signers[0].name, status: 'failed', error: data.message });
          }
        } catch (err: any) {
          failCount++;
          details.push({ signer: env.signers[0].name, status: 'failed', error: err.message });
        }
      }

      setResults({ successCount, failCount, details });
      setStep('result');
    } catch (err: any) {
      setError(err.message || 'Bulk send failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Bulk Send" activePage="envelopes">
      <div className="max-w-3xl mx-auto">
        {/* Progress Steps */}
        <div className="flex items-center mb-8">
          {(['upload', 'signers', 'review'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === s ? 'bg-blue-600 text-white' :
                (['upload', 'signers', 'review'].indexOf(step) > i || step === 'result') ? 'bg-green-500 text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {(['upload', 'signers', 'review'].indexOf(step) > i || step === 'result') ? '✓' : i + 1}
              </div>
              <span className="ml-2 text-sm font-medium text-gray-600 capitalize hidden sm:inline">{s === 'upload' ? 'Document' : s}</span>
              {i < 2 && <div className="flex-1 h-0.5 mx-3 bg-gray-200" />}
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Upload Document */}
        {step === 'upload' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Document</h2>
            <p className="text-sm text-gray-500 mb-6">Upload a document to send to multiple signers at once.</p>

            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center cursor-pointer hover:border-blue-400 transition-colors"
            >
              {file ? (
                <div>
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="text-xs text-red-500 mt-2 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-gray-500 text-sm">Click to select a PDF document</p>
                  <p className="text-xs text-gray-400 mt-1">Max 10MB</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />

            <div className="flex justify-end mt-6">
              <button
                type="button"
                disabled={!file}
                onClick={() => setStep('signers')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-blue-700"
              >
                Next: Add Signers
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Add Signers */}
        {step === 'signers' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Signers</h2>
            <p className="text-sm text-gray-500 mb-6">
              Each signer will receive their own copy of the document to sign independently.
            </p>

            {/* CSV Upload */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Import from CSV</p>
              <p className="text-xs text-gray-400 mb-3">Format: Name, Email, Phone (optional). First row can be a header.</p>
              <button
                type="button"
                onClick={() => csvRef.current?.click()}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-white"
              >
                Upload CSV
              </button>
              <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
              {csvFile && <span className="ml-3 text-xs text-green-600">Imported from {csvFile.name}</span>}
            </div>

            {/* Manual Add */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <input
                type="text"
                placeholder="Full Name"
                value={manualSigner.name}
                onChange={e => setManualSigner(p => ({ ...p, name: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="email"
                placeholder="Email"
                value={manualSigner.email}
                onChange={e => setManualSigner(p => ({ ...p, email: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <input
                  type="tel"
                  placeholder="Phone (optional)"
                  value={manualSigner.phone}
                  onChange={e => setManualSigner(p => ({ ...p, phone: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1"
                />
                <button
                  type="button"
                  onClick={addManualSigner}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 whitespace-nowrap"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Signer List */}
            {signers.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
                <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 flex justify-between">
                  <span>{signers.length} signer{signers.length !== 1 ? 's' : ''}</span>
                  <button type="button" onClick={() => setSigners([])} className="text-red-500 hover:underline">Clear all</button>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-gray-100">
                  {signers.map((s, i) => (
                    <div key={i} className="px-4 py-2 flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium text-gray-900">{s.name}</span>
                        <span className="text-gray-400 ml-2">{s.email}</span>
                        {s.phone && <span className="text-gray-300 ml-2">{s.phone}</span>}
                      </div>
                      <button type="button" onClick={() => removeSigner(i)} className="text-red-400 hover:text-red-600 text-xs">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <button type="button" onClick={() => setStep('upload')} className="px-4 py-2 text-gray-600 text-sm hover:underline">
                Back
              </button>
              <button
                type="button"
                disabled={signers.length === 0}
                onClick={() => setStep('review')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-blue-700"
              >
                Next: Review
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 'review' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Review & Send</h2>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700">Document</p>
                  <p className="text-sm text-gray-500">{file?.name}</p>
                </div>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  {((file?.size || 0) / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  {signers.length} signer{signers.length !== 1 ? 's' : ''} will each receive a copy
                </p>
                <div className="flex flex-wrap gap-2">
                  {signers.slice(0, 10).map((s, i) => (
                    <span key={i} className="text-xs bg-white border border-gray-200 px-2 py-1 rounded-full text-gray-600">
                      {s.name}
                    </span>
                  ))}
                  {signers.length > 10 && (
                    <span className="text-xs text-gray-400">+{signers.length - 10} more</span>
                  )}
                </div>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  This will create {signers.length} separate envelopes and send signing invitations to each signer.
                  Each signer uses 1 envelope from your plan limit.
                </p>
              </div>
            </div>

            <div className="flex justify-between">
              <button type="button" onClick={() => setStep('signers')} className="px-4 py-2 text-gray-600 text-sm hover:underline">
                Back
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleBulkSend}
                className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-green-700"
              >
                {loading ? 'Sending...' : `Send to ${signers.length} signer${signers.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {step === 'result' && results && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Bulk Send Complete</h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <p className="text-3xl font-bold text-green-600">{results.successCount}</p>
                <p className="text-sm text-green-700">Sent</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg text-center">
                <p className="text-3xl font-bold text-red-600">{results.failCount}</p>
                <p className="text-sm text-red-700">Failed</p>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
              <div className="max-h-60 overflow-y-auto divide-y divide-gray-100">
                {results.details.map((d: any, i: number) => (
                  <div key={i} className="px-4 py-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900">{d.signer}</span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      d.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {d.status === 'sent' ? 'Sent' : `Failed: ${d.error}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => { setStep('upload'); setFile(null); setSigners([]); setResults(null); }}
                className="px-4 py-2 text-gray-600 text-sm hover:underline"
              >
                Send Another Batch
              </button>
              <button
                type="button"
                onClick={() => router.push('/envelopes')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                View Envelopes
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
