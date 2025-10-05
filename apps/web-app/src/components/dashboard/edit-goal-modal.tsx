"use client";

import { useState } from "react";
import { StudyGoal } from "@/types/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface EditGoalModalProps {
  goal: StudyGoal;
  onClose: () => void;
  onSubmit: (updates: Partial<StudyGoal>) => Promise<void>;
}

export function EditGoalModal({ goal, onClose, onSubmit }: EditGoalModalProps) {
  const [formData, setFormData] = useState({
    title: goal.title,
    description: goal.description,
    type: goal.type,
    target: goal.target,
    deadline: goal.deadline || "",
    isActive: goal.isActive,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const goalTypes = [
    { value: "daily_questions", label: "Daily Questions" },
    { value: "weekly_hours", label: "Weekly Study Hours" },
    { value: "topic_mastery", label: "Topics to Master" },
    { value: "accuracy_target", label: "Accuracy Target (%)" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setIsSubmitting(true);
    try {
      const updates: Partial<StudyGoal> = {};

      if (formData.title !== goal.title) updates.title = formData.title.trim();
      if (formData.description !== goal.description)
        updates.description = formData.description.trim();
      if (formData.type !== goal.type) updates.type = formData.type;
      if (formData.target !== goal.target) updates.target = formData.target;
      if (formData.deadline !== (goal.deadline || "")) {
        updates.deadline = formData.deadline || undefined;
      }
      if (formData.isActive !== goal.isActive)
        updates.isActive = formData.isActive;

      if (Object.keys(updates).length > 0) {
        await onSubmit(updates);
      } else {
        onClose();
      }
    } catch (error) {
      console.error("Failed to update goal:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Edit Study Goal
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <XMarkIcon className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Goal Title *
            </label>
            <Input
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="e.g., Practice 20 questions daily"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Describe your goal and why it's important to you..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Goal Type *
            </label>
            <Select
              value={formData.type}
              onValueChange={(value: StudyGoal["type"]) =>
                setFormData((prev) => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {goalTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target *
            </label>
            <Input
              type="number"
              value={formData.target}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  target: parseInt(e.target.value) || 0,
                }))
              }
              min="1"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Current progress: {goal.current} / {goal.target}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deadline (Optional)
            </label>
            <Input
              type="date"
              value={formData.deadline}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, deadline: e.target.value }))
              }
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
              }
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Keep this goal active
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.title.trim()}
              className="flex-1"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
