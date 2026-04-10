import Link from 'next/link';
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function AccountPage() {
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const name = localStorage.getItem('sayina_user_name') || '';
    const email = localStorage.getItem('sayina_user_email') || '';
    setUserName(name);
    setUserEmail(email);
    setEditName(name);
    setEditEmail(email);
  }, []);

  const handleSaveProfile = () => {
    localStorage.setItem('sayina_user_name', editName);
    localStorage.setItem('sayina_user_email', editEmail);
    setUserName(editName);
    setUserEmail(editEmail);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <DashboardLayout title="Settings" activePage="account">
      <div className="max-w-2xl space-y-5">

        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Profile saved successfully.
          </div>
        )}

        {/* Profile */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#D4A832] flex items-center justify-center text-black font-bold">
                {userName ? userName[0].toUpperCase() : '?'}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Profile</h3>
                <p className="text-xs text-gray-400">Your name and email address</p>
              </div>
            </div>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-sm text-[#D4A832] hover:underline font-medium"
              >
                Edit
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A832] focus:border-transparent"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A832] focus:border-transparent"
                  placeholder="your@email.com"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSaveProfile}
                  className="bg-[#D4A832] hover:bg-[#c49a28] text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => { setEditing(false); setEditName(userName); setEditEmail(userEmail); }}
                  className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Full Name</p>
                <p className="text-gray-900 font-medium">{userName || <span className="text-gray-400 italic">Not set — click Edit to add</span>}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Email Address</p>
                <p className="text-gray-900 font-medium">{userEmail || <span className="text-gray-400 italic">Not set — click Edit to add</span>}</p>
              </div>
            </div>
          )}
        </div>

        {/* Subscription */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Subscription & Billing</h3>
              <p className="text-xs text-gray-400">Manage your plan</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Starter Plan — R150/month</p>
              <p className="text-sm text-gray-400 mt-0.5">0 of 5 envelopes used this month</p>
            </div>
            <Link href="/account/subscription">
              <button className="border border-gray-200 hover:border-[#D4A832] text-gray-700 hover:text-[#D4A832] font-medium px-4 py-2 rounded-lg text-sm transition-colors">
                Manage Plan
              </button>
            </Link>
          </div>
        </div>

        {/* SMS Credits */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">SMS Credits</h3>
              <p className="text-xs text-gray-400">For OTP verification on signatures</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Balance: —</p>
              <p className="text-sm text-gray-400 mt-0.5">Available on Basic plan and above</p>
            </div>
            <Link href="/account/sms-topup">
              <button className="border border-gray-200 hover:border-[#D4A832] text-gray-700 hover:text-[#D4A832] font-medium px-4 py-2 rounded-lg text-sm transition-colors">
                Top Up
              </button>
            </Link>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Security</h3>
              <p className="text-xs text-gray-400">Password and account protection</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-700">Password</p>
                <p className="text-xs text-gray-400">Last changed: unknown</p>
              </div>
              <a
                href={`mailto:support@sayina.co.za?subject=Password Reset Request&body=Please reset the password for my account: ${userEmail}`}
                className="border border-gray-200 hover:border-[#D4A832] text-gray-700 hover:text-[#D4A832] font-medium px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Reset via Email
              </a>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-700">Two-Factor Authentication</p>
                <p className="text-xs text-gray-400">Add an extra layer of security</p>
              </div>
              <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg font-medium">Coming Soon</span>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
