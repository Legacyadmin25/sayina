import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface InstallPromptProps {
  className?: string;
}

/**
 * InstallPrompt component shows customized installation banners based on the user's platform
 * (iOS, Android, Desktop) and provides guidance on how to install the PWA.
 */
const InstallPrompt: React.FC<InstallPromptProps> = ({ className }) => {
  const { t } = useTranslation('common');
  const [showPrompt, setShowPrompt] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'huawei' | 'desktop' | null>(null);
  const [installEvent, setInstallEvent] = useState<any>(null);

  // Hide the prompt for 30 days if dismissed
  const dismissPrompt = () => {
    setShowPrompt(false);
    localStorage.setItem('pwaPromptDismissed', Date.now().toString());
  };

  // Trigger installation from the stored beforeinstallprompt event
  const installPwa = async () => {
    if (installEvent) {
      installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
    }
  };

  useEffect(() => {
    // Check if the app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Check if the prompt has been dismissed in the last 30 days
    const lastDismissed = localStorage.getItem('pwaPromptDismissed');
    if (lastDismissed) {
      const dismissedTime = parseInt(lastDismissed, 10);
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < thirtyDaysInMs) {
        return;
      }
    }

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
      setShowPrompt(true);
    } else if (/huawei/.test(userAgent)) {
      setPlatform('huawei');
      setShowPrompt(true);
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
      setShowPrompt(true);
    } else {
      setPlatform('desktop');
    }

    // Listen for beforeinstallprompt event (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallEvent(e);
      
      if (platform === 'desktop' || platform === 'android') {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [platform]);

  if (!showPrompt) {
    return null;
  }

  return (
    <Card className={`p-4 relative ${className}`}>
      <button 
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100" 
        onClick={dismissPrompt}
        aria-label={t('close')}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      
      <div className="flex items-center">
        <div className="mr-4">
          <img src="/logo.png" alt="Sayina Logo" className="w-12 h-12" />
        </div>
        
        <div className="flex-1">
          <h4 className="text-lg font-semibold mb-1">
            {t('install_app_title', 'Install Sayina E-Signature')}
          </h4>
          
          <p className="text-sm text-gray-700 mb-3">
            {platform === 'ios' && t('install_ios_instructions', 'Tap the share icon and then "Add to Home Screen" to install Sayina for offline use.')}
            {platform === 'android' && t('install_android_instructions', 'Tap "Install" to add Sayina to your home screen for offline use.')}
            {platform === 'huawei' && t('install_huawei_instructions', 'Tap "Install" to add Sayina to your home screen for offline use.')}
            {platform === 'desktop' && t('install_desktop_instructions', 'Click "Install" to add Sayina to your desktop for quicker access.')}
          </p>
          
          {(platform === 'android' || platform === 'desktop' || platform === 'huawei') && installEvent && (
            <Button 
              onClick={installPwa} 
              variant="default"
              size="sm"
            >
              {t('install_now', 'Install Now')}
            </Button>
          )}
          
          {platform === 'ios' && (
            <div className="flex items-center text-sm text-gray-600">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
              </svg>
              <span>{t('tap_share_then', 'Tap Share then')}</span>
              <svg className="w-5 h-5 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              <span>{t('add_to_home_screen', 'Add to Home Screen')}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default InstallPrompt;
