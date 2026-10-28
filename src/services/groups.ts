import type { DeleteGroupOutcome, TaskGroup } from '../domain/task';
import { invokeCommand } from '../shared/tauri';

export const listGroups = (archived = false): Promise<TaskGroup[]> => invokeCommand('list_groups', { archived });
export const createGroup = (name: string): Promise<TaskGroup> => invokeCommand('create_group', { name });
export const renameGroup = (id: number, name: string): Promise<TaskGroup> => invokeCommand('rename_group', { id, name });
export const deleteGroup = (id: number): Promise<DeleteGroupOutcome> => invokeCommand('delete_group', { id });
export const reorderGroups = (groupIds: number[]): Promise<void> => invokeCommand('reorder_groups', { groupIds });
export const archiveGroup = (id: number): Promise<void> => invokeCommand('archive_group', { id });
export const restoreGroup = (id: number): Promise<void> => invokeCommand('restore_group', { id });
