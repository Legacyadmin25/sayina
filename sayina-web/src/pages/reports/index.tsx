import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function ReportsPage() {
  const reportTypes = [
    { title: 'Envelope Activity', description: 'Track sent, completed, pending and declined envelopes over time.', icon: '📊', available: false },
    { title: 'Signer Activity', description: 'See who signed, when, and from which device or location.', icon: '✍️', available: false },
    { title: 'Completion Rate', description: 'Measure how many documents get fully signed vs abandoned.', icon: '✅', available: false },
    { title: 'Audit Trail Export', description: 'Export full audit trail logs for compliance purposes.', icon: '🔒', available: false },
  ];

  return (
    <DashboardLayout title="Reports" activePage="reports">
      <div className="mb-6">
        <p className="text-gray-500 text-sm">Analytics and reporting for your e-signature activity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportTypes.map(r => (
          <div key={r.title} className="bg-white rounded-xl shadow-sm p-6 flex items-start gap-4">
            <span className="text-2xl">{r.icon}</span>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-gray-900">{r.title}</h3>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-lg font-medium">Coming Soon</span>
              </div>
              <p className="text-sm text-gray-400">{r.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-[#D4A832]/10 border border-[#D4A832]/30 rounded-xl p-5 flex items-start gap-4">
        <span className="text-2xl">💡</span>
        <div>
          <p className="font-semibold text-gray-800 mb-1">Reports coming in the next update</p>
          <p className="text-sm text-gray-500">
            Full reporting and analytics will be available soon. Start sending envelopes now — all your data will be ready when reports launch.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
