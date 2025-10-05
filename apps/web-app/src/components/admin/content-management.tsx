"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";

interface ContentItem {
  id: string;
  title: string;
  type: "multiple_choice" | "true_false" | "fill_blank";
  status: "draft" | "under_review" | "approved" | "published" | "archived";
  difficulty: number;
  topics: string[];
  jurisdictions: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: string;
  approvedBy?: string;
}

export function ContentManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Mock data - in real implementation, this would come from API
  const mockItems: ContentItem[] = [
    {
      id: "1",
      title: "What is the speed limit in residential areas?",
      type: "multiple_choice",
      status: "published",
      difficulty: 0.3,
      topics: ["Speed Limits", "Residential Areas"],
      jurisdictions: ["CA", "NY"],
      createdBy: "author@example.com",
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2024-01-15T10:00:00Z",
      approvedBy: "admin@example.com",
    },
    {
      id: "2",
      title: "When should you use hazard lights?",
      type: "multiple_choice",
      status: "under_review",
      difficulty: 0.6,
      topics: ["Emergency Procedures", "Vehicle Lights"],
      jurisdictions: ["CA"],
      createdBy: "author2@example.com",
      createdAt: "2024-01-14T15:30:00Z",
      updatedAt: "2024-01-14T15:30:00Z",
    },
    {
      id: "3",
      title: "Right of way at four-way stop",
      type: "multiple_choice",
      status: "draft",
      difficulty: 0.8,
      topics: ["Right of Way", "Intersections"],
      jurisdictions: ["NY", "TX"],
      createdBy: "author@example.com",
      createdAt: "2024-01-13T09:15:00Z",
      updatedAt: "2024-01-13T09:15:00Z",
    },
  ];

  const { data: items = mockItems, isLoading } = useQuery({
    queryKey: ["contentItems", searchTerm, statusFilter, topicFilter],
    queryFn: async () => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return mockItems.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || item.status === statusFilter;
        const matchesTopic = topicFilter === "all" || item.topics.some(topic => topic === topicFilter);
        return matchesSearch && matchesStatus && matchesTopic;
      });
    },
  });

  const approveItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contentItems"] });
    },
  });

  const rejectItemMutation = useMutation({
    mutationFn: async ({ itemId, reason }: { itemId: string; reason: string }) => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contentItems"] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contentItems"] });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-100 text-green-800";
      case "approved":
        return "bg-blue-100 text-blue-800";
      case "under_review":
        return "bg-yellow-100 text-yellow-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "archived":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty < 0.4) return "Easy";
    if (difficulty < 0.7) return "Medium";
    return "Hard";
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty < 0.4) return "text-green-600";
    if (difficulty < 0.7) return "text-yellow-600";
    return "text-red-600";
  };

  const handleBulkAction = (action: string) => {
    console.log(`Bulk ${action} for items:`, selectedItems);
    // Implement bulk actions
  };

  const uniqueTopics = Array.from(new Set(mockItems.flatMap(item => item.topics)));

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Select value={topicFilter} onValueChange={setTopicFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                {uniqueTopics.map((topic) => (
                  <SelectItem key={topic} value={topic}></SelectItem>                 {topic}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button>
          <PlusIcon className="w-4 h-4 mr-2" />
          New Content
        </Button>
      </div>

      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">
                {selectedItems.length} item(s) selected
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction("approve")}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction("publish")}
                >
                  Publish
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction("archive")}
                >
                  Archive
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedItems([])}
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Table */}
      <Card>
        <CardHeader>
          <CardTitle>Content Items ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8">
              <DocumentDuplicateIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Content Found
              </h3>
              <p className="text-gray-600">
                No content items match your current filters.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems([...selectedItems, item.id]);
                        } else {
                          setSelectedItems(selectedItems.filter(id => id !== item.id));
                        }
                      }}
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="capitalize">{item.type.replace('_', ' ')}</span>
                            <span className={getDifficultyColor(item.difficulty)}>
                              {getDifficultyLabel(item.difficulty)}
                            </span>
                            <span>by {item.createdBy}</span>
                            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              item.status
                            )}`}
                          >
                            {item.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Topics and Jurisdictions */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {item.topics.map((topic) => (
                          <span
                            key={topic}
                            className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                          >
                            {topic}
                          </span>
                        ))}
                        {item.jurisdictions.map((jurisdiction) => (
                          <span
                            key={jurisdiction}
                            className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs"
                          >
                            {jurisdiction}
                          </span>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">
                          <EyeIcon className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        <Button size="sm" variant="outline">
                          <PencilIcon className="w-3 h-3 mr-1" />
                          Edit
                        </Button>

                        {item.status === "under_review" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => approveItemMutation.mutate(item.id)}
                              disabled={approveItemMutation.isPending}
                            >
                              <CheckIcon className="w-3 h-3 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rejectItemMutation.mutate({ 
                                itemId: item.id, 
                                reason: "Needs revision" 
                              })}
                              disabled={rejectItemMutation.isPending}
                            >
                              <XMarkIcon className="w-3 h-3 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteItemMutation.mutate(item.id)}
                          disabled={deleteItemMutation.isPending}
                          className="text-red-600 hover:text-red-700"
                        >
                          <TrashIcon className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">
              {mockItems.filter(item => item.status === "published").length}
            </div>
            <div className="text-sm text-gray-600">Published</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {mockItems.filter(item => item.status === "under_review").length}
            </div>
            <div className="text-sm text-gray-600">Under Review</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600">
              {mockItems.filter(item => item.status === "draft").length}
            </div>
            <div className="text-sm text-gray-600">Drafts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {uniqueTopics.length}
            </div>
            <div className="text-sm text-gray-600">Topics</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}