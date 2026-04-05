// Shared types for envelope builder flow

export interface Signer {
  name: string;
  email: string;
  phone: string;
}

export interface Field {
  id: string;
  type: 'signature' | 'text' | 'date' | 'checkbox';
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  signerId: number;
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
