import type { AppState } from '../app/state';
import type { TaskListTab } from '../domain/task';

export function bindStatusTabs(state: AppState, onChange: () => Promise<void>): void {
  const container = document.querySelector<HTMLElement>('.status-tabs');
  if (!container) return;
  container.addEventListener('click', async (event) => {
    const tab = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-tab]');
    if (!tab) return;
    state.currentTab = tab.dataset.tab as TaskListTab;
    await onChange();
  });
  container.addEventListener('keydown', (event) => {
    const keyEvent = event as KeyboardEvent;
    if (keyEvent.key !== 'ArrowLeft' && keyEvent.key !== 'ArrowRight') return;
    keyEvent.preventDefault();
    const tabs = Array.from(container.querySelectorAll<HTMLButtonElement>('.status-tab'));
    const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
    const step = keyEvent.key === 'ArrowRight' ? 1 : -1;
    const next = tabs[(current + step + tabs.length) % tabs.length];
    next?.focus();
    next?.click();
  });
}
