import React, { useState, useEffect } from 'react';
import { Modal, Button, Card, Row, Col, Badge, Spinner, Alert } from 'react-bootstrap';
import { FaCheck, FaTimes } from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-toastify';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billing_cycle: string;
  envelope_limit: number;
  sms_credits: number;
  custom_branding: boolean;
  remove_watermark: boolean;
  api_access: boolean;
  priority_support: boolean;
}

interface SubscriptionPlansProps {
  show: boolean;
  onClose: () => void;
  currentPlan?: string;
}

const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({ show, onClose, currentPlan }) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [processingPayment, setProcessingPayment] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (show) {
      fetchPlans();
    }
  }, [show]);

  useEffect(() => {
    if (currentPlan) {
      setSelectedPlan(currentPlan);
    }
  }, [currentPlan]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/v1/billing/plans');
      setPlans(response.data.data.subscription_plans);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Failed to load subscription plans');
      setLoading(false);
      setError('Failed to load subscription plans. Please try again later.');
    }
  };

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) {
      toast.error('Please select a plan');
      return;
    }

    try {
      setProcessingPayment(true);
      setError('');

      // Call API to initiate subscription
      const response = await axios.post('/api/v1/billing/subscribe', {
        planId: selectedPlan
      });

      // Redirect to PayFast payment page
      if (response.data.success && response.data.data.paymentUrl) {
        window.location.href = response.data.data.paymentUrl;
      } else {
        throw new Error('Failed to generate payment URL');
      }
    } catch (error) {
      console.error('Error subscribing to plan:', error);
      setProcessingPayment(false);
      setError('Failed to process subscription. Please try again later.');
      toast.error('Failed to process subscription');
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: currency || 'ZAR'
    }).format(amount);
  };

  return (
    <Modal show={show} onHide={onClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Subscription Plans</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        ) : (
          <>
            {error && <Alert variant="danger">{error}</Alert>}
            
            <Row>
              {plans.map(plan => (
                <Col key={plan.id} md={4} className="mb-3">
                  <Card 
                    className={`h-100 ${selectedPlan === plan.id ? 'border-primary' : ''}`}
                    onClick={() => handlePlanSelect(plan.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Card.Header className="text-center">
                      <h5>{plan.name}</h5>
                      {currentPlan === plan.id && (
                        <Badge bg="info" className="mt-1">Current Plan</Badge>
                      )}
                    </Card.Header>
                    <Card.Body>
                      <div className="text-center mb-3">
                        <h3>{formatCurrency(plan.price, plan.currency)}</h3>
                        <small className="text-muted">per month</small>
                      </div>
                      <Card.Text>{plan.description}</Card.Text>
                      <hr />
                      <ul className="list-unstyled">
                        <li className="mb-2">
                          <FaCheck className="text-success me-2" />
                          {plan.envelope_limit} Envelopes/month
                        </li>
                        <li className="mb-2">
                          <FaCheck className="text-success me-2" />
                          {plan.sms_credits} SMS Credits
                        </li>
                        <li className="mb-2">
                          {plan.custom_branding ? 
                            <FaCheck className="text-success me-2" /> : 
                            <FaTimes className="text-danger me-2" />
                          }
                          Custom Branding
                        </li>
                        <li className="mb-2">
                          {plan.remove_watermark ? 
                            <FaCheck className="text-success me-2" /> : 
                            <FaTimes className="text-danger me-2" />
                          }
                          Remove Watermark
                        </li>
                        <li className="mb-2">
                          {plan.api_access ? 
                            <FaCheck className="text-success me-2" /> : 
                            <FaTimes className="text-danger me-2" />
                          }
                          API Access
                        </li>
                        <li>
                          {plan.priority_support ? 
                            <FaCheck className="text-success me-2" /> : 
                            <FaTimes className="text-danger me-2" />
                          }
                          Priority Support
                        </li>
                      </ul>
                    </Card.Body>
                    <Card.Footer className="text-center">
                      <Button 
                        variant={selectedPlan === plan.id ? "primary" : "outline-primary"}
                        onClick={() => handlePlanSelect(plan.id)}
                        className="w-100"
                      >
                        {currentPlan === plan.id ? 'Current Plan' : 'Select'}
                      </Button>
                    </Card.Footer>
                  </Card>
                </Col>
              ))}
            </Row>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSubscribe} 
          disabled={processingPayment || !selectedPlan || selectedPlan === currentPlan}
        >
          {processingPayment ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              Processing...
            </>
          ) : (
            selectedPlan === currentPlan ? 'Current Plan' : 'Subscribe'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SubscriptionPlans;
