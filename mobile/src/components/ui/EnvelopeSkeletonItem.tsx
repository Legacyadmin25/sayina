import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Divider } from 'react-native-paper';
import { SkeletonContent } from './SkeletonLoader';

const EnvelopeSkeletonItem = () => {
  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <SkeletonContent
            isLoading={true}
            containerStyle={{ margin: 0, padding: 0 }}
            layout={[{ width: '70%', height: 24 }]}
          >
            <View />
          </SkeletonContent>
          
          <SkeletonContent
            isLoading={true}
            containerStyle={{ margin: 0, padding: 0 }}
            layout={[{ width: 80, height: 24, borderRadius: 16 }]}
          >
            <View />
          </SkeletonContent>
        </View>
        
        <View style={styles.details}>
          <SkeletonContent
            isLoading={true}
            containerStyle={{ margin: 0, padding: 0, flexDirection: 'row' }}
            layout={[{ width: '45%', height: 16 }]}
          >
            <View />
          </SkeletonContent>
          
          <SkeletonContent
            isLoading={true}
            containerStyle={{ margin: 0, padding: 0, flexDirection: 'row' }}
            layout={[{ width: '35%', height: 16 }]}
          >
            <View />
          </SkeletonContent>
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.stats}>
          <SkeletonContent
            isLoading={true}
            containerStyle={{ margin: 0, padding: 0, flexDirection: 'row' }}
            layout={[{ width: '40%', height: 16 }]}
          >
            <View />
          </SkeletonContent>
          
          <SkeletonContent
            isLoading={true}
            containerStyle={{ margin: 0, padding: 0, flexDirection: 'row' }}
            layout={[{ width: '30%', height: 16 }]}
          >
            <View />
          </SkeletonContent>
        </View>
      </Card.Content>
    </Card>
  );
};

const EnvelopeSkeletonList = ({ count = 5 }: { count?: number }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <EnvelopeSkeletonItem key={`skeleton-${index}`} />
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  divider: {
    marginVertical: 12,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
});

export { EnvelopeSkeletonItem, EnvelopeSkeletonList };
