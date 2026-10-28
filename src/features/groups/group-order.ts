import { reorderGroups } from '../../services/groups';
import { errorMessage } from '../../shared/errors';
import { showError } from '../../shared/notifications';

interface DragSession {
  pointerId: number;
  handle: HTMLButtonElement;
  source: HTMLElement;
  originalOrder: number[];
  holdTimer: number;
  dragging: boolean;
}

export function bindGroupOrder(refresh: () => Promise<void>): void {
  const list = document.querySelector<HTMLElement>('#groupList');
  if (!list) return;
  let session: DragSession | null = null;

  list.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || session) return;
    const handle = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-drag-handle]');
    const source = handle?.closest<HTMLElement>('[data-draggable-group]');
    if (!handle || !source) return;

    event.preventDefault();
    const activeSession: DragSession = {
      pointerId: event.pointerId,
      handle,
      source,
      originalOrder: readGroupOrder(list),
      holdTimer: 0,
      dragging: false,
    };
    activeSession.holdTimer = window.setTimeout(() => {
      if (session !== activeSession) return;
      activeSession.dragging = true;
      activeSession.handle.classList.add('is-active');
      activeSession.source.classList.add('is-dragging');
      document.body.classList.add('is-reordering-groups');
    }, 180);
    session = activeSession;
    try {
      handle.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best-effort; the same list-level handlers still work without it.
    }
  });

  list.addEventListener('pointermove', (event) => {
    if (!session || session.pointerId !== event.pointerId || !session.dragging) return;
    event.preventDefault();
    const pointerTarget = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
    const target = pointerTarget?.closest<HTMLElement>('[data-draggable-group]');
    if (!target || target === session.source) {
      clearDropIndicators(list);
      return;
    }

    const bounds = target.getBoundingClientRect();
    const insertBefore = event.clientY < bounds.top + bounds.height / 2;
    clearDropIndicators(list);
    target.classList.add(insertBefore ? 'drop-before' : 'drop-after');
    const alreadyBefore = session.source.nextElementSibling === target;
    const alreadyAfter = target.nextElementSibling === session.source;
    if (insertBefore && !alreadyBefore) list.insertBefore(session.source, target);
    if (!insertBefore && !alreadyAfter) list.insertBefore(session.source, target.nextElementSibling);
  });

  list.addEventListener('pointerup', (event) => {
    if (!session || session.pointerId !== event.pointerId) return;
    void finishDrag(false);
  });

  list.addEventListener('pointercancel', (event) => {
    if (!session || session.pointerId !== event.pointerId) return;
    void finishDrag(true);
  });

  async function finishDrag(cancelled: boolean): Promise<void> {
    if (!session) return;
    const completedSession = session;
    session = null;
    window.clearTimeout(completedSession.holdTimer);
    clearDragStyles(list!, completedSession.handle);
    if (!completedSession.dragging) return;

    const groupIds = readGroupOrder(list!);
    if (cancelled || sameOrder(groupIds, completedSession.originalOrder)) {
      if (cancelled) await refresh();
      return;
    }

    try {
      await reorderGroups(groupIds);
      await refresh();
    } catch (error) {
      showError(errorMessage(error));
      await refresh();
    }
  }
}

function readGroupOrder(list: HTMLElement): number[] {
  return Array.from(list.querySelectorAll<HTMLElement>('[data-draggable-group]'))
    .map((row) => Number(row.dataset.draggableGroup));
}

function sameOrder(left: number[], right: number[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function clearDropIndicators(list: HTMLElement): void {
  list.querySelectorAll<HTMLElement>('[data-draggable-group]').forEach((row) => {
    row.classList.remove('drop-before', 'drop-after');
  });
}

function clearDragStyles(list: HTMLElement, handle: HTMLButtonElement): void {
  handle.classList.remove('is-active');
  document.body.classList.remove('is-reordering-groups');
  list.querySelectorAll<HTMLElement>('[data-draggable-group]').forEach((row) => {
    row.classList.remove('is-dragging', 'drop-before', 'drop-after');
  });
}
