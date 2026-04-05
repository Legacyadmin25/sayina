import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { PieChart } from 'react-native-chart-kit';

interface EnvelopeStatusChartProps {
  completed: number;
  pending: number;
  expired: number;
  canceled: number;
}

const EnvelopeStatusChart: React.FC<EnvelopeStatusChartProps> = ({
  completed,
  pending,
  expired,
  canceled,
}) => {
  // Calculate total
  const total = completed + pending + expired + canceled;
  
  // Return placeholder if no data
  if (total === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No envelope data available</Text>
      </View>
    );
  }

  // Prepare data for pie chart
  const data = [
    {
      name: 'Completed',
      value: completed,
      color: '#4CAF50',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
    {
      name: 'Pending',
      value: pending,
      color: '#FFC107',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
    {
      name: 'Expired',
      value: expired,
      color: '#F44336',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
    {
      name: 'Canceled',
      value: canceled,
      color: '#9E9E9E',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12,
    },
  ].filter(item => item.value > 0); // Only include non-zero values

  return (
    <View style={styles.container}>
      <PieChart
        data={data}
        width={Dimensions.get('window').width - 64} // Account for padding
        height={180}
        chartConfig={{
          backgroundColor: '#FFFFFF',
          backgroundGradientFrom: '#FFFFFF',
          backgroundGradientTo: '#FFFFFF',
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        }}
        accessor="value"
        backgroundColor="transparent"
        paddingLeft="10"
        absolute
        hasLegend={true}
        center={[0, 0]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#999999',
    fontSize: 14,
  },
});

export default EnvelopeStatusChart;
