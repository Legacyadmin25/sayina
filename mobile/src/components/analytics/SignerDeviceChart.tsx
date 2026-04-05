import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { BarChart } from 'react-native-chart-kit';

interface DeviceData {
  device: string;
  count: number;
  percentage: number;
}

interface SignerDeviceChartProps {
  data: DeviceData[];
}

const SignerDeviceChart: React.FC<SignerDeviceChartProps> = ({ data }) => {
  // Return placeholder if no data
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No device data available</Text>
      </View>
    );
  }

  // Sort data by count in descending order
  const sortedData = [...data].sort((a, b) => b.count - a.count);
  
  // Limit to top 5 devices
  const topDevices = sortedData.slice(0, 5);

  // Prepare data for bar chart
  const chartData = {
    labels: topDevices.map(item => item.device),
    datasets: [
      {
        data: topDevices.map(item => item.count),
      },
    ],
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Signing by Device</Text>
      <BarChart
        data={chartData}
        width={Dimensions.get('window').width - 64} // Account for padding
        height={180}
        yAxisLabel=""
        yAxisSuffix=""
        chartConfig={{
          backgroundColor: '#FFFFFF',
          backgroundGradientFrom: '#FFFFFF',
          backgroundGradientTo: '#FFFFFF',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(218, 180, 74, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          barPercentage: 0.6,
        }}
        style={styles.chart}
        fromZero
        showValuesOnTopOfBars
      />
      <View style={styles.legend}>
        {topDevices.map((item, index) => (
          <View key={index} style={styles.legendItem}>
            <Text style={styles.legendPercentage}>{Math.round(item.percentage * 100)}%</Text>
            <Text style={styles.legendText}>{item.device}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
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
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 8,
  },
  legendItem: {
    alignItems: 'center',
    marginHorizontal: 8,
    marginBottom: 4,
  },
  legendPercentage: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333333',
  },
  legendText: {
    fontSize: 10,
    color: '#666666',
  },
});

export default SignerDeviceChart;
