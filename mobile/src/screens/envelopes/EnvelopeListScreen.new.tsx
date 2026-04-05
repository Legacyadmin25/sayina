import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { Text, Card, Chip, Searchbar, FAB, ActivityIndicator, Badge, Divider, Menu } from 'react-native-paper';
import { EnvelopeSkeletonList } from '../../components/ui/EnvelopeSkeletonItem';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainTabsParamList, MainStackParamList } from '../../navigation/MainStack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'react-query';
import NetInfo from '@react-native-community/netinfo';
import api from '../../services/api';

type NavigationProp = NativeStackNavigationProp<MainStackParamList, 'MainTabs'>;
type RouteProps = RouteProp<MainTabsParamList, 'Envelopes'>;

interface Envelope {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
  expiry_date: string;
  documents_count: number;
  signers_count: number;
  completed_count: number;
  owner: {
    id: string;
    name: string;
    email: string;
  };
}

type FilterType = 'all' | 'draft' | 'sent' | 'completed' | 'expired' | 'awaiting';

// ScrollableChipGroup component for filtering envelopes
const ScrollableChipGroup = ({ 
  options, 
  selectedValue, 
  onSelect 
}: { 
  options: { label: string; value: string }[];
  selectedValue: string;
  onSelect: (value: string) => void;
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipScrollContent}
    >
      {options.map((option) => (
        <Chip
          key={option.value}
          selected={selectedValue === option.value}
          onPress={() => onSelect(option.value)}
          style={styles.filterChip}
          mode={selectedValue === option.value ? "flat" : "outlined"}
        >
          {option.label}
        </Chip>
      ))}
    </ScrollView>
  );
};

const EnvelopeListScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>((route.params as any)?.filter || 'all');
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isOffline, setIsOffline] = useState(false);

  // Track network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Set initial filter from route params if provided
  useEffect(() => {
    if ((route.params as any)?.filter) {
      setFilter((route.params as any).filter);
    }
  }, [route.params]);

  // Fetch envelopes
  const { 
    data: envelopes,
    isLoading,
    refetch,
    isError,
  } = useQuery<Envelope[]>(
    ['envelopes', filter],
    async () => {
      const response = await api.get(`/api/v1/envelopes?status=${filter}`);
      return response.data.data;
    },
    {
      enabled: !isOffline,
      retry: 2,
      staleTime: 2 * 60 * 1000, // 2 minutes
      onError: (error: any) => {
        console.error('Failed to fetch envelopes:', error);
      },
    }
  );

  // Handle refresh
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Filter and sort envelopes
  const filteredEnvelopes = React.useMemo(() => {
    if (!envelopes) return [];

    // Filter by search query
    let filtered = envelopes;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(envelope => 
        envelope.name.toLowerCase().includes(query) ||
        envelope.owner.name.toLowerCase().includes(query)
      );
    }

    // Sort
    return [...filtered].sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.updated_at).getTime();
        const dateB = new Date(b.updated_at).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      } else if (sortBy === 'name') {
        return sortOrder === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (sortBy === 'status') {
        return sortOrder === 'asc'
          ? a.status.localeCompare(b.status)
          : b.status.localeCompare(a.status);
      }
      return 0;
    });
  }, [envelopes, searchQuery, sortBy, sortOrder]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return '#9E9E9E';
      case 'sent':
        return '#2196F3';
      case 'in_progress':
        return '#FF9800';
      case 'completed':
        return '#4CAF50';
      case 'expired':
        return '#F44336';
      case 'declined':
        return '#D32F2F';
      default:
        return '#9E9E9E';
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format status for display
  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Render skeleton loading items using our custom component
  const renderSkeletonItems = () => {
    return <EnvelopeSkeletonList count={5} />;
  };

  // Render envelope item
  const renderEnvelopeItem = ({ item }: { item: Envelope }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('EnvelopeDetails', { envelopeId: item.id })}
    >
      <Card style={styles.envelopeCard}>
        <Card.Content>
          <View style={styles.envelopeHeader}>
            <Text variant="titleMedium" style={styles.envelopeName} numberOfLines={1}>
              {item.name}
            </Text>
            <Chip
              mode="flat"
              textStyle={{ color: '#FFF' }}
              style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}
            >
              {formatStatus(item.status)}
            </Chip>
          </View>
          
          <View style={styles.envelopeDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="person-outline" size={16} color="#757575" />
              <Text variant="bodySmall" style={styles.detailText}>
                {item.owner.name}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={16} color="#757575" />
              <Text variant="bodySmall" style={styles.detailText}>
                {formatDate(item.updated_at)}
              </Text>
            </View>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.envelopeStats}>
            <View style={styles.statItem}>
              <Ionicons name="document-outline" size={16} color="#757575" />
              <Text variant="bodySmall" style={styles.statText}>
                {item.documents_count} {item.documents_count === 1 ? 'Document' : 'Documents'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={16} color="#757575" />
              <Text variant="bodySmall" style={styles.statText}>
                {item.completed_count}/{item.signers_count} Signed
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderFilterChips = () => (
    <View style={styles.filterContainer}>
      <ScrollableChipGroup
        options={[
          { label: 'All', value: 'all' },
          { label: 'Drafts', value: 'draft' },
          { label: 'Sent', value: 'sent' },
          { label: 'In Progress', value: 'in_progress' },
          { label: 'Completed', value: 'completed' },
          { label: 'Awaiting', value: 'awaiting_signature' },
          { label: 'Expired', value: 'expired' },
        ]}
        selectedValue={filter}
        onSelect={(value) => setFilter(value as FilterType)}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        {isOffline && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline" size={20} color="#FFF" />
            <Text style={styles.offlineText}>You are offline. Some content may be unavailable.</Text>
          </View>
        )}

        <Searchbar
          placeholder="Search envelopes..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={{ fontSize: 16 }}
          autoCapitalize="none"
        />
        
        {renderFilterChips()}

        <View style={styles.listHeader}>
          <Text variant="titleMedium" style={styles.listTitle}>
            {!isLoading && filteredEnvelopes && `${filteredEnvelopes.length} ${filteredEnvelopes.length === 1 ? 'Envelope' : 'Envelopes'}`}
            {isLoading && 'Loading envelopes...'}
          </Text>
          
          <Menu
            visible={sortMenuVisible}
            onDismiss={() => setSortMenuVisible(false)}
            anchor={
              <TouchableOpacity 
                style={styles.sortButton} 
                onPress={() => setSortMenuVisible(true)}
              >
                <Ionicons name="funnel-outline" size={18} color="#333" />
                <Text style={styles.sortButtonText}>Sort</Text>
              </TouchableOpacity>
            }
          >
            <Menu.Item 
              onPress={() => {
                setSortBy('date');
                setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                setSortMenuVisible(false);
              }} 
              title={`Date ${sortBy === 'date' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}`} 
            />
            <Menu.Item 
              onPress={() => {
                setSortBy('name');
                setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                setSortMenuVisible(false);
              }} 
              title={`Name ${sortBy === 'name' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}`} 
            />
            <Menu.Item 
              onPress={() => {
                setSortBy('status');
                setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                setSortMenuVisible(false);
              }} 
              title={`Status ${sortBy === 'status' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}`} 
            />
          </Menu>
        </View>

        {isLoading && !refreshing ? (
          <View style={styles.listContent}>
            {renderSkeletonItems()}
          </View>
        ) : isError ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#F44336" />
            <Text style={styles.errorText}>Failed to load envelopes</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filteredEnvelopes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={48} color="#9E9E9E" />
            <Text style={styles.emptyText}>
              {searchQuery.trim() ? 'No envelopes match your search' : 'No envelopes found'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredEnvelopes}
            renderItem={renderEnvelopeItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#2196F3']}
              />
            }
          />
        )}
      </View>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('EnvelopeWizard')}
        color="#FFF"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
  },
  searchBar: {
    margin: 16,
    elevation: 2,
  },
  filterContainer: {
    marginBottom: 8,
  },
  chipScrollContent: {
    paddingHorizontal: 16,
  },
  filterChip: {
    marginRight: 8,
  },
  listContent: {
    paddingBottom: 16,
  },
  envelopeCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    elevation: 2,
  },
  envelopeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  envelopeName: {
    flex: 1,
    marginRight: 8,
  },
  statusChip: {
    height: 24,
    borderRadius: 12,
  },
  envelopeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    marginLeft: 4,
    color: '#757575',
  },
  divider: {
    marginVertical: 8,
  },
  envelopeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 4,
    color: '#757575',
  },
  offlineBanner: {
    backgroundColor: '#F44336',
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineText: {
    color: '#FFF',
    marginLeft: 8,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  listTitle: {
    fontWeight: 'bold',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#EEEEEE',
  },
  sortButtonText: {
    marginLeft: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginVertical: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#FFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    marginTop: 16,
    textAlign: 'center',
    color: '#757575',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
});

export default EnvelopeListScreen;
