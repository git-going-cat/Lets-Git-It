export interface CommandOption {
  option: string;
  description: string;
}

export interface Command {
  commandId: string;
  name: string;
  description: string;
  imageUrl: string;
  isInGame: boolean;
  options: CommandOption[];
}

export interface DictionaryResponse {
  commands: Command[];
}
