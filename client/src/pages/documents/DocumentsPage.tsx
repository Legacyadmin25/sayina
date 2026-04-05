import { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  useTheme,
  InputAdornment,
  Chip,
  Avatar,
  Badge,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Description as DocumentIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  WatchLater as WatchLaterIcon,
  FileDownload as DownloadIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  ContentCopy as DuplicateIcon,
  Visibility as PreviewIcon,
} from '@mui/icons-material';

// Mock data - replace with actual API calls
const createDocumentData = (id: number, title: string, status: string, signers: string[], modified: string) => {
  return { id, title, status, signers, modified };
};

const documents = [
  createDocumentData(1, 'Employment Contract.pdf', 'completed', ['John Smith', 'Jane Doe'], '2023-05-15T09:30:00'),
  createDocumentData(2, 'Non-Disclosure Agreement.docx', 'pending', ['Alex Johnson'], '2023-05-14T14:45:00'),
  createDocumentData(3, 'Service Agreement.pdf', 'pending', ['Sarah Williams', 'Mike Brown'], '2023-05-12T11:20:00'),
  createDocumentData(4, 'Offer Letter - Developer.pdf', 'completed', ['Robert Chen'], '2023-05-10T16:15:00'),
  createDocumentData(5, 'Partnership Agreement.pdf', 'draft', [], '2023-05-08T10:00:00'),
  createDocumentData(6, 'Contract Renewal.docx', 'pending', ['Emily Davis', 'David Wilson'], '2023-05-05T13:30:00'),
  createDocumentData(7, 'Consulting Agreement.pdf', 'completed', ['Michael Johnson'], '2023-05-01T09:15:00'),
];

type Order = 'asc' | 'desc';

interface HeadCell {
  id: keyof typeof documents[0];
  label: string;
  numeric: boolean;
  disablePadding: boolean;
}

const headCells: readonly HeadCell[] = [
  { id: 'title', numeric: false, disablePadding: true, label: 'Document' },
  { id: 'status', numeric: false, disablePadding: false, label: 'Status' },
  { id: 'signers', numeric: false, disablePadding: false, label: 'Signers' },
  { id: 'modified', numeric: false, disablePadding: false, label: 'Last Modified' },
];

interface EnhancedTableProps {
  numSelected: number;
  onRequestSort: (event: React.MouseEvent<unknown>, property: keyof typeof documents[0]) => void;
  onSelectAllClick: (event: React.ChangeEvent<HTMLInputElement>) => void;
  order: Order;
  orderBy: string;
  rowCount: number;
}

function EnhancedTableHead(props: EnhancedTableProps) {
  const { onSelectAllClick, order, orderBy, numSelected, rowCount, onRequestSort } = props;
  const createSortHandler = (property: keyof typeof documents[0]) => (event: React.MouseEvent<unknown>) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead>
      <TableRow>
        <TableCell padding="checkbox">
          <Checkbox
            color="primary"
            indeterminate={numSelected > 0 && numSelected < rowCount}
            checked={rowCount > 0 && numSelected === rowCount}
            onChange={onSelectAllClick}
            inputProps={{ 'aria-label': 'select all documents' }}
          />
        </TableCell>
        {headCells.map((headCell) => (
          <TableCell
            key={headCell.id}
            align={headCell.numeric ? 'right' : 'left'}
            padding={headCell.disablePadding ? 'none' : 'normal'}
            sortDirection={orderBy === headCell.id ? order : false}
          >
            <TableSortLabel
              active={orderBy === headCell.id}
              direction={orderBy === headCell.id ? order : 'asc'}
              onClick={createSortHandler(headCell.id)}
            >
              {headCell.label}
            </TableSortLabel>
          </TableCell>
        ))}
        <TableCell align="right">Actions</TableCell>
      </TableRow>
    </TableHead>
  );
}

const getStatusChip = (status: string) => {
  switch (status) {
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
          label="Pending"
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

export default function DocumentsPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<keyof typeof documents[0]>('modified');
  const [selected, setSelected] = useState<number[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchQuery, setSearchQuery] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDocument, setSelectedDocument] = useState<number | null>(null);
  const [documentsState, setDocumentsState] = useState(documents);

  const handleRequestSort = (event: React.MouseEvent<unknown>, property: keyof typeof documents[0]) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = documentsState.map((n) => n.id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleClick = (event: React.MouseEvent<unknown>, id: number) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: number[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }

    setSelected(newSelected);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setPage(0);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, documentId: number) => {
    setAnchorEl(event.currentTarget);
    setSelectedDocument(documentId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedDocument(null);
  };

  const handleViewDocument = () => {
    if (selectedDocument) {
      navigate(`/documents/${selectedDocument}`);
      handleMenuClose();
    }
  };

  const handleDownloadDocument = () => {
    // TODO: Implement download document
    console.log('Download document:', selectedDocument);
    handleMenuClose();
  };

  const handleDuplicateDocument = () => {
    // TODO: Implement duplicate document
    console.log('Duplicate document:', selectedDocument);
    handleMenuClose();
  };

  const handleDeleteDocument = () => {
    // TODO: Implement delete document
    console.log('Delete document:', selectedDocument);
    if (selectedDocument) {
      setDocumentsState(documentsState.filter(doc => doc.id !== selectedDocument));
      setSelected(selected.filter(id => id !== selectedDocument));
    }
    handleMenuClose();
  };

  const handleShareDocument = () => {
    // TODO: Implement share document
    console.log('Share document:', selectedDocument);
    handleMenuClose();
  };

  const isSelected = (id: number) => selected.indexOf(id) !== -1;

  // Filter documents based on search query
  const filteredDocuments = documentsState.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.signers.some(signer => signer.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Sort documents
  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    if (orderBy === 'modified') {
      return order === 'desc'
        ? new Date(b.modified).getTime() - new Date(a.modified).getTime()
        : new Date(a.modified).getTime() - new Date(b.modified).getTime();
    } else if (orderBy === 'title') {
      return order === 'desc'
        ? b.title.localeCompare(a.title)
        : a.title.localeCompare(b.title);
    } else if (orderBy === 'status') {
      return order === 'desc'
        ? b.status.localeCompare(a.status)
        : a.status.localeCompare(b.status);
    }
    return 0;
  });

  // Pagination
  const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - filteredDocuments.length) : 0;
  const visibleRows = sortedDocuments.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ width: '100%', mb: 2, p: 2 }}>
        <Toolbar
          sx={{
            pl: { sm: 2 },
            pr: { xs: 1, sm: 1 },
            ...(selected.length > 0 && {
              bgcolor: (theme) =>
                theme.palette.mode === 'light'
                  ? 'rgba(25, 118, 210, 0.08)'
                  : 'rgba(25, 118, 210, 0.16)',
            }),
          }}
        >
          {selected.length > 0 ? (
            <Typography
              sx={{ flex: '1 1 100%' }}
              color="inherit"
              variant="subtitle1"
              component="div"
            >
              {selected.length} selected
            </Typography>
          ) : (
            <Typography
              sx={{ flex: '1 1 100%' }}
              variant="h6"
              id="tableTitle"
              component="div"
            >
              Documents
            </Typography>
          )}
          {selected.length > 0 ? (
            <Box>
              <Tooltip title="Delete">
                <IconButton onClick={() => handleDeleteDocument()}>
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Share">
                <IconButton onClick={handleShareDocument}>
                  <ShareIcon />
                </IconButton>
              </Tooltip>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TextField
                variant="outlined"
                size="small"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={handleSearch}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mr: 2, width: 300 }}
              />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/documents/new')}
                sx={{ ml: 1 }}
              >
                New Document
              </Button>
            </Box>
          )}
        </Toolbar>
        <TableContainer>
          <Table
            sx={{ minWidth: 750 }}
            aria-labelledby="tableTitle"
            size={'medium'}
          >
            <EnhancedTableHead
              numSelected={selected.length}
              order={order}
              orderBy={orderBy}
              onSelectAllClick={handleSelectAllClick}
              onRequestSort={handleRequestSort}
              rowCount={filteredDocuments.length}
            />
            <TableBody>
              {visibleRows.map((row, index) => {
                const isItemSelected = isSelected(row.id);
                const labelId = `enhanced-table-checkbox-${index}`;

                return (
                  <TableRow
                    hover
                    onClick={(event) => handleClick(event, row.id)}
                    role="checkbox"
                    aria-checked={isItemSelected}
                    tabIndex={-1}
                    key={row.id}
                    selected={isItemSelected}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        color="primary"
                        checked={isItemSelected}
                        inputProps={{ 'aria-labelledby': labelId }}
                      />
                    </TableCell>
                    <TableCell
                      component="th"
                      id={labelId}
                      scope="row"
                      padding="none"
                      sx={{ py: 2 }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar
                          sx={{
                            mr: 2,
                            bgcolor: 'primary.light',
                            color: 'primary.contrastText',
                          }}
                        >
                          <DocumentIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {row.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(row.modified).toLocaleString()}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{getStatusChip(row.status)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {row.signers.length > 0 ? (
                          <Box sx={{ display: 'flex' }}>
                            {row.signers.slice(0, 2).map((signer, idx) => (
                              <Avatar
                                key={idx}
                                sx={{
                                  width: 32,
                                  height: 32,
                                  fontSize: '0.75rem',
                                  bgcolor: 'primary.light',
                                  color: 'primary.contrastText',
                                  ml: idx > 0 ? -1 : 0,
                                  border: `2px solid ${theme.palette.background.paper}`,
                                }}
                              >
                                {signer
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')}
                              </Avatar>
                            ))}
                            {row.signers.length > 2 && (
                              <Avatar
                                sx={{
                                  width: 32,
                                  height: 32,
                                  fontSize: '0.75rem',
                                  bgcolor: 'grey.300',
                                  color: 'text.primary',
                                  ml: -1,
                                  border: `2px solid ${theme.palette.background.paper}`,
                                }}
                              >
                                +{row.signers.length - 2}
                              </Avatar>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No signers
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(row.modified).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(row.modified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        aria-label="more"
                        aria-controls="document-menu"
                        aria-haspopup="true"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMenuOpen(e, row.id);
                        }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
              {emptyRows > 0 && (
                <TableRow style={{ height: 53 * emptyRows }}>
                  <TableCell colSpan={6} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredDocuments.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Document Actions Menu */}
      <Menu
        id="document-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleViewDocument}>
          <ListItemIcon>
            <PreviewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Document</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDownloadDocument}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Download</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDuplicateDocument}>
          <ListItemIcon>
            <DuplicateIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Make a Copy</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleShareDocument}>
          <ListItemIcon>
            <ShareIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Share</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDeleteDocument} sx={{ color: 'error.main' }}>
          <ListItemIcon sx={{ color: 'error.main' }}>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
