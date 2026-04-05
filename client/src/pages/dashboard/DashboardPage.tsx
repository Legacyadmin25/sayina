import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActionArea,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  useTheme,
  Skeleton,
  Chip,
  Tooltip,
  alpha,
  useMediaQuery,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Description as DocumentIcon,
  CheckCircle as SignedIcon,
  Pending as PendingIcon,
  AccessTime as ClockIcon,
  CloudUpload as UploadIcon,
  DescriptionOutlined as TemplateIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';

type DocumentStatus = 'signed' | 'pending' | 'declined' | 'draft' | 'completed';

interface Document {
  id: string | number;
  name: string;
  status: DocumentStatus;
  date: string;
  signers?: { name: string; email: string; status: string }[];
}

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color?: string;
}

// Mock data - replace with actual API calls
const MOCK_DOCUMENTS: Document[] = [
  {
    id: 1,
    name: 'Employment Contract - John Doe',
    status: 'pending',
    date: '2023-06-15T10:30:00Z',
    signers: [
      { name: 'John Doe', email: 'john@example.com', status: 'signed' },
      { name: 'HR Department', email: 'hr@example.com', status: 'pending' },
    ],
  },
  {
    id: 2,
    name: 'NDA - Acme Corp',
    status: 'signed',
    date: '2023-06-10T14:45:00Z',
  },
  {
    id: 3,
    name: 'Service Agreement - Client X',
    status: 'draft',
    date: '2023-06-05T09:15:00Z',
  },
];

const QUICK_ACTIONS: QuickAction[] = [
  {
    title: 'New Document',
    description: 'Upload and prepare a new document for signing',
    icon: <UploadIcon fontSize="large" />,
    path: '/documents/new',
    color: '#4caf50',
  },
  {
    title: 'Use Template',
    description: 'Start from a pre-built template',
    icon: <TemplateIcon fontSize="large" />,
    path: '/templates',
    color: '#2196f3',
  },
  {
    title: 'Send for Signature',
    description: 'Request signatures from multiple parties',
    icon: <EditIcon fontSize="large" />,
    path: '/send',
    color: '#ff9800',
  },
];

const DashboardPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState({
    pending: 0,
    signed: 0,
    declined: 0,
    draft: 0,
  });

  const getStatusChipProps = (status: DocumentStatus) => {
    switch (status) {
      case 'signed':
        return { label: 'Signed', color: 'success' as const, icon: <SignedIcon /> };
      case 'pending':
        return { label: 'Pending', color: 'warning' as const, icon: <PendingIcon /> };
      case 'declined':
        return { label: 'Declined', color: 'error' as const, icon: <PendingIcon /> };
      case 'draft':
        return { label: 'Draft', color: 'default' as const, icon: <ClockIcon /> };
      case 'completed':
        return { label: 'Completed', color: 'info' as const, icon: <SignedIcon /> };
      default:
        return { label: 'Unknown', color: 'default' as const, icon: <ClockIcon /> };
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: enUS });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

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

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" width="100%" height={118} sx={{ mb: 3 }} />
        <Skeleton variant="rectangular" width="100%" height={200} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: isMobile ? 1 : 3 }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 2 
          }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              Dashboard
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => navigate('/documents/new')}
            >
              New Document
            </Button>
          </Box>
        </Grid>

        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardActionArea onClick={() => navigate('/documents?status=pending')}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography color="textSecondary" gutterBottom>
                    Pending
                  </Typography>
                  <PendingIcon color="warning" />
                </Box>
                <Typography variant="h4">{stats.pending}</Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardActionArea onClick={() => navigate('/documents?status=signed')}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography color="textSecondary" gutterBottom>
                    Signed
                  </Typography>
                  <SignedIcon color="success" />
                </Box>
                <Typography variant="h4">{stats.signed}</Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardActionArea onClick={() => navigate('/documents?status=declined')}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography color="textSecondary" gutterBottom>
                    Declined
                  </Typography>
                  <PendingIcon color="error" />
                </Box>
                <Typography variant="h4">{stats.declined}</Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardActionArea onClick={() => navigate('/documents?status=draft')}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography color="textSecondary" gutterBottom>
                    Drafts
                  </Typography>
                  <ClockIcon color="action" />
                </Box>
                <Typography variant="h4">{stats.draft}</Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mt: 1 }}>
            Quick Actions
          </Typography>
          <Grid container spacing={2}>
            {QUICK_ACTIONS.map((action) => (
              <Grid item xs={12} sm={6} md={4} key={action.path}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 6,
                    },
                  }}
                >
                  <CardActionArea
                    onClick={() => navigate(action.path)}
                    sx={{ flex: 1, p: 3, display: 'flex', flexDirection: 'column' }}
                  >
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        bgcolor: alpha(action.color || theme.palette.primary.main, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2,
                        color: action.color || theme.palette.primary.main,
                      }}
                    >
                      {action.icon}
                    </Box>
                    <Typography variant="h6" component="div" gutterBottom>
                      {action.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 'auto' }}>
                      {action.description}
                    </Typography>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* Recent Documents */}
        <Grid item xs={12}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: 2 
          }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Recent Documents
            </Typography>
            <Button
              size="small"
              onClick={() => navigate('/documents')}
              sx={{ textTransform: 'none' }}
            >
              View All
            </Button>
          </Box>

          <Paper 
            variant="outlined"
            sx={{
              borderRadius: 2,
              overflow: 'hidden',
              '&:hover': {
                boxShadow: 3,
              },
            }}
          >
            {documents.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <DocumentIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1, opacity: 0.5 }} />
                <Typography color="textSecondary">No recent documents</Typography>
                <Button 
                  variant="outlined" 
                  color="primary" 
                  sx={{ mt: 2 }}
                  onClick={() => navigate('/documents/new')}
                >
                  Upload Your First Document
                </Button>
              </Box>
            ) : (
              <List disablePadding>
                {documents.map((doc, index) => {
                  const statusProps = getStatusChipProps(doc.status);
                  
                  return (
                    <div key={doc.id}>
                      <ListItem
                        sx={{
                          '&:hover': {
                            bgcolor: 'action.hover',
                            '& .hover-actions': {
                              opacity: 1,
                            },
                          },
                        }}
                        secondaryAction={
                          <Box
                            className="hover-actions"
                            sx={{
                              display: 'flex',
                              opacity: { xs: 1, sm: 0 },
                              transition: 'opacity 0.2s',
                            }}
                          >
                            <Tooltip title="Download">
                              <IconButton size="small" sx={{ ml: 1 }}>
                                <DownloadIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar>
                            <DocumentIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" flexWrap="wrap">
                              <Typography
                                component="span"
                                variant="subtitle1"
                                sx={{
                                  mr: 1,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: { xs: '100%', sm: 300, md: 400 },
                                }}
                              >
                                {doc.name}
                              </Typography>
                              <Chip
                                size="small"
                                label={statusProps.label}
                                color={statusProps.color}
                                icon={statusProps.icon}
                                sx={{ ml: 1, fontSize: '0.7rem' }}
                              />
                            </Box>
                          }
                          secondary={
                            <Box display="flex" alignItems="center" mt={0.5}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                                <ClockIcon fontSize="inherit" sx={{ mr: 0.5, fontSize: '0.9em' }} />
                                {formatDate(doc.date)}
                              </Typography>
                              {doc.signers && doc.signers.length > 0 && (
                                <Tooltip 
                                  title={doc.signers.map(s => `${s.name} (${s.status})`).join(', ')}
                                  arrow
                                >
                                  <Typography 
                                    variant="caption" 
                                    color="text.secondary" 
                                    sx={{ 
                                      ml: 2, 
                                      display: 'flex', 
                                      alignItems: 'center',
                                      '&:hover': {
                                        textDecoration: 'underline',
                                        cursor: 'pointer'
                                      }
                                    }}
                                  >
                                    <PersonIcon fontSize="inherit" sx={{ mr: 0.5, fontSize: '0.9em' }} />
                                    {doc.signers.length} {doc.signers.length === 1 ? 'signer' : 'signers'}
                                  </Typography>
                                </Tooltip>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < documents.length - 1 && <Divider variant="inset" component="li" />}
                    </div>
                  );
                })}
              </List>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 2 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate('/documents')}
              >
                View All Documents
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
