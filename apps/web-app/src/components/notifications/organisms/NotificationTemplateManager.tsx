'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Edit, Trash2, Copy, Eye, Code, FileText, CheckCircle, XCircle } from 'lucide-react';
import { useNotificationTemplates } from '@/hooks/useNotificationTemplates';
import { NotificationSkeleton } from '../molecules/NotificationSkeleton';
import { EmptyNotificationState } from '../molecules/EmptyNotificationState';
import type { NotificationTemplate, NotificationType, DeliveryChannel } from '@/types/notifications';

interface NotificationTemplateManagerProps {
  onSave?: (template: NotificationTemplate) => void;
  onDelete?: (id: string) => void;
  readOnly?: boolean;
  className?: string;
}

const TEMPLATE_VARIABLES: Record<NotificationType, string[]> = {
  achievement: ['userName', 'achievementName', 'points', 'rarity', 'description'],
  streak_reminder: ['userName', 'currentStreak', 'timeRemaining', 'longestStreak'],
  spaced_repetition: ['userName', 'topic', 'itemsDue', 'difficulty', 'optimalTiming'],
  mock_test_reminder: ['userName', 'testName', 'testType', 'difficulty', 'duration', 'scheduledTime'],
  system: ['userName', 'message', 'actionUrl', 'actionText'],
  mentoring: ['userName', 'mentorName', 'messagePreview', 'conversationId'],
  course_update: ['userName', 'courseName', 'updateType', 'description'],
};

export function NotificationTemplateManager({
  onSave,
  onDelete,
  readOnly = false,
  className = '',
}: NotificationTemplateManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'type'>('date');
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'system' as NotificationType,
    titleTemplate: '',
    bodyTemplate: '',
    supportedChannels: ['in-app'] as DeliveryChannel[],
    isActive: true,
  });

  const {
    templates,
    isLoading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    renderTemplate,
  } = useNotificationTemplates();

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];

    let filtered = templates;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.type.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter((t) => t.type === filterType);
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((t) =>
        filterStatus === 'active' ? t.isActive : !t.isActive
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'type':
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });

    return filtered;
  }, [templates, searchQuery, filterType, filterStatus, sortBy]);

  const handleCreateNew = () => {
    setEditMode('create');
    setFormData({
      name: '',
      description: '',
      type: 'system',
      titleTemplate: '',
      bodyTemplate: '',
      supportedChannels: ['in-app'],
      isActive: true,
    });
    setEditorOpen(true);
  };

  const handleEdit = (template: NotificationTemplate) => {
    setEditMode('edit');
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      type: template.type,
      titleTemplate: template.titleTemplate,
      bodyTemplate: template.bodyTemplate,
      supportedChannels: template.supportedChannels,
      isActive: template.isActive,
    });
    setEditorOpen(true);
  };

  const handleDuplicate = (template: NotificationTemplate) => {
    setEditMode('create');
    setFormData({
      name: `${template.name} (Copy)`,
      description: template.description || '',
      type: template.type,
      titleTemplate: template.titleTemplate,
      bodyTemplate: template.bodyTemplate,
      supportedChannels: template.supportedChannels,
      isActive: false,
    });
    setEditorOpen(true);
  };

  const handleDeleteClick = (template: NotificationTemplate) => {
    setSelectedTemplate(template);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTemplate) return;

    try {
      await deleteTemplate(selectedTemplate.id);
      onDelete?.(selectedTemplate.id);
      setDeleteDialogOpen(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleSave = async () => {
    try {
      if (editMode === 'create') {
        const newTemplate = await createTemplate(formData);
        onSave?.(newTemplate);
      } else if (selectedTemplate) {
        const updatedTemplate = await updateTemplate(selectedTemplate.id, formData);
        onSave?.(updatedTemplate);
      }
      setEditorOpen(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  const handlePreview = async (template: NotificationTemplate) => {
    setSelectedTemplate(template);
    setPreviewOpen(true);
  };

  const handleToggleActive = async (template: NotificationTemplate) => {
    try {
      await updateTemplate(template.id, { isActive: !template.isActive });
    } catch (error) {
      console.error('Failed to toggle template status:', error);
    }
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('bodyTemplate') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formData.bodyTemplate;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const newText = `${before}{{${variable}}}${after}`;
      setFormData({ ...formData, bodyTemplate: newText });
      
      // Set cursor position after inserted variable
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length + 4, start + variable.length + 4);
      }, 0);
    }
  };

  const validateTemplate = () => {
    const requiredVars = TEMPLATE_VARIABLES[formData.type] || [];
    const usedVars = formData.bodyTemplate.match(/\{\{(\w+)\}\}/g)?.map((v) => v.slice(2, -2)) || [];
    const missingVars = requiredVars.filter((v) => !usedVars.includes(v));
    return { isValid: missingVars.length === 0, missingVars };
  };

  if (isLoading) {
    return (
      <div className={className}>
        <NotificationSkeleton count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <EmptyNotificationState type="error" onAction={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header with search and filters */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Notification Templates</h2>
          {!readOnly && (
            <Button onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={filterType} onValueChange={(v) => setFilterType(v as NotificationType | 'all')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="achievement">Achievement</SelectItem>
              <SelectItem value="streak_reminder">Streak Reminder</SelectItem>
              <SelectItem value="spaced_repetition">Spaced Repetition</SelectItem>
              <SelectItem value="mock_test_reminder">Mock Test</SelectItem>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="mentoring">Mentoring</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as 'all' | 'active' | 'inactive')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'name' | 'date' | 'type')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="type">Type</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Template List */}
      {filteredTemplates.length === 0 ? (
        <EmptyNotificationState
          type={searchQuery || filterType !== 'all' ? 'filtered-empty' : 'no-notifications'}
          onAction={() => {
            setSearchQuery('');
            setFilterType('all');
            setFilterStatus('all');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="mt-1">{template.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    {template.isActive ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">{template.type}</Badge>
                  <Badge variant="outline">v{template.version}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Channels:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.supportedChannels.map((channel) => (
                        <Badge key={channel} variant="outline" className="text-xs">
                          {channel}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(template)}
                        title="Preview"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!readOnly && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(template)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicate(template)}
                            title="Duplicate"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(template)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                    {!readOnly && (
                      <Switch
                        checked={template.isActive}
                        onCheckedChange={() => handleToggleActive(template)}
                        aria-label="Toggle active status"
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Template Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editMode === 'create' ? 'Create Template' : 'Edit Template'}
            </DialogTitle>
            <DialogDescription>
              Create a reusable notification template with variable substitution
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="editor" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="editor">
                <FileText className="h-4 w-4 mr-2" />
                Editor
              </TabsTrigger>
              <TabsTrigger value="variables">
                <Code className="h-4 w-4 mr-2" />
                Variables
              </TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Achievement Unlock"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData({ ...formData, type: v as NotificationType })}
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="achievement">Achievement</SelectItem>
                      <SelectItem value="streak_reminder">Streak Reminder</SelectItem>
                      <SelectItem value="spaced_repetition">Spaced Repetition</SelectItem>
                      <SelectItem value="mock_test_reminder">Mock Test</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="mentoring">Mentoring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this template"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="titleTemplate">Title Template *</Label>
                <Input
                  id="titleTemplate"
                  value={formData.titleTemplate}
                  onChange={(e) => setFormData({ ...formData, titleTemplate: e.target.value })}
                  placeholder="e.g., Congratulations {{userName}}!"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bodyTemplate">Body Template *</Label>
                <Textarea
                  id="bodyTemplate"
                  value={formData.bodyTemplate}
                  onChange={(e) => setFormData({ ...formData, bodyTemplate: e.target.value })}
                  placeholder="Use {{variableName}} for dynamic content"
                  rows={8}
                />
                {(() => {
                  const validation = validateTemplate();
                  return !validation.isValid && validation.missingVars.length > 0 ? (
                    <p className="text-sm text-destructive">
                      Missing required variables: {validation.missingVars.join(', ')}
                    </p>
                  ) : null;
                })()}
              </div>

              <div className="space-y-2">
                <Label>Supported Channels</Label>
                <div className="flex flex-wrap gap-2">
                  {(['in-app', 'push', 'email', 'sms'] as DeliveryChannel[]).map((channel) => (
                    <Label key={channel} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.supportedChannels.includes(channel)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              supportedChannels: [...formData.supportedChannels, channel],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              supportedChannels: formData.supportedChannels.filter((c) => c !== channel),
                            });
                          }
                        }}
                      />
                      {channel}
                    </Label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </TabsContent>

            <TabsContent value="variables" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Available Variables for {formData.type}</CardTitle>
                  <CardDescription>
                    Click a variable to insert it into the template
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {(TEMPLATE_VARIABLES[formData.type] || []).map((variable) => (
                      <Button
                        key={variable}
                        variant="outline"
                        size="sm"
                        onClick={() => insertVariable(variable)}
                        className="justify-start font-mono"
                      >
                        <Code className="h-4 w-4 mr-2" />
                        {`{{${variable}}}`}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formData.name || !formData.titleTemplate || !formData.bodyTemplate}>
              {editMode === 'create' ? 'Create' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>Preview with sample data</DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Title</Label>
                <p className="font-semibold">{selectedTemplate.titleTemplate}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Body</Label>
                <p className="text-sm whitespace-pre-wrap">{selectedTemplate.bodyTemplate}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Channels</Label>
                <div className="flex gap-2 mt-1">
                  {selectedTemplate.supportedChannels.map((channel) => (
                    <Badge key={channel} variant="secondary">
                      {channel}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedTemplate?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
