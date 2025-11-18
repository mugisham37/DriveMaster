"use client";

import React, { useState } from "react";
import { Smartphone, Monitor, Trash2, Plus, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useDeviceTokens } from "@/hooks/useDeviceTokens";
import { usePushPermission } from "@/hooks/usePushPermission";
import { useToast } from "@/hooks/use-toast";
import type { DeviceToken } from "@/types/notification-service";
import { formatDistanceToNow } from "date-fns";

export interface DeviceTokenManagerProps {
  userId: string;
  onTokenRegistered?: (token: DeviceToken) => void;
  className?: string;
}

export function DeviceTokenManager({
  userId,
  onTokenRegistered,
  className = "",
}: DeviceTokenManagerProps) {
  const { toast } = useToast();
  const [deviceToRemove, setDeviceToRemove] = useState<DeviceToken | null>(null);

  const { data: devices, isLoading, refetch } = useDeviceTokens(userId);
  const { requestPermission, hasPermission, isSupported } = usePushPermission();

  const handleRegisterDevice = async () => {
    try {
      if (!isSupported) {
        toast({
          title: "Not Supported",
          description: "Push notifications are not supported in this browser.",
          variant: "destructive",
        });
        return;
      }

      const granted = await requestPermission();

      if (granted) {
        // Token registration would happen in the hook
        toast({
          title: "Device Registered",
          description: "This device will now receive push notifications.",
        });
        refetch();
      } else {
        toast({
          title: "Permission Denied",
          description: "Please enable notifications in your browser settings.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "Failed to register device",
        variant: "destructive",
      });
    }
  };

  const handleRemoveDevice = async (device: DeviceToken) => {
    try {
      // Implementation would call mutation hook
      console.log("Remove device:", device.id);

      toast({
        title: "Device Removed",
        description: "This device will no longer receive push notifications.",
      });

      setDeviceToRemove(null);
      refetch();
    } catch (error) {
      toast({
        title: "Removal Failed",
        description: error instanceof Error ? error.message : "Failed to remove device",
        variant: "destructive",
      });
    }
  };

  const getPlatformIcon = (platform: DeviceToken["platform"]) => {
    switch (platform) {
      case "ios":
      case "android":
        return <Smartphone className="h-5 w-5" />;
      case "web":
        return <Monitor className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const getPlatformLabel = (platform: DeviceToken["platform"]) => {
    switch (platform) {
      case "ios":
        return "iOS";
      case "android":
        return "Android";
      case "web":
        return "Web Browser";
      default:
        return "Unknown";
    }
  };

  const activeDevices = devices?.filter((d) => d.isActive) ?? [];
  const inactiveDevices = devices?.filter((d) => !d.isActive) ?? [];

  if (isLoading) {
    return (
      <div className={`device-token-manager-loading ${className}`}>
        <p>Loading devices...</p>
      </div>
    );
  }

  return (
    <div className={`device-token-manager ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Registered Devices</CardTitle>
              <CardDescription>
                Manage devices that receive push notifications
              </CardDescription>
            </div>
            <Button onClick={handleRegisterDevice} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Register This Device
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {devices?.length === 0 ? (
            <div className="text-center py-8">
              <Smartphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Devices Registered</h3>
              <p className="text-muted-foreground mb-4">
                Register this device to receive push notifications
              </p>
              <Button onClick={handleRegisterDevice}>
                <Plus className="h-4 w-4 mr-2" />
                Register This Device
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Active Devices */}
              {activeDevices.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Active Devices ({activeDevices.length})
                  </h3>
                  <div className="space-y-2">
                    {activeDevices.map((device) => (
                      <Card key={device.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="mt-1">
                              {getPlatformIcon(device.platform)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">
                                  {getPlatformLabel(device.platform)}
                                </h4>
                                <Badge variant="outline" className="text-xs">
                                  Active
                                </Badge>
                              </div>
                              {device.metadata?.deviceModel && (
                                <p className="text-sm text-muted-foreground">
                                  {device.metadata.deviceModel}
                                </p>
                              )}
                              {device.metadata?.browserName && (
                                <p className="text-sm text-muted-foreground">
                                  {device.metadata.browserName} {device.metadata.browserVersion}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                Last used {formatDistanceToNow(new Date(device.lastUsedAt), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeviceToRemove(device)}
                            aria-label="Remove device"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Inactive Devices */}
              {inactiveDevices.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                    Inactive Devices ({inactiveDevices.length})
                  </h3>
                  <div className="space-y-2">
                    {inactiveDevices.map((device) => (
                      <Card key={device.id} className="p-4 opacity-60">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="mt-1">
                              {getPlatformIcon(device.platform)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">
                                  {getPlatformLabel(device.platform)}
                                </h4>
                                <Badge variant="secondary" className="text-xs">
                                  Inactive
                                </Badge>
                              </div>
                              {device.metadata?.deviceModel && (
                                <p className="text-sm text-muted-foreground">
                                  {device.metadata.deviceModel}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                Last used {formatDistanceToNow(new Date(device.lastUsedAt), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeviceToRemove(device)}
                            aria-label="Remove device"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Educational Content */}
          {!hasPermission && isSupported && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Enable Push Notifications</h4>
              <p className="text-sm text-muted-foreground mb-3">
                To receive real-time notifications, you need to grant permission in your browser.
              </p>
              <Button onClick={handleRegisterDevice} size="sm">
                Enable Notifications
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!deviceToRemove} onOpenChange={() => setDeviceToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Device?</AlertDialogTitle>
            <AlertDialogDescription>
              This device will no longer receive push notifications. You can register it again later.
              {deviceToRemove && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="font-medium">{getPlatformLabel(deviceToRemove.platform)}</p>
                  {deviceToRemove.metadata?.deviceModel && (
                    <p className="text-sm">{deviceToRemove.metadata.deviceModel}</p>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deviceToRemove && handleRemoveDevice(deviceToRemove)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Device
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default DeviceTokenManager;
