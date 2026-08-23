"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ConnectionQuality,
  ConnectionState,
  DisconnectReason,
  Room,
  RoomEvent,
  Track,
  type Participant,
  type RemoteTrack,
  type RemoteTrackPublication,
} from "livekit-client";
import {
  SCREEN_SHARE_FPS,
  SCREEN_SHARE_FPS_FALLBACK,
  SCREEN_SHARE_HEIGHT,
  SCREEN_SHARE_MAX_BITRATE,
  SCREEN_SHARE_MAX_BITRATE_FALLBACK,
  SCREEN_SHARE_WIDTH,
} from "@/lib/livekit/config";
import type { ConnectedParticipant, ConnectionStatusState, SessionUser } from "@/types";

export type VoiceRoomErrorCode =
  | "mic-permission-denied"
  | "mic-not-found"
  | "screen-share-denied"
  | "screen-share-unsupported"
  | "already-sharing"
  | "token-failed"
  | "connection-failed"
  | "unknown";

export interface VoiceRoomError {
  code: VoiceRoomErrorCode;
  message: string;
}

export interface RemoteScreenShare {
  participantIdentity: string;
  participantName: string;
  track: RemoteTrack;
}

interface UseVoiceRoomResult {
  participants: ConnectedParticipant[];
  localScreenShareTrack: import("livekit-client").LocalVideoTrack | null;
  remoteScreenShare: RemoteScreenShare | null;
  capturedResolution: { width: number; height: number } | null;
  isMuted: boolean;
  isSharingScreen: boolean;
  micReady: boolean;
  connectionStatus: ConnectionStatusState;
  error: VoiceRoomError | null;
  dismissError: () => void;
  toggleMute: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  leave: () => void;
}

const ERROR_MESSAGES: Record<VoiceRoomErrorCode, string> = {
  "mic-permission-denied":
    "Permissão de microfone negada. Habilite o microfone nas configurações do navegador para falar na sala.",
  "mic-not-found": "Nenhum microfone foi encontrado neste dispositivo.",
  "screen-share-denied": "Compartilhamento de tela cancelado ou não autorizado.",
  "screen-share-unsupported":
    "Este navegador/dispositivo não suporta compartilhamento de tela.",
  "already-sharing": "Outra pessoa já está compartilhando a tela nesta sala.",
  "token-failed": "Não foi possível entrar na sala. Recarregue a página e tente novamente.",
  "connection-failed": "Falha na conexão com o servidor de voz. Tente novamente.",
  unknown: "Ocorreu um erro inesperado.",
};

function buildError(code: VoiceRoomErrorCode, override?: string): VoiceRoomError {
  return { code, message: override || ERROR_MESSAGES[code] };
}

function toParticipant(p: Participant, isLocal: boolean): ConnectedParticipant {
  return {
    identity: p.identity,
    name: p.name || p.identity,
    isSpeaking: p.isSpeaking,
    isMuted: !p.isMicrophoneEnabled,
    isLocal,
    isSharingScreen: p.isScreenShareEnabled,
  };
}

export function useVoiceRoom(roomName: string | null, user: SessionUser): UseVoiceRoomResult {
  const roomRef = useRef<Room | null>(null);
  const intentionalLeaveRef = useRef(false);
  const screenShareQualityRef = useRef<"high" | "fallback">("high");
  const downgradingRef = useRef(false);

  const [participants, setParticipants] = useState<ConnectedParticipant[]>([]);
  const [localScreenShareTrack, setLocalScreenShareTrack] =
    useState<import("livekit-client").LocalVideoTrack | null>(null);
  const [remoteScreenShare, setRemoteScreenShare] = useState<RemoteScreenShare | null>(null);
  const [capturedResolution, setCapturedResolution] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatusState>("reconnecting");
  const [error, setError] = useState<VoiceRoomError | null>(null);

  const dismissError = useCallback(() => setError(null), []);

  const resync = useCallback((room: Room) => {
    const local = toParticipant(room.localParticipant, true);
    const remotes = Array.from(room.remoteParticipants.values()).map((p) =>
      toParticipant(p, false),
    );
    const all = [local, ...remotes].sort((a, b) => {
      if (a.isLocal !== b.isLocal) return a.isLocal ? -1 : 1;
      return a.name.localeCompare(b.name, "pt-BR");
    });
    setParticipants(all);
    setIsMuted(!room.localParticipant.isMicrophoneEnabled);
    setIsSharingScreen(room.localParticipant.isScreenShareEnabled);

    // Find whichever remote screen share is currently subscribed & active.
    let found: RemoteScreenShare | null = null;
    for (const p of room.remoteParticipants.values()) {
      const pub = p.getTrackPublication(Track.Source.ScreenShare) as
        | RemoteTrackPublication
        | undefined;
      if (pub?.isSubscribed && pub.track) {
        found = { participantIdentity: p.identity, participantName: p.name || p.identity, track: pub.track };
        break;
      }
    }
    setRemoteScreenShare(found);
  }, []);

  useEffect(() => {
    if (!roomName) return;
    intentionalLeaveRef.current = false;
    screenShareQualityRef.current = "high";
    // Resets state as we start connecting to the (new) LiveKit room — an
    // external system sync, not derived render state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
    setConnectionStatus("reconnecting");

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      publishDefaults: {
        simulcast: true,
        videoCodec: "vp8",
        screenShareEncoding: {
          maxBitrate: SCREEN_SHARE_MAX_BITRATE,
          maxFramerate: SCREEN_SHARE_FPS,
        },
      },
    });
    roomRef.current = room;

    const onAnyChange = () => resync(room);

    room
      .on(RoomEvent.ParticipantConnected, onAnyChange)
      .on(RoomEvent.ParticipantDisconnected, onAnyChange)
      .on(RoomEvent.ActiveSpeakersChanged, onAnyChange)
      .on(RoomEvent.TrackMuted, onAnyChange)
      .on(RoomEvent.TrackUnmuted, onAnyChange)
      .on(RoomEvent.TrackPublished, onAnyChange)
      .on(RoomEvent.TrackUnpublished, onAnyChange)
      .on(RoomEvent.TrackSubscribed, onAnyChange)
      .on(RoomEvent.TrackUnsubscribed, onAnyChange)
      .on(RoomEvent.LocalTrackPublished, onAnyChange)
      .on(RoomEvent.LocalTrackUnpublished, onAnyChange)
      .on(RoomEvent.Reconnecting, () => setConnectionStatus("reconnecting"))
      .on(RoomEvent.Reconnected, () => {
        setConnectionStatus("connected");
        resync(room);
      })
      .on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
        setConnectionStatus("disconnected");
        if (!intentionalLeaveRef.current) {
          console.warn("[voice] desconectado da sala, motivo:", reason);
        }
      })
      .on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        if (state === ConnectionState.Connected) setConnectionStatus("connected");
        else if (state === ConnectionState.Reconnecting || state === ConnectionState.Connecting) {
          setConnectionStatus("reconnecting");
        } else if (state === ConnectionState.Disconnected) {
          setConnectionStatus("disconnected");
        }
      })
      .on(RoomEvent.MediaDevicesError, (err: Error) => {
        const name = (err as DOMException).name;
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setError(buildError("mic-permission-denied"));
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setError(buildError("mic-not-found"));
        } else {
          setError(buildError("unknown", err.message));
        }
        setMicReady(false);
      })
      .on(
        RoomEvent.ConnectionQualityChanged,
        (quality: ConnectionQuality, participant: Participant) => {
          if (
            participant.sid !== room.localParticipant.sid ||
            !room.localParticipant.isScreenShareEnabled ||
            screenShareQualityRef.current !== "high" ||
            downgradingRef.current
          ) {
            return;
          }
          if (quality === ConnectionQuality.Poor) {
            downgradingRef.current = true;
            room.localParticipant
              .setScreenShareEnabled(
                true,
                {
                  video: true,
                  resolution: {
                    width: SCREEN_SHARE_WIDTH,
                    height: SCREEN_SHARE_HEIGHT,
                    frameRate: SCREEN_SHARE_FPS_FALLBACK,
                  },
                  contentHint: "detail",
                },
                {
                  source: Track.Source.ScreenShare,
                  videoEncoding: {
                    maxBitrate: SCREEN_SHARE_MAX_BITRATE_FALLBACK,
                    maxFramerate: SCREEN_SHARE_FPS_FALLBACK,
                  },
                },
              )
              .then(() => {
                screenShareQualityRef.current = "fallback";
              })
              .catch(() => {
                // ignore — keep sharing at current quality if the downgrade republish fails
              })
              .finally(() => {
                downgradingRef.current = false;
              });
          }
        },
      );

    let cancelled = false;

    async function connect() {
      try {
        const res = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomName }),
        });
        const body = await res.json();
        if (!res.ok) {
          if (!cancelled) setError(buildError("token-failed", body?.error));
          return;
        }
        if (cancelled) return;

        await room.connect(body.url, body.token, { autoSubscribe: true });
        if (cancelled) return;

        try {
          await room.localParticipant.setMicrophoneEnabled(true, {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          });
          setMicReady(true);
        } catch (micErr) {
          const name = (micErr as DOMException).name;
          if (name === "NotAllowedError" || name === "PermissionDeniedError") {
            setError(buildError("mic-permission-denied"));
          } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
            setError(buildError("mic-not-found"));
          } else {
            setError(buildError("unknown"));
          }
        }

        setConnectionStatus("connected");
        resync(room);
      } catch {
        if (!cancelled) setError(buildError("connection-failed"));
      }
    }

    connect();

    return () => {
      cancelled = true;
      intentionalLeaveRef.current = true;
      room.disconnect();
      roomRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, user.userId]);

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const wasEnabled = room.localParticipant.isMicrophoneEnabled;
    try {
      await room.localParticipant.setMicrophoneEnabled(!wasEnabled);
      setIsMuted(wasEnabled); // mic was on -> now muted, and vice versa
    } catch (err) {
      const name = (err as DOMException).name;
      if (name === "NotAllowedError") setError(buildError("mic-permission-denied"));
      else if (name === "NotFoundError") setError(buildError("mic-not-found"));
      else setError(buildError("unknown"));
    }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;

    if (room.localParticipant.isScreenShareEnabled) {
      await room.localParticipant.setScreenShareEnabled(false);
      setLocalScreenShareTrack(null);
      setCapturedResolution(null);
      screenShareQualityRef.current = "high";
      return;
    }

    const alreadySharing = Array.from(room.remoteParticipants.values()).some(
      (p) => p.isScreenShareEnabled,
    );
    if (alreadySharing) {
      setError(buildError("already-sharing"));
      return;
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
      setError(buildError("screen-share-unsupported"));
      return;
    }

    try {
      const publication = await room.localParticipant.setScreenShareEnabled(
        true,
        {
          video: true,
          resolution: {
            width: SCREEN_SHARE_WIDTH,
            height: SCREEN_SHARE_HEIGHT,
            frameRate: SCREEN_SHARE_FPS,
          },
          contentHint: "detail",
          audio: false,
          selfBrowserSurface: "exclude",
          surfaceSwitching: "include",
        },
        {
          source: Track.Source.ScreenShare,
          videoEncoding: {
            maxBitrate: SCREEN_SHARE_MAX_BITRATE,
            maxFramerate: SCREEN_SHARE_FPS,
          },
        },
      );

      const track = publication?.videoTrack ?? null;
      setLocalScreenShareTrack(track ?? null);
      const settings = track?.mediaStreamTrack.getSettings();
      if (settings?.width && settings?.height) {
        setCapturedResolution({ width: settings.width, height: settings.height });
      }
    } catch (err) {
      const name = (err as DOMException)?.name;
      if (name === "NotAllowedError") setError(buildError("screen-share-denied"));
      else if (name === "NotFoundError") setError(buildError("screen-share-unsupported"));
      else setError(buildError("unknown"));
    }
  }, []);

  const leave = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    intentionalLeaveRef.current = true;
    room.disconnect();
  }, []);

  return {
    participants,
    localScreenShareTrack,
    remoteScreenShare,
    capturedResolution,
    isMuted,
    isSharingScreen,
    micReady,
    connectionStatus,
    error,
    dismissError,
    toggleMute,
    toggleScreenShare,
    leave,
  };
}
