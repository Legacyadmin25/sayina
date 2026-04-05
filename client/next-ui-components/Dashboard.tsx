import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';
import { Button } from './Button';
import { Input } from './Input';

// Types
interface DocumentStatus {
  type: 'signed' | 'pending' | 'declined' | 'draft' | 'completed';
  label: string;
  color: string;
  bgColor: string;
}

interface Signer {
  id: string;
  name: string;
  email: string;
  status: 'signed' | 'pending' | 'declined';
}

interface Document {
  id: string;
  name: string;
  status: DocumentStatus['type'];
  date: string;
  signers?: Signer[];
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

// Mock data
const MOCK_DOCUMENTS: Document[] = [
  {
    id: '1',
    name: 'Employment Contract - John Doe',
    status: 'pending',
    date: '2025-05-15T10:30:00Z',
    signers: [
      { id: 's1', name: 'John Doe', email: 'john@example.com', status: 'signed' },
      { id: 's2', name: 'HR Department', email: 'hr@example.com', status: 'pending' },
    ],
  },
  {
    id: '2',
    name: 'NDA - Acme Corp',
    status: 'signed',
    date: '2025-05-10T14:45:00Z',
    signers: [
      { id: 's3', name: 'Jane Smith', email: 'jane@example.com', status: 'signed' },
    ],
  },
  {
    id: '3',
    name: 'Service Agreement - Client X',
    status: 'draft',
    date: '2025-05-05T09:15:00Z',
    signers: [],
  },
];

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'new-doc',
    title: 'New Document',
    description: 'Upload and prepare a new document for signing',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
    path: '/documents/new',
    color: '#4caf50',
  },
  {
    id: 'template',
    title: 'Use Template',
    description: 'Start from a pre-built template',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
      </svg>
    ),
    path: '/templates',
    color: '#2196f3',
  },
  {
    id: 'send',
    title: 'Send for Signature',
    description: 'Request signatures from multiple parties',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    path: '/send',
    color: '#ff9800',
  },
];

const getStatusConfig = (status: DocumentStatus['type']): DocumentStatus => {
  switch (status) {
    case 'signed':
      return { type: status, label: 'Signed', color: 'text-green-700', bgColor: 'bg-green-100' };
    case 'pending':
      return { type: status, label: 'Pending', color: 'text-yellow-700', bgColor: 'bg-yellow-100' };
    case 'declined':
      return { type: status, label: 'Declined', color: 'text-red-700', bgColor: 'bg-red-100' };
    case 'draft':
      return { type: status, label: 'Draft', color: 'text-gray-700', bgColor: 'bg-gray-100' };
    case 'completed':
      return { type: status, label: 'Completed', color: 'text-blue-700', bgColor: 'bg-blue-100' };
    default:
      return { type: 'draft', label: 'Unknown', color: 'text-gray-700', bgColor: 'bg-gray-100' };
  }
};

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)} weeks ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    pending: 0,
    signed: 0,
    declined: 0,
    draft: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setDocuments(MOCK_DOCUMENTS);
        setStats({
          pending: 5,
          signed: 12,
          declined: 2,
          draft: 3,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredDocuments = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleCreateDocument = () => {
    // Navigate to document creation page
    window.location.href = '/documents/new';
  };

  const handleDocumentClick = (documentId: string) => {
    // Navigate to document details page
    window.location.href = `/documents/${documentId}`;
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="animate-pulse">
          <div className="h-9 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-9 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-9 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">Dashboard</h1>
        <Button 
          variant="default" 
          size="default"
          leftIcon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          }
          onClick={handleCreateDocument}
        >
          New Document
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card variant="elevated">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <div className="p-3 rounded-full bg-yellow-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </CardContent>
        </Card>
        
        <Card variant="elevated">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Signed</p>
              <p className="text-3xl font-bold text-green-600">{stats.signed}</p>
            </div>
            <div className="p-3 rounded-full bg-green-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </CardContent>
        </Card>
        
        <Card variant="elevated">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Declined</p>
              <p className="text-3xl font-bold text-red-600">{stats.declined}</p>
            </div>
            <div className="p-3 rounded-full bg-red-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </CardContent>
        </Card>
        
        <Card variant="elevated">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Drafts</p>
              <p className="text-3xl font-bold text-gray-600">{stats.draft}</p>
            </div>
            <div className="p-3 rounded-full bg-gray-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {QUICK_ACTIONS.map((action) => (
          <Card 
            key={action.id} 
            variant="outline" 
            clickable 
            className="hover:border-gray-300 transition-all"
            onClick={() => window.location.href = action.path}
          >
            <CardContent className="flex flex-col items-center text-center p-6">
              <div 
                className="p-4 rounded-full mb-4" 
                style={{ backgroundColor: `${action.color}15`, color: action.color }}
              >
                {action.icon}
              </div>
              <h3 className="text-lg font-medium mb-2">{action.title}</h3>
              <p className="text-gray-500 text-sm">{action.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Documents */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 sm:mb-0">Recent Documents</h2>
        <Input
          placeholder="Search documents..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="w-full sm:w-64"
          leftAddon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
        />
      </div>

      {filteredDocuments.length === 0 ? (
        <Card variant="outline" className="p-8 text-center">
          <CardContent className="flex flex-col items-center">
            <div className="p-4 rounded-full bg-gray-100 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">No documents found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'Try adjusting your search term.' : 'You have no documents yet.'}
            </p>
            <Button 
              variant="default" 
              onClick={handleCreateDocument}
            >
              Create your first document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDocuments.map((document) => {
            const statusConfig = getStatusConfig(document.status);
            return (
              <Card 
                key={document.id} 
                variant="outline" 
                clickable 
                className="hover:border-gray-300"
                onClick={() => handleDocumentClick(document.id)}
              >
                <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4">
                  <div className="flex items-start mb-4 sm:mb-0">
                    <div className="p-2 rounded-md bg-gray-100 mr-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-gray-900">{document.name}</h3>
                      <p className="text-sm text-gray-500">
                        {formatDate(document.date)} • {document.signers?.length || 0} signers
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {document.signers && document.signers.length > 0 && (
                      <div className="flex -space-x-2 mr-4">
                        {document.signers.slice(0, 3).map((signer) => (
                          <div 
                            key={signer.id} 
                            className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center overflow-hidden"
                            title={signer.name}
                          >
                            <span className="text-xs font-medium text-gray-600">
                              {signer.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                        ))}
                        {document.signers.length > 3 && (
                          <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600">
                              +{document.signers.length - 3}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
