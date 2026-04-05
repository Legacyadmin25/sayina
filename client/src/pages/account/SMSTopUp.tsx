import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Card, 
  Form, 
  Button, 
  Row, 
  Col, 
  Alert, 
  Spinner, 
  InputGroup 
} from 'react-bootstrap';
import { FaSms, FaArrowLeft } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

interface SMSPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  sms_credits: number;
}

interface SMSCredits {
  total_credits: number;
  used_credits: number;
  remaining_credits: number;
}

const SMSTopUp: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [processing, setProcessing] = useState<boolean>(false);
  const [smsCredits, setSMSCredits] = useState<SMSCredits | null>(null);
  const [smsPlans, setSMSPlans] = useState<SMSPlan[]>([]);
  const [customCredits, setCustomCredits] = useState<number>(0);
  const [ratePerCredit, setRatePerCredit] = useState<number>(0);
  const [error, setError] = useState<string>('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const status = queryParams.get('status');

  useEffect(() => {
    fetchData();
    
    // Check for payment status from URL
    if (status === 'success') {
      toast.success('SMS credits purchased successfully!');
    } else if (status === 'cancelled') {
      toast.info('SMS credit purchase was cancelled');
    }
  }, [status]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch SMS credits balance
      const creditsResponse = await axios.get('/api/v1/billing/sms-credits');
      
      // Fetch SMS plans (for rate calculation)
      const plansResponse = await axios.get('/api/v1/billing/plans');
      
      setSMSCredits(creditsResponse.data.data);
      
      // Store SMS plans data and calculate rate per credit
      const smsPlansData = plansResponse.data.data.sms_plans;
      setSMSPlans(smsPlansData);
      
      // Calculate rate per credit based on the first SMS plan
      if (smsPlansData && smsPlansData.length > 0) {
        const plan = smsPlansData[0];
        setRatePerCredit(plan.price / plan.sms_credits);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching SMS data:', error);
      toast.error('Failed to load SMS credit information');
      setLoading(false);
      setError('Failed to load SMS credit information. Please try again later.');
    }
  };

  const handleCustomCreditsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setCustomCredits(isNaN(value) ? 0 : value);
  };

  const handlePredefinedCredits = (credits: number) => {
    setCustomCredits(credits);
  };

  const handleTopUp = async () => {
    if (customCredits < 10) {
      toast.error('Minimum SMS topup is 10 credits');
      return;
    }

    try {
      setProcessing(true);
      setError('');

      // Call API to initiate SMS topup
      const response = await axios.post('/api/v1/billing/sms-topup', {
        credits: customCredits
      });

      // Redirect to PayFast payment page
      if (response.data.success && response.data.data.paymentUrl) {
        window.location.href = response.data.data.paymentUrl;
      } else {
        throw new Error('Failed to generate payment URL');
      }
    } catch (error) {
      console.error('Error processing SMS topup:', error);
      setProcessing(false);
      setError('Failed to process SMS topup. Please try again later.');
      toast.error('Failed to process SMS topup');
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  };

  const calculateCost = (): string => {
    if (customCredits <= 0 || ratePerCredit <= 0) return formatCurrency(0);
    return formatCurrency(customCredits * ratePerCredit);
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
      <Button 
        variant="link" 
        className="mb-3 p-0 text-decoration-none" 
        onClick={() => navigate('/account/subscription')}
      >
        <FaArrowLeft className="me-2" /> Back to Subscription Dashboard
      </Button>
      
      <h1 className="mb-4">SMS Credits Top-Up</h1>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Row>
        <Col md={4} className="mb-4">
          <Card className="shadow-sm h-100">
            <Card.Body>
              <Card.Title>
                <FaSms className="me-2" /> Current SMS Credits
              </Card.Title>
              {smsCredits && (
                <>
                  <h3 className="mt-3">{smsCredits.remaining_credits}</h3>
                  <Card.Text>
                    remaining credits
                  </Card.Text>
                  <hr />
                  <div className="d-flex justify-content-between">
                    <div>
                      <small className="text-muted">Total Credits:</small>
                      <p>{smsCredits.total_credits}</p>
                    </div>
                    <div>
                      <small className="text-muted">Used Credits:</small>
                      <p>{smsCredits.used_credits}</p>
                    </div>
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={8}>
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Purchase Additional SMS Credits</Card.Title>
              <Card.Text className="mb-4">
                Add more SMS credits to your account for sending text message notifications to your signers.
                The minimum purchase is 10 credits.
              </Card.Text>
              
              <Form>
                <Form.Group className="mb-4">
                  <Form.Label>Quick Selection</Form.Label>
                  <Row>
                    <Col xs={6} md={3} className="mb-2">
                      <Button 
                        variant="outline-primary" 
                        className="w-100"
                        onClick={() => handlePredefinedCredits(50)}
                      >
                        50 Credits
                      </Button>
                    </Col>
                    <Col xs={6} md={3} className="mb-2">
                      <Button 
                        variant="outline-primary" 
                        className="w-100"
                        onClick={() => handlePredefinedCredits(100)}
                      >
                        100 Credits
                      </Button>
                    </Col>
                    <Col xs={6} md={3} className="mb-2">
                      <Button 
                        variant="outline-primary" 
                        className="w-100"
                        onClick={() => handlePredefinedCredits(200)}
                      >
                        200 Credits
                      </Button>
                    </Col>
                    <Col xs={6} md={3} className="mb-2">
                      <Button 
                        variant="outline-primary" 
                        className="w-100"
                        onClick={() => handlePredefinedCredits(500)}
                      >
                        500 Credits
                      </Button>
                    </Col>
                  </Row>
                </Form.Group>
                
                <Form.Group className="mb-4">
                  <Form.Label>Custom Amount</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="number"
                      min="10"
                      step="1"
                      value={customCredits || ''}
                      onChange={handleCustomCreditsChange}
                      placeholder="Enter number of credits"
                    />
                    <InputGroup.Text>SMS Credits</InputGroup.Text>
                  </InputGroup>
                  <Form.Text className="text-muted">
                    Minimum purchase: 10 credits
                  </Form.Text>
                </Form.Group>
                
                <div className="bg-light p-3 rounded mb-4">
                  <div className="d-flex justify-content-between">
                    <h5>Total Cost:</h5>
                    <h5>{calculateCost()}</h5>
                  </div>
                  <small className="text-muted">
                    Rate: {formatCurrency(ratePerCredit)} per credit
                  </small>
                </div>
                
                <Button 
                  variant="primary" 
                  size="lg"
                  className="w-100"
                  onClick={handleTopUp}
                  disabled={processing || customCredits < 10}
                >
                  {processing ? (
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
                    `Purchase ${customCredits} SMS Credits`
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default SMSTopUp;
