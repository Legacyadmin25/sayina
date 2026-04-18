import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { getTemplates, createTemplate, deleteTemplate, Template } from '@/lib/api/api';
import { toast } from 'react-hot-toast';

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await getTemplates();
      setTemplates(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file && !templateName) {
      setTemplateName(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleSave = async () => {
    if (!selectedFile) { toast.error('Please select a file'); return; }
    if (!templateName.trim()) { toast.error('Please enter a template name'); return; }
    setIsSaving(true);
    try {
      const tpl = await createTemplate(selectedFile, templateName.trim(), templateDesc.trim() || undefined);
      setTemplates(prev => [{ ...tpl, is_owner: true }, ...prev]);
      toast.success('Template saved');
      setShowUpload(false);
      setTemplateName('');
      setTemplateDesc('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      toast.error(err.message || 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete template "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await deleteTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast.success('Template deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete template');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <DashboardLayout title="Templates" activePage="templates">
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-500 text-sm">Reusable document templates to speed up your workflow.</p>
        <button
          onClick={() => setShowUpload(true)}
          className="bg-[#D4A832] hover:bg-[#c49a28] text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          New Template
        </button>
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Save New Template</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document File <span className="text-red-500">*</span></label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#D4A832]/10 file:text-[#D4A832] hover:file:bg-[#D4A832]/20 cursor-pointer"
                />
                {selectedFile && (
                  <p className="mt-1 text-xs text-gray-400">{selectedFile.name} ({formatFileSize(selectedFile.size)})</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  placeholder="e.g. NDA Agreement"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A832]/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea
                  value={templateDesc}
                  onChange={e => setTemplateDesc(e.target.value)}
                  placeholder="Brief description of this template..."
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A832]/50 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowUpload(false); setSelectedFile(null); setTemplateName(''); setTemplateDesc(''); }}
                className="flex-1 border border-gray-200 text-gray-600 font-medium py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-[#D4A832] hover:bg-[#c49a28] text-black font-semibold py-2 rounded-lg text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" />
                    Saving...
                  </>
                ) : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template list */}
      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#D4A832] border-t-transparent mb-3" />
          <p className="text-gray-400 text-sm">Loading templates...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center">
          <div className="w-16 h-16 bg-[#D4A832]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#D4A832]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-gray-900 font-bold text-lg mb-2">No templates yet</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto mb-5">
            Save your most-used documents as reusable templates — upload once, send many times.
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="bg-[#D4A832] hover:bg-[#c49a28] text-black font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
          >
            Upload Your First Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(tpl => (
            <div key={tpl.id} className="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="w-9 h-9 bg-[#D4A832]/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#D4A832]" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-800 text-sm truncate">{tpl.name}</h4>
                  {tpl.description && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{tpl.description}</p>
                  )}
                </div>
              </div>

              <div className="text-xs text-gray-400 space-y-0.5">
                <div>{tpl.file_name}</div>
                <div>{formatFileSize(tpl.file_size)} · {new Date(tpl.created_at).toLocaleDateString()}</div>
              </div>

              {tpl.is_owner && (
                <div className="flex gap-2 pt-1 border-t border-gray-100">
                  <button
                    onClick={() => handleDelete(tpl.id, tpl.name)}
                    disabled={deletingId === tpl.id}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                  >
                    {deletingId === tpl.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
