import { icon } from './icons';

export function renderSettingsDialog(): string {
  return `
    <dialog class="modal" id="settingsDialog" aria-labelledby="settingsDialogTitle">
      <div class="modal-header"><h2 id="settingsDialogTitle">设置</h2><button class="icon-button" type="button" data-close="settingsDialog" aria-label="关闭">${icon('close')}</button></div>
      <div class="modal-body">
        <div class="field">
          <label for="storageDirectory">数据存储位置</label>
          <div class="storage-location">
            <p class="storage-directory" id="storageDirectory" aria-live="polite">读取中…</p>
            <button class="secondary-button" id="chooseStorageDirectory" type="button">选择目录</button>
          </div>
          <p class="field-error" id="settingsError" role="alert" aria-live="polite"></p>
        </div>
        <div class="modal-actions"><button class="secondary-button" type="button" data-close="settingsDialog">关闭</button></div>
      </div>
    </dialog>
  `;
}
