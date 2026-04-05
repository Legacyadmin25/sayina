import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Pagination, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { toast } from 'react-toastify';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  gateway: string;
  gateway_transaction_id: string;
  metadata: string;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const TransactionHistory: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0
  });

  useEffect(() => {
    fetchTransactions(1);
  }, []);

  const fetchTransactions = async (page: number) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/v1/billing/transactions?page=${page}&limit=${pagination.limit}`);
      
      setTransactions(response.data.data.transactions);
      setPagination(response.data.data.pagination);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transaction history');
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    fetchTransactions(page);
  };

  // Helper function to format currency
  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency || 'ZAR'
    }).format(amount);
  };

  // Helper function to format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper function to get badge color based on status
  const getStatusBadgeVariant = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
      case 'cancelled':
      case 'canceled':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  // Render pagination controls
  const renderPagination = () => {
    const { page, pages } = pagination;
    
    if (pages <= 1) return null;
    
    const items = [];
    
    // Previous button
    items.push(
      <Pagination.Prev 
        key="prev" 
        onClick={() => handlePageChange(page - 1)}
        disabled={page === 1}
      />
    );
    
    // Page numbers
    for (let i = 1; i <= pages; i++) {
      items.push(
        <Pagination.Item
          key={i}
          active={i === page}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Pagination.Item>
      );
    }
    
    // Next button
    items.push(
      <Pagination.Next 
        key="next" 
        onClick={() => handlePageChange(page + 1)}
        disabled={page === pages}
      />
    );
    
    return <Pagination className="justify-content-center mt-3">{items}</Pagination>;
  };

  return (
    <Card className="shadow-sm mt-4">
      <Card.Header>
        <h5 className="mb-0">Transaction History</h5>
      </Card.Header>
      <Card.Body>
        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-center text-muted py-4">No transactions found</p>
        ) : (
          <div className="table-responsive">
            <Table hover>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(transaction => (
                  <tr key={transaction.id}>
                    <td>{formatDate(transaction.created_at)}</td>
                    <td>{transaction.description}</td>
                    <td>{formatCurrency(transaction.amount, transaction.currency)}</td>
                    <td>
                      <Badge bg={getStatusBadgeVariant(transaction.status)}>
                        {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
        
        {renderPagination()}
      </Card.Body>
    </Card>
  );
};

export default TransactionHistory;
