import { invokeCommand } from '../shared/tauri';

export const getStorageDirectory = (): Promise<string> => invokeCommand('get_storage_directory');

export const moveStorageDirectory = (directory: string): Promise<string> =>
  invokeCommand('move_storage_directory', { directory });
