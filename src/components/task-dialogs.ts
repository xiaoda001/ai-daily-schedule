import { icon } from './icons';

export function renderTaskDialogs(): string {
  return `
    <dialog class="modal" id="taskDialog" aria-labelledby="taskDialogTitle">
      <form id="taskForm" novalidate>
        <div class="modal-header"><h2 id="taskDialogTitle">添加任务</h2><button class="icon-button" type="button" data-close="taskDialog" aria-label="关闭">${icon('close')}</button></div>
        <div class="modal-body">
          <div class="field"><label for="taskTitle">任务标题</label><input id="taskTitle" maxlength="120" autocomplete="off" /></div>
          <div class="field"><label for="taskDescription">描述（可选）</label><textarea id="taskDescription" maxlength="1000" rows="4"></textarea></div>
          <div class="field"><label for="taskGroup">任务分组</label><select id="taskGroup"></select></div>
          <p class="field-error" id="taskFormError" role="alert" aria-live="polite"></p>
          <div class="modal-actions"><button class="secondary-button" type="button" data-close="taskDialog">取消</button><button class="primary-button" id="saveTaskButton" type="submit">保存任务</button></div>
        </div>
      </form>
    </dialog>
  `;
}
