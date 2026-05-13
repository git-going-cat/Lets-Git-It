export interface TutorialCommand {
  sequence: number;
  command: string;
  explanation: string;
}

export interface TutorialStep {
  order: number;
  title: string;
  description: string;
  commands: TutorialCommand[];
}
