import React from 'react';
import {
  Grid,
  Typography,
  Box,
  Paper,
  CircularProgress,
  LinearProgress,
  Chip,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import MetricsCard from '../components/MetricsCard';

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkTraffic: number;
  activeConnections: number;
  responseTime: number;
  errorRate: number;
  uptime: string;
  services: Array<{
    name: string;
    status: 'healthy' | 'warning' | 'error';
    responseTime: number;
  }>;
}

const SystemMonitoring: React.FC = () => {
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['system-monitoring'],
    queryFn: async () => {
      const response = await axios.get('/api/analytics/system');
      return response.data as SystemMetrics;
    },
    refetchInterval: 10000, // Refetch every 10 seconds for system metrics
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

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
          Error loading system monitoring data. Please try again later.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        System Monitoring
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="CPU Usage"
            value={`${metrics?.cpuUsage || 0}%`}
            color={metrics?.cpuUsage && metrics.cpuUsage > 80 ? 'error' : 'primary'}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Memory Usage"
            value={`${metrics?.memoryUsage || 0}%`}
            color={metrics?.memoryUsage && metrics.memoryUsage > 85 ? 'warning' : 'success'}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Active Connections"
            value={metrics?.activeConnections || 0}
            color="secondary"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Response Time"
            value={`${metrics?.responseTime || 0}ms`}
            color={metrics?.responseTime && metrics.responseTime > 1000 ? 'error' : 'primary'}
          />
        </Grid>
      </Grid>

      <Box mt={4}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Resource Usage
              </Typography>
              
              <Box mb={2}>
                <Typography variant="body2" gutterBottom>
                  Disk Usage: {metrics?.diskUsage || 0}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={metrics?.diskUsage || 0} 
                  color={metrics?.diskUsage && metrics.diskUsage > 90 ? 'error' : 'primary'}
                />
              </Box>
              
              <Box mb={2}>
                <Typography variant="body2" gutterBottom>
                  Network Traffic: {metrics?.networkTraffic || 0} MB/s
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="body2" gutterBottom>
                  System Uptime: {metrics?.uptime || 'Unknown'}
                </Typography>
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Service Status
              </Typography>
              {metrics?.services?.map((service, index) => (
                <Box key={index} display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2">{service.name}</Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" fontSize="0.75rem">
                      {service.responseTime}ms
                    </Typography>
                    <Chip
                      label={service.status}
                      size="small"
                      color={getStatusColor(service.status) as any}
                      variant="outlined"
                    />
                  </Box>
                </Box>
              )) || (
                <Typography variant="body2" color="textSecondary">
                  No service data available
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default SystemMonitoring;