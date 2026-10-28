import type { TaskCounts } from '../domain/task';
import { isTauri } from '../shared/tauri';
import { errorMessage } from '../shared/errors';
import { clearPageError, showPageError } from '../shared/notifications';
import { getTaskCounts, listTasks } from '../services/tasks';
import { listGroups } from '../services/groups';
import { renderAppShell } from '../components/app-shell';
import { renderGroupList } from '../components/group-list';
import { renderTaskList } from '../components/task-list';
import { renderStatusTabs } from '../components/status-tabs';
import { bindDialogDismissal } from '../features/dialogs';
import { bindGroupNavigation } from '../features/group-navigation';
import { bindStatusTabs } from '../features/status-tabs';
import { bindGroupFeature } from '../features/groups/group-feature';
import { bindGroupOrder } from '../features/groups/group-order';
import { bindSettingsFeature } from '../features/settings/settings-feature';
import { bindTaskFeature } from '../features/tasks/task-feature';
import { createAppState } from './state';

export function startApp(): void {
  const root = document.querySelector<HTMLElement>('#app');
  if (!root) throw new Error('App root #app is missing.');
  const state = createAppState();
  renderAppShell(root);
  bindDialogDismissal();

  if (!isTauri()) {
    showPageError('请从 Tauri 桌面应用启动任务清单。');
    return;
  }

  bindGroupNavigation(state, refreshSafely);
  bindStatusTabs(state, refreshSafely);
  bindTaskFeature({ state, refresh: refreshSafely });
  bindGroupFeature({ state, refresh: refreshSafely });
  bindGroupOrder(refreshSafely);
  bindSettingsFeature();
  void refreshSafely();

  async function refreshSafely(): Promise<void> {
    try {
      await refresh();
      clearPageError();
    } catch (error) {
      showPageError(errorMessage(error));
    }
  }

  async function refresh(): Promise<void> {
    const isArchiveView = state.groupView === 'archive';
    const selectedArchiveGroup = isArchiveView && state.currentGroup !== 'all';
    const groupId = state.currentGroup === 'all' ? null : state.currentGroup;
    const [groups, archivedGroups, tasks, counts] = await Promise.all([
      listGroups(false),
      listGroups(true),
      isArchiveView && !selectedArchiveGroup
        ? Promise.resolve([])
        : listTasks(groupId, isArchiveView ? 'all' : state.currentTab, isArchiveView),
      isArchiveView && !selectedArchiveGroup
        ? Promise.resolve({ todo: 0, inProgress: 0, completed: 0, total: 0 })
        : getTaskCounts(groupId, isArchiveView),
    ]);
    state.groups = groups;
    state.archivedGroups = archivedGroups;
    const selectedGroups = isArchiveView ? archivedGroups : groups;
    if (state.currentGroup !== 'all' && !selectedGroups.some((group) => group.id === state.currentGroup)) {
      state.currentGroup = 'all';
      await refresh();
      return;
    }
    render(groups, archivedGroups, tasks, counts);
  }

  function render(groups: typeof state.groups, archivedGroups: typeof state.archivedGroups, tasks: typeof state.tasks, counts: TaskCounts): void {
    state.groups = groups;
    state.archivedGroups = archivedGroups;
    state.tasks = tasks;
    const archiveGroupSelected = state.groupView === 'archive' && state.currentGroup !== 'all';
    const groupViewEmpty = state.groupView === 'archive' && state.currentGroup === 'all';
    document.querySelector<HTMLElement>('.status-tabs')!.hidden = state.groupView === 'archive';
    document.querySelector<HTMLButtonElement>('#newTaskButton')!.hidden = state.groupView === 'archive';
    renderGroupList(groups, archivedGroups, state.currentGroup, state.groupView);
    renderStatusTabs(counts, state.currentTab);
    renderTaskList(tasks, state.currentTab, archiveGroupSelected, groupViewEmpty);
  }
}
