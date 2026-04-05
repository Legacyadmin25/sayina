import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import HomeIcon from '@mui/icons-material/Home';
import IosShareIcon from '@mui/icons-material/IosShare';

interface InstallPromptProps {
  open: boolean;
  installType: 'ios' | 'android' | 'huawei' | 'generic' | null;
  onClose: () => void;
}

const InstallPrompt: React.FC<InstallPromptProps> = ({ open, installType, onClose }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="install-prompt-title"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle id="install-prompt-title">
        Add Sayina to Home Screen
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          Install Sayina for faster access and offline features.
        </Typography>

        {installType === 'ios' && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              For iOS (Safari):
            </Typography>
            <ol>
              <li>
                <Typography display="flex" alignItems="center" gutterBottom>
                  Tap the Share button <IosShareIcon sx={{ mx: 1 }} />
                </Typography>
              </li>
              <li>
                <Typography gutterBottom>
                  Scroll down and tap "Add to Home Screen"
                </Typography>
              </li>
              <li>
                <Typography gutterBottom>
                  Tap "Add" in the top right corner
                </Typography>
              </li>
            </ol>
            <Box sx={{ my: 2, border: '1px solid #ccc', borderRadius: 1, p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Note: This only works in Safari. If you're using another browser on iOS, please open Sayina in Safari first.
              </Typography>
            </Box>
          </Box>
        )}

        {installType === 'android' && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              For Android (Chrome):
            </Typography>
            <ol>
              <li>
                <Typography display="flex" alignItems="center" gutterBottom>
                  Tap the menu button <MoreVertIcon sx={{ mx: 1 }} />
                </Typography>
              </li>
              <li>
                <Typography display="flex" alignItems="center" gutterBottom>
                  Tap "Add to Home screen" <AddCircleOutlineIcon sx={{ mx: 1 }} />
                </Typography>
              </li>
              <li>
                <Typography gutterBottom>
                  Tap "Add" when prompted
                </Typography>
              </li>
            </ol>
          </Box>
        )}

        {installType === 'huawei' && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              For Huawei Browser:
            </Typography>
            <ol>
              <li>
                <Typography display="flex" alignItems="center" gutterBottom>
                  Tap the menu button <MoreVertIcon sx={{ mx: 1 }} />
                </Typography>
              </li>
              <li>
                <Typography gutterBottom>
                  Tap "Add to Home screen"
                </Typography>
              </li>
              <li>
                <Typography gutterBottom>
                  Follow the prompts to complete installation
                </Typography>
              </li>
            </ol>
          </Box>
        )}

        {installType === 'generic' && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Install Instructions:
            </Typography>
            <ol>
              <li>
                <Typography gutterBottom>
                  Look for the install icon or menu in your browser
                </Typography>
              </li>
              <li>
                <Typography gutterBottom>
                  Select "Add to Home screen" or "Install app"
                </Typography>
              </li>
              <li>
                <Typography gutterBottom>
                  Follow any additional prompts to complete installation
                </Typography>
              </li>
            </ol>
          </Box>
        )}

        <Box sx={{ mt: 3, display: 'flex', alignItems: 'center' }}>
          <HomeIcon color="primary" sx={{ mr: 1 }} />
          <Typography>
            Once installed, you'll be able to use Sayina even when offline!
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary" variant="outlined">
          Not now
        </Button>
        <Button 
          color="primary" 
          variant="contained"
          onClick={onClose}
          startIcon={<AddCircleOutlineIcon />}
        >
          Add to Home Screen
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InstallPrompt;
