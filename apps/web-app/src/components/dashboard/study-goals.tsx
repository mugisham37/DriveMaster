"use client";

import { useState } from "react";
import { StudyGoal } from "@/types/analytics";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { clsx } from "clsx";
import { format, parseISO, isAfter, isBefore } from "date-fns";
import {
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import { CreateGoalModal } from "./create-goal-modal";
import { EditGoalModal } from "./edit-goal-modal";

interface StudyGoalsProps {
  goals: StudyGoal[];
  onCreateGoal?: (
    goal: Omit<StudyGoal, "id" | "current" | "createdAt">
  ) => Promise<void>;
  onUpdateGoal?: (goalId: string, updates: Partial<StudyGoal>) => Promise<void>;
  onDeleteGoal?: (goalId: string) => Promise<void>;
}

export function StudyGoals({
  goals,
  onCreateGoal,
  onUpdateGoal,
  onDeleteGoal,
}: StudyGoalsProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<StudyGoal | null>(null);

  const getGoalStatus = (goal: StudyGoal) => {
    const progress = goal.current / goal.target;
    const now = new Date();
    const deadline = goal.deadline ? parseISO(goal.deadline) : null;

    if (progress >= 1) return "completed";
    if (deadline && isAfter(now, deadline)) return "overdue";
    if (deadline && isBefore(now, deadline)) {
      const daysLeft = Math.ceil(
        (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysLeft <= 3) return "urgent";
    }
    return "active";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-50 border-green-200 text-green-800";
      case "overdue":
        return "bg-red-50 border-red-200 text-red-800";
      case "urgent":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      default:
        return "bg-blue-50 border-blue-200 text-blue-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case "overdue":
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
      case "urgent":
        return <ClockIcon className="w-5 h-5 text-yellow-600" />;
      default:
        return <ClockIcon className="w-5 h-5 text-blue-600" />;
    }
  };

  const getGoalTypeLabel = (type: string) => {
    switch (type) {
      case "daily_questions":
        return "Daily Questions";
      case "weekly_hours":
        return "Weekly Hours";
      case "topic_mastery":
        return "Topic Mastery";
      case "accuracy_target":
        return "Accuracy Target";
      default:
        return type;
    }
  };

  const formatGoalValue = (type: string, value: number) => {
    switch (type) {
      case "daily_questions":
        return `${value} questions`;
      case "weekly_hours":
        return `${value} hours`;
      case "topic_mastery":
        return `${value} topics`;
      case "accuracy_target":
        return `${value}%`;
      default:
        return value.toString();
    }
  };

  const formatDeadline = (deadline: string) => {
    const date = parseISO(deadline);
    const now = new Date();
    const daysLeft = Math.ceil(
      (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysLeft < 0) return "Overdue";
    if (daysLeft === 0) return "Due today";
    if (daysLeft === 1) return "Due tomorrow";
    if (daysLeft <= 7) return `${daysLeft} days left`;
    return format(date, "MMM d, yyyy");
  };

  const activeGoals = goals.filter((g) => g.isActive);
  const completedGoals = goals.filter(
    (g) => !g.isActive || getGoalStatus(g) === "completed"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Study Goals</h3>
          <p className="text-sm text-gray-600">
            Track your learning objectives and stay motivated
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="w-4 h-4 mr-2" />
          New Goal
        </Button>
      </div>

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Active Goals</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeGoals.map((goal) => {
              const status = getGoalStatus(goal);
              const progress = Math.min(
                (goal.current / goal.target) * 100,
                100
              );

              return (
                <Card
                  key={goal.id}
                  className={clsx(
                    "transition-all duration-200 hover:shadow-md",
                    getStatusColor(status)
                  )}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(status)}
                          <div>
                            <h5 className="font-medium text-gray-900">
                              {goal.title}
                            </h5>
                            <p className="text-xs text-gray-600">
                              {getGoalTypeLabel(goal.type)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingGoal(goal)}
                          >
                            <PencilIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDeleteGoal?.(goal.id)}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-gray-700">
                        {goal.description}
                      </p>

                      {/* Progress */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-medium">
                            {formatGoalValue(goal.type, goal.current)} /{" "}
                            {formatGoalValue(goal.type, goal.target)}
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <div className="text-xs text-gray-500">
                          {progress.toFixed(0)}% complete
                        </div>
                      </div>

                      {/* Deadline */}
                      {goal.deadline && (
                        <div className="text-xs text-gray-600">
                          {formatDeadline(goal.deadline)}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">
            Completed Goals ({completedGoals.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedGoals.slice(0, 4).map((goal) => (
              <Card key={goal.id} className="opacity-75">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h5 className="font-medium text-gray-900 truncate">
                        {goal.title}
                      </h5>
                      <p className="text-sm text-gray-600 truncate">
                        {goal.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatGoalValue(goal.type, goal.target)} achieved
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {goals.length === 0 && (
        <div className="text-center py-12">
          <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Goals Set
          </h3>
          <p className="text-gray-600 mb-4">
            Set study goals to track your progress and stay motivated.
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="w-4 h-4 mr-2" />
            Create Your First Goal
          </Button>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateGoalModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={async (goal) => {
            await onCreateGoal?.(goal);
            setShowCreateModal(false);
          }}
        />
      )}

      {editingGoal && (
        <EditGoalModal
          goal={editingGoal}
          onClose={() => setEditingGoal(null)}
          onSubmit={async (updates) => {
            await onUpdateGoal?.(editingGoal.id, updates);
            setEditingGoal(null);
          }}
        />
      )}
    </div>
  );
}
