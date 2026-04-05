import { AppState, AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const AUTO_LOCK_ENABLED_KEY = 'autoLockEnabled';
const AUTO_LOCK_TIMEOUT_KEY = 'autoLockTimeoutMinutes';
const LAST_ACTIVE_TIME_KEY = 'lastActiveTime';

/**
 * Security Service for managing app security features
 * - Auto lock with biometric authentication
 * - Idle timeout tracking
 */
class SecurityService {
  private static instance: SecurityService;
  private appStateSubscription: any;
  private autoLockEnabled: boolean = true;
  private autoLockTimeoutMinutes: number = 5; // Default: 5 minutes
  private lastActiveTime: number = Date.now();
  private isLocked: boolean = false;
  private lockListeners: ((locked: boolean) => void)[] = [];
  private lockCheckInterval: NodeJS.Timeout | null = null;
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.initialize();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }
  
  /**
   * Initialize security service
   */
  private async initialize() {
    try {
      // Load saved settings
      const enabledStr = await AsyncStorage.getItem(AUTO_LOCK_ENABLED_KEY);
      const timeoutStr = await AsyncStorage.getItem(AUTO_LOCK_TIMEOUT_KEY);
      
      // Set values from storage or use defaults
      this.autoLockEnabled = enabledStr === null ? true : enabledStr === 'true';
      this.autoLockTimeoutMinutes = timeoutStr ? parseInt(timeoutStr, 10) : 5;
      
      // Start monitoring app state
      this.startAppStateMonitoring();
      
      // Start periodic lock check
      this.startLockCheck();
      
      console.log('Security service initialized:', {
        autoLockEnabled: this.autoLockEnabled,
        timeoutMinutes: this.autoLockTimeoutMinutes
      });
    } catch (error) {
      console.error('Error initializing security service:', error);
    }
  }
  
  /**
   * Start monitoring app state changes
   */
  private startAppStateMonitoring() {
    // Remove existing subscription if any
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    
    // Monitor app state changes
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }
  
  /**
   * Handle app state changes
   */
  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // App came to foreground
      const currentTime = Date.now();
      const lastActiveTime = this.lastActiveTime;
      const idleTimeMs = currentTime - lastActiveTime;
      const idleTimeMinutes = idleTimeMs / (1000 * 60);
      
      console.log(`App resumed. Idle time: ${idleTimeMinutes.toFixed(2)} minutes`);
      
      // Check if we need to lock based on idle time
      if (this.autoLockEnabled && idleTimeMinutes >= this.autoLockTimeoutMinutes) {
        this.setLocked(true);
      }
      
      // Update last active time
      this.updateLastActiveTime();
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      // App went to background - store the timestamp
      this.updateLastActiveTime();
    }
  };
  
  /**
   * Update the last active time
   */
  public updateLastActiveTime() {
    this.lastActiveTime = Date.now();
    // Store in AsyncStorage for persistence across app restarts
    AsyncStorage.setItem(LAST_ACTIVE_TIME_KEY, this.lastActiveTime.toString()).catch(error => {
      console.error('Error saving last active time:', error);
    });
  }
  
  /**
   * Start periodic lock check
   */
  private startLockCheck() {
    // Clear existing interval if any
    if (this.lockCheckInterval) {
      clearInterval(this.lockCheckInterval);
    }
    
    // Check every minute if the app should be locked
    this.lockCheckInterval = setInterval(() => {
      if (AppState.currentState === 'active' && this.autoLockEnabled) {
        const currentTime = Date.now();
        const idleTimeMs = currentTime - this.lastActiveTime;
        const idleTimeMinutes = idleTimeMs / (1000 * 60);
        
        if (idleTimeMinutes >= this.autoLockTimeoutMinutes) {
          this.setLocked(true);
        }
      }
    }, 60000); // Check every minute
  }
  
  /**
   * Stop periodic lock check
   */
  private stopLockCheck() {
    if (this.lockCheckInterval) {
      clearInterval(this.lockCheckInterval);
      this.lockCheckInterval = null;
    }
  }
  
  /**
   * Set whether auto-lock is enabled
   */
  public async setAutoLockEnabled(enabled: boolean): Promise<void> {
    this.autoLockEnabled = enabled;
    await AsyncStorage.setItem(AUTO_LOCK_ENABLED_KEY, enabled.toString());
    
    // Restart lock check if enabled
    if (enabled) {
      this.startLockCheck();
    } else {
      this.stopLockCheck();
    }
    
    console.log('Auto lock enabled:', enabled);
  }
  
  /**
   * Get whether auto-lock is enabled
   */
  public isAutoLockEnabled(): boolean {
    return this.autoLockEnabled;
  }
  
  /**
   * Set auto-lock timeout in minutes
   */
  public async setAutoLockTimeout(minutes: number): Promise<void> {
    if (minutes < 1) minutes = 1; // Minimum 1 minute
    this.autoLockTimeoutMinutes = minutes;
    await AsyncStorage.setItem(AUTO_LOCK_TIMEOUT_KEY, minutes.toString());
    console.log('Auto lock timeout set to', minutes, 'minutes');
  }
  
  /**
   * Get auto-lock timeout in minutes
   */
  public getAutoLockTimeout(): number {
    return this.autoLockTimeoutMinutes;
  }
  
  /**
   * Set the lock state
   */
  public setLocked(locked: boolean): void {
    this.isLocked = locked;
    
    // Notify listeners
    this.lockListeners.forEach(listener => {
      listener(locked);
    });
    
    console.log('App lock state:', locked ? 'LOCKED' : 'UNLOCKED');
  }
  
  /**
   * Get the current lock state
   */
  public getLockState(): boolean {
    return this.isLocked;
  }
  
  /**
   * Add a lock state change listener
   * @returns Function to remove the listener
   */
  public addLockListener(listener: (locked: boolean) => void): () => void {
    this.lockListeners.push(listener);
    
    // Return function to remove listener
    return () => {
      this.lockListeners = this.lockListeners.filter(l => l !== listener);
    };
  }
  
  /**
   * Unlock the app using biometric authentication
   * @returns Promise resolving to true if unlock was successful
   */
  public async unlockWithBiometrics(): Promise<boolean> {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        console.warn('Device does not have biometric hardware');
        // Fall back to a successful unlock
        this.setLocked(false);
        return true;
      }
      
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        console.warn('No biometrics enrolled on this device');
        // Fall back to a successful unlock
        this.setLocked(false);
        return true;
      }
      
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to unlock Sayina',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Passcode',
      });
      
      if (result.success) {
        this.setLocked(false);
        this.updateLastActiveTime(); // Reset the timer
        return true;
      }
      
      console.log('Biometric authentication failed:', result);
      return false;
    } catch (error) {
      console.error('Error during biometric authentication:', error);
      return false;
    }
  }
  
  /**
   * Force a lock check and lock if idle time exceeds timeout
   */
  public checkLockStatus(): void {
    if (!this.autoLockEnabled) return;
    
    const currentTime = Date.now();
    const idleTimeMs = currentTime - this.lastActiveTime;
    const idleTimeMinutes = idleTimeMs / (1000 * 60);
    
    if (idleTimeMinutes >= this.autoLockTimeoutMinutes) {
      this.setLocked(true);
    }
  }
  
  /**
   * Clean up resources
   */
  public cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    
    this.stopLockCheck();
  }
}

export default SecurityService.getInstance();
