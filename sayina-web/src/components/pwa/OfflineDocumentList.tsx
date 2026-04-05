import React from 'react';
import { useOfflineDocuments } from '@/hooks/useOfflineDocuments';
import { useTranslation } from '@/hooks/useTranslation';

interface OfflineDocumentListProps {
  userEmail?: string;
  onDocumentSelect?: (documentId: string) => void;
  className?: string;
}

/**
 * OfflineDocumentList displays documents available for offline use
 * and provides functionality to view them while offline
 */
const OfflineDocumentList: React.FC<OfflineDocumentListProps> = ({
  userEmail,
  onDocumentSelect,
  className,
}) => {
  const { t } = useTranslation();
  const {
    documents,
    loading,
    error,
    isOnline,
    getDocumentURL,
    removeFromOffline,
  } = useOfflineDocuments(userEmail);

  // Handle document selection
  const handleDocumentClick = (documentId: string) => {
    if (onDocumentSelect) {
      onDocumentSelect(documentId);
    }
  };

  // Handle removing a document from offline storage
  const handleRemoveDocument = async (
    e: React.MouseEvent,
    documentId: string
  ) => {
    e.stopPropagation();
    await removeFromOffline(documentId);
  };

  if (loading) {
    return (
      <div className={`p-4 text-center ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 text-center text-red-600 ${className}`}>
        <p>{t('error_loading_offline_documents', 'Error loading offline documents')}</p>
        <p className="text-sm">{error.message}</p>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className={`p-4 text-center ${className}`}>
        <p className="text-gray-600">
          {isOnline
            ? t('no_offline_documents', 'No documents saved for offline use')
            : t('offline_no_documents', 'You are offline and have no saved documents')}
        </p>
        {isOnline && (
          <p className="text-sm text-gray-500 mt-2">
            {t(
              'save_documents_offline_hint',
              'Save documents for offline use to access them when you have no internet connection'
            )}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <h3 className="text-lg font-medium mb-4">
        {t('offline_documents', 'Available Offline')}
      </h3>

      <div className="space-y-3">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition cursor-pointer"
            onClick={() => handleDocumentClick(doc.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-gray-100 p-2 rounded mr-3">
                  <svg
                    className="w-6 h-6 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium">{doc.name}</h4>
                  <p className="text-xs text-gray-500">
                    {new Date(doc.lastModified).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <button
                className="text-gray-500 hover:text-red-500 transition-colors"
                onClick={(e) => handleRemoveDocument(e, doc.id)}
                aria-label={t('remove_from_offline', 'Remove from offline storage')}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OfflineDocumentList;
