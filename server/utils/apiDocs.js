const fs = require('fs');
const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

/**
 * Generate OpenAPI documentation
 * @returns {Object} - Swagger specification
 */
const generateApiDocs = () => {
  const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Sayina E-Signature API',
        version: '1.0.0',
        description: 'API documentation for the Sayina E-Signature Service',
        contact: {
          name: 'Sayina Support',
          email: 'support@sayina.co.za',
          url: 'https://sayina.co.za'
        },
        license: {
          name: 'Proprietary',
          url: 'https://sayina.co.za/terms'
        }
      },
      servers: [
        {
          url: process.env.API_URL || 'http://localhost:5000',
          description: 'Sayina API Server'
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          },
          apiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-KEY'
          }
        },
        schemas: {
          Error: {
            type: 'object',
            properties: {
              success: {
                type: 'boolean',
                example: false
              },
              message: {
                type: 'string',
                example: 'Error message'
              },
              errors: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    param: {
                      type: 'string',
                      example: 'email'
                    },
                    msg: {
                      type: 'string',
                      example: 'Invalid email format'
                    },
                    location: {
                      type: 'string',
                      example: 'body'
                    }
                  }
                }
              }
            }
          },
          User: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                example: '123e4567-e89b-12d3-a456-426614174000'
              },
              email: {
                type: 'string',
                format: 'email',
                example: 'user@example.com'
              },
              first_name: {
                type: 'string',
                example: 'John'
              },
              last_name: {
                type: 'string',
                example: 'Doe'
              },
              phone: {
                type: 'string',
                example: '+27721234567'
              },
              role: {
                type: 'string',
                enum: ['user', 'org_admin', 'system_admin'],
                example: 'user'
              },
              is_active: {
                type: 'boolean',
                example: true
              },
              is_email_verified: {
                type: 'boolean',
                example: true
              },
              is_phone_verified: {
                type: 'boolean',
                example: false
              },
              two_factor_enabled: {
                type: 'boolean',
                example: false
              },
              two_factor_method: {
                type: 'string',
                enum: ['sms', 'email', null],
                example: null
              },
              created_at: {
                type: 'string',
                format: 'date-time',
                example: '2023-01-01T00:00:00Z'
              }
            }
          },
          Organization: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                example: '123e4567-e89b-12d3-a456-426614174000'
              },
              name: {
                type: 'string',
                example: 'Acme Inc'
              },
              email: {
                type: 'string',
                format: 'email',
                example: 'info@acme.com'
              },
              phone: {
                type: 'string',
                example: '+27721234567'
              },
              address: {
                type: 'string',
                example: '123 Main St'
              },
              city: {
                type: 'string',
                example: 'Cape Town'
              },
              state: {
                type: 'string',
                example: 'Western Cape'
              },
              postal_code: {
                type: 'string',
                example: '8001'
              },
              country: {
                type: 'string',
                example: 'South Africa'
              },
              logo_path: {
                type: 'string',
                example: '/uploads/logos/acme-logo.png'
              },
              primary_color: {
                type: 'string',
                example: '#3a86ff'
              },
              secondary_color: {
                type: 'string',
                example: '#ff006e'
              },
              sms_credits: {
                type: 'integer',
                example: 100
              },
              created_at: {
                type: 'string',
                format: 'date-time',
                example: '2023-01-01T00:00:00Z'
              }
            }
          },
          Envelope: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                example: '123e4567-e89b-12d3-a456-426614174000'
              },
              name: {
                type: 'string',
                example: 'Contract Agreement'
              },
              message: {
                type: 'string',
                example: 'Please sign this contract agreement.'
              },
              status: {
                type: 'string',
                enum: ['draft', 'sent', 'delivered', 'completed', 'declined', 'voided', 'expired'],
                example: 'draft'
              },
              expiry_days: {
                type: 'integer',
                example: 30
              },
              created_by: {
                type: 'string',
                format: 'uuid',
                example: '123e4567-e89b-12d3-a456-426614174000'
              },
              created_at: {
                type: 'string',
                format: 'date-time',
                example: '2023-01-01T00:00:00Z'
              },
              completed_at: {
                type: 'string',
                format: 'date-time',
                example: null
              }
            }
          },
          Document: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                example: '123e4567-e89b-12d3-a456-426614174000'
              },
              envelope_id: {
                type: 'string',
                format: 'uuid',
                example: '123e4567-e89b-12d3-a456-426614174000'
              },
              name: {
                type: 'string',
                example: 'Contract.pdf'
              },
              file_path: {
                type: 'string',
                example: '/uploads/documents/contract-123.pdf'
              },
              file_size: {
                type: 'integer',
                example: 1024000
              },
              page_count: {
                type: 'integer',
                example: 5
              },
              created_by: {
                type: 'string',
                format: 'uuid',
                example: '123e4567-e89b-12d3-a456-426614174000'
              },
              created_at: {
                type: 'string',
                format: 'date-time',
                example: '2023-01-01T00:00:00Z'
              }
            }
          },
          Signer: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                example: '123e4567-e89b-12d3-a456-426614174000'
              },
              envelope_id: {
                type: 'string',
                format: 'uuid',
                example: '123e4567-e89b-12d3-a456-426614174000'
              },
              name: {
                type: 'string',
                example: 'John Doe'
              },
              email: {
                type: 'string',
                format: 'email',
                example: 'john@example.com'
              },
              phone: {
                type: 'string',
                example: '+27721234567'
              },
              role: {
                type: 'string',
                enum: ['signer', 'approver', 'viewer', 'cc'],
                example: 'signer'
              },
              signing_order: {
                type: 'integer',
                example: 1
              },
              status: {
                type: 'string',
                enum: ['pending', 'delivered', 'signed', 'declined'],
                example: 'pending'
              },
              message: {
                type: 'string',
                example: 'Please sign this document'
              },
              access_token: {
                type: 'string',
                example: '1a2b3c4d5e6f7g8h9i0j'
              },
              signed_at: {
                type: 'string',
                format: 'date-time',
                example: null
              },
              created_at: {
                type: 'string',
                format: 'date-time',
                example: '2023-01-01T00:00:00Z'
              }
            }
          },
          Field: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                example: '123e4567-e89b-12d3-a456-426614174000'
              },
              document_id: {
                type: 'string',
                format: 'uuid',
                example: '123e4567-e89b-12d3-a456-426614174000'
              },
              envelope_id: {
                type: 'string',
                format: 'uuid',
                example: '123e4567-e89b-12d3-a456-426614174000'
              },
              signer_id: {
                type: 'string',
                format: 'uuid',
                example: '123e4567-e89b-12d3-a456-426614174000'
              },
              type: {
                type: 'string',
                enum: ['signature', 'initial', 'date', 'text', 'checkbox', 'dropdown', 'radio', 'attachment', 'payment', 'name', 'email', 'company', 'title'],
                example: 'signature'
              },
              page: {
                type: 'integer',
                example: 1
              },
              x_position: {
                type: 'number',
                example: 100.5
              },
              y_position: {
                type: 'number',
                example: 200.5
              },
              width: {
                type: 'number',
                example: 150.0
              },
              height: {
                type: 'number',
                example: 50.0
              },
              required: {
                type: 'boolean',
                example: true
              },
              label: {
                type: 'string',
                example: 'Signature'
              },
              value: {
                type: 'string',
                example: null
              },
              created_at: {
                type: 'string',
                format: 'date-time',
                example: '2023-01-01T00:00:00Z'
              },
              completed_at: {
                type: 'string',
                format: 'date-time',
                example: null
              }
            }
          },
          Plan: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                example: '123e4567-e89b-12d3-a456-426614174000'
              },
              name: {
                type: 'string',
                example: 'Professional'
              },
              description: {
                type: 'string',
                example: 'For small to medium businesses'
              },
              price: {
                type: 'integer',
                example: 29900
              },
              currency: {
                type: 'string',
                example: 'ZAR'
              },
              billing_cycle: {
                type: 'string',
                enum: ['monthly', 'yearly', 'once'],
                example: 'monthly'
              },
              envelope_limit: {
                type: 'integer',
                example: 100
              },
              sms_credits: {
                type: 'integer',
                example: 50
              },
              custom_branding: {
                type: 'boolean',
                example: true
              },
              remove_watermark: {
                type: 'boolean',
                example: true
              },
              api_access: {
                type: 'boolean',
                example: false
              },
              priority_support: {
                type: 'boolean',
                example: false
              },
              is_active: {
                type: 'boolean',
                example: true
              }
            }
          },
          Subscription: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                example: '123e4567-e89b-12d3-a456-426614174000'
              },
              org_id: {
                type: 'string',
                format: 'uuid',
                example: '123e4567-e89b-12d3-a456-426614174000'
              },
              plan_id: {
                type: 'string',
                format: 'uuid',
                example: '123e4567-e89b-12d3-a456-426614174000'
              },
              status: {
                type: 'string',
                enum: ['active', 'cancelled', 'expired', 'pending'],
                example: 'active'
              },
              start_date: {
                type: 'string',
                format: 'date-time',
                example: '2023-01-01T00:00:00Z'
              },
              next_billing_date: {
                type: 'string',
                format: 'date-time',
                example: '2023-02-01T00:00:00Z'
              },
              payfast_token: {
                type: 'string',
                example: 'pft_1a2b3c4d5e6f7g8h9i0j'
              },
              created_at: {
                type: 'string',
                format: 'date-time',
                example: '2023-01-01T00:00:00Z'
              }
            }
          }
        }
      },
      tags: [
        {
          name: 'Auth',
          description: 'Authentication and authorization endpoints'
        },
        {
          name: 'Users',
          description: 'User management endpoints'
        },
        {
          name: 'Organizations',
          description: 'Organization management endpoints'
        },
        {
          name: 'Envelopes',
          description: 'Envelope management endpoints'
        },
        {
          name: 'Documents',
          description: 'Document management endpoints'
        },
        {
          name: 'Signers',
          description: 'Signer management endpoints'
        },
        {
          name: 'Fields',
          description: 'Field management endpoints'
        },
        {
          name: 'OTP',
          description: 'One-time password endpoints'
        },
        {
          name: 'Billing',
          description: 'Billing and subscription endpoints'
        },
        {
          name: 'Webhooks',
          description: 'Webhook endpoints'
        }
      ],
      security: [
        {
          bearerAuth: []
        }
      ]
    },
    apis: [
      path.join(__dirname, '../routes/*.js'),
      path.join(__dirname, '../controllers/*.js')
    ]
  };

  return swaggerJsdoc(options);
};

/**
 * Set up Swagger UI
 * @param {Object} app - Express app
 */
const setupSwaggerUI = (app) => {
  const swaggerSpec = generateApiDocs();
  
  // Serve Swagger UI
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  
  // Serve Swagger spec as JSON
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  
  // Save Swagger spec to file
  const outputPath = path.join(__dirname, '../../docs/swagger.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2));
  
  console.log('API documentation available at /api/docs');
};

module.exports = {
  generateApiDocs,
  setupSwaggerUI
};
