import React from 'react';
import { Alert, Snackbar, Typography, Box } from '@mui/material';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';

interface OfflineNotificationProps {
  open: boolean;
  onClose: () => void;
  message: string;
  queuedAction?: string;
  autoHideDuration?: number | null;
}

const OfflineNotification: React.FC<OfflineNotificationProps> = ({
  open,
  onClose,
  message,
  queuedAction,
  autoHideDuration = 6000
}) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        icon={<CloudQueueIcon />}
        variant="filled"
        severity="warning"
        onClose={onClose}
        sx={{ width: '100%', minWidth: '300px' }}
      >
        <Box>
          <Typography variant="body1">{message}</Typography>
          {queuedAction && (
            <Typography variant="body2" sx={{ mt: 0.5, fontSize: '0.875rem' }}>
              {queuedAction}
            </Typography>
          )}
        </Box>
      </Alert>
    </Snackbar>
  );
};

export default OfflineNotification;
