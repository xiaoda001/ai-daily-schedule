import type { AppState } from '../../app/state';
import type { Task, TaskStatus } from '../../domain/task';
import { errorMessage } from '../../shared/errors';
import { escapeHtml } from '../../shared/html';
import { showError, showToast } from '../../shared/notifications';
import { createTask, setTaskStatus, updateTask } from '../../services/tasks';

interface TaskFeatureOptions {
  state: AppState;
  refresh: () => Promise<void>;
}

export function bindTaskFeature({ state, refresh }: TaskFeatureOptions): void {
  let editingTaskId: number | null = null;
  document.querySelector<HTMLButtonElement>('#newTaskButton')?.addEventListener('click', () => openTaskDialog());

  document.querySelector<HTMLFormElement>('#taskForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const titleInput = document.querySelector<HTMLInputElement>('#taskTitle')!;
    const descriptionInput = document.querySelector<HTMLTextAreaElement>('#taskDescription')!;
    const groupSelect = document.querySelector<HTMLSelectElement>('#taskGroup')!;
    const errorElement = document.querySelector<HTMLElement>('#taskFormError')!;
    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const groupId = Number(groupSelect.value);
    if (!title) { errorElement.textContent = '任务标题不能为空。'; titleInput.focus(); return; }
    if (!groupId) { errorElement.textContent = '请先选择任务分组。'; groupSelect.focus(); return; }

    const saveButton = document.querySelector<HTMLButtonElement>('#saveTaskButton')!;
    saveButton.disabled = true;
    try {
      if (editingTaskId === null) {
        await createTask(title, description, groupId);
        state.currentTab = 'active';
        showToast('任务已添加');
      } else {
        await updateTask(editingTaskId, title, description, groupId);
        showToast('修改已保存');
      }
      state.currentGroup = groupId;
      document.querySelector<HTMLDialogElement>('#taskDialog')!.close();
      await refresh();
    } catch (error) {
      errorElement.textContent = errorMessage(error);
    } finally {
      saveButton.disabled = false;
    }
  });

  document.querySelector<HTMLElement>('#taskList')?.addEventListener('click', (event) => {
    if (window.getSelection()?.toString()) return;
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-edit-task]');
    const task = state.tasks.find((item) => item.id === Number(button?.dataset.editTask));
    if (task && task.status !== 'completed' && state.groupView === 'active') openTaskDialog(task);
  });

  document.querySelector<HTMLElement>('#taskList')?.addEventListener('change', async (event) => {
    const select = (event.target as HTMLElement).closest<HTMLSelectElement>('[data-task-status]');
    if (!select) return;
    select.disabled = true;
    try {
      await setTaskStatus(Number(select.dataset.taskStatus), select.value as TaskStatus);
      await refresh();
    } catch (error) {
      showError(errorMessage(error));
      await refresh();
    }
  });

  function openTaskDialog(task?: Task): void {
    editingTaskId = task?.id ?? null;
    const dialog = document.querySelector<HTMLDialogElement>('#taskDialog')!;
    document.querySelector<HTMLFormElement>('#taskForm')!.reset();
    document.querySelector<HTMLElement>('#taskDialogTitle')!.textContent = task ? '编辑任务' : '添加任务';
    document.querySelector<HTMLButtonElement>('#saveTaskButton')!.textContent = task ? '保存修改' : '保存任务';
    document.querySelector<HTMLInputElement>('#taskTitle')!.value = task?.title ?? '';
    document.querySelector<HTMLTextAreaElement>('#taskDescription')!.value = task?.description ?? '';
    const preferredId = task?.groupId ?? (state.currentGroup === 'all' ? state.groups[0]?.id : state.currentGroup);
    const groupSelect = document.querySelector<HTMLSelectElement>('#taskGroup')!;
    groupSelect.innerHTML = state.groups.length === 0
      ? '<option value="">没有可选分组</option>'
      : state.groups.map((group) => `<option value="${group.id}" ${group.id === preferredId ? 'selected' : ''}>${escapeHtml(group.name)}</option>`).join('');
    groupSelect.disabled = state.groups.length === 0;
    document.querySelector<HTMLButtonElement>('#saveTaskButton')!.disabled = state.groups.length === 0;
    document.querySelector<HTMLElement>('#taskFormError')!.textContent = state.groups.length === 0 ? '请先创建任务分组。' : '';
    dialog.showModal();
    document.querySelector<HTMLInputElement>('#taskTitle')!.focus();
  }
}
