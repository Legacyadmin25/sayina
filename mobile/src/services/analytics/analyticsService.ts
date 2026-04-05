import api from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const ANALYTICS_CACHE_KEY = 'analytics_cache';

/**
 * Service for analytics functionality
 */
class AnalyticsService {
  /**
   * Get envelope analytics
   * @param period The time period for analytics (e.g., 'day', 'week', 'month', 'year')
   * @param startDate Optional start date for custom period
   * @param endDate Optional end date for custom period
   * @param forceRefresh Whether to force refresh from API
   */
  async getEnvelopeAnalytics(
    period: AnalyticsPeriod = 'week',
    startDate?: string,
    endDate?: string,
    forceRefresh = false
  ): Promise<EnvelopeAnalytics> {
    try {
      // Check cache first if not forcing refresh
      if (!forceRefresh) {
        const cacheKey = `envelope_${period}_${startDate || ''}_${endDate || ''}`;
        const cachedData = await this.getCachedAnalytics(cacheKey);
        if (cachedData) {
          return cachedData as EnvelopeAnalytics;
        }
      }

      // Call API
      const response = await api.get('/api/v1/analytics/envelopes', {
        params: {
          period,
          start_date: startDate,
          end_date: endDate,
        },
      });

      const data = response.data.data;

      // Cache the data
      const cacheKey = `envelope_${period}_${startDate || ''}_${endDate || ''}`;
      await this.cacheAnalytics(cacheKey, data);

      return data;
    } catch (error) {
      console.error('Error getting envelope analytics:', error);
      throw error;
    }
  }

  /**
   * Get signer analytics
   * @param period The time period for analytics
   * @param startDate Optional start date for custom period
   * @param endDate Optional end date for custom period
   * @param forceRefresh Whether to force refresh from API
   */
  async getSignerAnalytics(
    period: AnalyticsPeriod = 'week',
    startDate?: string,
    endDate?: string,
    forceRefresh = false
  ): Promise<SignerAnalytics> {
    try {
      // Check cache first if not forcing refresh
      if (!forceRefresh) {
        const cacheKey = `signer_${period}_${startDate || ''}_${endDate || ''}`;
        const cachedData = await this.getCachedAnalytics(cacheKey);
        if (cachedData) {
          return cachedData as SignerAnalytics;
        }
      }

      // Call API
      const response = await api.get('/api/v1/analytics/signers', {
        params: {
          period,
          start_date: startDate,
          end_date: endDate,
        },
      });

      const data = response.data.data;

      // Cache the data
      const cacheKey = `signer_${period}_${startDate || ''}_${endDate || ''}`;
      await this.cacheAnalytics(cacheKey, data);

      return data;
    } catch (error) {
      console.error('Error getting signer analytics:', error);
      throw error;
    }
  }

  /**
   * Get usage analytics
   * @param period The time period for analytics
   * @param startDate Optional start date for custom period
   * @param endDate Optional end date for custom period
   * @param forceRefresh Whether to force refresh from API
   */
  async getUsageAnalytics(
    period: AnalyticsPeriod = 'month',
    startDate?: string,
    endDate?: string,
    forceRefresh = false
  ): Promise<UsageAnalytics> {
    try {
      // Check cache first if not forcing refresh
      if (!forceRefresh) {
        const cacheKey = `usage_${period}_${startDate || ''}_${endDate || ''}`;
        const cachedData = await this.getCachedAnalytics(cacheKey);
        if (cachedData) {
          return cachedData as UsageAnalytics;
        }
      }

      // Call API
      const response = await api.get('/api/v1/analytics/usage', {
        params: {
          period,
          start_date: startDate,
          end_date: endDate,
        },
      });

      const data = response.data.data;

      // Cache the data
      const cacheKey = `usage_${period}_${startDate || ''}_${endDate || ''}`;
      await this.cacheAnalytics(cacheKey, data);

      return data;
    } catch (error) {
      console.error('Error getting usage analytics:', error);
      throw error;
    }
  }

  /**
   * Get personal activity analytics
   * @param period The time period for analytics
   * @param startDate Optional start date for custom period
   * @param endDate Optional end date for custom period
   * @param forceRefresh Whether to force refresh from API
   */
  async getPersonalActivityAnalytics(
    period: AnalyticsPeriod = 'month',
    startDate?: string,
    endDate?: string,
    forceRefresh = false
  ): Promise<PersonalActivityAnalytics> {
    try {
      // Check cache first if not forcing refresh
      if (!forceRefresh) {
        const cacheKey = `personal_${period}_${startDate || ''}_${endDate || ''}`;
        const cachedData = await this.getCachedAnalytics(cacheKey);
        if (cachedData) {
          return cachedData as PersonalActivityAnalytics;
        }
      }

      // Call API
      const response = await api.get('/api/v1/analytics/personal-activity', {
        params: {
          period,
          start_date: startDate,
          end_date: endDate,
        },
      });

      const data = response.data.data;

      // Cache the data
      const cacheKey = `personal_${period}_${startDate || ''}_${endDate || ''}`;
      await this.cacheAnalytics(cacheKey, data);

      return data;
    } catch (error) {
      console.error('Error getting personal activity analytics:', error);
      throw error;
    }
  }

  /**
   * Get dashboard summary
   * @param forceRefresh Whether to force refresh from API
   */
  async getDashboardSummary(forceRefresh = false): Promise<DashboardSummary> {
    try {
      // Check cache first if not forcing refresh
      if (!forceRefresh) {
        const cachedData = await this.getCachedAnalytics('dashboard_summary');
        if (cachedData) {
          return cachedData as DashboardSummary;
        }
      }

      // Call API
      const response = await api.get('/api/v1/analytics/dashboard-summary');
      const data = response.data.data;

      // Cache the data
      await this.cacheAnalytics('dashboard_summary', data);

      return data;
    } catch (error) {
      console.error('Error getting dashboard summary:', error);
      throw error;
    }
  }

  /**
   * Get cached analytics
   */
  private async getCachedAnalytics(key: string): Promise<any | null> {
    try {
      const cachedAnalyticsJson = await AsyncStorage.getItem(ANALYTICS_CACHE_KEY);
      if (!cachedAnalyticsJson) {
        return null;
      }

      const cachedAnalytics = JSON.parse(cachedAnalyticsJson);
      
      if (cachedAnalytics[key] && !this.isCacheExpired(cachedAnalytics[key].timestamp)) {
        return cachedAnalytics[key].data;
      }

      return null;
    } catch (error) {
      console.error('Error getting cached analytics:', error);
      return null;
    }
  }

  /**
   * Cache analytics data
   */
  private async cacheAnalytics(key: string, data: any): Promise<void> {
    try {
      const cachedAnalyticsJson = await AsyncStorage.getItem(ANALYTICS_CACHE_KEY);
      const cachedAnalytics = cachedAnalyticsJson ? JSON.parse(cachedAnalyticsJson) : {};
      
      cachedAnalytics[key] = {
        data,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(ANALYTICS_CACHE_KEY, JSON.stringify(cachedAnalytics));
    } catch (error) {
      console.error('Error caching analytics:', error);
    }
  }

  /**
   * Check if cache is expired (30 minutes)
   */
  private isCacheExpired(timestamp: number): boolean {
    const cacheLifetime = 30 * 60 * 1000; // 30 minutes
    return Date.now() - timestamp > cacheLifetime;
  }

  /**
   * Track event for analytics
   * @param eventName The name of the event
   * @param eventData Optional event data
   */
  async trackEvent(eventName: string, eventData?: Record<string, any>): Promise<void> {
    try {
      await api.post('/api/v1/analytics/track', {
        event_name: eventName,
        event_data: eventData || {},
        platform: 'mobile',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error tracking event:', error);
      // Don't throw - tracking failures shouldn't break app experience
    }
  }

  /**
   * Clear analytics cache
   */
  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ANALYTICS_CACHE_KEY);
    } catch (error) {
      console.error('Error clearing analytics cache:', error);
    }
  }
}

// Types
export type AnalyticsPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface EnvelopeAnalytics {
  total_count: number;
  completed_count: number;
  pending_count: number;
  expired_count: number;
  canceled_count: number;
  completion_rate: number;
  average_completion_time: number; // in hours
  time_series: {
    date: string;
    created: number;
    completed: number;
    pending: number;
  }[];
  by_document_type: {
    type: string;
    count: number;
    percentage: number;
  }[];
}

export interface SignerAnalytics {
  total_signers: number;
  unique_signers: number;
  conversion_rate: number;
  average_time_to_sign: number; // in hours
  by_device: {
    device: string;
    count: number;
    percentage: number;
  }[];
  by_location: {
    location: string;
    count: number;
    percentage: number;
  }[];
  time_series: {
    date: string;
    signed: number;
    viewed: number;
  }[];
}

export interface UsageAnalytics {
  document_count: number;
  total_size: number; // in bytes
  storage_usage_percentage: number;
  sms_credits: {
    used: number;
    remaining: number;
    total: number;
  };
  subscription: {
    plan: string;
    documents_used: number;
    documents_limit: number;
    usage_percentage: number;
  };
  usage_by_feature: {
    feature: string;
    count: number;
    percentage: number;
  }[];
}

export interface PersonalActivityAnalytics {
  created_envelopes: number;
  signed_documents: number;
  viewed_documents: number;
  recent_activity: {
    action: string;
    entity_type: string;
    entity_id: string;
    entity_name: string;
    timestamp: string;
  }[];
  time_series: {
    date: string;
    created: number;
    signed: number;
    viewed: number;
  }[];
}

export interface DashboardSummary {
  action_required_count: number;
  waiting_others_count: number;
  completed_count: number;
  expired_count: number;
  recent_envelopes: {
    id: string;
    name: string;
    status: string;
    created_at: string;
    updated_at: string;
    signers_count: number;
    completion_percentage: number;
  }[];
  activity_stats: {
    today: number;
    this_week: number;
    this_month: number;
  };
}

export default new AnalyticsService();
