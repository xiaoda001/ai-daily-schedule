import type { AppState } from '../../app/state';
import type { TaskGroup } from '../../domain/task';
import { errorMessage } from '../../shared/errors';
import { showError, showToast } from '../../shared/notifications';
import { archiveGroup, createGroup, deleteGroup, renameGroup, restoreGroup } from '../../services/groups';

interface GroupFeatureOptions {
  state: AppState;
  refresh: () => Promise<void>;
}

export function bindGroupFeature({ state, refresh }: GroupFeatureOptions): void {
  let editingGroupId: number | null = null;
  let deletingGroupId: number | null = null;
  document.querySelector<HTMLButtonElement>('#newGroupButton')?.addEventListener('click', () => openGroupDialog());

  document.querySelector<HTMLElement>('#groupList')?.addEventListener('click', async (event) => {
    const action = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-group-action]');
    if (!action) return;
    if (action.dataset.groupAction === 'toggle') {
      const groupId = action.dataset.groupId;
      const menu = Array.from(document.querySelectorAll<HTMLElement>('[data-group-menu]')).find((item) => item.dataset.groupMenu === groupId);
      const shouldOpen = menu?.hidden;
      document.querySelectorAll<HTMLElement>('[data-group-menu]').forEach((item) => { item.hidden = true; });
      document.querySelectorAll<HTMLButtonElement>('[data-group-action="toggle"]').forEach((item) => item.setAttribute('aria-expanded', 'false'));
      if (menu && shouldOpen) { menu.hidden = false; action.setAttribute('aria-expanded', 'true'); }
      return;
    }
    const group = [...state.groups, ...state.archivedGroups].find((item) => item.id === Number(action.dataset.groupId));
    if (!group) return;
    if (action.dataset.groupAction === 'rename') openGroupDialog(group);
    if (action.dataset.groupAction === 'delete') openDeleteDialog(group);
    if (action.dataset.groupAction === 'archive') {
      try {
        await archiveGroup(group.id);
        if (state.currentGroup === group.id) state.currentGroup = 'all';
        showToast('分组已归档');
        await refresh();
      } catch (error) {
        showError(errorMessage(error));
      }
    }
    if (action.dataset.groupAction === 'restore') {
      try {
        await restoreGroup(group.id);
        if (state.currentGroup === group.id) state.currentGroup = 'all';
        showToast('分组已恢复');
        await refresh();
      } catch (error) {
        showError(errorMessage(error));
      }
    }
  });

  document.querySelector<HTMLFormElement>('#groupForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const nameInput = document.querySelector<HTMLInputElement>('#groupName')!;
    const name = nameInput.value.trim();
    const errorElement = document.querySelector<HTMLElement>('#groupFormError')!;
    if (!name) { errorElement.textContent = '分组名称不能为空。'; nameInput.focus(); return; }
    const saveButton = document.querySelector<HTMLButtonElement>('#saveGroupButton')!;
    saveButton.disabled = true;
    try {
      if (editingGroupId === null) {
        const group = await createGroup(name);
        state.currentGroup = group.id;
        showToast('分组已创建');
      } else {
        await renameGroup(editingGroupId, name);
        showToast('分组名称已更新');
      }
      document.querySelector<HTMLDialogElement>('#groupDialog')!.close();
      await refresh();
    } catch (error) {
      errorElement.textContent = errorMessage(error);
    } finally {
      saveButton.disabled = false;
    }
  });

  document.querySelector<HTMLButtonElement>('#confirmDeleteGroup')?.addEventListener('click', async () => {
    if (deletingGroupId === null) return;
    const button = document.querySelector<HTMLButtonElement>('#confirmDeleteGroup')!;
    button.disabled = true;
    try {
      const outcome = await deleteGroup(deletingGroupId);
      if (state.currentGroup === deletingGroupId) state.currentGroup = 'all';
      deletingGroupId = null;
      document.querySelector<HTMLDialogElement>('#deleteGroupDialog')!.close();
      showToast(`分组和 ${outcome.deletedTasks} 项任务已删除`);
      await refresh();
    } catch (error) {
      document.querySelector<HTMLDialogElement>('#deleteGroupDialog')!.close();
      showError(errorMessage(error));
    } finally {
      button.disabled = false;
    }
  });

  function openGroupDialog(group?: TaskGroup): void {
    editingGroupId = group?.id ?? null;
    document.querySelector<HTMLFormElement>('#groupForm')!.reset();
    document.querySelector<HTMLInputElement>('#groupName')!.value = group?.name ?? '';
    document.querySelector<HTMLElement>('#groupDialogTitle')!.textContent = group ? '重命名分组' : '新建分组';
    document.querySelector<HTMLButtonElement>('#saveGroupButton')!.textContent = group ? '保存修改' : '创建分组';
    document.querySelector<HTMLElement>('#groupFormError')!.textContent = '';
    document.querySelector<HTMLDialogElement>('#groupDialog')!.showModal();
    document.querySelector<HTMLInputElement>('#groupName')!.focus();
  }

  function openDeleteDialog(group: TaskGroup): void {
    deletingGroupId = group.id;
    document.querySelector<HTMLElement>('#deleteGroupMessage')!.textContent = `删除“${group.name}”分组将同时删除其中 ${group.taskCount} 项任务，且无法撤销。`;
    document.querySelector<HTMLDialogElement>('#deleteGroupDialog')!.showModal();
    document.querySelector<HTMLButtonElement>('#confirmDeleteGroup')!.focus();
  }
}
