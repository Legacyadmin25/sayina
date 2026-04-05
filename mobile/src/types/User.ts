export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  org_id: string;
  organization?: {
    id: string;
    name: string;
    logo_url?: string;
  };
  created_at: string;
  updated_at: string;
}
