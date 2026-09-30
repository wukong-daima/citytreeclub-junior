export type Tree = {
  id: string;
  name: string;
  species: string;
  lat: number;
  lng: number;
  location: string;
  sample: boolean;
  distance?: number;
};
export type Application = {
  id: string;
  treeId: string | null;
  kind: string;
  message: string;
  startDate: string;
  endDate: string;
  status: string;
};
export type Garden = {
  tree: Tree | null;
  xp: number;
  visits: number;
  water: number;
  compost: number;
  decoration: string;
  nickname: string;
  tutorialCompleted: boolean;
  gameWins: number;
  careDays: number;
  points: number;
  applications: Application[];
  todayActions: string[];
  logs: {
    action: string;
    text?: string;
    createdAt?: string;
    created_at?: string;
  }[];
  interests: string[];
  gameRun?: {
    id: string;
    game: "bugs" | "prune" | "soil";
    targets: { id: string; x: number; y: number }[];
    startedAt: string | number;
  };
};
export type Act = (
  action: string,
  extra?: Record<string, unknown>,
) => Promise<Garden | null>;
export type Celebration = {
  id: number;
  action: string;
  title: string;
  xp: number;
  levelUp: boolean;
};
