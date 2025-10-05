import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  CircularProgress,
} from "@mui/material";
import { TrendingUp, TrendingDown, TrendingFlat } from "@mui/icons-material";

interface MetricsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "flat";
  trendValue?: string;
  loading?: boolean;
  color?: "primary" | "secondary" | "success" | "warning" | "error";
}

const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  loading = false,
  color = "primary",
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <TrendingUp color="success" />;
      case "down":
        return <TrendingDown color="error" />;
      case "flat":
        return <TrendingFlat color="disabled" />;
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case "up":
        return "success";
      case "down":
        return "error";
      case "flat":
        return "default";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight={120}
          >
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography color="textSecondary" gutterBottom variant="body2">
          {title}
        </Typography>

        <Typography variant="h4" component="div" color={color}>
          {value}
        </Typography>

        {subtitle && (
          <Typography variant="body2" color="textSecondary">
            {subtitle}
          </Typography>
        )}

        {trend && trendValue && (
          <Box display="flex" alignItems="center" mt={1}>
            {getTrendIcon()}
            <Chip
              label={trendValue}
              size="small"
              color={getTrendColor() as any}
              variant="outlined"
              sx={{ ml: 1 }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricsCard;
