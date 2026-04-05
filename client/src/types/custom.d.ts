// Type declarations for libraries without existing TypeScript definitions

declare module 'react-bootstrap' {
  export const Card: any;
  export const Button: any;
  export const ProgressBar: any;
  export const Alert: any;
  export const Spinner: any;
  export const Container: any;
  export const Row: any;
  export const Col: any;
  export const Modal: any;
  export const Badge: any;
  export const Table: any;
  export const Pagination: any;
  export const Form: any;
  export const InputGroup: any;
}

declare module 'react-icons/fa' {
  export const FaCheck: any;
  export const FaTimes: any;
  export const FaFileSignature: any;
  export const FaSms: any;
  export const FaCreditCard: any;
  export const FaCalendarAlt: any;
  export const FaArrowLeft: any;
}

declare module 'react-toastify' {
  export const toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    warning: (message: string) => void;
  };
}
