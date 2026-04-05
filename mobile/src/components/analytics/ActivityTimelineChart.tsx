import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import { AnalyticsPeriod } from '../../services/analytics/analyticsService';
import { format, parseISO } from 'date-fns';

interface TimeSeriesData {
  date: string;
  created: number;
  completed: number;
  pending?: number;
}

interface ActivityTimelineChartProps {
  data: TimeSeriesData[];
  period: AnalyticsPeriod;
}

const ActivityTimelineChart: React.FC<ActivityTimelineChartProps> = ({
  data,
  period,
}) => {
  const theme = useTheme();

  // Return placeholder if no data
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No activity data available</Text>
      </View>
    );
  }

  // Format dates based on period
  const formatDate = (dateString: string) => {
    const date = parseISO(dateString);
    switch (period) {
      case 'day':
        return format(date, 'HH:mm');
      case 'week':
        return format(date, 'EEE');
      case 'month':
        return format(date, 'dd');
      case 'quarter':
      case 'year':
        return format(date, 'MMM');
      default:
        return format(date, 'MM/dd');
    }
  };

  // Prepare data for line chart
  const chartData = {
    labels: data.map(item => formatDate(item.date)),
    datasets: [
      {
        data: data.map(item => item.created),
        color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`, // Blue
        strokeWidth: 2,
      },
      {
        data: data.map(item => item.completed),
        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`, // Green
        strokeWidth: 2,
      },
    ],
    legend: ['Created', 'Completed'],
  };

  // Calculate chart height based on maximum value
  const maxValue = Math.max(
    ...data.map(item => Math.max(item.created, item.completed))
  );
  
  // Handle case where all values are 0
  if (maxValue === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No activity data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LineChart
        data={chartData}
        width={Dimensions.get('window').width - 64} // Account for padding
        height={180}
        yAxisInterval={1}
        chartConfig={{
          backgroundColor: '#FFFFFF',
          backgroundGradientFrom: '#FFFFFF',
          backgroundGradientTo: '#FFFFFF',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: '4',
            strokeWidth: '2',
            stroke: '#FFFFFF',
          },
          propsForBackgroundLines: {
            strokeDasharray: '',
            stroke: '#EEEEEE',
          },
        }}
        bezier
        style={styles.chart}
        fromZero
      />
      <View style={styles.legend}>
        {chartData.legend.map((label, index) => (
          <View key={index} style={styles.legendItem}>
            <View
              style={[
                styles.legendColor,
                {
                  backgroundColor: chartData.datasets[index].color(1),
                },
              ]}
            />
            <Text style={styles.legendText}>{label}</Text>
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
    justifyContent: 'center',
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#666666',
  },
});

export default ActivityTimelineChart;
