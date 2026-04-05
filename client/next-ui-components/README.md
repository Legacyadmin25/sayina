# Sayina E-Signature: Next.js UI Components

This directory contains the foundational UI components for the Sayina E-Signature Service's migration from React/Vite/Material UI to Next.js/Tailwind CSS. These components are designed to be shared between the web and mobile applications, ensuring a consistent user experience across all platforms.

## Migration Overview

The Sayina E-Signature Service is being migrated to a hybrid architecture with:

- **Web**: Next.js PWA with Tailwind CSS
- **Mobile**: Expo/React Native with NativeWind
- **Shared Components**: Common UI elements and business logic

The migration follows the plan outlined in `../migration-plan.md`, with a phased approach to ensure minimal disruption to the existing service.

## Component Library

This directory contains the core UI components that will be used across the application:

- **Button.tsx**: A versatile button component with various styles, sizes, and states
- **Input.tsx**: Form input component with validation, helper text, and addon support
- **Card.tsx**: Card component with header, content, and footer sections
- **Modal.tsx**: Modal dialog for various interactions
- **PDFViewer.tsx**: PDF viewer component with annotation tools and field detection

## Dashboard Example

The `Dashboard.tsx` file provides a complete example of how to use these components to build a page in the new architecture. It demonstrates:

1. Responsive layout with Tailwind CSS
2. Component composition
3. Data fetching and state management
4. Loading states and error handling

## Getting Started

To use these components in the Next.js project:

1. Install the required dependencies:
   ```bash
   npm install class-variance-authority clsx tailwind-merge
   ```

2. Copy the components to your Next.js project's components directory

3. Configure Tailwind CSS with the appropriate theme settings

4. Import and use the components in your pages

## Next Steps

1. Complete the remaining UI components as outlined in the migration plan
2. Set up the Next.js project structure
3. Implement the shared state management
4. Configure PWA capabilities
5. Set up the Expo/React Native project with NativeWind

## South African Compliance

These components are designed with South African compliance requirements in mind, including:

- ECT Act 25/2002 compliance
- POPIA compliance
- Accessibility standards

## AI Features Integration

The components are prepared for integration with AI features:

- Smart field detection in PDFViewer
- Document summarization
- Natural language processing
- Multilingual support
