import type { TaskCounts, TaskListTab } from '../domain/task';
import { TASK_LIST_TABS, TASK_LIST_TAB_LABELS } from '../domain/task';

export function renderStatusTabs(counts: TaskCounts, currentTab: TaskListTab): void {
  const tabs = document.querySelector<HTMLElement>('.status-tabs');
  if (!tabs) return;
  const countByTab: Record<TaskListTab, number> = {
    active: counts.todo + counts.inProgress,
    completed: counts.completed,
  };
  tabs.innerHTML = TASK_LIST_TABS.map((tab) => `
    <button class="status-tab" id="tab-${tab}" type="button" role="tab" data-tab="${tab}" aria-selected="${tab === currentTab}">
      ${TASK_LIST_TAB_LABELS[tab]}<span class="tab-count" id="count-${tab}">${countByTab[tab]}</span>
    </button>
  `).join('');
  document.querySelector('#taskList')?.setAttribute('aria-labelledby', `tab-${currentTab}`);
}
