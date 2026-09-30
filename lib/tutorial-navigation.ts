type TutorialActions = {
  garden: () => void;
  games: () => void;
  assign: () => void;
  water: () => void;
  focus: (id: string) => void;
  events: () => void;
};

export function navigateTutorial(step: number, actions: TutorialActions) {
  if (step === 0) actions.assign();
  else if (step === 4) actions.events();
  else if (step === 3) actions.games();
  else {
    actions.garden();
    if (step === 1) actions.focus("tree-name");
    if (step === 2) actions.water();
  }
}
