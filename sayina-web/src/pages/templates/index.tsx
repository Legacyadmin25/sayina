import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function TemplatesPage() {
  return (
    <DashboardLayout title="Templates" activePage="templates">
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-500 text-sm">Reusable document templates to speed up your workflow.</p>
        <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg font-medium">Coming Soon</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-10 text-center">
        <div className="w-20 h-20 bg-[#D4A832]/10 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#D4A832]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-gray-900 font-bold text-xl mb-3">Templates are coming soon</h3>
        <p className="text-gray-500 text-sm max-w-md mx-auto mb-2">
          Save your most-used documents as reusable templates — fill in signer details each time with no re-uploading required.
        </p>
        <p className="text-gray-400 text-xs max-w-md mx-auto mb-8">
          Examples: NDAs, employment contracts, lease agreements, service agreements.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/envelopes/create">
            <button className="bg-[#D4A832] hover:bg-[#c49a28] text-black font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors">
              Send a Document Now
            </button>
          </Link>
          <Link href="/envelopes">
            <button className="border border-gray-200 hover:bg-gray-50 text-gray-600 font-medium px-6 py-2.5 rounded-lg text-sm transition-colors">
              View My Envelopes
            </button>
          </Link>
        </div>
      </div>

      {/* Preview of what's coming */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { title: 'Save as Template', desc: 'Turn any sent document into a reusable template in one click.' },
          { title: 'Pre-fill Signer Slots', desc: 'Define roles like "Client" and "Witness" — fill names when sending.' },
          { title: 'Template Library', desc: 'Browse common SA legal document templates ready to use.' },
        ].map(f => (
          <div key={f.title} className="bg-white rounded-xl shadow-sm p-5 opacity-50">
            <div className="w-8 h-8 bg-[#D4A832]/10 rounded-lg flex items-center justify-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#D4A832]" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
                <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            </div>
            <h4 className="font-semibold text-gray-800 text-sm mb-1">{f.title}</h4>
            <p className="text-xs text-gray-400">{f.desc}</p>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
