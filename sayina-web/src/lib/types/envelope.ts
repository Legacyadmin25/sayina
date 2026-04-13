// Shared types for envelope builder flow

export type SignerRole = 'signer' | 'cc' | 'viewer' | 'approver';

export const SIGNER_ROLE_LABELS: Record<SignerRole, string> = {
  signer:   'Must Sign',
  approver: 'Approver',
  cc:       'Receives a Copy',
  viewer:   'Read Only',
};

export interface Signer {
  name: string;
  email: string;
  phone: string;
  role: SignerRole;
}

export type FieldType = 'signature' | 'initials' | 'text' | 'date' | 'checkbox' | 'dropdown' | 'stamp';

export interface Field {
  id: string;
  type: FieldType;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  signerId: number;
  label?: string;       // optional label shown above the field
  required?: boolean;   // defaults to true
  options?: string[];   // for dropdown type
}

export interface EnvelopeData {
  id?: string | null;
  file: File | null;
  signers: Signer[];
  fields: Field[];
}

export interface EnvelopeState extends EnvelopeData {
  isLoading: boolean;
  error: string | null;
}

export interface Step1Props {
  data: EnvelopeData;
  onNext: (file: File) => void;
}

export interface Step2Props {
  data: EnvelopeData;
  onBack: () => void;
  onNext: (signers: Signer[]) => void;
}

export interface Step3Props {
  data: EnvelopeData;
  onBack: () => void;
  onNext: (fields: Field[]) => void;
}

export interface Step4Props {
  data: EnvelopeData;
  onBack: () => void;
  onSubmit: () => Promise<boolean>;
}
