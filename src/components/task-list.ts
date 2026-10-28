import type { Task, TaskListTab, TaskStatus } from '../domain/task';
import { TASK_STATUSES, TASK_STATUS_LABELS } from '../domain/task';
import { escapeHtml } from '../shared/html';
import { icon } from './icons';

export function renderTaskList(
  tasks: Task[],
  currentTab: TaskListTab,
  archivedGroup = false,
  archiveLanding = false,
): void {
  const taskList = document.querySelector<HTMLElement>('#taskList');
  const total = document.querySelector<HTMLElement>('#taskTotal');
  const emptyState = document.querySelector<HTMLElement>('#emptyState');
  const emptyTitle = document.querySelector<HTMLElement>('#emptyTitle');
  if (!taskList || !total || !emptyState || !emptyTitle) return;

  total.textContent = `${tasks.length} 项任务`;
  emptyState.hidden = tasks.length > 0;
  emptyTitle.textContent = archiveLanding
    ? '选择一个归档分组查看任务'
    : archivedGroup
      ? '这个归档分组还没有任务'
      : currentTab === 'active' ? '任务列表为空' : '已完成列表为空';

  if (archivedGroup) {
    const archiveStatusOrder: readonly TaskStatus[] = ['in_progress', 'todo', 'completed'];
    taskList.innerHTML = archiveStatusOrder
      .map((status) => {
        const statusTasks = tasks.filter((task) => task.status === status);
        if (statusTasks.length === 0) return '';
        return `<section class="archive-task-section"><h2>${TASK_STATUS_LABELS[status]}<span>${statusTasks.length}</span></h2>${statusTasks.map((task) => renderTask(task, true)).join('')}</section>`;
      })
      .join('');
    return;
  }
  taskList.innerHTML = tasks.map((task) => renderTask(task, false)).join('');
}

function renderTask(task: Task, readOnly: boolean): string {
  const completed = task.status === 'completed';
  const locked = readOnly || completed;
  return `
    <article class="task-row ${task.status === 'completed' ? 'is-completed' : ''}">
      <div class="task-copy">${locked ? `<span class="task-title">${escapeHtml(task.title)}</span>` : `<button class="task-title" data-edit-task="${task.id}" type="button">${escapeHtml(task.title)}</button>`}${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}</div>
      ${readOnly
        ? `<span class="archive-task-status">${TASK_STATUS_LABELS[task.status as TaskStatus]}</span>`
        : `<label class="sr-only" for="status-${task.id}">任务状态：${escapeHtml(task.title)}</label><select class="task-status" id="status-${task.id}" data-task-status="${task.id}">${TASK_STATUSES.map((status) => `<option value="${status}" ${task.status === status ? 'selected' : ''}>${TASK_STATUS_LABELS[status]}</option>`).join('')}</select>${completed ? '' : `<button class="icon-button task-edit-button" data-edit-task="${task.id}" type="button" aria-label="编辑任务：${escapeHtml(task.title)}">${icon('edit')}</button>`}`}
    </article>
  `;
}
