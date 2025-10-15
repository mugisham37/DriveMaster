"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ContentManagement } from "@/components/admin/content-management";
import { UserManagement } from "@/components/admin/user-management";
import { SystemMonitoring } from "@/components/admin/system-monitoring";
import { ReportsExports } from "@/components/admin/reports-exports";
import { SystemConfiguration } from "@/components/admin/system-configuration";
import {
  DocumentTextIcon,
  UsersIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/contexts/auth-context";

export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "content" | "users" | "monitoring" | "reports" | "config"
  >("content");

  // Check if user has admin permissions
  // In real implementation, this would check user roles
  const isAdmin = true; // Mock admin check

  if (!isAdmin) {
    return (
      <MainLayout title="Access Denied">
        <div className="text-center py-12">
          <ShieldCheckIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600">
            You don&apos;t have permission to access the admin panel.
          </p>
        </div>
      </MainLayout>
    );
  }

  const tabs = [
    {
      id: "content",
      label: "Content Management",
      icon: DocumentTextIcon,
      description: "Manage questions, topics, and content approval",
    },
    {
      id: "users",
      label: "User Management",
      icon: UsersIcon,
      description: "Manage user accounts and permissions",
    },
    {
      id: "monitoring",
      label: "System Monitoring",
      icon: ChartBarIcon,
      description: "Monitor system performance and analytics",
    },
    {
      id: "reports",
      label: "Reports & Exports",
      icon: DocumentArrowDownIcon,
      description: "Generate reports and export data",
    },
    {
      id: "config",
      label: "Configuration",
      icon: Cog6ToothIcon,
      description: "System settings and feature flags",
    },
  ] as const;

  return (
    <MainLayout
      title="Admin Panel"
      description="Manage content, users, and system configuration"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">Admin Panel</h1>
          <p className="text-purple-100">
            Welcome, {user?.email}. Manage your adaptive learning platform.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-purple-500 text-purple-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Description */}
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            {tabs.find((tab) => tab.id === activeTab)?.description}
          </p>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === "content" && <ContentManagement />}
          {activeTab === "users" && <UserManagement />}
          {activeTab === "monitoring" && <SystemMonitoring />}
          {activeTab === "reports" && <ReportsExports />}
          {activeTab === "config" && <SystemConfiguration />}
        </div>
      </div>
    </MainLayout>
  );
}
