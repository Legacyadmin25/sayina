import { Box, List, ListItem, ListItemIcon, ListItemText, Typography, Avatar } from '@mui/material';
import { History as HistoryIcon, CheckCircle as CheckCircleIcon, Send as SendIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import { AuditTrail } from '../../../mockData/mockDocument';

interface ActivityPanelProps {
  document: {
    auditTrail: AuditTrail[];
  };
}

const getActionIcon = (action: string) => {
  switch (action) {
    case 'document_created':
      return <HistoryIcon color="primary" />;
    case 'document_sent':
      return <SendIcon color="primary" />;
    case 'document_viewed':
      return <VisibilityIcon color="info" />;
    case 'document_signed':
      return <CheckCircleIcon color="success" />;
    default:
      return <HistoryIcon />;
  }
};

const getActionText = (action: string) => {
  switch (action) {
    case 'document_created':
      return 'Document created';
    case 'document_sent':
      return 'Document sent for signature';
    case 'document_viewed':
      return 'Document viewed';
    case 'document_signed':
      return 'Document signed';
    default:
      return 'Action performed';
  }
};

const ActivityPanel = ({ document }: ActivityPanelProps) => {
  return (
    <Box>
      <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
        Activity Log
      </Typography>
      <List>
        {document.auditTrail.map((activity, index) => (
          <ListItem key={activity.id} disableGutters>
            <ListItemIcon>
              <Avatar sx={{ bgcolor: 'action.hover' }}>
                {getActionIcon(activity.action)}
              </Avatar>
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography variant="body2">
                  <Typography component="span" fontWeight="medium">
                    {activity.userName}
                  </Typography>{' '}
                  {getActionText(activity.action)}
                </Typography>
              }
              secondary={
                <Typography variant="caption" color="text.secondary">
                  {new Date(activity.timestamp).toLocaleString()}
                </Typography>
              }
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default ActivityPanel;
