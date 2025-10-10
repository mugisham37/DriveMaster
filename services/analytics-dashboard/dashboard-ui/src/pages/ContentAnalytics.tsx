import React from 'react';
import {
  Grid,
  Typography,
  Box,
  Paper,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import MetricsCard from '../components/MetricsCard';

interface ContentMetrics {
  totalContent: number;
  publishedContent: number;
  draftContent: number;
  contentViews: number;
  avgEngagement: number;
  topContent: Array<{
    id: string;
    title: string;
    views: number;
    engagement: number;
  }>;
}

const ContentAnalytics: React.FC = () => {
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['content-analytics'],
    queryFn: async () => {
      const response = await axios.get('/api/analytics/content');
      return response.data as ContentMetrics;
    },
    refetchInterval: 60000,
  });

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
          Error loading content analytics. Please try again later.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Content Analytics
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Total Content"
            value={metrics?.totalContent || 0}
            color="primary"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Published"
            value={metrics?.publishedContent || 0}
            color="success"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Drafts"
            value={metrics?.draftContent || 0}
            color="warning"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricsCard
            title="Total Views"
            value={metrics?.contentViews || 0}
            color="secondary"
          />
        </Grid>
      </Grid>

      <Box mt={4}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Average Engagement
              </Typography>
              <Typography variant="h4" color="primary">
                {metrics?.avgEngagement || 0}%
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Across all content
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Top Performing Content
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Title</TableCell>
                      <TableCell align="right">Views</TableCell>
                      <TableCell align="right">Engagement</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {metrics?.topContent?.slice(0, 5).map((content) => (
                      <TableRow key={content.id}>
                        <TableCell component="th" scope="row">
                          {content.title}
                        </TableCell>
                        <TableCell align="right">{content.views}</TableCell>
                        <TableCell align="right">{content.engagement}%</TableCell>
                      </TableRow>
                    )) || (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          No data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default ContentAnalytics;