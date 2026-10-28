import { icon } from './icons';

export function renderErrorDialog(): string {
  return `
    <dialog class="modal" id="errorDialog" aria-labelledby="errorDialogTitle">
      <div class="modal-header"><h2 id="errorDialogTitle">操作失败</h2><button class="icon-button" type="button" data-close="errorDialog" aria-label="关闭">${icon('close')}</button></div>
      <div class="modal-body"><p class="delete-copy" id="errorDialogMessage"></p><div class="modal-actions"><button class="primary-button" type="button" data-close="errorDialog">知道了</button></div></div>
    </dialog>
  `;
}
