import { useState } from 'react';
import { Box, Button, List, ListItem, ListItemIcon, ListItemText, Avatar, Chip, Divider, Typography } from '@mui/material';
import { PersonAdd as PersonAddIcon, Email as EmailIcon, MoreVert as MoreVertIcon } from '@mui/icons-material';
import { Document, Signer } from '../../../mockData/mockDocument';

interface SignersPanelProps {
  document: Document;
}

const SignersPanel = ({ document }: SignersPanelProps) => {
  const [showAddSignerForm, setShowAddSignerForm] = useState(false);

  const getStatusChip = (status: Signer['status']) => {
    switch (status) {
      case 'signed':
        return (
          <Chip
            label="Signed"
            color="success"
            size="small"
            variant="outlined"
          />
        );
      case 'pending':
        return (
          <Chip
            label="Awaiting Signature"
            color="warning"
            size="small"
            variant="outlined"
          />
        );
      case 'declined':
        return (
          <Chip
            label="Declined"
            color="error"
            size="small"
            variant="outlined"
          />
        );
      default:
        return null;
    }
  };

  const handleAddSigner = () => {
    setShowAddSignerForm(true);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle1" fontWeight="medium">
          Signers
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<PersonAddIcon />}
          onClick={handleAddSigner}
        >
          Add Signer
        </Button>
      </Box>

      <List>
        {document.signers.map((signer, index) => (
          <Box key={signer.id}>
            <ListItem disableGutters>
              <ListItemIcon>
                <Avatar>
                  {signer.name.split(' ').map(n => n[0]).join('')}
                </Avatar>
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body1">{signer.name}</Typography>
                    {getStatusChip(signer.status)}
                  </Box>
                }
                secondary={
                  <Box>
                    <Box component="span" display="block">{signer.role}</Box>
                    <Box component="span" display="block" fontSize="0.75rem" color="text.secondary">
                      {signer.status === 'signed' && `Signed on ${new Date(signer.signedAt || '').toLocaleString()}`}
                      {signer.status === 'pending' && `Sent on ${new Date(signer.sentAt).toLocaleString()}`}
                      {signer.status === 'declined' && 'Declined to sign'}
                    </Box>
                  </Box>
                }
              />
              <IconButton edge="end" size="small">
                <MoreVertIcon />
              </IconButton>
            </ListItem>
            {index < document.signers.length - 1 && <Divider variant="inset" component="li" />}
          </Box>
        ))}
      </List>

      {showAddSignerForm && (
        <Box mt={2} p={2} bgcolor="action.hover" borderRadius={1}>
          <Typography variant="subtitle2" gutterBottom>
            Add New Signer
          </Typography>
          <Box display="flex" gap={1} mb={2}>
            <Box flex={1}>
              <Typography variant="caption" display="block" color="text.secondary">
                Name
              </Typography>
              <input
                type="text"
                placeholder="Full Name"
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                }}
              />
            </Box>
            <Box flex={1}>
              <Typography variant="caption" display="block" color="text.secondary">
                Email
              </Typography>
              <input
                type="email"
                placeholder="email@example.com"
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                }}
              />
            </Box>
          </Box>
          <Box display="flex" justifyContent="flex-end" gap={1}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setShowAddSignerForm(false)}
            >
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              color="primary"
            >
              Add Signer
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default SignersPanel;
