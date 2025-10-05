import { atom } from 'nanostores';

export const zenModeStore = atom<boolean>(false);

export function toggleZenMode() {
  zenModeStore.set(!zenModeStore.get());
}
