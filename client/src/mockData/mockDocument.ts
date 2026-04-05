interface Signer {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'pending' | 'signed' | 'declined';
  signedAt?: string;
  sentAt: string;
}

interface AuditTrail {
  id: string;
  action: string;
  userId: string;
  userName: string;
  timestamp: string;
  details: string;
}

interface Field {
  id: string;
  type: 'signature' | 'date' | 'text' | 'checkbox' | 'radio';
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  signerId: string;
  required: boolean;
  value?: string;
  label?: string;
}

interface Message {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
}

interface Document {
  id: string;
  title: string;
  status: 'draft' | 'pending' | 'completed' | 'declined' | 'expired';
  created: string;
  modified: string;
  size: string;
  pages: number;
  signers: Signer[];
  auditTrail: AuditTrail[];
  fields: Field[];
  messages: Message[];
}

const mockDocument: Document = {
  id: '1',
  title: 'Employment Contract.pdf',
  status: 'pending',
  created: '2023-05-10T09:30:00',
  modified: '2023-05-15T14:20:00',
  size: '2.4 MB',
  pages: 5,
  signers: [
    { 
      id: '1', 
      name: 'John Smith', 
      email: 'john.smith@example.com', 
      role: 'Signer 1', 
      status: 'signed', 
      signedAt: '2023-05-12T10:15:00',
      sentAt: '2023-05-10T09:35:00'
    },
    { 
      id: '2', 
      name: 'Jane Doe', 
      email: 'jane.doe@example.com', 
      role: 'Signer 2', 
      status: 'pending', 
      sentAt: '2023-05-10T09:35:00' 
    },
  ],
  auditTrail: [
    { 
      id: '1', 
      action: 'document_created', 
      userId: 'user1', 
      userName: 'You', 
      timestamp: '2023-05-10T09:30:00', 
      details: 'Document created' 
    },
    { 
      id: '2', 
      action: 'document_sent', 
      userId: 'user1', 
      userName: 'You', 
      timestamp: '2023-05-10T09:35:00', 
      details: 'Document sent for signature' 
    },
    { 
      id: '3', 
      action: 'document_viewed', 
      userId: '1', 
      userName: 'John Smith', 
      timestamp: '2023-05-11T14:20:00', 
      details: 'Document viewed by John Smith' 
    },
    { 
      id: '4', 
      action: 'document_signed', 
      userId: '1', 
      userName: 'John Smith', 
      timestamp: '2023-05-12T10:15:00', 
      details: 'Document signed by John Smith' 
    },
  ],
  fields: [
    { 
      id: '1', 
      type: 'signature', 
      page: 1, 
      x: 100, 
      y: 200, 
      width: 200, 
      height: 80, 
      signerId: '1', 
      required: true,
      value: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCAxMDAgNTAiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNmZmYiLz48cGF0aCBkPSJNMTAsMzVjMTAtMTUsMjAtMTUsMzAsMGMxMC0xNSwyMC0xNSwzMCwwIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIvPjwvc3ZnPg=='
    },
    { 
      id: '2', 
      type: 'date', 
      page: 1, 
      x: 350, 
      y: 200, 
      width: 150, 
      height: 40, 
      signerId: '1', 
      required: true, 
      value: '2023-05-12' 
    },
    { 
      id: '3', 
      type: 'text', 
      page: 1, 
      x: 100, 
      y: 350, 
      width: 200, 
      height: 40, 
      signerId: '1', 
      required: false, 
      label: 'Title', 
      value: 'Software Engineer' 
    },
    { 
      id: '4', 
      type: 'signature', 
      page: 2, 
      x: 100, 
      y: 200, 
      width: 200, 
      height: 80, 
      signerId: '2', 
      required: true 
    },
    { 
      id: '5', 
      type: 'date', 
      page: 2, 
      x: 350, 
      y: 200, 
      width: 150, 
      height: 40, 
      signerId: '2', 
      required: true 
    },
  ],
  messages: [
    { 
      id: '1', 
      userId: 'user1', 
      userName: 'You', 
      text: 'Please review and sign the document at your earliest convenience.', 
      timestamp: '2023-05-10T09:35:00' 
    },
    { 
      id: '2', 
      userId: '1', 
      userName: 'John Smith', 
      text: 'I have reviewed and signed the document. Thanks!', 
      timestamp: '2023-05-12T10:16:00' 
    },
  ],
};

export { mockDocument, type Document, type Signer, type Field, type Message, type AuditTrail };
