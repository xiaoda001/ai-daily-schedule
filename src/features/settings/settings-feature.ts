import { open } from '@tauri-apps/plugin-dialog';
import { getStorageDirectory, moveStorageDirectory } from '../../services/settings';
import { errorMessage } from '../../shared/errors';
import { showToast } from '../../shared/notifications';

export function bindSettingsFeature(): void {
  const dialog = document.querySelector<HTMLDialogElement>('#settingsDialog');
  const pathLabel = document.querySelector<HTMLElement>('#storageDirectory');
  const errorLabel = document.querySelector<HTMLElement>('#settingsError');
  const chooseButton = document.querySelector<HTMLButtonElement>('#chooseStorageDirectory');
  if (!dialog || !pathLabel || !errorLabel || !chooseButton) return;

  document.querySelector<HTMLButtonElement>('#settingsButton')?.addEventListener('click', () => {
    errorLabel.textContent = '';
    pathLabel.textContent = '读取中…';
    dialog.showModal();
    void getStorageDirectory()
      .then((directory) => { pathLabel.textContent = directory; })
      .catch((error: unknown) => { errorLabel.textContent = errorMessage(error); });
  });

  chooseButton.addEventListener('click', async () => {
    chooseButton.disabled = true;
    errorLabel.textContent = '';
    try {
      const selected = await open({
        title: '选择数据存储目录',
        directory: true,
        multiple: false,
        defaultPath: pathLabel.textContent || undefined,
      });
      if (typeof selected !== 'string') return;
      if (selected === pathLabel.textContent) return;

      const previousDirectory = pathLabel.textContent ?? '';
      pathLabel.textContent = '正在迁移数据…';
      const activeDirectory = await moveStorageDirectory(selected);
      pathLabel.textContent = activeDirectory;
      showToast('数据已迁移到新位置');
      if (!previousDirectory) errorLabel.textContent = '';
    } catch (error) {
      errorLabel.textContent = errorMessage(error);
      try {
        pathLabel.textContent = await getStorageDirectory();
      } catch {
        pathLabel.textContent = '无法读取当前路径';
      }
    } finally {
      chooseButton.disabled = false;
    }
  });
}
