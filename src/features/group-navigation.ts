import type { AppState } from '../app/state';

export function bindGroupNavigation(state: AppState, onChange: () => Promise<void>): void {
  document.querySelector<HTMLButtonElement>('#archiveButton')?.addEventListener('click', async () => {
    state.groupView = state.groupView === 'archive' ? 'active' : 'archive';
    state.currentGroup = 'all';
    await onChange();
  });

  document.querySelector<HTMLElement>('#groupList')?.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-group-action]')) return;
    const button = target.closest<HTMLButtonElement>('[data-group]');
    if (!button) return;
    state.currentGroup = button.dataset.group === 'all' ? 'all' : Number(button.dataset.group);
    await onChange();
  });
}
