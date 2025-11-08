"use client";

import React, { useEffect, useState } from "react";

export interface ImpactMetric {
  location: string;
  users: number;
  lat: number;
  lng: number;
}

export interface ImpactMapProps {
  initialMetrics: ImpactMetric[];
}

/**
 * ImpactMap Component
 * Displays a geographic map of impact metrics
 */
export function ImpactMap({ initialMetrics }: ImpactMapProps) {
  const [metrics, setMetrics] = useState<ImpactMetric[]>(initialMetrics);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  useEffect(() => {
    setMetrics(initialMetrics);
  }, [initialMetrics]);

  const handleLocationClick = (location: string) => {
    setSelectedLocation(location);
  };

  return (
    <div className="impact-map">
      <div className="impact-map-container">
        {/* Map visualization would go here */}
        <div className="impact-map-placeholder">
          <p>Interactive Impact Map</p>
        </div>
      </div>
      <div className="impact-map-legend">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className={`impact-map-location ${selectedLocation === metric.location ? "selected" : ""}`}
            onClick={() => handleLocationClick(metric.location)}
          >
            <span className="location-name">{metric.location}</span>
            <span className="location-users">{metric.users} users</span>
          </div>
        ))}
      </div>
    </div>
  );
}
