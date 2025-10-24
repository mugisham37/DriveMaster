import type { Task, TaskTest } from '../../../types/Tasks'

export const generateUnfoldableFunctionNames = (tasks: Task[] | null = null): string[] => {
  if (tasks === null) return []

  return [
    ...new Set(
      tasks.map((task) => task.tests.map((test: TaskTest) => test.function)).flat().filter((fn): fn is string => fn !== undefined)
    ),
  ]
}
