import { icon } from './icons';
import { renderTaskDialogs } from './task-dialogs';
import { renderGroupDialogs } from './group-dialogs';
import { renderErrorDialog } from './error-dialog';
import { renderSettingsDialog } from './settings-dialog';

export function renderAppShell(root: HTMLElement): void {
  root.innerHTML = `
    <div class="window-shell">
      <div class="app-layout">
        <aside class="sidebar" aria-label="任务分组">
          <div class="brand"><span class="brand-mark" aria-hidden="true">✓</span><span>我的任务</span></div>
          <div class="group-heading"><span id="groupHeadingLabel">任务分组</span><button class="icon-button group-add" id="newGroupButton" type="button" aria-label="新建分组">${icon('plus')}</button></div>
          <nav class="group-list" id="groupList"></nav>
          <div class="sidebar-footer"><button class="sidebar-nav-button" id="archiveButton" type="button" aria-pressed="false">${icon('archive')}<span>归档</span></button><button class="sidebar-nav-button" id="settingsButton" type="button">${icon('settings')}<span>设置</span></button></div>
        </aside>
        <main class="main-panel">
          <header class="main-topbar"><button class="primary-button" id="newTaskButton" type="button">${icon('plus')}<span>添加任务</span></button></header>
          <section class="content" aria-label="任务内容">
            <div class="page-heading"><h1 id="pageTitle">全部任务</h1><span class="task-total" id="taskTotal">0 项任务</span></div>
            <div class="status-tabs" role="tablist" aria-label="任务状态"></div>
            <div class="task-list" id="taskList" role="tabpanel"></div>
            <div class="empty-state" id="emptyState" hidden><span class="empty-icon" aria-hidden="true">✓</span><strong id="emptyTitle">这里还没有任务</strong></div>
            <div class="page-error" id="pageError" role="alert" aria-live="polite" hidden></div>
          </section>
        </main>
      </div>
    </div>
    ${renderTaskDialogs()}
    ${renderGroupDialogs()}
    ${renderErrorDialog()}
    ${renderSettingsDialog()}
    <div class="toast" id="toast" role="status" aria-live="polite"></div>
  `;
}
