"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DocumentArrowDownIcon,
  ChartBarIcon,
  UsersIcon,
  AcademicCapIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { adminApi } from "@/lib/api/admin";

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type:
    | "user_analytics"
    | "content_performance"
    | "system_usage"
    | "learning_outcomes";
  parameters: ReportParameter[];
  formats: ("csv" | "pdf" | "json" | "xlsx")[];
}

interface ReportParameter {
  name: string;
  type: "date" | "select" | "multiselect" | "boolean" | "number";
  label: string;
  required: boolean;
  options?: { value: string; label: string }[];
  defaultValue?: any;
}

interface ExportJob {
  id: string;
  reportName: string;
  status: "pending" | "processing" | "completed" | "failed";
  format: string;
  parameters: Record<string, any>;
  createdAt: string;
  completedAt?: string;
  downloadUrl?: string;
  error?: string;
}

export function ReportsExports() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [selectedFormat, setSelectedFormat] = useState<string>("csv");
  const queryClient = useQueryClient();

  // Fetch report templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["reportTemplates"],
    queryFn: () => adminApi.getReportTemplates(),
  });

  // Fetch export jobs
  const { data: exportJobs, isLoading: jobsLoading } = useQuery({
    queryKey: ["exportJobs"],
    queryFn: () => adminApi.getExportJobs(),
    refetchInterval: 5000, // Refresh every 5 seconds to update job status
  });

  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: (data: {
      templateId: string;
      format: string;
      parameters: Record<string, any>;
    }) => adminApi.generateReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exportJobs"] });
      setSelectedTemplate("");
      setParameters({});
    },
  });

  const currentTemplate = templates?.find((t) => t.id === selectedTemplate);

  const handleParameterChange = (paramName: string, value: any) => {
    setParameters((prev) => ({
      ...prev,
      [paramName]: value,
    }));
  };

  const handleGenerateReport = () => {
    if (!selectedTemplate) return;

    generateReportMutation.mutate({
      templateId: selectedTemplate,
      format: selectedFormat,
      parameters,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-100";
      case "processing":
        return "text-blue-600 bg-blue-100";
      case "failed":
        return "text-red-600 bg-red-100";
      default:
        return "text-yellow-600 bg-yellow-100";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircleIcon className="w-4 h-4" />;
      case "failed":
        return <ExclamationCircleIcon className="w-4 h-4" />;
      default:
        return <ClockIcon className="w-4 h-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "user_analytics":
        return <UsersIcon className="w-5 h-5" />;
      case "content_performance":
        return <AcademicCapIcon className="w-5 h-5" />;
      case "system_usage":
        return <ChartBarIcon className="w-5 h-5" />;
      case "learning_outcomes":
        return <AcademicCapIcon className="w-5 h-5" />;
      default:
        return <DocumentArrowDownIcon className="w-5 h-5" />;
    }
  };

  const renderParameterInput = (param: ReportParameter) => {
    switch (param.type) {
      case "date":
        return (
          <Input
            type="date"
            value={parameters[param.name] || param.defaultValue || ""}
            onChange={(e) => handleParameterChange(param.name, e.target.value)}
          />
        );

      case "select":
        return (
          <Select
            value={parameters[param.name] || param.defaultValue || ""}
            onValueChange={(value: string) =>
              handleParameterChange(param.name, value)
            }
          >
            <SelectTrigger>
              <SelectValue
                placeholder={`Select ${param.label.toLowerCase()}`}
              />
            </SelectTrigger>
            <SelectContent>
              {param.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "multiselect":
        return (
          <div className="space-y-2">
            {param.options?.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`${param.name}-${option.value}`}
                  checked={
                    parameters[param.name]?.includes(option.value) || false
                  }
                  onCheckedChange={(checked: boolean) => {
                    const current = parameters[param.name] || [];
                    if (checked) {
                      handleParameterChange(param.name, [
                        ...current,
                        option.value,
                      ]);
                    } else {
                      handleParameterChange(
                        param.name,
                        current.filter((v: string) => v !== option.value)
                      );
                    }
                  }}
                />
                <Label htmlFor={`${param.name}-${option.value}`}>
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        );

      case "boolean":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={param.name}
              checked={parameters[param.name] || param.defaultValue || false}
              onCheckedChange={(checked: boolean) =>
                handleParameterChange(param.name, checked)
              }
            />
            <Label htmlFor={param.name}>{param.label}</Label>
          </div>
        );

      case "number":
        return (
          <Input
            type="number"
            value={parameters[param.name] || param.defaultValue || ""}
            onChange={(e) =>
              handleParameterChange(param.name, parseInt(e.target.value))
            }
          />
        );

      default:
        return (
          <Input
            value={parameters[param.name] || param.defaultValue || ""}
            onChange={(e) => handleParameterChange(param.name, e.target.value)}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Report Generation */}
        <Card>
          <CardHeader>
            <CardTitle>Generate Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Template Selection */}
            <div>
              <Label htmlFor="template">Report Template</Label>
              <Select
                value={selectedTemplate}
                onValueChange={setSelectedTemplate}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a report template" />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(template.type)}
                        {template.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentTemplate && (
                <p className="text-sm text-gray-500 mt-1">
                  {currentTemplate.description}
                </p>
              )}
            </div>

            {/* Format Selection */}
            {currentTemplate && (
              <div>
                <Label htmlFor="format">Export Format</Label>
                <Select
                  value={selectedFormat}
                  onValueChange={setSelectedFormat}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currentTemplate.formats.map((format) => (
                      <SelectItem key={format} value={format}>
                        {format.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Parameters */}
            {currentTemplate?.parameters.map((param) => (
              <div key={param.name}>
                <Label htmlFor={param.name}>
                  {param.label}
                  {param.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </Label>
                {renderParameterInput(param)}
              </div>
            ))}

            {/* Generate Button */}
            <Button
              onClick={handleGenerateReport}
              disabled={
                !selectedTemplate ||
                generateReportMutation.isPending ||
                (currentTemplate?.parameters.some(
                  (p) => p.required && !parameters[p.name]
                ) ??
                  false)
              }
              className="w-full"
            >
              {generateReportMutation.isPending ? (
                <>
                  <ClockIcon className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Quick Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              <Button
                variant="outline"
                className="justify-start h-auto p-4"
                onClick={() => {
                  adminApi.generateQuickReport("daily_summary");
                }}
              >
                <div className="flex items-center gap-3">
                  <ChartBarIcon className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">Daily Summary</div>
                    <div className="text-sm text-gray-500">
                      Today's key metrics and activity
                    </div>
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="justify-start h-auto p-4"
                onClick={() => {
                  adminApi.generateQuickReport("user_engagement");
                }}
              >
                <div className="flex items-center gap-3">
                  <UsersIcon className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">User Engagement</div>
                    <div className="text-sm text-gray-500">
                      Weekly user activity and retention
                    </div>
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="justify-start h-auto p-4"
                onClick={() => {
                  adminApi.generateQuickReport("content_analytics");
                }}
              >
                <div className="flex items-center gap-3">
                  <AcademicCapIcon className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-medium">Content Analytics</div>
                    <div className="text-sm text-gray-500">
                      Question performance and difficulty analysis
                    </div>
                  </div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Export History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {exportJobs?.length === 0 ? (
              <div className="text-center py-8">
                <DocumentArrowDownIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No export jobs yet</p>
                <p className="text-sm text-gray-400">
                  Generate your first report above
                </p>
              </div>
            ) : (
              exportJobs?.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-1 rounded-full ${getStatusColor(
                        job.status
                      )}`}
                    >
                      {getStatusIcon(job.status)}
                    </div>
                    <div>
                      <h4 className="font-medium">{job.reportName}</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Badge variant="outline" className="text-xs">
                          {job.format.toUpperCase()}
                        </Badge>
                        <span>
                          {new Date(job.createdAt).toLocaleDateString()}
                        </span>
                        {job.completedAt && (
                          <span>
                            • Completed{" "}
                            {new Date(job.completedAt).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                      {job.error && (
                        <p className="text-sm text-red-600 mt-1">{job.error}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {job.status === "completed" && job.downloadUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          window.open(job.downloadUrl, "_blank");
                        }}
                      >
                        <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    )}
                    {job.status === "processing" && (
                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <ClockIcon className="w-4 h-4 animate-spin" />
                        Processing...
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
