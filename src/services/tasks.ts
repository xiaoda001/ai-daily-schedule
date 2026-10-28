import type { Task, TaskCounts, TaskListTab, TaskStatus } from '../domain/task';
import { invokeCommand } from '../shared/tauri';

export const listTasks = (groupId: number | null, tab: TaskListTab | 'all', includeArchived = false): Promise<Task[]> =>
  invokeCommand('list_tasks', { groupId, status: tab, includeArchived });

export const getTaskCounts = (groupId: number | null, includeArchived = false): Promise<TaskCounts> =>
  invokeCommand('get_task_counts', { groupId, includeArchived });

export const createTask = (title: string, description: string, groupId: number): Promise<Task> =>
  invokeCommand('create_task', { title, description, groupId });

export const updateTask = (id: number, title: string, description: string, groupId: number): Promise<Task> =>
  invokeCommand('update_task', { id, title, description, groupId });

export const setTaskStatus = (id: number, status: TaskStatus): Promise<Task> =>
  invokeCommand('set_task_status', { id, status });
