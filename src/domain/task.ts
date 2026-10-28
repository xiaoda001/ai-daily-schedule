export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type TaskListTab = 'active' | 'completed';
export type GroupSelection = number | 'all';
export type GroupView = 'active' | 'archive';

export interface TaskGroup {
  id: number;
  name: string;
  taskCount: number;
  archived: boolean;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  groupId: number;
  status: TaskStatus;
  createdAt: number;
  updatedAt: number;
}

export interface TaskCounts {
  todo: number;
  inProgress: number;
  completed: number;
  total: number;
}

export interface DeleteGroupOutcome {
  deletedTasks: number;
}

export const TASK_STATUSES: readonly TaskStatus[] = ['todo', 'in_progress', 'completed'];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: '待完成',
  in_progress: '进行中',
  completed: '已完成',
};

export const TASK_LIST_TABS: readonly TaskListTab[] = ['active', 'completed'];

export const TASK_LIST_TAB_LABELS: Record<TaskListTab, string> = {
  active: '任务点',
  completed: '已完成',
};
