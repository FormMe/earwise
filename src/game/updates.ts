import { create } from 'zustand';

/** A new app version is waiting; it is applied when the learner isn't in a lesson. */
export const useUpdate = create<{ ready: boolean; apply: (() => void) | null }>(() => ({ ready: false, apply: null }));
