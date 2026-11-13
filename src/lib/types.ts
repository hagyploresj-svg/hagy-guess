export interface LatLng { lat: number; lng: number }

/** İstemciye giden görüntü bilgisi. Konum (koordinat) ASLA içermez. */
export interface RoundImage {
  imageId: string;
  sequenceId: string | null;
  isPano: boolean;
  imageUrl: string;
  creator: string | null;
  capturedAt: string | null;
}

export interface GuessResult { actual: LatLng; distanceKm: number; score: number }

export type RoomStatus = 'lobby' | 'starting' | 'playing' | 'results' | 'finished';

export interface PublicPlayer {
  id: string; nickname: string; isHost: boolean; totalScore: number; hasGuessed: boolean;
}

export interface RoomState {
  serverNow: number;
  room: {
    id: string; code: string; status: RoomStatus; totalRounds: number;
    timeLimitSec: number; currentRound: number; roundEndsAt: string | null;
  };
  players: PublicPlayer[];
  me: { id: string; isHost: boolean };
  round: { roundNo: number; image: RoundImage } | null;
  reveal: {
    actual: LatLng;
    guesses: { playerId: string; lat: number; lng: number; distanceKm: number; score: number }[];
  } | null;
}

export interface Creds { playerId: string; secret: string }
