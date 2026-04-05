import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Image } from 'react-native';
import { Text, Card, Button, FAB, ActivityIndicator, Banner } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainStack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from 'react-query';
import NetInfo from '@react-native-community/netinfo';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

type NavigationProp = NativeStackNavigationProp<MainStackParamList, 'MainTabs'>;

interface DashboardStats {
  total_envelopes: number;
  pending_signatures: number;
  completed_envelopes: number;
  expiring_soon: number;
}

interface RecentActivity {
  id: string;
  type: 'envelope_created' | 'envelope_signed' | 'envelope_viewed' | 'envelope_completed';
  envelope_id: string;
  envelope_name: string;
  actor_name: string;
  timestamp: string;
}

const DashboardScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [isOffline, setIsOffline] = useState(false);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Track network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = !state.isConnected;
      if (offline && !isOffline) {
        setShowOfflineBanner(true);
      }
      setIsOffline(offline);
    });

    return () => unsubscribe();
  }, [isOffline]);

  // Fetch dashboard stats
  const { 
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery<DashboardStats>(
    'dashboardStats',
    async () => {
      const response = await api.get('/api/v1/dashboard/stats');
      return response.data.data;
    },
    {
      enabled: !isOffline,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      onError: () => console.error('Failed to fetch dashboard stats'),
    }
  );

  // Fetch recent activity
  const {
    data: activities,
    isLoading: activitiesLoading,
    refetch: refetchActivities,
  } = useQuery<RecentActivity[]>(
    'recentActivities',
    async () => {
      const response = await api.get('/api/v1/dashboard/activities');
      return response.data.data;
    },
    {
      enabled: !isOffline,
      retry: 1,
      staleTime: 2 * 60 * 1000, // 2 minutes
      onError: () => console.error('Failed to fetch recent activities'),
    }
  );

  // Handle refresh
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchActivities()]);
    setRefreshing(false);
  };

  // Get activity icon based on type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'envelope_created':
        return 'create-outline';
      case 'envelope_signed':
        return 'pencil-outline';
      case 'envelope_viewed':
        return 'eye-outline';
      case 'envelope_completed':
        return 'checkmark-circle-outline';
      default:
        return 'document-outline';
    }
  };

  // Format activity timestamp
  const formatActivityTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHrs = diffMs / (1000 * 60 * 60);
    
    if (diffHrs < 24) {
      return `${Math.floor(diffHrs)} hours ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Get activity description
  const getActivityDescription = (activity: RecentActivity) => {
    switch (activity.type) {
      case 'envelope_created':
        return `${activity.actor_name} created an envelope "${activity.envelope_name}"`;
      case 'envelope_signed':
        return `${activity.actor_name} signed the envelope "${activity.envelope_name}"`;
      case 'envelope_viewed':
        return `${activity.actor_name} viewed the envelope "${activity.envelope_name}"`;
      case 'envelope_completed':
        return `Envelope "${activity.envelope_name}" was completed`;
      default:
        return `Action performed on "${activity.envelope_name}"`;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <Banner
        visible={showOfflineBanner}
        actions={[
          {
            label: 'Dismiss',
            onPress: () => setShowOfflineBanner(false),
          },
        ]}
        icon={({ size }) => (
          <Ionicons name="cloud-offline" size={size} color="#F44336" />
        )}
      >
        You are currently offline. Some features may be limited, but you can still access your recent documents.
      </Banner>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#DAB44A']}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text variant="titleLarge" style={styles.welcomeText}>
              Welcome back,
            </Text>
            <Text variant="headlineMedium" style={styles.nameText}>
              {user?.name || 'User'}
            </Text>
          </View>
          <TouchableOpacity style={styles.avatarContainer}>
            {user?.organization?.logo_url ? (
              <Image
                source={{ uri: user.organization.logo_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0) || 'U'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          {statsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#DAB44A" />
              <Text>Loading stats...</Text>
            </View>
          ) : isOffline && !stats ? (
            <Card style={styles.offlineCard}>
              <Card.Content>
                <Ionicons name="cloud-offline" size={36} color="#757575" style={styles.offlineIcon} />
                <Text style={styles.offlineText}>Stats unavailable while offline</Text>
              </Card.Content>
            </Card>
          ) : stats ? (
            <>
              <View style={styles.statsRow}>
                <Card style={styles.statCard}>
                  <Card.Content style={styles.statContent}>
                    <Ionicons name="documents-outline" size={28} color="#DAB44A" />
                    <Text variant="titleLarge" style={styles.statNumber}>
                      {stats.total_envelopes}
                    </Text>
                    <Text variant="bodyMedium" style={styles.statLabel}>
                      Total Envelopes
                    </Text>
                  </Card.Content>
                </Card>
                <Card style={styles.statCard}>
                  <Card.Content style={styles.statContent}>
                    <Ionicons name="time-outline" size={28} color="#FF9800" />
                    <Text variant="titleLarge" style={styles.statNumber}>
                      {stats.pending_signatures}
                    </Text>
                    <Text variant="bodyMedium" style={styles.statLabel}>
                      Pending Signatures
                    </Text>
                  </Card.Content>
                </Card>
              </View>
              <View style={styles.statsRow}>
                <Card style={styles.statCard}>
                  <Card.Content style={styles.statContent}>
                    <Ionicons name="checkmark-circle-outline" size={28} color="#4CAF50" />
                    <Text variant="titleLarge" style={styles.statNumber}>
                      {stats.completed_envelopes}
                    </Text>
                    <Text variant="bodyMedium" style={styles.statLabel}>
                      Completed
                    </Text>
                  </Card.Content>
                </Card>
                <Card style={styles.statCard}>
                  <Card.Content style={styles.statContent}>
                    <Ionicons name="alert-circle-outline" size={28} color="#F44336" />
                    <Text variant="titleLarge" style={styles.statNumber}>
                      {stats.expiring_soon}
                    </Text>
                    <Text variant="bodyMedium" style={styles.statLabel}>
                      Expiring Soon
                    </Text>
                  </Card.Content>
                </Card>
              </View>
            </>
          ) : (
            <Card style={styles.errorCard}>
              <Card.Content style={styles.errorContent}>
                <Ionicons name="alert-circle-outline" size={36} color="#F44336" />
                <Text style={styles.errorText}>Failed to load dashboard stats</Text>
                <Button mode="outlined" onPress={() => refetchStats()} style={styles.retryButton}>
                  Retry
                </Button>
              </Card.Content>
            </Card>
          )}
        </View>

        <View style={styles.quickActions}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Quick Actions
          </Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('EnvelopeWizard')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#DAB44A' }]}>
                <Ionicons name="create-outline" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.actionText}>New Envelope</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Envelopes')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#26A69A' }]}>
                <Ionicons name="documents-outline" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.actionText}>My Envelopes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                // Navigate to envelopes with filter for awaiting signature
                navigation.navigate('Envelopes', { filter: 'awaiting' });
              }}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#FF9800' }]}>
                <Ionicons name="time-outline" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.actionText}>Sign Now</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.activitySection}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Recent Activity
          </Text>
          
          {activitiesLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#DAB44A" />
              <Text>Loading activity...</Text>
            </View>
          ) : isOffline && !activities ? (
            <Card style={styles.offlineCard}>
              <Card.Content>
                <Ionicons name="cloud-offline" size={36} color="#757575" style={styles.offlineIcon} />
                <Text style={styles.offlineText}>Activity unavailable while offline</Text>
              </Card.Content>
            </Card>
          ) : activities && activities.length > 0 ? (
            <View style={styles.activityList}>
              {activities.map((activity) => (
                <TouchableOpacity
                  key={activity.id}
                  style={styles.activityItem}
                  onPress={() => navigation.navigate('EnvelopeDetails', { envelopeId: activity.envelope_id })}
                >
                  <View style={styles.activityIconContainer}>
                    <Ionicons name={getActivityIcon(activity.type)} size={22} color="#FFFFFF" />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityText}>
                      {getActivityDescription(activity)}
                    </Text>
                    <Text style={styles.activityTime}>
                      {formatActivityTime(activity.timestamp)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <Ionicons name="notifications-outline" size={36} color="#BDBDBD" />
                <Text style={styles.emptyText}>No recent activity</Text>
              </Card.Content>
            </Card>
          )}
        </View>
      </ScrollView>
      
      <FAB
        icon="plus"
        style={styles.fab}
        color="#FFFFFF"
        onPress={() => navigation.navigate('EnvelopeWizard')}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeText: {
    color: '#666666',
  },
  nameText: {
    fontWeight: 'bold',
    color: '#333333',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#DAB44A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statsContainer: {
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    elevation: 2,
  },
  statContent: {
    alignItems: 'center',
    padding: 12,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  statLabel: {
    color: '#666666',
    textAlign: 'center',
  },
  quickActions: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionText: {
    textAlign: 'center',
    fontSize: 12,
  },
  activitySection: {
    marginBottom: 16,
  },
  activityList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  activityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DAB44A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#999999',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  offlineCard: {
    marginVertical: 8,
  },
  offlineIcon: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  offlineText: {
    textAlign: 'center',
    color: '#757575',
  },
  errorCard: {
    marginVertical: 8,
  },
  errorContent: {
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    textAlign: 'center',
    color: '#F44336',
    marginVertical: 8,
  },
  retryButton: {
    marginTop: 8,
  },
  emptyCard: {
    marginVertical: 8,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    textAlign: 'center',
    color: '#BDBDBD',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#DAB44A',
  },
});

export default DashboardScreen;
