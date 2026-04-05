import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Container, Grid, Paper, Typography, useTheme } from '@mui/material';
import {
  Description as DocumentIcon,
  HowToReg as SignIcon,
  Group as TeamIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';

const features = [
  {
    icon: <DocumentIcon sx={{ fontSize: 60, color: 'primary.main' }} />,
    title: 'Easy Document Upload',
    description: 'Upload and prepare documents for signature in just a few clicks.',
  },
  {
    icon: <SignIcon sx={{ fontSize: 60, color: 'primary.main' }} />,
    title: 'Secure eSignatures',
    description: 'Legally binding signatures with full audit trail and compliance.',
  },
  {
    icon: <TeamIcon sx={{ fontSize: 60, color: 'primary.main' }} />,
    title: 'Team Collaboration',
    description: 'Work together with your team on important documents.',
  },
  {
    icon: <SecurityIcon sx={{ fontSize: 60, color: 'primary.main' }} />,
    title: 'Bank-Level Security',
    description: 'Your documents are protected with enterprise-grade security.',
  },
];

export default function HomePage() {
  const theme = useTheme();

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          pt: 15,
          pb: 10,
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h2" component="h1" gutterBottom>
            The Fastest Way to Sign Documents Online
          </Typography>
          <Typography variant="h5" sx={{ mb: 4, opacity: 0.9 }}>
            Secure, legally binding eSignatures for businesses of all sizes. No credit card required to start.
          </Typography>
          <Box sx={{ mt: 4, '& > *:not(:last-child)': { mr: 2 } }}>
            <Button
              component={RouterLink}
              to="/register"
              variant="contained"
              color="secondary"
              size="large"
            >
              Get Started Free
            </Button>
            <Button
              component={RouterLink}
              to="/login"
              variant="outlined"
              color="inherit"
              size="large"
              sx={{ color: 'white', borderColor: 'white' }}
            >
              Sign In
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" align="center" gutterBottom>
          Everything You Need to Go Paperless
        </Typography>
        <Typography variant="h6" align="center" color="textSecondary" paragraph sx={{ mb: 8 }}>
          Powerful features to streamline your document workflow
        </Typography>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  border: `1px solid ${theme.palette.grey[200]}`,
                  '&:hover': {
                    boxShadow: theme.shadows[4],
                    transform: 'translateY(-4px)',
                    transition: 'all 0.3s ease-in-out',
                  },
                }}
              >
                {feature.icon}
                <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 500 }}>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {feature.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box bgcolor="grey.100" py={10} mt={8}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom>
            Ready to get started?
          </Typography>
          <Typography variant="h6" color="textSecondary" paragraph sx={{ mb: 4 }}>
            Join thousands of businesses that trust Sayina for their document signing needs.
          </Typography>
          <Button
            component={RouterLink}
            to="/register"
            variant="contained"
            color="primary"
            size="large"
          >
            Start Your Free Trial
          </Button>
        </Container>
      </Box>
    </Box>
  );
}
