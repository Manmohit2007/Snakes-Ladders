export type RoomState = 'lobby' | 'playing' | 'finished';

export interface RoomData {
  state: RoomState;
  names: string[];
  devices: string[];
  turn: number;
  positions: number[];
  lastRoll: number | '-';
  chat?: { [key: string]: ChatMessage };
  winners?: number[]; // Array of player indexes in order of winning
}

export interface ChatMessage {
  uid: string;
  name: string;
  text: string;
  time: number;
  replyToName?: string;
  replyToText?: string;
}

export interface Standing {
  name: string;
  pos: number;
  color: string;
}
