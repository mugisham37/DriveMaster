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

interface CreateGoalModalProps {
  onClose: () => void;
  onSubmit: (
    goal: Omit<StudyGoal, "id" | "current" | "createdAt">
  ) => Promise<void>;
}

export function CreateGoalModal({ onClose, onSubmit }: CreateGoalModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "daily_questions" as StudyGoal["type"],
    target: 10,
    deadline: "",
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const goalTypes = [
    { value: "daily_questions", label: "Daily Questions", defaultTarget: 10 },
    { value: "weekly_hours", label: "Weekly Study Hours", defaultTarget: 5 },
    { value: "topic_mastery", label: "Topics to Master", defaultTarget: 3 },
    {
      value: "accuracy_target",
      label: "Accuracy Target (%)",
      defaultTarget: 80,
    },
  ];

  const handleTypeChange = (type: StudyGoal["type"]) => {
    const goalType = goalTypes.find((gt) => gt.value === type);
    setFormData((prev) => ({
      ...prev,
      type,
      target: goalType?.defaultTarget || 10,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        title: formData.title.trim(),
        description: formData.description.trim(),
        deadline: formData.deadline || undefined,
      });
    } catch (error) {
      console.error("Failed to create goal:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Create Study Goal
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
            <Select value={formData.type} onValueChange={handleTypeChange}>
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
              {formData.type === "daily_questions" &&
                "Number of questions per day"}
              {formData.type === "weekly_hours" && "Hours of study per week"}
              {formData.type === "topic_mastery" &&
                "Number of topics to master"}
              {formData.type === "accuracy_target" &&
                "Target accuracy percentage"}
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
              {isSubmitting ? "Creating..." : "Create Goal"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
