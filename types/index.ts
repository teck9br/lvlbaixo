export type RoomType = "text" | "voice";
export type RoomCategory = "text" | "voice" | "afk";

export interface RoomRecord {
  id: string;
  name: string;
  slug: string;
  type: RoomType;
  category: RoomCategory;
  position: number;
  topic: string | null;
}

export interface MessageRecord {
  id: string;
  room_id: string;
  user_id: string | null;
  username: string;
  content: string | null;
  created_at: string;
  poll_id: string | null;
}

export interface PollOption {
  id: string;
  label: string;
}

export interface PollRecord {
  id: string;
  room_id: string;
  question: string;
  options: PollOption[];
  created_by_user_id: string | null;
  created_by_username: string;
  created_at: string;
  closed_at: string | null;
}

export interface PollVoteRecord {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
  username: string;
  created_at: string;
}

export interface SessionUser {
  userId: string;
  username: string;
}

export interface ConnectedParticipant {
  identity: string;
  name: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isLocal: boolean;
  isSharingScreen: boolean;
}

export type ConnectionStatusState = "connected" | "reconnecting" | "disconnected";

/** One person currently connected to a voice room, as reported by LiveKit
 * (via GET /api/livekit/presence) — not necessarily the viewer themselves. */
export interface VoicePresenceParticipant {
  identity: string;
  name: string;
  isMuted: boolean;
}

export interface ApiErrorBody {
  error: string;
}
