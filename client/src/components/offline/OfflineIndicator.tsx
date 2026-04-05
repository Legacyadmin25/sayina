import React, { useState, useEffect } from 'react';
import { Snackbar, Alert, IconButton, Box, Typography, Badge } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import SyncIcon from '@mui/icons-material/Sync';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloseIcon from '@mui/icons-material/Close';

interface OfflineIndicatorProps {
  isOffline: boolean;
  queueLength?: number;
  onClose?: () => void;
  position?: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  };
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  isOffline,
  queueLength = 0,
  onClose,
  position = { vertical: 'bottom', horizontal: 'center' }
}) => {
  const [open, setOpen] = useState(isOffline);

  useEffect(() => {
    setOpen(isOffline);
  }, [isOffline]);

  const handleClose = () => {
    setOpen(false);
    if (onClose) onClose();
  };

  // Show banner when offline or when there are pending items in queue
  const shouldShow = isOffline || queueLength > 0;
  
  if (!shouldShow) return null;

  return (
    <>
      {/* Floating indicator for all states */}
      <Box
        sx={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          backgroundColor: isOffline ? '#f44336' : (queueLength > 0 ? '#ff9800' : '#4caf50'),
          color: 'white',
          borderRadius: '50%',
          width: '60px',
          height: '60px',
          justifyContent: 'center',
          boxShadow: '0 3px 5px rgba(0, 0, 0, 0.2)',
          cursor: 'pointer'
        }}
        onClick={() => setOpen(true)}
      >
        {isOffline ? (
          <CloudOffIcon />
        ) : queueLength > 0 ? (
          <Badge badgeContent={queueLength} color="error">
            <SyncIcon className={queueLength > 0 ? 'rotating' : ''} />
          </Badge>
        ) : (
          <CloudDoneIcon />
        )}
      </Box>

      {/* Snackbar with more details */}
      <Snackbar
        open={open}
        anchorOrigin={position}
        autoHideDuration={isOffline ? null : 5000}
        onClose={handleClose}
      >
        <Alert
          severity={isOffline ? 'error' : queueLength > 0 ? 'warning' : 'success'}
          variant="filled"
          sx={{ width: '100%', minWidth: '300px' }}
          icon={isOffline ? <WifiOffIcon /> : <SyncIcon className={queueLength > 0 ? 'rotating' : ''} />}
          action={
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={handleClose}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          }
        >
          <Box>
            <Typography variant="body1">
              {isOffline 
                ? 'You are currently offline' 
                : queueLength > 0 
                  ? `${queueLength} items will sync when online` 
                  : 'All changes are synced'}
            </Typography>
            {isOffline && queueLength > 0 && (
              <Typography variant="body2">
                {queueLength} {queueLength === 1 ? 'item' : 'items'} will sync when you're back online
              </Typography>
            )}
          </Box>
        </Alert>
      </Snackbar>
      
      {/* CSS for rotation animation */}
      <style jsx>{`
        .rotating {
          animation: spin 2s linear infinite;
        }
        
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
};

export default OfflineIndicator;
