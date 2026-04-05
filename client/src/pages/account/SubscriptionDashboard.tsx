import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, ProgressBar, Alert, Spinner } from 'react-bootstrap';
import { FaFileSignature, FaSms, FaCalendarAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import TransactionHistory from '../../components/billing/TransactionHistory';
import SubscriptionPlans from '../../components/billing/SubscriptionPlans';

interface UsageData {
  plan: string;
  envelopesUsed: number;
  envelopesLimit: number;
  smsUsed: number;
  smsLimit: number;
  nextBillingDate: string;
}

interface Subscription {
  id: string;
  plan_id: string;
  plan_name: string;
  status: string;
  next_billing_date: string;
}

const SubscriptionDashboard: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [showPlans, setShowPlans] = useState<boolean>(false);
  const navigate = useNavigate();

  // Fetch subscription and usage data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get current user's organization ID from localStorage or context
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const orgId = currentUser.org_id;
        
        if (!orgId) {
          toast.error('Organization information not found');
          setLoading(false);
          return;
        }
        
        // Fetch organization usage data
        const usageResponse = await axios.get(`/api/v1/organizations/${orgId}/usage`);
        
        // Fetch current subscription details
        const subscriptionResponse = await axios.get('/api/v1/billing/subscription');
        
        setUsage(usageResponse.data.data);
        setSubscription(subscriptionResponse.data.data.subscription);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching subscription data:', error);
        toast.error('Failed to load subscription information');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleTopUpSMS = () => {
    navigate('/account/sms-topup');
  };

  const handleChangePlan = () => {
    setShowPlans(true);
  };

  const handleCancelSubscription = async () => {
    if (window.confirm('Are you sure you want to cancel your subscription? Your service will continue until the end of your current billing period.')) {
      try {
        setLoading(true);
        const response = await axios.post('/api/v1/billing/subscription/cancel');
        
        toast.success('Subscription cancelled successfully');
        
        // Refresh data
        const subscriptionResponse = await axios.get('/api/v1/billing/subscription');
        setSubscription(subscriptionResponse.data.data.subscription);
        
        setLoading(false);
      } catch (error) {
        console.error('Error cancelling subscription:', error);
        toast.error('Failed to cancel subscription');
        setLoading(false);
      }
    }
  };

  const closePlanSelection = () => {
    setShowPlans(false);
  };

  // Helper function to determine color for progress bar
  const getProgressBarVariant = (percentage: number): string => {
    if (percentage < 70) return 'success';
    if (percentage < 90) return 'warning';
    return 'danger';
  };

  // Helper function to format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <h1 className="mb-4">Subscription Dashboard</h1>
      
      {!subscription && (
        <Alert variant="warning">
          <Alert.Heading>No Active Subscription</Alert.Heading>
          <p>
            You don't have an active subscription. Select a plan to get started with Sayina E-Signature Service.
          </p>
          <Button variant="primary" onClick={handleChangePlan}>
            View Plans
          </Button>
        </Alert>
      )}

      {subscription && usage && (
        <>
          <Row className="mb-4">
            <Col md={12}>
              <Card className="shadow-sm">
                <Card.Body>
                  <Row>
                    <Col md={8}>
                      <h5 className="text-primary">Current Plan: {usage.plan}</h5>
                      <p className="text-muted">
                        <FaCalendarAlt className="me-1" /> Next billing date: {formatDate(usage.nextBillingDate)}
                      </p>
                    </Col>
                    <Col md={4} className="text-end">
                      <Button variant="outline-primary" onClick={handleChangePlan} className="me-2">
                        Change Plan
                      </Button>
                      <Button variant="outline-danger" onClick={handleCancelSubscription}>
                        Cancel
                      </Button>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="mb-4">
            <Col md={6}>
              <Card className="shadow-sm h-100">
                <Card.Body>
                  <Card.Title>
                    <FaFileSignature className="me-2" /> Envelope Usage
                  </Card.Title>
                  <h3 className="mt-3">
                    {usage.envelopesUsed} / {usage.envelopesLimit}
                  </h3>
                  <ProgressBar 
                    now={(usage.envelopesUsed / usage.envelopesLimit) * 100} 
                    variant={getProgressBarVariant((usage.envelopesUsed / usage.envelopesLimit) * 100)}
                    className="my-3"
                  />
                  <Card.Text>
                    {usage.envelopesLimit - usage.envelopesUsed} envelopes remaining this billing period
                  </Card.Text>
                  {usage.envelopesUsed >= usage.envelopesLimit && (
                    <Alert variant="danger" className="mt-3">
                      You've reached your envelope limit for this billing period.
                      Consider upgrading your plan for additional capacity.
                    </Alert>
                  )}
                  {usage.envelopesUsed >= (usage.envelopesLimit * 0.8) && usage.envelopesUsed < usage.envelopesLimit && (
                    <Alert variant="warning" className="mt-3">
                      You're approaching your envelope limit for this billing period.
                    </Alert>
                  )}
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={6}>
              <Card className="shadow-sm h-100">
                <Card.Body>
                  <Card.Title>
                    <FaSms className="me-2" /> SMS Credits
                  </Card.Title>
                  <h3 className="mt-3">
                    {usage.smsUsed} / {usage.smsLimit}
                  </h3>
                  <ProgressBar 
                    now={(usage.smsUsed / usage.smsLimit) * 100} 
                    variant={getProgressBarVariant((usage.smsUsed / usage.smsLimit) * 100)}
                    className="my-3"
                  />
                  <Card.Text>
                    {usage.smsLimit - usage.smsUsed} SMS credits remaining this billing period
                  </Card.Text>
                  <Button variant="primary" onClick={handleTopUpSMS} className="mt-2">
                    Top Up SMS Credits
                  </Button>
                  
                  {usage.smsUsed >= usage.smsLimit && (
                    <Alert variant="danger" className="mt-3">
                      You've reached your SMS credit limit for this billing period.
                      Purchase additional credits to continue sending SMS notifications.
                    </Alert>
                  )}
                  {usage.smsUsed >= (usage.smsLimit * 0.8) && usage.smsUsed < usage.smsLimit && (
                    <Alert variant="warning" className="mt-3">
                      You're approaching your SMS credit limit for this billing period.
                    </Alert>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
          
          <TransactionHistory />
        </>
      )}

      {showPlans && (
        <SubscriptionPlans 
          show={showPlans} 
          onClose={closePlanSelection} 
          currentPlan={subscription?.plan_id}
        />
      )}
    </Container>
  );
};

export default SubscriptionDashboard;
