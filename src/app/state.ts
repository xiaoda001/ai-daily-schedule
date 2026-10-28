import type { GroupSelection, GroupView, Task, TaskGroup, TaskListTab } from '../domain/task';

export interface AppState {
  groups: TaskGroup[];
  archivedGroups: TaskGroup[];
  tasks: Task[];
  currentGroup: GroupSelection;
  groupView: GroupView;
  currentTab: TaskListTab;
}

export function createAppState(): AppState {
  return {
    groups: [],
    archivedGroups: [],
    tasks: [],
    currentGroup: 'all',
    groupView: 'active',
    currentTab: 'active',
  };
}
