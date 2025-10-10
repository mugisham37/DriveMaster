import React from "react";
import { Grid, Typography, Box, Paper, CircularProgress } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import MetricsCard from "../components/MetricsCard";

interface UserMetrics {
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  userRetention: number;
  avgSessionDuration: number;
  topUserActions: Array<{ action: string; count: number }>;
}

const UserAnalytics: React.FC = () => {
  const {
    data: metrics,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["user-analytics"],
    queryFn: async () => {
      const response = await axios.get("/api/analytics/users");
      return response.data as UserMetrics;
    },
    refetchInterval: 60000, // Refetch every minute
  });

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">
          Error loading user analytics. Please try again later.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        User Analytics
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Total Users"
            value={metrics?.totalUsers || 0}
            color="primary"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="New Users"
            value={metrics?.newUsers || 0}
            color="success"
            trend="up"
            trendValue="+12%"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Active Users"
            value={metrics?.activeUsers || 0}
            color="secondary"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="User Retention"
            value={`${metrics?.userRetention || 0}%`}
            color="warning"
          />
        </Grid>
      </Grid>

      <Box mt={4}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Session Duration
              </Typography>
              <Typography variant="h4" color="primary">
                {metrics?.avgSessionDuration || 0} min
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Average session duration
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Top User Actions
              </Typography>
              {metrics?.topUserActions?.map((action, index) => (
                <Box
                  key={index}
                  display="flex"
                  justifyContent="space-between"
                  mb={1}
                >
                  <Typography variant="body2">{action.action}</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {action.count}
                  </Typography>
                </Box>
              )) || (
                <Typography variant="body2" color="textSecondary">
                  No data available
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default UserAnalytics;
