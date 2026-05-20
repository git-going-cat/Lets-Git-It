export interface TutorialCommand {
  sequence: number;
  command: string;
  explanation?: string | null;
}

export interface TutorialStep {
  order: number;
  title: string;
  description: string;
  commands: TutorialCommand[];
}
