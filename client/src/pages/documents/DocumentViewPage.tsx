import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Rotate90DegreesCw as RotateIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  Send as SendIcon,
  Person as PersonIcon,
  History as HistoryIcon,
  Comment as CommentIcon,
  Info as InfoIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import { 
  Box,
  Typography,
  Tabs,
  Tab,
  Drawer,
  useTheme,
  IconButton,
  Toolbar,
  AppBar,
  CircularProgress,
  Button,
  Paper,
  Tooltip
} from '@mui/material';

// Import components
import DocumentPreview from '../../components/documents/DocumentPreview';
import SignersPanel from '../../components/documents/SignersPanel';
import ActivityPanel from '../../components/documents/ActivityPanel';
import MessagesPanel from '../../components/documents/MessagesPanel';
import InfoPanel from '../../components/documents/InfoPanel';

// Define Document type
interface Document {
  id: string;
  name: string;
  status: 'draft' | 'sent' | 'completed' | 'declined';
  createdAt: string;
  updatedAt: string;
  signers: Array<{
    id: string;
    name: string;
    email: string;
    status: 'pending' | 'signed' | 'declined';
  }>;
  messages: Array<{
    id: string;
    sender: string;
    message: string;
    timestamp: string;
  }>;
  activities: Array<{
    id: string;
    action: string;
    user: string;
    timestamp: string;
  }>;
  fields: any[]; // Add fields property
  auditTrail: any[]; // Add auditTrail property
}

// Mock document data
const mockDocument: Document = {
  id: 'doc-123',
  name: 'Sample Contract.pdf',
  status: 'sent',
  createdAt: '2023-05-15T10:00:00Z',
  updatedAt: '2023-05-15T10:00:00Z',
  signers: [
    { id: 's1', name: 'John Doe', email: 'john@example.com', status: 'signed' },
    { id: 's2', name: 'Jane Smith', email: 'jane@example.com', status: 'pending' },
  ],
  messages: [
    { id: 'm1', sender: 'John Doe', message: 'I have signed the document', timestamp: '2023-05-15T10:15:00Z' },
  ],
  activities: [
    { id: 'a1', action: 'Document created', user: 'System', timestamp: '2023-05-15T10:00:00Z' },
    { id: 'a2', action: 'Sent for signatures', user: 'Admin', timestamp: '2023-05-15T10:05:00Z' },
    { id: 'a3', action: 'Document viewed by John Doe', user: 'System', timestamp: '2023-05-15T10:10:00Z' },
    { id: 'a4', action: 'Document signed by John Doe', user: 'System', timestamp: '2023-05-15T10:15:00Z' },
  ],
  fields: [], // Add empty fields array
  auditTrail: [], // Add empty auditTrail array
};

const DocumentViewPage = () => {
  const { id: documentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  
  // State for document data and loading
  const [documentData, setDocumentData] = useState<Document | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State for document view
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('signers');
  const [selectedField, setSelectedField] = useState<string | null>(null);

  // Handle document loading
  useEffect(() => {
    const loadDocument = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setDocumentData(mockDocument);
      } catch (error) {
        console.error('Error loading document:', error);
        setError('Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [documentId]);

  // Show loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Show error state
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  // Show empty state if no document
  if (!documentData) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>No document found</Typography>
      </Box>
    );
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  };

  const handleFieldClick = (fieldId: string) => {
    setSelectedField(fieldId === selectedField ? null : fieldId);
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleFitToScreen = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  };

  const renderPanel = () => {
    if (!documentData) return null;
    
    const panelProps = { document: documentData };
    
    switch (activeTab) {
      case 'signers':
        return <SignersPanel {...panelProps} />;
      case 'activity':
        return <ActivityPanel {...panelProps} />;
      case 'messages':
        return <MessagesPanel {...panelProps} />;
      case 'info':
        return <InfoPanel {...panelProps} />;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Tooltip title="Go back">
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => navigate(-1)}
              sx={{ mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {documentData?.name || 'Document'}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SendIcon />}
            sx={{ mr: 2 }}
          >
            Send for Signature
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<PersonIcon />}
          >
            Manage Signers
          </Button>
        </Toolbar>
      </AppBar>
      {/* Main content */}
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* Document viewer */}
        <Box sx={{ flexGrow: 1, p: 2, overflow: 'auto', position: 'relative' }}>
          <Paper
            elevation={3}
            sx={{
              p: 2,
              mb: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 'calc(100vh - 200px)',
              position: 'relative',
            }}
          >
            {documentData && (
              <DocumentPreview
                document={documentData}
                zoom={zoom}
                rotation={rotation}
                onFieldClick={handleFieldClick}
                selectedFieldId={selectedField}
              />
            )}
          </Paper>
        </Box>
        {/* Sidebar */}
        <Drawer
          variant="persistent"
          anchor="right"
          open={sidebarOpen}
          sx={{
            width: 320,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 320,
              boxSizing: 'border-box',
              borderLeft: `1px solid ${theme.palette.divider}`,
            },
          }}
        >
          <Box sx={{ width: 320, p: 2 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="fullWidth"
              textColor="primary"
              indicatorColor="primary"
              sx={{ mb: 2 }}
            >
              <Tab icon={<PersonIcon />} value="signers" />
              <Tab icon={<HistoryIcon />} value="activity" />
              <Tab icon={<CommentIcon />} value="messages" />
              <Tab icon={<InfoIcon />} value="info" />
            </Tabs>
            <Box sx={{ overflowY: 'auto', maxHeight: 'calc(100vh - 150px)' }}>
              {renderPanel()}
            </Box>
          </Box>
        </Drawer>
      </Box>
      {/* Toolbar */}
      <Paper
        elevation={0}
        sx={{
          p: 1,
          display: 'flex',
          justifyContent: 'center',
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Tooltip title="Zoom In">
          <IconButton onClick={handleZoomIn}>
            <ZoomInIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Zoom Out">
          <IconButton onClick={handleZoomOut}>
            <ZoomOutIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Rotate Document">
          <IconButton onClick={handleRotate}>
            <RotateIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Fit to Screen">
          <IconButton onClick={handleFitToScreen}>
            <ZoomInIcon />
          </IconButton>
        </Tooltip>
        {sidebarOpen ? (
          <Tooltip title="Hide Panel">
            <IconButton onClick={() => setSidebarOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title="Show Panel">
            <IconButton onClick={() => setSidebarOpen(true)}>
              <MenuIcon />
            </IconButton>
          </Tooltip>
        )}
      </Paper>
    </Box>
  );
};

export default DocumentViewPage;
