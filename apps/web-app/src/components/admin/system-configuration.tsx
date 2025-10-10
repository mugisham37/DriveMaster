"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Cog6ToothIcon,
  FlagIcon,
  ShieldCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { adminApi } from "@/lib/api/admin";

interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  type: "boolean" | "string" | "number" | "json";
  value?: any;
  environment: "development" | "staging" | "production" | "all";
  rolloutPercentage?: number;
  conditions?: FeatureFlagCondition[];
}

interface FeatureFlagCondition {
  type: "user_id" | "user_role" | "country" | "device_type";
  operator: "equals" | "in" | "not_in" | "contains";
  value: string | string[];
}

interface SystemSetting {
  key: string;
  name: string;
  description: string;
  value: any;
  type: "string" | "number" | "boolean" | "json" | "select";
  category: "general" | "security" | "performance" | "ml" | "notifications";
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    required?: boolean;
  };
}

interface ConfigurationChange {
  id: string;
  type: "feature_flag" | "system_setting";
  key: string;
  oldValue: any;
  newValue: any;
  changedBy: string;
  timestamp: string;
  environment: string;
}

export function SystemConfiguration() {
  const [activeTab, setActiveTab] = useState<
    "features" | "settings" | "history"
  >("features");
  const [editingFlag, setEditingFlag] = useState<string | null>(null);
  const [editingSetting, setEditingSetting] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch feature flags
  const { data: featureFlags, isLoading: flagsLoading } = useQuery({
    queryKey: ["featureFlags"],
    queryFn: () => adminApi.getFeatureFlags(),
  });

  // Fetch system settings
  const { data: systemSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["systemSettings"],
    queryFn: () => adminApi.getSystemSettings(),
  });

  // Fetch configuration history
  const { data: configHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["configurationHistory"],
    queryFn: () => adminApi.getConfigurationHistory(),
  });

  // Update feature flag mutation
  const updateFeatureFlagMutation = useMutation({
    mutationFn: (data: { key: string; updates: any }) =>
      adminApi.updateFeatureFlag(data.key, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["featureFlags"] });
      queryClient.invalidateQueries({ queryKey: ["configurationHistory"] });
      setEditingFlag(null);
    },
  });

  // Update system setting mutation
  const updateSystemSettingMutation = useMutation({
    mutationFn: (data: { key: string; value: any }) =>
      adminApi.updateSystemSetting(data.key, data.value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
      queryClient.invalidateQueries({ queryKey: ["configurationHistory"] });
      setEditingSetting(null);
    },
  });

  const getEnvironmentColor = (env: string) => {
    switch (env) {
      case "production":
        return "text-red-600 bg-red-100";
      case "staging":
        return "text-yellow-600 bg-yellow-100";
      case "development":
        return "text-blue-600 bg-blue-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "security":
        return "text-red-600 bg-red-100";
      case "performance":
        return "text-green-600 bg-green-100";
      case "ml":
        return "text-purple-600 bg-purple-100";
      case "notifications":
        return "text-blue-600 bg-blue-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const renderSettingInput = (setting: SystemSetting) => {
    switch (setting.type) {
      case "boolean":
        return (
          <Switch
            checked={setting.value}
            onCheckedChange={(checked: boolean) =>
              updateSystemSettingMutation.mutate({
                key: setting.key,
                value: checked,
              })
            }
          />
        );

      case "select":
        return (
          <Select
            value={setting.value}
            onValueChange={(value: string) =>
              updateSystemSettingMutation.mutate({
                key: setting.key,
                value,
              })
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {setting.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "number":
        return (
          <Input
            type="number"
            value={setting.value}
            min={setting.validation?.min}
            max={setting.validation?.max}
            className="w-32"
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              if (!isNaN(value)) {
                updateSystemSettingMutation.mutate({
                  key: setting.key,
                  value,
                });
              }
            }}
          />
        );

      case "json":
        return (
          <div className="space-y-2">
            <Textarea
              value={JSON.stringify(setting.value, null, 2)}
              onChange={(e) => {
                try {
                  const value = JSON.parse(e.target.value);
                  updateSystemSettingMutation.mutate({
                    key: setting.key,
                    value,
                  });
                } catch (error) {
                  // Invalid JSON, don't update
                }
              }}
              className="font-mono text-sm"
              rows={4}
            />
          </div>
        );

      default:
        return (
          <Input
            value={setting.value}
            pattern={setting.validation?.pattern}
            className="w-64"
            onChange={(e) =>
              updateSystemSettingMutation.mutate({
                key: setting.key,
                value: e.target.value,
              })
            }
          />
        );
    }
  };

  const tabs = [
    { id: "features", label: "Feature Flags", icon: FlagIcon },
    { id: "settings", label: "System Settings", icon: Cog6ToothIcon },
    { id: "history", label: "Change History", icon: ClockIcon },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Feature Flags Tab */}
      {activeTab === "features" && (
        <div className="space-y-4">
          {featureFlags?.map((flag: any) => (
            <Card key={flag.key}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{flag.name}</h3>
                      <Badge
                        variant="outline"
                        className={getEnvironmentColor(flag.environment)}
                      >
                        {flag.environment}
                      </Badge>
                      <Badge variant={flag.enabled ? "default" : "secondary"}>
                        {flag.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {flag.description}
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`flag-${flag.key}`}>Enabled</Label>
                        <Switch
                          id={`flag-${flag.key}`}
                          checked={flag.enabled}
                          onCheckedChange={(checked: boolean) =>
                            updateFeatureFlagMutation.mutate({
                              key: flag.key,
                              updates: { enabled: checked },
                            })
                          }
                        />
                      </div>
                      {flag.rolloutPercentage !== undefined && (
                        <div className="flex items-center gap-2">
                          <Label>Rollout</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={flag.rolloutPercentage}
                            onChange={(e) =>
                              updateFeatureFlagMutation.mutate({
                                key: flag.key,
                                updates: {
                                  rolloutPercentage: parseInt(e.target.value),
                                },
                              })
                            }
                            className="w-20"
                          />
                          <span className="text-sm text-gray-500">%</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setEditingFlag(editingFlag === flag.key ? null : flag.key)
                    }
                  >
                    {editingFlag === flag.key ? "Cancel" : "Edit"}
                  </Button>
                </div>

                {editingFlag === flag.key && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    <div>
                      <Label>Value</Label>
                      {flag.type === "boolean" ? (
                        <Switch
                          checked={flag.value}
                          onCheckedChange={(checked: boolean) =>
                            updateFeatureFlagMutation.mutate({
                              key: flag.key,
                              updates: { value: checked },
                            })
                          }
                        />
                      ) : flag.type === "json" ? (
                        <Textarea
                          value={JSON.stringify(flag.value, null, 2)}
                          onChange={(e) => {
                            try {
                              const value = JSON.parse(e.target.value);
                              updateFeatureFlagMutation.mutate({
                                key: flag.key,
                                updates: { value },
                              });
                            } catch (error) {
                              // Invalid JSON
                            }
                          }}
                          className="font-mono text-sm"
                          rows={3}
                        />
                      ) : (
                        <Input
                          value={flag.value || ""}
                          onChange={(e) =>
                            updateFeatureFlagMutation.mutate({
                              key: flag.key,
                              updates: { value: e.target.value },
                            })
                          }
                        />
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* System Settings Tab */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          {Object.entries(
            systemSettings?.reduce(
              (
                acc: Record<string, SystemSetting[]>,
                setting: SystemSetting
              ) => {
                if (!acc[setting.category]) acc[setting.category] = [];
                acc[setting.category].push(setting);
                return acc;
              },
              {}
            ) || {}
          ).map(([category, settings]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge className={getCategoryColor(category)}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(settings as any).map((setting: any) => (
                    <div
                      key={setting.key}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{setting.name}</h4>
                        <p className="text-sm text-gray-600">
                          {setting.description}
                        </p>
                        <code className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
                          {setting.key}
                        </code>
                      </div>
                      <div className="flex items-center gap-3">
                        {renderSettingInput(setting)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Configuration History Tab */}
      {activeTab === "history" && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Configuration Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {configHistory?.length === 0 ? (
                <div className="text-center py-8">
                  <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No configuration changes yet</p>
                </div>
              ) : (
                configHistory?.map((change: any) => (
                  <div
                    key={change.id}
                    className="flex items-start justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">
                          {change.type.replace("_", " ")}
                        </Badge>
                        <Badge
                          className={getEnvironmentColor(change.environment)}
                        >
                          {change.environment}
                        </Badge>
                      </div>
                      <h4 className="font-medium">{change.key}</h4>
                      <div className="text-sm text-gray-600 mt-1">
                        <span className="line-through text-red-600">
                          {JSON.stringify(change.oldValue)}
                        </span>
                        {" → "}
                        <span className="text-green-600">
                          {JSON.stringify(change.newValue)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Changed by {change.changedBy} on{" "}
                        {new Date(change.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
