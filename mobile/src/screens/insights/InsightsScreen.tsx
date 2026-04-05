import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, useTheme, Button, Card, SegmentedButtons } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from 'react-query';
import { useFocusEffect } from '@react-navigation/native';
import analyticsService, { AnalyticsPeriod } from '../../services/analytics/analyticsService';
import LoadingIndicator from '../../components/common/LoadingIndicator';
import ErrorComponent from '../../components/common/ErrorComponent';
import EnvelopeStatusChart from '../../components/analytics/EnvelopeStatusChart';
import ActivityTimelineChart from '../../components/analytics/ActivityTimelineChart';
import SignerDeviceChart from '../../components/analytics/SignerDeviceChart';
import MetricCard from '../../components/analytics/MetricCard';

const InsightsScreen: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriod>('month');
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Fetch envelope analytics
  const {
    data: envelopeAnalytics,
    isLoading: isLoadingEnvelopes,
    isError: isErrorEnvelopes,
    refetch: refetchEnvelopes,
  } = useQuery(
    ['envelopeAnalytics', selectedPeriod],
    () => analyticsService.getEnvelopeAnalytics(selectedPeriod),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Fetch signer analytics
  const {
    data: signerAnalytics,
    isLoading: isLoadingSigners,
    isError: isErrorSigners,
    refetch: refetchSigners,
  } = useQuery(
    ['signerAnalytics', selectedPeriod],
    () => analyticsService.getSignerAnalytics(selectedPeriod),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Fetch usage analytics
  const {
    data: usageAnalytics,
    isLoading: isLoadingUsage,
    isError: isErrorUsage,
    refetch: refetchUsage,
  } = useQuery(
    ['usageAnalytics', selectedPeriod],
    () => analyticsService.getUsageAnalytics(selectedPeriod),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Fetch personal activity analytics
  const {
    data: personalActivity,
    isLoading: isLoadingPersonal,
    isError: isErrorPersonal,
    refetch: refetchPersonal,
  } = useQuery(
    ['personalActivity', selectedPeriod],
    () => analyticsService.getPersonalActivityAnalytics(selectedPeriod),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchEnvelopes(),
        refetchSigners(),
        refetchUsage(),
        refetchPersonal(),
      ]);
    } catch (error) {
      console.error('Error refreshing analytics:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchEnvelopes, refetchSigners, refetchUsage, refetchPersonal]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      onRefresh();
      // Track screen view
      analyticsService.trackEvent('view_insights_screen');
    }, [onRefresh])
  );

  // Check if any data is loading
  const isLoading =
    isLoadingEnvelopes || isLoadingSigners || isLoadingUsage || isLoadingPersonal;

  // Check if any data has an error
  const hasError =
    isErrorEnvelopes || isErrorSigners || isErrorUsage || isErrorPersonal;

  // Render loading state
  if (isLoading && !refreshing) {
    return <LoadingIndicator message="Loading insights..." />;
  }

  // Render error state
  if (hasError) {
    return (
      <ErrorComponent
        message="There was a problem loading your insights."
        onRetry={onRefresh}
      />
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Insights
        </Text>
      </View>

      <View style={styles.periodSelector}>
        <SegmentedButtons
          value={selectedPeriod}
          onValueChange={(value) => setSelectedPeriod(value as AnalyticsPeriod)}
          buttons={[
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
            { value: 'quarter', label: 'Quarter' },
            { value: 'year', label: 'Year' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Envelope Status Overview */}
        <Card style={styles.card}>
          <Card.Title title="Envelope Status" />
          <Card.Content>
            {envelopeAnalytics && (
              <>
                <View style={styles.metricsRow}>
                  <MetricCard
                    title="Total"
                    value={envelopeAnalytics.total_count}
                    icon="document-text"
                  />
                  <MetricCard
                    title="Completed"
                    value={envelopeAnalytics.completed_count}
                    icon="checkmark-circle"
                    iconColor="#4CAF50"
                  />
                  <MetricCard
                    title="Pending"
                    value={envelopeAnalytics.pending_count}
                    icon="time"
                    iconColor="#FFC107"
                  />
                </View>
                <View style={styles.chartContainer}>
                  <EnvelopeStatusChart
                    completed={envelopeAnalytics.completed_count}
                    pending={envelopeAnalytics.pending_count}
                    expired={envelopeAnalytics.expired_count}
                    canceled={envelopeAnalytics.canceled_count}
                  />
                </View>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {(envelopeAnalytics.completion_rate * 100).toFixed(0)}%
                    </Text>
                    <Text style={styles.statLabel}>Completion Rate</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {envelopeAnalytics.average_completion_time.toFixed(1)}h
                    </Text>
                    <Text style={styles.statLabel}>Avg. Completion Time</Text>
                  </View>
                </View>
              </>
            )}
          </Card.Content>
        </Card>

        {/* Activity Timeline */}
        <Card style={styles.card}>
          <Card.Title title="Activity Timeline" />
          <Card.Content>
            {envelopeAnalytics && (
              <View style={styles.chartContainer}>
                <ActivityTimelineChart
                  data={envelopeAnalytics.time_series}
                  period={selectedPeriod}
                />
              </View>
            )}
            {personalActivity && (
              <View style={styles.metricsRow}>
                <MetricCard
                  title="Created"
                  value={personalActivity.created_envelopes}
                  icon="create"
                />
                <MetricCard
                  title="Signed"
                  value={personalActivity.signed_documents}
                  icon="pencil"
                />
                <MetricCard
                  title="Viewed"
                  value={personalActivity.viewed_documents}
                  icon="eye"
                />
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Signer Statistics */}
        <Card style={styles.card}>
          <Card.Title title="Signer Statistics" />
          <Card.Content>
            {signerAnalytics && (
              <>
                <View style={styles.metricsRow}>
                  <MetricCard
                    title="Total Signers"
                    value={signerAnalytics.total_signers}
                    icon="people"
                  />
                  <MetricCard
                    title="Unique Signers"
                    value={signerAnalytics.unique_signers}
                    icon="person"
                  />
                </View>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {(signerAnalytics.conversion_rate * 100).toFixed(0)}%
                    </Text>
                    <Text style={styles.statLabel}>Conversion Rate</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {signerAnalytics.average_time_to_sign.toFixed(1)}h
                    </Text>
                    <Text style={styles.statLabel}>Avg. Time to Sign</Text>
                  </View>
                </View>
                <View style={styles.chartContainer}>
                  <SignerDeviceChart data={signerAnalytics.by_device} />
                </View>
              </>
            )}
          </Card.Content>
        </Card>

        {/* SMS & Storage Usage */}
        <Card style={styles.card}>
          <Card.Title title="Subscription & Usage" />
          <Card.Content>
            {usageAnalytics && (
              <>
                <View style={styles.metricsRow}>
                  <MetricCard
                    title="Documents"
                    value={usageAnalytics.document_count}
                    icon="document-text"
                  />
                  <MetricCard
                    title="Storage"
                    value={formatBytes(usageAnalytics.total_size)}
                    icon="cloud"
                  />
                </View>
                
                {/* SMS Credits */}
                <View style={styles.usageContainer}>
                  <View style={styles.usageHeader}>
                    <Text style={styles.usageTitle}>SMS Credits</Text>
                    <Text style={styles.usageSubtitle}>
                      {usageAnalytics.sms_credits.used} / {usageAnalytics.sms_credits.total}
                    </Text>
                  </View>
                  <View style={styles.usageBar}>
                    <View
                      style={[
                        styles.usageFill,
                        {
                          width: `${(usageAnalytics.sms_credits.used / usageAnalytics.sms_credits.total) * 100}%`,
                          backgroundColor: '#DAB44A',
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Document Quota */}
                <View style={styles.usageContainer}>
                  <View style={styles.usageHeader}>
                    <Text style={styles.usageTitle}>Document Quota</Text>
                    <Text style={styles.usageSubtitle}>
                      {usageAnalytics.subscription.documents_used} / {usageAnalytics.subscription.documents_limit}
                    </Text>
                  </View>
                  <View style={styles.usageBar}>
                    <View
                      style={[
                        styles.usageFill,
                        {
                          width: `${usageAnalytics.subscription.usage_percentage * 100}%`,
                          backgroundColor:
                            usageAnalytics.subscription.usage_percentage > 0.9
                              ? '#F44336'
                              : usageAnalytics.subscription.usage_percentage > 0.7
                              ? '#FFC107'
                              : '#4CAF50',
                        },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.subscriptionInfo}>
                  <Ionicons name="information-circle" size={16} color="#666666" />
                  <Text style={styles.subscriptionText}>
                    You are on the {usageAnalytics.subscription.plan} plan
                  </Text>
                </View>
              </>
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
};

// Helper function to format bytes
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontWeight: 'bold',
  },
  periodSelector: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    marginBottom: 8,
  },
  segmentedButtons: {
    backgroundColor: '#F9F9F9',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  chartContainer: {
    height: 200,
    marginVertical: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#EEEEEE',
  },
  usageContainer: {
    marginBottom: 16,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  usageTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  usageSubtitle: {
    fontSize: 12,
    color: '#666666',
  },
  usageBar: {
    height: 8,
    backgroundColor: '#EEEEEE',
    borderRadius: 4,
    overflow: 'hidden',
  },
  usageFill: {
    height: '100%',
    borderRadius: 4,
  },
  subscriptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  subscriptionText: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 4,
  },
});

export default InsightsScreen;
