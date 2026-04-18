import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Step2Props, Signer, SignerRole, SIGNER_ROLE_LABELS } from '@/lib/types/envelope';

const RECENT_CONTACTS_KEY = 'sayina_recent_contacts';
const MAX_RECENT_CONTACTS = 20;

interface SavedContact {
  name: string;
  email: string;
  phone: string;
}

function loadRecentContacts(): SavedContact[] {
  try {
    const raw = localStorage.getItem(RECENT_CONTACTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveContactToRecents(contact: SavedContact) {
  try {
    const contacts = loadRecentContacts();
    // Remove duplicate email entries, add new one at top
    const filtered = contacts.filter(c => c.email.toLowerCase() !== contact.email.toLowerCase());
    const updated = [contact, ...filtered].slice(0, MAX_RECENT_CONTACTS);
    localStorage.setItem(RECENT_CONTACTS_KEY, JSON.stringify(updated));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

const ROLE_ICONS: Record<SignerRole, string> = {
  signer:   '✍️',
  approver: '✅',
  cc:       '📋',
  viewer:   '👁️',
};

export default function Step2Signers({ data, onBack, onNext }: Step2Props) {
  const [signers, setSigners] = useState<Signer[]>(
    data.signers.length > 0 ? data.signers : [{ name: '', email: '', phone: '', role: 'signer' }]
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [recentContacts, setRecentContacts] = useState<SavedContact[]>([]);
  const [pickerOpenIndex, setPickerOpenIndex] = useState<number | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecentContacts(loadRecentContacts());
  }, []);

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpenIndex(null);
        setPickerSearch('');
      }
    }
    if (pickerOpenIndex !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [pickerOpenIndex]);

  const filteredContacts = recentContacts.filter(c => {
    const q = pickerSearch.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });

  const applyContact = (index: number, contact: SavedContact) => {
    const updatedSigners = [...signers];
    updatedSigners[index] = {
      ...updatedSigners[index],
      name: contact.name,
      email: contact.email,
      phone: contact.phone || '',
    };
    setSigners(updatedSigners);
    setPickerOpenIndex(null);
    setPickerSearch('');
  };

  const addSigner = () => {
    setSigners([...signers, { name: '', email: '', phone: '', role: 'signer' }]);
  };

  const removeSigner = (index: number) => {
    if (signers.length > 1) {
      const updatedSigners = [...signers];
      updatedSigners.splice(index, 1);
      setSigners(updatedSigners);
    }
  };

  const updateSigner = (index: number, field: keyof Signer, value: string | SignerRole) => {
    const updatedSigners = [...signers];
    updatedSigners[index] = { ...updatedSigners[index], [field]: value };
    setSigners(updatedSigners);
  };

  const validateSigners = () => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    signers.forEach((signer, index) => {
      if (!signer.name.trim()) {
        newErrors[`name-${index}`] = 'Name is required';
        isValid = false;
      }

      if (!signer.email.trim()) {
        newErrors[`email-${index}`] = 'Email is required';
        isValid = false;
      } else if (!/\S+@\S+\.\S+/.test(signer.email)) {
        newErrors[`email-${index}`] = 'Invalid email format';
        isValid = false;
      }

      if (signer.phone && !/^(\+\d{1,3})?\d{9,10}$/.test(signer.phone.replace(/\s+/g, ''))) {
        newErrors[`phone-${index}`] = 'Invalid phone format';
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleNext = () => {
    if (validateSigners()) {
      // Save valid signers to recent contacts
      signers.forEach(s => {
        if (s.name.trim() && s.email.trim()) {
          saveContactToRecents({ name: s.name.trim(), email: s.email.trim(), phone: s.phone?.trim() || '' });
        }
      });
      onNext(signers);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Step 2: Add Signers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {signers.map((signer, index) => (
            <div key={index} className="p-4 border border-secondary-200 rounded-lg relative">
              {signers.length > 1 && (
                <button
                  onClick={() => removeSigner(index)}
                  className="absolute top-2 right-2 text-secondary-400 hover:text-secondary-600"
                  aria-label="Remove signer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}

              {/* Role selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Recipient Role
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(SIGNER_ROLE_LABELS) as SignerRole[]).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => updateSigner(index, 'role', role)}
                      className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                        (signer.role || 'signer') === role
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-secondary-200 text-secondary-600 hover:bg-secondary-50'
                      }`}
                    >
                      <span className="text-base">{ROLE_ICONS[role]}</span>
                      <span>{SIGNER_ROLE_LABELS[role]}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-secondary-400">
                  {(signer.role || 'signer') === 'signer'   && 'This person must sign the document before it is complete.'}
                  {signer.role === 'approver' && 'This person must approve the document before signers are notified.'}
                  {signer.role === 'cc'       && 'This person receives a copy by email but does not sign.'}
                  {signer.role === 'viewer'   && 'This person can view the document but takes no action.'}
                </p>
              </div>

              {/* Contact picker */}
              {recentContacts.length > 0 && (
                <div className="relative mb-3" ref={pickerOpenIndex === index ? pickerRef : undefined}>
                  <button
                    type="button"
                    onClick={() => {
                      setPickerOpenIndex(pickerOpenIndex === index ? null : index);
                      setPickerSearch('');
                    }}
                    className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 font-medium"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    Choose from recent contacts
                  </button>

                  {pickerOpenIndex === index && (
                    <div className="absolute top-6 left-0 z-20 w-72 bg-white border border-secondary-200 rounded-lg shadow-lg overflow-hidden">
                      <div className="p-2 border-b border-secondary-100">
                        <input
                          type="text"
                          value={pickerSearch}
                          onChange={e => setPickerSearch(e.target.value)}
                          placeholder="Search contacts..."
                          className="w-full text-sm px-2 py-1.5 border border-secondary-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-400"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredContacts.length === 0 ? (
                          <p className="px-3 py-3 text-xs text-secondary-400">No contacts found</p>
                        ) : (
                          filteredContacts.map((contact, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => applyContact(index, contact)}
                              className="w-full text-left px-3 py-2 hover:bg-secondary-50 transition-colors"
                            >
                              <div className="text-sm font-medium text-secondary-800">{contact.name}</div>
                              <div className="text-xs text-secondary-400">{contact.email}</div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <Input
                  label={`Recipient ${index + 1} Name`}
                  value={signer.name}
                  onChange={(e) => updateSigner(index, 'name', e.target.value)}
                  error={errors[`name-${index}`]}
                  fullWidth
                />
                <Input
                  label="Email Address"
                  type="email"
                  value={signer.email}
                  onChange={(e) => updateSigner(index, 'email', e.target.value)}
                  error={errors[`email-${index}`]}
                  fullWidth
                />
                {/* Phone only needed for Must Sign / Approver */}
                {(!signer.role || signer.role === 'signer' || signer.role === 'approver') && (
                  <Input
                    label="Phone Number (for SMS OTP verification)"
                    type="tel"
                    value={signer.phone}
                    onChange={(e) => updateSigner(index, 'phone', e.target.value)}
                    error={errors[`phone-${index}`]}
                    helperText="Optional, but required for SMS OTP verification"
                    leftAddon={<span className="text-sm">+27</span>}
                    fullWidth
                  />
                )}
              </div>
            </div>
          ))}

          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={addSigner}
              className="flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Another Signer
            </Button>
          </div>

          <div className="mt-6 flex justify-between">
            <Button variant="secondary" onClick={onBack}>
              Back
            </Button>
            <Button onClick={handleNext}>
              Next: Place Fields
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
