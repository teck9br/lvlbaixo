import "server-only";
import { AccessToken, TrackSource, type VideoGrant } from "livekit-server-sdk";

const TOKEN_TTL = "6h";

/**
 * Mints a short-lived LiveKit access token server-side. Never exposes
 * LIVEKIT_API_SECRET to the client — only the resulting JWT crosses the
 * network to the browser.
 */
export async function createLiveKitToken(params: {
  identity: string;
  name: string;
  roomName: string;
}): Promise<string> {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error(
      "LiveKit não está configurado: defina LIVEKIT_API_KEY e LIVEKIT_API_SECRET.",
    );
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: params.identity,
    name: params.name,
    ttl: TOKEN_TTL,
  });

  const grant: VideoGrant = {
    room: params.roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    // Screen share audio counts as its own source; both are allowed
    // alongside the mic. Camera is deliberately left out — this app is
    // audio + screen share only.
    canPublishSources: [
      TrackSource.MICROPHONE,
      TrackSource.SCREEN_SHARE,
      TrackSource.SCREEN_SHARE_AUDIO,
    ],
  };
  at.addGrant(grant);

  return at.toJwt();
}
