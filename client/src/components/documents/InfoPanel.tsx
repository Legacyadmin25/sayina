import { Box, Typography, List, ListItem, ListItemIcon, ListItemText, Divider, Button, Chip, Paper } from '@mui/material';
import {
  Description as DescriptionIcon,
  Person as PersonIcon,
  History as HistoryIcon,
  Lock as LockIcon,
  CloudDownload as DownloadIcon,
  Share as ShareIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  WatchLater as WatchLaterIcon,
} from '@mui/icons-material';
import { Document } from '../../../mockData/mockDocument';

interface InfoPanelProps {
  document: Document;
}

const InfoPanel = ({ document }: InfoPanelProps) => {
  const getStatusChip = () => {
    switch (document.status) {
      case 'completed':
        return (
          <Chip
            icon={<CheckCircleIcon fontSize="small" />}
            label="Completed"
            color="success"
            variant="outlined"
            size="small"
          />
        );
      case 'pending':
        return (
          <Chip
            icon={<PendingIcon fontSize="small" />}
            label="In Progress"
            color="warning"
            variant="outlined"
            size="small"
          />
        );
      case 'draft':
        return (
          <Chip
            icon={<WatchLaterIcon fontSize="small" />}
            label="Draft"
            color="default"
            variant="outlined"
            size="small"
          />
        );
      default:
        return null;
    }
  };

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
        Document Details
      </Typography>

      <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
        <Box display="flex" alignItems="center" mb={2}>
          <DescriptionIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6">{document.title}</Typography>
        </Box>
        <Box mb={2}>
          <Typography variant="caption" color="text.secondary" display="block">
            Status
          </Typography>
          {getStatusChip()}
        </Box>
      </Paper>

      <List disablePadding>
        <ListItem disableGutters>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <PersonIcon color="action" fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Owner"
            secondary="You"
            secondaryTypographyProps={{ variant: 'body2' }}
          />
        </ListItem>
        <ListItem disableGutters>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <HistoryIcon color="action" fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Created"
            secondary={new Date(document.created).toLocaleString()}
            secondaryTypographyProps={{ variant: 'body2' }}
          />
        </ListItem>
        <ListItem disableGutters>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <HistoryIcon color="action" fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Last Modified"
            secondary={new Date(document.modified).toLocaleString()}
            secondaryTypographyProps={{ variant: 'body2' }}
          />
        </ListItem>
        <ListItem disableGutters>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <LockIcon color="action" fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Security"
            secondary="Secured with 256-bit SSL"
            secondaryTypographyProps={{ variant: 'body2' }}
          />
        </ListItem>
      </List>

      <Divider sx={{ my: 2 }} />

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Actions
        </Typography>
        <Box display="flex" flexDirection="column" gap={1}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<DownloadIcon />}
            sx={{ justifyContent: 'flex-start' }}
          >
            Download Document
          </Button>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<ShareIcon />}
            sx={{ justifyContent: 'flex-start' }}
          >
            Share Document
          </Button>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<DeleteIcon />}
            color="error"
            sx={{ justifyContent: 'flex-start' }}
          >
            Delete Document
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default InfoPanel;
