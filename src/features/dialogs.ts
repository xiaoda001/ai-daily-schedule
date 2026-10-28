export function bindDialogDismissal(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-close]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelector<HTMLDialogElement>(`#${button.dataset.close}`)?.close();
    });
  });

  document.querySelectorAll<HTMLDialogElement>('.modal').forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog && dialog.id !== 'deleteGroupDialog') dialog.close();
    });
  });
}
