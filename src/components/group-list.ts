import type { GroupSelection, GroupView, TaskGroup } from '../domain/task';
import { escapeHtml } from '../shared/html';
import { icon } from './icons';

const COLORS = ['#618f82', '#d39a5e', '#8985b1', '#6284a8', '#b77782'];

export function renderGroupList(
  groups: TaskGroup[],
  archivedGroups: TaskGroup[],
  selection: GroupSelection,
  view: GroupView,
): void {
  const groupList = document.querySelector<HTMLElement>('#groupList');
  if (!groupList) return;
  const displayedGroups = view === 'archive' ? archivedGroups : groups;
  const allSelected = selection === 'all' && view === 'active';
  const allCount = groups.reduce((sum, group) => sum + group.taskCount, 0);
  const allRow = view === 'active'
    ? `<div class="group-row"><button class="group-item all-group ${allSelected ? 'is-selected' : ''}" data-group="all" aria-current="${allSelected ? 'page' : 'false'}"><span class="group-dot all-dot" aria-hidden="true"></span><span class="group-name">全部任务</span><span class="group-count">${allCount}</span></button></div>`
    : '';
  const rows = displayedGroups.map((group, index) => {
    const selected = selection === group.id;
    const color = COLORS[index % COLORS.length];
    const menuActions = view === 'archive'
      ? `<button type="button" data-group-action="restore" data-group-id="${group.id}">恢复分组</button><button type="button" data-group-action="delete" data-group-id="${group.id}">删除分组</button>`
      : `<button type="button" data-group-action="rename" data-group-id="${group.id}">重命名</button><button type="button" data-group-action="archive" data-group-id="${group.id}">归档</button><button type="button" data-group-action="delete" data-group-id="${group.id}">删除分组</button>`;
    return `<div class="group-row" ${view === 'active' ? `data-draggable-group="${group.id}"` : ''}>
      ${view === 'active' ? `<button class="icon-button group-drag-handle" data-drag-handle="${group.id}" type="button" aria-label="按住拖拽排序：${escapeHtml(group.name)}" title="拖拽排序">${icon('move')}</button>` : ''}
      <button class="group-item ${selected ? 'is-selected' : ''}" data-group="${group.id}" aria-current="${selected ? 'page' : 'false'}" style="--group-color:${color}"><span class="group-dot" aria-hidden="true"></span><span class="group-name">${escapeHtml(group.name)}</span><span class="group-count">${group.taskCount}</span></button>
      <button class="icon-button group-menu-button" data-group-action="toggle" data-group-id="${group.id}" type="button" aria-label="${escapeHtml(group.name)}分组操作" aria-expanded="false">${icon('more')}</button>
      <div class="group-menu" data-group-menu="${group.id}" hidden>${menuActions}</div>
    </div>`;
  }).join('');
  groupList.innerHTML = allRow + rows || `<div class="group-list-empty">${view === 'archive' ? '暂无归档分组' : '暂无任务分组'}</div>`;

  const title = document.querySelector<HTMLHeadingElement>('#pageTitle');
  const headingLabel = document.querySelector<HTMLElement>('#groupHeadingLabel');
  const addButton = document.querySelector<HTMLButtonElement>('#newGroupButton');
  const archiveButton = document.querySelector<HTMLButtonElement>('#archiveButton');
  if (headingLabel) headingLabel.textContent = view === 'archive' ? '归档分组' : '任务分组';
  if (addButton) addButton.hidden = view === 'archive';
  if (archiveButton) {
    archiveButton.setAttribute('aria-pressed', String(view === 'archive'));
    archiveButton.querySelector('span')!.textContent = view === 'archive' ? '返回任务' : '归档';
    archiveButton.innerHTML = `${icon(view === 'archive' ? 'restore' : 'archive')}<span>${view === 'archive' ? '返回任务' : '归档'}</span>`;
  }
  if (title) {
    title.textContent = view === 'archive'
      ? (selection === 'all' ? '归档' : archivedGroups.find((group) => group.id === selection)?.name ?? '归档分组')
      : (allSelected ? '全部任务' : groups.find((group) => group.id === selection)?.name ?? '任务分组');
  }
}
