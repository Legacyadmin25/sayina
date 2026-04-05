import { useState } from 'react';
import { Box, Paper, Typography, IconButton, Tooltip, CircularProgress } from '@mui/material';
import { Document, Field } from '../../../mockData/mockDocument';

interface DocumentPreviewProps {
  document: Document;
  zoom: number;
  rotation: number;
  onFieldClick?: (field: Field) => void;
  selectedFieldId?: string | null;
}

const DocumentPreview = ({
  document,
  zoom,
  rotation,
  onFieldClick,
  selectedFieldId,
}: DocumentPreviewProps) => {
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const handleFieldClick = (field: Field) => {
    if (onFieldClick) {
      onFieldClick(field);
    }
  };

  const renderPage = (pageNumber: number) => {
    const pageFields = document.fields.filter((field) => field.page === pageNumber);
    
    return (
      <Paper
        key={`page-${pageNumber}`}
        elevation={3}
        sx={{
          width: '8.5in',
          minHeight: '11in',
          mb: 4,
          position: 'relative',
          backgroundColor: '#fff',
          backgroundImage: 'linear-gradient(#e0e0e0 1px, transparent 1px), linear-gradient(90deg, #e0e0e0 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          overflow: 'hidden',
        }}
      >
        {/* Page number */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            color: 'text.secondary',
            fontSize: '0.875rem',
          }}
        >
          Page {pageNumber} of {document.pages}
        </Box>

        {/* Fields for this page */}
        {pageFields.map((field) => (
          <Box
            key={field.id}
            onClick={() => handleFieldClick(field)}
            sx={{
              position: 'absolute',
              left: `${field.x}px`,
              top: `${field.y}px`,
              width: `${field.width}px`,
              height: `${field.height}px`,
              border: '2px dashed',
              borderColor: field.id === selectedFieldId ? 'primary.main' : 'divider',
              backgroundColor: field.id === selectedFieldId ? 'rgba(25, 118, 210, 0.08)' : 'rgba(0, 0, 0, 0.02)',
              borderRadius: 1,
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.04)',
                cursor: 'pointer',
              },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              p: 1,
              overflow: 'hidden',
            }}
          >
            {field.type === 'signature' ? (
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" display="block" color="text.secondary">
                  {field.required ? 'SIGN HERE' : 'SIGNATURE (OPTIONAL)'}
                </Typography>
                {field.value ? (
                  <Box
                    component="img"
                    src={field.value}
                    alt="Signature"
                    sx={{ maxWidth: '100%', maxHeight: 60, mt: 0.5 }}
                  />
                ) : (
                  <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                    {field.required ? 'Required' : 'Optional'}
                  </Typography>
                )}
              </Box>
            ) : field.type === 'date' ? (
              <Box sx={{ textAlign: 'center', width: '100%' }}>
                <Typography variant="caption" display="block" color="text.secondary" noWrap>
                  {field.required ? 'DATE (REQUIRED)' : 'DATE (OPTIONAL)'}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }} noWrap>
                  {field.value || 'MM/DD/YYYY'}
                </Typography>
              </Box>
            ) : field.type === 'text' ? (
              <Box sx={{ width: '100%' }}>
                <Typography variant="caption" display="block" color="text.secondary" noWrap>
                  {field.label || 'TEXT FIELD'}
                </Typography>
                <Typography variant="body2" noWrap sx={{ mt: 0.5 }}>
                  {field.value || (field.required ? 'Required' : 'Optional')}
                </Typography>
              </Box>
            ) : null}
          </Box>
        ))}
      </Paper>
    );
  };

  const renderLoadingState = () => (
    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
      <CircularProgress />
    </Box>
  );

  const renderDocument = () => {
    if (loading) {
      return renderLoadingState();
    }

    return (
      <Box
        sx={{
          transform: `scale(${zoom}) rotate(${rotation}deg)`,
          transformOrigin: 'center top',
          transition: 'transform 0.2s ease-in-out',
          minHeight: 'calc(100vh - 200px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          p: 2,
        }}
      >
        {Array.from({ length: document.pages }).map((_, index) =>
          renderPage(index + 1)
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ width: '100%', height: '100%', overflow: 'auto' }}>
      {renderDocument()}
    </Box>
  );
};

export default DocumentPreview;
