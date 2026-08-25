import "server-only";
import { RoomServiceClient, TrackSource } from "livekit-server-sdk";
import type { VoicePresenceParticipant } from "@/types";

/** RoomServiceClient wants an http(s) URL; the app otherwise only ever
 * deals with the wss:// URL browsers connect with. */
function toHttpUrl(wsUrl: string): string {
  return wsUrl.replace(/^ws/, "http");
}

/**
 * Asks LiveKit who is currently connected to each of the fixed voice
 * rooms, so the sidebar can show names/avatars for rooms the viewer
 * hasn't joined themselves — LiveKit rooms are otherwise invisible unless
 * you're actually connected to them.
 *
 * A room LiveKit has never seen (nobody has joined it yet) 404s; that
 * just means it's empty, same as any other lookup failure here — this
 * never throws, so a LiveKit hiccup degrades to "nobody's around" rather
 * than breaking the sidebar.
 */
export async function listVoicePresence(
  roomNames: readonly string[],
): Promise<Record<string, VoicePresenceParticipant[]>> {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!apiKey || !apiSecret || !wsUrl) {
    return Object.fromEntries(roomNames.map((name) => [name, []]));
  }

  const client = new RoomServiceClient(toHttpUrl(wsUrl), apiKey, apiSecret);

  const entries = await Promise.all(
    roomNames.map(async (roomName) => {
      try {
        const participants = await client.listParticipants(roomName);
        const people: VoicePresenceParticipant[] = participants.map((p) => {
          const micTrack = p.tracks.find((t) => t.source === TrackSource.MICROPHONE);
          return {
            identity: p.identity,
            name: p.name || p.identity,
            // No mic track published yet counts as muted too — same "not
            // sending audio" semantics as the in-room isMuted state.
            isMuted: !micTrack || micTrack.muted,
          };
        });
        return [roomName, people] as const;
      } catch {
        return [roomName, []] as const;
      }
    }),
  );

  return Object.fromEntries(entries);
}
