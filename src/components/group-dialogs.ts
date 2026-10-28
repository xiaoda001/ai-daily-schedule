import { icon } from './icons';

export function renderGroupDialogs(): string {
  return `
    <dialog class="modal" id="groupDialog" aria-labelledby="groupDialogTitle">
      <form id="groupForm" novalidate>
        <div class="modal-header"><h2 id="groupDialogTitle">新建分组</h2><button class="icon-button" type="button" data-close="groupDialog" aria-label="关闭">${icon('close')}</button></div>
        <div class="modal-body">
          <div class="field"><label for="groupName">分组名称</label><input id="groupName" maxlength="40" autocomplete="off" /></div>
          <p class="field-error" id="groupFormError" role="alert" aria-live="polite"></p>
          <div class="modal-actions"><button class="secondary-button" type="button" data-close="groupDialog">取消</button><button class="primary-button" id="saveGroupButton" type="submit">创建分组</button></div>
        </div>
      </form>
    </dialog>
    <dialog class="modal" id="deleteGroupDialog" aria-labelledby="deleteGroupDialogTitle">
      <div class="modal-header"><h2 id="deleteGroupDialogTitle">删除分组</h2><button class="icon-button" type="button" data-close="deleteGroupDialog" aria-label="关闭">${icon('close')}</button></div>
      <div class="modal-body">
        <p class="delete-copy" id="deleteGroupMessage"></p>
        <div class="modal-actions"><button class="secondary-button" type="button" data-close="deleteGroupDialog">取消</button><button class="danger-button" id="confirmDeleteGroup" type="button">删除分组和任务</button></div>
      </div>
    </dialog>
  `;
}
