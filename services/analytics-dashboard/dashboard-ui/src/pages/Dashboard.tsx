import React, { useEffect, useState } from 'react';
import {
  Grid,
  Typography,
  Box,
  Paper,
  CircularProgress,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import MetricsCard from '../components/MetricsCard';
import { useWebSocket } from '../contexts/WebSocketContext';

interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  totalContent: number;
  systemHealth: string;
  responseTime: number;
  errorRate: number;
}

const Dashboard: React.FC = () => {
  const { metrics: wsMetrics, isConnected } = useWebSocket();
  const [realTimeMetrics, setRealTimeMetrics] = useState<DashboardMetrics | null>(null);

  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const response = await axios.get('/api/analytics/dashboard');
      return response.data as DashboardMetrics;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  useEffect(() => {
    if (wsMetrics) {
      setRealTimeMetrics(wsMetrics);
    }
  }, [wsMetrics]);

  const displayMetrics = realTimeMetrics || metrics;

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">
          Error loading dashboard metrics. Please try again later.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard Overview
      </Typography>
      
      <Box mb={2}>
        <Typography variant="body2" color={isConnected ? 'success.main' : 'error.main'}>
          WebSocket: {isConnected ? 'Connected' : 'Disconnected'}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Total Users"
            value={displayMetrics?.totalUsers || 0}
            loading={isLoading}
            color="primary"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Active Users"
            value={displayMetrics?.activeUsers || 0}
            loading={isLoading}
            color="success"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Total Content"
            value={displayMetrics?.totalContent || 0}
            loading={isLoading}
            color="secondary"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Response Time"
            value={`${displayMetrics?.responseTime || 0}ms`}
            loading={isLoading}
            color="warning"
          />
        </Grid>
      </Grid>

      <Box mt={4}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            System Status
          </Typography>
          <Typography variant="body1">
            System Health: {displayMetrics?.systemHealth || 'Unknown'}
          </Typography>
          <Typography variant="body1">
            Error Rate: {displayMetrics?.errorRate || 0}%
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};

export default Dashboard;