type Invoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>;

declare global {
  interface Window {
    __TAURI__?: { core: { invoke: Invoke } };
  }
}

export const isTauri = (): boolean => Boolean(window.__TAURI__?.core.invoke);

export function invokeCommand<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const invoke = window.__TAURI__?.core.invoke;
  if (!invoke) return Promise.reject(new Error('请从 Tauri 桌面应用启动任务清单。'));
  return invoke<T>(command, args);
}
