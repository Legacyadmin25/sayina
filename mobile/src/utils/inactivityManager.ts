import { AppState, AppStateStatus } from 'react-native';

// Default timeout in milliseconds (5 minutes)
const DEFAULT_TIMEOUT = 5 * 60 * 1000;

export interface InactivityManagerOptions {
  timeoutMs?: number;
  onTimeout: () => void;
  debug?: boolean;
}

/**
 * InactivityManager tracks application activity and triggers a callback
 * when the app has been inactive for a specified amount of time
 */
class InactivityManager {
  private timeoutMs: number;
  private onTimeout: () => void;
  private timeoutId: NodeJS.Timeout | null = null;
  private lastActiveTimestamp: number;
  private isActive: boolean = true;
  private debug: boolean;
  private appStateSubscription: any = null;

  constructor(options: InactivityManagerOptions) {
    this.timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT;
    this.onTimeout = options.onTimeout;
    this.debug = options.debug || false;
    this.lastActiveTimestamp = Date.now();
    
    this.resetTimer = this.resetTimer.bind(this);
    this.handleAppStateChange = this.handleAppStateChange.bind(this);
  }

  /**
   * Start tracking inactivity
   */
  public start(): void {
    if (this.debug) console.log('[InactivityManager] Starting inactivity tracking');
    
    this.resetTimer();
    
    // Subscribe to app state changes
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  /**
   * Stop tracking inactivity
   */
  public stop(): void {
    if (this.debug) console.log('[InactivityManager] Stopping inactivity tracking');
    
    this.clearTimer();
    
    // Unsubscribe from app state changes
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }

  /**
   * Reset the inactivity timer
   */
  public resetTimer(): void {
    this.clearTimer();
    
    this.lastActiveTimestamp = Date.now();
    this.isActive = true;
    
    this.timeoutId = setTimeout(() => {
      if (this.debug) console.log('[InactivityManager] Timeout triggered');
      this.isActive = false;
      this.onTimeout();
    }, this.timeoutMs);
    
    if (this.debug) console.log('[InactivityManager] Timer reset');
  }

  /**
   * Check if the app is considered active
   */
  public isUserActive(): boolean {
    return this.isActive;
  }

  /**
   * Get the time remaining before timeout in milliseconds
   */
  public getTimeRemaining(): number {
    const elapsed = Date.now() - this.lastActiveTimestamp;
    return Math.max(0, this.timeoutMs - elapsed);
  }

  /**
   * Update the timeout duration
   */
  public updateTimeout(timeoutMs: number): void {
    this.timeoutMs = timeoutMs;
    this.resetTimer();
  }

  /**
   * Clear the inactivity timer
   */
  private clearTimer(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange(nextAppState: AppStateStatus): void {
    if (this.debug) console.log(`[InactivityManager] App state changed to: ${nextAppState}`);
    
    if (nextAppState === 'active') {
      // App has come to foreground
      const now = Date.now();
      const timeSinceLastActive = now - this.lastActiveTimestamp;
      
      if (timeSinceLastActive >= this.timeoutMs) {
        // If the app was in background longer than the timeout
        if (this.debug) console.log('[InactivityManager] App returned after timeout period');
        this.isActive = false;
        this.onTimeout();
      } else {
        // Reset the timer
        this.resetTimer();
      }
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      // Store the timestamp when the app goes to background
      this.lastActiveTimestamp = Date.now();
    }
  }
}

// Export a singleton instance
let instance: InactivityManager | null = null;

export const initInactivityManager = (options: InactivityManagerOptions): InactivityManager => {
  if (instance) {
    instance.stop();
  }
  
  instance = new InactivityManager(options);
  return instance;
};

export const getInactivityManager = (): InactivityManager | null => {
  return instance;
};

export default InactivityManager;
