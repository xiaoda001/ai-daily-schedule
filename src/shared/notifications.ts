export function showToast(message: string): void {
  const element = document.querySelector<HTMLDivElement>('#toast');
  if (!element) return;
  element.textContent = message;
  element.classList.add('is-visible');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => element.classList.remove('is-visible'), 2100);
}

export function showError(message: string): void {
  const messageElement = document.querySelector<HTMLElement>('#errorDialogMessage');
  const dialog = document.querySelector<HTMLDialogElement>('#errorDialog');
  if (!messageElement || !dialog) return;
  messageElement.textContent = message;
  if (!dialog.open) dialog.showModal();
}

export function showPageError(message: string): void {
  const element = document.querySelector<HTMLElement>('#pageError');
  if (!element) return;
  element.textContent = message;
  element.hidden = false;
}

export function clearPageError(): void {
  const element = document.querySelector<HTMLElement>('#pageError');
  if (element) element.hidden = true;
}

export namespace showToast {
  export let timer: number;
}
