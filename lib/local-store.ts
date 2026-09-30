import type { GameTarget } from "./domain.ts";

export type Owned = {
  treeId: string;
  nickname: string;
  decoration: string;
  health: string[];
  girth: number | null;
  size: string;
  species: string;
};
export type Observation = {
  id: string;
  treeId: string;
  text: string;
  health: string[];
  girth: number | null;
  size: string;
  photoKey: string | null;
  createdAt: string;
};
export type LocalState = {
  active: string | null;
  tutorialCompleted: boolean;
  profile: { displayName: string; areas: string[] };
  owned: Owned[];
  favorites: string[];
  actions: {
    id: string;
    treeId: string;
    action: string;
    day: string;
    xp: number;
    text: string;
    createdAt: string;
  }[];
  runs: {
    id: string;
    treeId: string;
    game: string;
    targets: GameTarget[];
    startedAt: string;
    completed: boolean;
  }[];
  applications: {
    id: string;
    treeId: string;
    kind: string;
    message: string;
    startDate: string;
    endDate: string;
    status: string;
  }[];
  records: Observation[];
  reports: {
    id: string;
    treeId: string;
    text: string;
    kind: string;
    details: Record<string, unknown>;
    status: string;
    createdAt: string;
  }[];
  photos: { key: string; blob: Blob }[];
};
export function emptyState(): LocalState {
  return {
    active: null,
    tutorialCompleted: false,
    profile: { displayName: "나무 친구", areas: [] },
    owned: [],
    favorites: [],
    actions: [],
    runs: [],
    applications: [],
    records: [],
    reports: [],
    photos: [],
  };
}
export interface LocalStore {
  update<T>(change: (state: LocalState) => T): Promise<T>;
}

// A single readwrite transaction owns both read and replacement. IndexedDB serializes
// transactions against this store across tabs; callbacks must remain synchronous.
export function createIndexedDbStore(
  factory: IDBFactory = globalThis.indexedDB,
): LocalStore {
  let connection: Promise<IDBDatabase> | undefined;
  function open() {
    if (!factory)
      return Promise.reject(
        new Error("이 브라우저에서 저장소를 사용할 수 없어요."),
      );
    return (connection ??= new Promise((resolve, reject) => {
      const request = factory.open("citytree-personal", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("state");
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          connection = undefined;
        };
        resolve(db);
      };
      request.onerror = () => {
        connection = undefined;
        reject(request.error);
      };
      request.onblocked = () => {
        connection = undefined;
        reject(new Error("다른 탭을 닫고 다시 시도해 주세요."));
      };
    }));
  }
  return {
    async update<T>(change: (state: LocalState) => T): Promise<T> {
      const db = await open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction("state", "readwrite");
        const store = tx.objectStore("state");
        let result: T;
        let failure: unknown;
        tx.oncomplete = () => resolve(result);
        tx.onabort = () =>
          reject(failure ?? tx.error ?? new Error("저장하지 못했어요."));
        tx.onerror = () => {
          failure ??= tx.error;
        };
        const request = store.get("current");
        request.onsuccess = () => {
          try {
            const state: LocalState = request.result ?? emptyState();
            result = change(state);
            store.put(state, "current");
          } catch (error) {
            failure = error;
            tx.abort();
          }
        };
      });
    },
  };
}
