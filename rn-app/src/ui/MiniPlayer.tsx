import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  Image,
  LayoutChangeEvent,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Audio, AVPlaybackStatus} from 'expo-av';
import {useThemeStore} from '../state/themeStore';
import {usePlayerStore} from '../state/playerStore';
import {useSettingsStore} from '../state/settingsStore';
import {useSessionStore} from '../state/sessionStore';
import {PipedClient} from '../network/pipedClient';
import {MixTrack} from '../state/mixStore';
import {useDashboardStore} from '../state/dashboardStore';
import {useMixStore} from '../state/mixStore';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const retryAsync = async <T,>(fn: () => Promise<T>, attempts: number = 2, delayMs: number = 250): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await wait(delayMs);
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Request failed');
};

const asList = (payload: unknown): Array<Record<string, unknown>> => {
  if (Array.isArray(payload)) return payload as Array<Record<string, unknown>>;
  if (payload && typeof payload === 'object') {
    const maybeItems = (payload as {items?: unknown}).items;
    if (Array.isArray(maybeItems)) return maybeItems as Array<Record<string, unknown>>;
  }
  return [];
};

const pickBestHttpAudio = (streams?: Array<{url?: string; bitrate?: number}>, preferLowerBitrate: boolean = false): string | null =>
  streams
    ?.filter(track => typeof track.url === 'string' && String(track.url).startsWith('http'))
    .sort((a, b) =>
      preferLowerBitrate
        ? Number(a.bitrate || 0) - Number(b.bitrate || 0)
        : Number(b.bitrate || 0) - Number(a.bitrate || 0),
    )[0]
    ?.url || null;

const extractVideoId = (rawUrl?: string): string | null => {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();

  const watchMatch = trimmed.match(/[?&]v=([^&]+)/);
  if (watchMatch?.[1]) return decodeURIComponent(watchMatch[1]);

  const shortMatch = trimmed.match(/youtu\.be\/([^?&/]+)/);
  if (shortMatch?.[1]) return decodeURIComponent(shortMatch[1]);

  const plainMatch = trimmed.match(/\/watch\/([^?&/]+)/);
  if (plainMatch?.[1]) return decodeURIComponent(plainMatch[1]);

  return null;
};

const resolveTrackPlayback = async (
  item: MixTrack,
  options?: {preferLowerBitrate?: boolean},
): Promise<{streamUrl: string; durationMs: number; adsSkippedEstimate: number} | null> => {
  let resolvedStreamUrl: string | undefined;
  let durationMs = 180000;
  let adsSkippedEstimate = 1;

  const fetchStreamForVideoId = async (videoId: string): Promise<boolean> => {
    if (!videoId || videoId.startsWith('itunes-')) return false;
    const stream = (await retryAsync(() => PipedClient.getStream(videoId), 2, 250)) as {
      duration?: number;
      audioStreams?: Array<{url?: string; bitrate?: number}>;
    };
    const candidate = pickBestHttpAudio(stream.audioStreams, Boolean(options?.preferLowerBitrate));
    if (!candidate) return false;
    resolvedStreamUrl = candidate;
    durationMs = Math.round((Number(stream.duration) || 180) * 1000);
    adsSkippedEstimate = Math.max(1, Math.floor((stream.audioStreams?.length || 1) / 2));
    return true;
  };

  const directVideoId = extractVideoId(item.url);
  let hasPlayableStream = directVideoId ? await fetchStreamForVideoId(directVideoId) : false;

  if (!hasPlayableStream) {
    const query = `${item.title} ${item.artist}`.trim();
    const results = asList(await retryAsync(() => PipedClient.search(query, 'music_songs'), 2, 250));
    for (const candidate of results.slice(0, 5)) {
      const candidateUrl = typeof candidate.url === 'string' ? candidate.url : undefined;
      const candidateVideoId = extractVideoId(candidateUrl);
      if (!candidateVideoId) continue;
      hasPlayableStream = await fetchStreamForVideoId(candidateVideoId);
      if (hasPlayableStream) break;
    }
  }

  if (!hasPlayableStream && item.streamUrl?.startsWith('http')) {
    resolvedStreamUrl = item.streamUrl;
    durationMs = 30000;
    adsSkippedEstimate = 0;
  }

  if (!resolvedStreamUrl) return null;
  return {streamUrl: resolvedStreamUrl, durationMs, adsSkippedEstimate};
};

const computeNextIndex = (
  queueLength: number,
  currentIndex: number,
  repeatMode: 'off' | 'all' | 'one',
  shuffleEnabled: boolean,
  manual: boolean,
): number | null => {
  if (queueLength === 0) return null;
  if (currentIndex < 0) return 0;
  if (!manual && repeatMode === 'one') return currentIndex;

  if (shuffleEnabled && queueLength > 1) {
    let next = currentIndex;
    while (next === currentIndex) {
      next = Math.floor(Math.random() * queueLength);
    }
    return next;
  }

  const next = currentIndex + 1;
  if (next < queueLength) return next;
  if (repeatMode === 'all') return 0;
  return null;
};

const computePreviousIndex = (
  queueLength: number,
  currentIndex: number,
  repeatMode: 'off' | 'all' | 'one',
  shuffleEnabled: boolean,
): number | null => {
  if (queueLength === 0) return null;
  if (currentIndex < 0) return 0;

  if (shuffleEnabled && queueLength > 1) {
    let next = currentIndex;
    while (next === currentIndex) {
      next = Math.floor(Math.random() * queueLength);
    }
    return next;
  }

  const prev = currentIndex - 1;
  if (prev >= 0) return prev;
  if (repeatMode === 'all') return queueLength - 1;
  return null;
};

const formatClock = (valueMs: number): string => {
  const totalSeconds = Math.max(0, Math.floor(valueMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const recommendationIdPrefix = 'rec:';
const isRecommendedTrack = (track: MixTrack): boolean => track.id.startsWith(recommendationIdPrefix);

const trackIdentityKey = (track: MixTrack): string => {
  const urlKey = track.url?.trim();
  if (urlKey) return `url:${urlKey}`;
  return `meta:${track.title.toLowerCase()}|${track.artist.toLowerCase()}`;
};

const suggestionToTrack = (item: Record<string, unknown>, idx: number): MixTrack => ({
  id: `${recommendationIdPrefix}${String(item.url || item.title || `suggested-${idx}`)}`,
  title: String(item.title || `Suggested Track ${idx + 1}`),
  artist: String(item.uploaderName || 'Unknown Artist'),
  thumbnail: String(item.thumbnail || `https://picsum.photos/seed/suggest-thumb-${idx}/640/640`),
  avatar: String(
    item.uploaderAvatar ||
      `https://picsum.photos/seed/suggest-artist-${encodeURIComponent(String(item.uploaderName || 'unknown'))}/120/120`,
  ),
  url: item.url ? String(item.url) : undefined,
  streamUrl: item.streamUrl ? String(item.streamUrl) : undefined,
});

export function MiniPlayer(): React.JSX.Element | null {
  const colors = useThemeStore(state => state.colors);
  const radius = useThemeStore(state => state.radius);
  const spacing = useThemeStore(state => state.spacing);
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const streamUrl = usePlayerStore(state => state.streamUrl);
  const queue = usePlayerStore(state => state.queue);
  const currentIndex = usePlayerStore(state => state.currentIndex);
  const shuffleEnabled = usePlayerStore(state => state.shuffleEnabled);
  const repeatMode = usePlayerStore(state => state.repeatMode);
  const autoplayRecommendations = usePlayerStore(state => state.autoplayRecommendations);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const isBuffering = usePlayerStore(state => state.isBuffering);
  const setNowPlaying = usePlayerStore(state => state.setNowPlaying);
  const setQueue = usePlayerStore(state => state.setQueue);
  const setCurrentIndex = usePlayerStore(state => state.setCurrentIndex);
  const toggleShuffle = usePlayerStore(state => state.toggleShuffle);
  const cycleRepeatMode = usePlayerStore(state => state.cycleRepeatMode);
  const toggleAutoplayRecommendations = usePlayerStore(state => state.toggleAutoplayRecommendations);
  const setPlaying = usePlayerStore(state => state.setPlaying);
  const setBuffering = usePlayerStore(state => state.setBuffering);
  const stop = usePlayerStore(state => state.stop);
  const settingsValues = useSettingsStore(state => state.values);
  const isSynced = useSessionStore(state => state.isSynced);
  const recordStream = useDashboardStore(state => state.recordStream);
  const addHistoryTrack = useMixStore(state => state.addHistoryTrack);
  const soundRef = useRef<Audio.Sound | null>(null);
  const advancingRef = useRef(false);
  const appendingRecommendationsRef = useRef(false);
  const sleepTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [progressWidth, setProgressWidth] = useState(1);
  const [showQueue, setShowQueue] = useState(false);
  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [rating, setRating] = useState<'none' | 'like' | 'dislike'>('none');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [sleepMinutesLeft, setSleepMinutesLeft] = useState<number | null>(null);
  const preferLowerBitrate = Boolean(settingsValues['mali.dataSaver']) || Boolean(settingsValues['engine.forceOpus256']);

  useEffect(() => {
    const prepareAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          staysActiveInBackground: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
        });
      } catch {
        // no-op
      }
    };
    void prepareAudio();
  }, []);

  const resetSessionState = useCallback((message?: string) => {
    if (sleepTimeoutRef.current) {
      clearTimeout(sleepTimeoutRef.current);
      sleepTimeoutRef.current = null;
    }
    setPositionMs(0);
    setDurationMs(0);
    setShowQueue(false);
    setShowNowPlaying(false);
    setSleepMinutesLeft(null);
    setActionStatus(message ?? null);
    stop();
  }, [stop]);

  const playFromQueue = useCallback(
    async (queueSource: MixTrack[], nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= queueSource.length) return;
      const nextTrack = queueSource[nextIndex];
      const resolved = await resolveTrackPlayback(nextTrack, {preferLowerBitrate});
      if (!resolved) {
        setActionStatus(`No playable stream found for ${nextTrack.title}`);
        return;
      }
      setQueue(queueSource, nextIndex);
      setCurrentIndex(nextIndex);
      setNowPlaying(nextTrack, resolved.streamUrl, {queue: queueSource, index: nextIndex});
      recordStream({durationMs: resolved.durationMs, adsSkippedEstimate: resolved.adsSkippedEstimate});
      addHistoryTrack(nextTrack);
      setActionStatus(`Playing ${nextTrack.title}`);
    },
    [addHistoryTrack, preferLowerBitrate, recordStream, setCurrentIndex, setNowPlaying, setQueue],
  );

  const playQueueIndex = useCallback(
    async (nextIndex: number) => {
      await playFromQueue(queue, nextIndex);
    },
    [playFromQueue, queue],
  );

  const appendRecommendations = useCallback(async (): Promise<boolean> => {
    if (!autoplayRecommendations || !currentTrack) return false;
    const sourceVideoId = extractVideoId(currentTrack.url);
    if (!sourceVideoId || sourceVideoId.startsWith('itunes-')) return false;

    const payload = await retryAsync(() => PipedClient.getSuggestions(sourceVideoId), 2, 250);
    const rawList = asList(payload);
    if (rawList.length === 0) return false;

    const existingTrackKeys = new Set(queue.map(trackIdentityKey));
    const nextSuggested = rawList
      .slice(0, 20)
      .map(suggestionToTrack)
      .filter(item => !existingTrackKeys.has(trackIdentityKey(item)));

    if (nextSuggested.length === 0) return false;
    const appendedQueue = [...queue, ...nextSuggested];
    setQueue(appendedQueue, currentIndex);
    setActionStatus(`Autoplay added ${nextSuggested.length} recommendations`);
    return true;
  }, [autoplayRecommendations, currentIndex, currentTrack, queue, setQueue]);

  const playNext = useCallback(
    async (manual: boolean) => {
      let nextIndex = computeNextIndex(queue.length, currentIndex, repeatMode, shuffleEnabled, manual);
      let updatedQueueForPlayback: MixTrack[] | null = null;
      if (nextIndex === null && !appendingRecommendationsRef.current) {
        appendingRecommendationsRef.current = true;
        try {
          const appended = await appendRecommendations();
          if (appended) {
            const updatedQueue = usePlayerStore.getState().queue;
            updatedQueueForPlayback = updatedQueue;
            nextIndex = computeNextIndex(updatedQueue.length, currentIndex, repeatMode, shuffleEnabled, manual);
          }
        } catch {
          setActionStatus('Unable to load recommendations');
        } finally {
          appendingRecommendationsRef.current = false;
        }
      }
      if (nextIndex === null) {
        setPlaying(false);
        return;
      }
      if (updatedQueueForPlayback) {
        await playFromQueue(updatedQueueForPlayback, nextIndex);
        return;
      }
      await playQueueIndex(nextIndex);
    },
    [appendRecommendations, currentIndex, playFromQueue, playQueueIndex, queue.length, repeatMode, setPlaying, shuffleEnabled],
  );

  const playPrevious = useCallback(async () => {
    const prevIndex = computePreviousIndex(queue.length, currentIndex, repeatMode, shuffleEnabled);
    if (prevIndex === null) return;
    await playQueueIndex(prevIndex);
  }, [currentIndex, playQueueIndex, queue.length, repeatMode, shuffleEnabled]);

  const seekTo = useCallback(
    async (nextPositionMs: number) => {
      if (!soundRef.current || durationMs <= 0) return;
      const clamped = Math.max(0, Math.min(durationMs, nextPositionMs));
      setPositionMs(clamped);
      try {
        await soundRef.current.setPositionAsync(clamped);
      } catch {
        setActionStatus('Unable to seek this stream');
      }
    },
    [durationMs],
  );

  const seekBy = useCallback(
    async (deltaMs: number) => {
      await seekTo(positionMs + deltaMs);
    },
    [positionMs, seekTo],
  );

  const onSeekLayout = useCallback((event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width > 0) setProgressWidth(width);
  }, []);

  const onSeekPress = useCallback(
    (event: GestureResponderEvent) => {
      if (durationMs <= 0) return;
      const ratio = Math.max(0, Math.min(1, event.nativeEvent.locationX / Math.max(1, progressWidth)));
      void seekTo(Math.round(durationMs * ratio));
    },
    [durationMs, progressWidth, seekTo],
  );

  const moveQueueItem = useCallback(
    (index: number, direction: -1 | 1) => {
      const target = index + direction;
      if (index < 0 || target < 0 || index >= queue.length || target >= queue.length) return;
      const next = [...queue];
      [next[index], next[target]] = [next[target], next[index]];
      const nextCurrentIndex =
        currentIndex === index ? target : currentIndex === target ? index : currentIndex;
      setQueue(next, nextCurrentIndex);
    },
    [currentIndex, queue, setQueue],
  );

  const insertAsPlayNext = useCallback(
    (index: number) => {
      if (index < 0 || index >= queue.length || currentIndex < 0 || index === currentIndex) return;
      const next = [...queue];
      const [picked] = next.splice(index, 1);
      if (!picked) return;

      const currentAfterRemoval = index < currentIndex ? currentIndex - 1 : currentIndex;
      const insertAt = Math.min(next.length, currentAfterRemoval + 1);
      next.splice(insertAt, 0, picked);
      const finalCurrentIndex = insertAt <= currentAfterRemoval ? currentAfterRemoval + 1 : currentAfterRemoval;
      setQueue(next, finalCurrentIndex);
      setActionStatus(`Play Next set: ${picked.title}`);
    },
    [currentIndex, queue, setQueue],
  );

  const removeQueueItem = useCallback(
    async (index: number) => {
      if (index < 0 || index >= queue.length) return;
      const nextQueue = queue.filter((_, idx) => idx !== index);

      if (nextQueue.length === 0) {
        try {
          if (soundRef.current) {
            await soundRef.current.stopAsync();
            await soundRef.current.unloadAsync();
          }
        } catch {
          // no-op
        } finally {
          soundRef.current = null;
          resetSessionState();
        }
        return;
      }

      if (index === currentIndex) {
        const nextIndex = Math.min(index, nextQueue.length - 1);
        await playFromQueue(nextQueue, nextIndex);
        return;
      }

      const nextCurrentIndex = index < currentIndex ? currentIndex - 1 : currentIndex;
      setQueue(nextQueue, nextCurrentIndex);
    },
    [currentIndex, playFromQueue, queue, resetSessionState, setQueue],
  );

  const clearPlayedFromQueue = useCallback(() => {
    if (currentIndex <= 0 || currentIndex >= queue.length) return;
    const nextQueue = queue.slice(currentIndex);
    setQueue(nextQueue, 0);
    setActionStatus(`Cleared ${currentIndex} played tracks`);
  }, [currentIndex, queue, setQueue]);

  const removeDuplicateQueueTracks = useCallback(() => {
    if (queue.length <= 1) return;
    const seen = new Set<string>();
    const nextQueue = queue.filter(track => {
      const key = trackIdentityKey(track);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (nextQueue.length === queue.length) return;
    const currentTrackKey = queue[currentIndex] ? trackIdentityKey(queue[currentIndex]) : null;
    const nextCurrentIndex = currentTrackKey ? Math.max(0, nextQueue.findIndex(track => trackIdentityKey(track) === currentTrackKey)) : 0;
    setQueue(nextQueue, nextCurrentIndex);
    setActionStatus(`Removed ${queue.length - nextQueue.length} duplicate tracks`);
  }, [currentIndex, queue, setQueue]);

  const playLastInQueue = useCallback(() => {
    if (queue.length <= 1) return;
    void playQueueIndex(queue.length - 1);
  }, [playQueueIndex, queue.length]);

  const onLike = useCallback(async () => {
    if (!isSynced) {
      setActionStatus('Sync account to like tracks');
      return;
    }
    const videoId = extractVideoId(currentTrack?.url);
    if (!videoId) {
      setActionStatus('Like unavailable for this source');
      return;
    }
    try {
      await retryAsync(() => PipedClient.likeVideo(videoId), 2, 250);
      setRating('like');
      setActionStatus('Liked');
    } catch (error) {
      setActionStatus(error instanceof Error ? error.message : 'Like failed');
    }
  }, [currentTrack?.url, isSynced]);

  const onDislike = useCallback(async () => {
    if (!isSynced) {
      setActionStatus('Sync account to dislike tracks');
      return;
    }
    const videoId = extractVideoId(currentTrack?.url);
    if (!videoId) {
      setActionStatus('Dislike unavailable for this source');
      return;
    }
    try {
      await retryAsync(() => PipedClient.dislikeVideo(videoId), 2, 250);
      setRating('dislike');
      setActionStatus('Disliked');
    } catch (error) {
      setActionStatus(error instanceof Error ? error.message : 'Dislike failed');
    }
  }, [currentTrack?.url, isSynced]);

  const onAddToPlaylist = useCallback(async () => {
    if (!isSynced) {
      setActionStatus('Sync account to manage playlists');
      return;
    }
    const videoId = extractVideoId(currentTrack?.url);
    if (!videoId) {
      setActionStatus('Playlist add unavailable for this source');
      return;
    }
    try {
      const playlists = (await retryAsync(() => PipedClient.getPlaylists(), 2, 250)) as Array<{id?: string; name?: string}>;
      const first = playlists.find(item => item.id || item.name);
      if (!first) {
        setActionStatus('No playlists available yet');
        return;
      }
      const playlistId = String(first.id || first.name);
      await retryAsync(() => PipedClient.addToPlaylist(playlistId, videoId), 2, 250);
      setActionStatus(`Added to ${first.name || 'playlist'}`);
    } catch (error) {
      setActionStatus(error instanceof Error ? error.message : 'Add to playlist failed');
    }
  }, [currentTrack?.url, isSynced]);

  useEffect(() => {
    let disposed = false;
    const syncTrack = async () => {
      if (!streamUrl) return;
      try {
        setBuffering(true);
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
          soundRef.current.setOnPlaybackStatusUpdate(null);
        }
        const {sound} = await Audio.Sound.createAsync(
          {uri: streamUrl},
          {shouldPlay: true, positionMillis: 0, progressUpdateIntervalMillis: 500},
          (status: AVPlaybackStatus) => {
            if (!status.isLoaded) return;
            setBuffering(status.isBuffering);
            setPlaying(Boolean(status.isPlaying));
            setPositionMs(Number(status.positionMillis || 0));
            setDurationMs(Number(status.durationMillis || 0));
            if (status.didJustFinish && !advancingRef.current) {
              advancingRef.current = true;
              void playNext(false).finally(() => {
                advancingRef.current = false;
              });
            }
          },
        );
        if (disposed) {
          await sound.unloadAsync();
          return;
        }
        if (playbackRate !== 1) {
          try {
            await sound.setRateAsync(playbackRate, true, Audio.PitchCorrectionQuality.Medium);
          } catch {
            // Some streams do not allow custom playback rates.
          }
        }
        soundRef.current = sound;
      } catch {
        resetSessionState('Playback failed. Please try another track.');
      }
    };
    void syncTrack();
    return () => {
      disposed = true;
    };
  }, [playNext, playbackRate, resetSessionState, setBuffering, setPlaying, streamUrl]);

  useEffect(() => {
    return () => {
      const release = async () => {
        if (sleepTimeoutRef.current) {
          clearTimeout(sleepTimeoutRef.current);
          sleepTimeoutRef.current = null;
        }
        if (!soundRef.current) return;
        try {
          await soundRef.current.unloadAsync();
        } catch {
          // no-op
        }
      };
      void release();
    };
  }, []);

  const toggle = async () => {
    if (!soundRef.current) return;
    try {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
        setPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setPlaying(true);
      }
    } catch {
      stop();
    }
  };

  const setRate = useCallback(
    async (rate: number) => {
      setPlaybackRate(rate);
      if (!soundRef.current) return;
      try {
        await soundRef.current.setRateAsync(rate, true, Audio.PitchCorrectionQuality.Medium);
      } catch {
        setActionStatus('Unable to set playback speed on this stream');
      }
    },
    [],
  );

  const scheduleSleepTimer = useCallback(
    (minutes: number | null) => {
      if (sleepTimeoutRef.current) {
        clearTimeout(sleepTimeoutRef.current);
        sleepTimeoutRef.current = null;
      }
      setSleepMinutesLeft(minutes);
      if (!minutes || minutes <= 0) {
        setActionStatus('Sleep timer off');
        return;
      }
      sleepTimeoutRef.current = setTimeout(() => {
        const stopForSleep = async () => {
          try {
            if (soundRef.current) {
              await soundRef.current.stopAsync();
              await soundRef.current.unloadAsync();
            }
          } catch {
            // no-op
          } finally {
            soundRef.current = null;
            setPositionMs(0);
            setDurationMs(0);
            setActionStatus('Sleep timer ended playback');
            resetSessionState('Sleep timer ended playback');
          }
        };
        void stopForSleep();
      }, minutes * 60 * 1000);
      setActionStatus(`Sleep timer set for ${minutes} min`);
    },
    [resetSessionState],
  );

  const close = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      }
    } catch {
      // no-op
    } finally {
      soundRef.current = null;
      resetSessionState();
    }
  };

  const upNextTrack = useMemo(() => {
    if (!currentTrack) return null;
    const nextIndex = computeNextIndex(queue.length, currentIndex, repeatMode, shuffleEnabled, true);
    if (nextIndex === null) return null;
    return queue[nextIndex] || null;
  }, [currentIndex, currentTrack, queue, repeatMode, shuffleEnabled]);

  const ensureQueueForCurrent = () => {
    if (!currentTrack) return;
    if (queue.length > 0) return;
    setQueue([currentTrack], 0);
  };

  if (!currentTrack || !streamUrl) return null;

  const progressPct = durationMs > 0 ? Math.max(0, Math.min(100, (positionMs / durationMs) * 100)) : 0;
  const queueLengthLabel = queue.length > 0 ? `${currentIndex + 1}/${queue.length}` : '1/1';

  const renderQueueList = () => (
    <ScrollView style={[styles.queueWrap, {borderColor: colors.border}]} contentContainerStyle={styles.queueContent}>
      <View style={styles.queueBulkRow}>
        <Pressable onPress={playLastInQueue} style={[styles.modeButton, {borderColor: colors.border}]}>
          <Text style={{color: colors.text, fontWeight: '700'}}>Play Last</Text>
        </Pressable>
        <Pressable onPress={removeDuplicateQueueTracks} style={[styles.modeButton, {borderColor: colors.border}]}>
          <Text style={{color: colors.text, fontWeight: '700'}}>Remove Dups</Text>
        </Pressable>
        <Pressable onPress={clearPlayedFromQueue} style={[styles.modeButton, {borderColor: colors.border}]}>
          <Text style={{color: colors.text, fontWeight: '700'}}>Clear Played</Text>
        </Pressable>
      </View>
      {queue.map((item, index) => {
        const active = index === currentIndex;
        const isRecommendedStart = isRecommendedTrack(item) && (index === 0 || !isRecommendedTrack(queue[index - 1]));
        return (
          <View key={`${item.id}-${index}`}>
            {isRecommendedStart ? (
              <View style={[styles.queueSectionHeader, {borderColor: colors.border, backgroundColor: colors.surface}]}>
                <Text style={{color: colors.accent, fontWeight: '800'}}>Recommended</Text>
              </View>
            ) : null}
            <View style={[styles.queueRow, {borderColor: colors.border}]}>
              <Pressable style={styles.queueMain} onPress={() => void playFromQueue(queue, index)}>
                <Text style={{color: active ? colors.accent : colors.text, fontWeight: active ? '800' : '600'}} numberOfLines={1}>
                  {`${index + 1}. ${item.title}`}
                </Text>
                <Text style={{color: colors.mutedText, fontSize: 11}} numberOfLines={1}>
                  {item.artist}
                </Text>
              </Pressable>
              <View style={styles.queueButtons}>
                <Pressable onPress={() => insertAsPlayNext(index)} style={[styles.queueBtn, {borderColor: colors.border}]}>
                  <Text style={{color: colors.accent}}>N</Text>
                </Pressable>
                <Pressable onPress={() => moveQueueItem(index, -1)} style={[styles.queueBtn, {borderColor: colors.border}]}>
                  <Text style={{color: colors.text}}>^</Text>
                </Pressable>
                <Pressable onPress={() => moveQueueItem(index, 1)} style={[styles.queueBtn, {borderColor: colors.border}]}>
                  <Text style={{color: colors.text}}>v</Text>
                </Pressable>
                <Pressable onPress={() => void removeQueueItem(index)} style={[styles.queueBtn, {borderColor: colors.border}]}>
                  <Text style={{color: '#FF7A8D'}}>x</Text>
                </Pressable>
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );

  return (
    <>
      <View
        style={[
          styles.root,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius,
            left: spacing,
            right: spacing,
            bottom: spacing + 20,
          },
        ]}>
        <View style={styles.meta}>
          <Text style={[styles.title, {color: colors.text}]} numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text style={[styles.artist, {color: colors.mutedText}]} numberOfLines={1}>
            {currentTrack.artist}
          </Text>
        </View>
        <Text style={[styles.upNext, {color: colors.mutedText}]} numberOfLines={1}>
          {upNextTrack ? `Up Next: ${upNextTrack.title}` : 'Up Next: End of queue'}
        </Text>
        <View style={styles.seekRow}>
          <Text style={[styles.clock, {color: colors.mutedText}]}>{formatClock(positionMs)}</Text>
          <Pressable onLayout={onSeekLayout} onPress={onSeekPress} style={[styles.seekTrack, {borderColor: colors.border}]}>
            <View style={[styles.seekFill, {width: `${progressPct}%`, backgroundColor: colors.accent}]} />
          </Pressable>
          <Text style={[styles.clock, {color: colors.mutedText}]}>{formatClock(durationMs)}</Text>
        </View>
        <View style={styles.jumpRow}>
          <Pressable onPress={() => void seekBy(-10000)} style={[styles.modeButton, {borderColor: colors.border}]}>
            <Text style={{color: colors.text, fontWeight: '700'}}>-10s</Text>
          </Pressable>
          <Text style={[styles.queueMeta, {color: colors.mutedText}]}>{`Queue ${queueLengthLabel}`}</Text>
          <Pressable onPress={() => void seekBy(10000)} style={[styles.modeButton, {borderColor: colors.border}]}>
            <Text style={{color: colors.text, fontWeight: '700'}}>+10s</Text>
          </Pressable>
        </View>
        <View style={styles.controlsRow}>
          {isBuffering ? <ActivityIndicator color={colors.accent} style={styles.spinner} /> : null}
          <Pressable
            onPress={() => {
              ensureQueueForCurrent();
              void playPrevious();
            }}
            style={[styles.button, {borderColor: colors.border}]}>
            <Text style={{color: colors.text, fontWeight: '700'}}>Prev</Text>
          </Pressable>
          <Pressable onPress={() => void toggle()} style={[styles.button, {borderColor: colors.border}]}>
            <Text style={{color: colors.text, fontWeight: '700'}}>{isPlaying ? 'Pause' : 'Play'}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              ensureQueueForCurrent();
              void playNext(true);
            }}
            style={[styles.button, {borderColor: colors.border}]}>
            <Text style={{color: colors.text, fontWeight: '700'}}>Next</Text>
          </Pressable>
          <Pressable onPress={() => setShowNowPlaying(true)} style={[styles.button, {borderColor: colors.border}]}>
            <Text style={{color: colors.text, fontWeight: '700'}}>Open</Text>
          </Pressable>
          <Pressable onPress={() => void close()} style={[styles.button, {borderColor: colors.border}]}>
            <Text style={{color: colors.text, fontWeight: '700'}}>Close</Text>
          </Pressable>
        </View>
        <View style={styles.modeRow}>
          <Pressable onPress={toggleShuffle} style={[styles.modeButton, {borderColor: colors.border}]}>
            <Text style={{color: shuffleEnabled ? colors.accent : colors.mutedText, fontWeight: '700'}}>Shuffle</Text>
          </Pressable>
          <Pressable onPress={cycleRepeatMode} style={[styles.modeButton, {borderColor: colors.border}]}>
            <Text style={{color: repeatMode === 'off' ? colors.mutedText : colors.accent, fontWeight: '700'}}>
              {`Repeat: ${repeatMode.toUpperCase()}`}
            </Text>
          </Pressable>
          <Pressable onPress={() => setShowQueue(value => !value)} style={[styles.modeButton, {borderColor: colors.border}]}>
            <Text style={{color: showQueue ? colors.accent : colors.mutedText, fontWeight: '700'}}>
              {showQueue ? 'Queue: ON' : 'Queue: OFF'}
            </Text>
          </Pressable>
          <Pressable onPress={toggleAutoplayRecommendations} style={[styles.modeButton, {borderColor: colors.border}]}>
            <Text style={{color: autoplayRecommendations ? colors.accent : colors.mutedText, fontWeight: '700'}}>
              {autoplayRecommendations ? 'Autoplay: ON' : 'Autoplay: OFF'}
            </Text>
          </Pressable>
        </View>
        <View style={styles.modeRow}>
          {[0.75, 1, 1.25, 1.5].map(rate => (
            <Pressable key={rate} onPress={() => void setRate(rate)} style={[styles.modeButton, {borderColor: colors.border}]}>
              <Text style={{color: playbackRate === rate ? colors.accent : colors.mutedText, fontWeight: '700'}}>{`${rate}x`}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.modeRow}>
          {[null, 15, 30, 60].map(value => (
            <Pressable
              key={String(value)}
              onPress={() => scheduleSleepTimer(value)}
              style={[styles.modeButton, {borderColor: colors.border}]}>
              <Text style={{color: sleepMinutesLeft === value ? colors.accent : colors.mutedText, fontWeight: '700'}}>
                {value === null ? 'Sleep Off' : `${value}m`}
              </Text>
            </Pressable>
          ))}
        </View>
        {actionStatus ? (
          <Text style={[styles.status, {color: colors.mutedText}]} numberOfLines={2}>
            {actionStatus}
          </Text>
        ) : null}
        {showQueue ? renderQueueList() : null}
      </View>
      <Modal visible={showNowPlaying} animationType="slide" onRequestClose={() => setShowNowPlaying(false)}>
        <View style={[styles.modalRoot, {backgroundColor: colors.background}]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalHeading, {color: colors.text}]}>Now Playing</Text>
            <Pressable onPress={() => setShowNowPlaying(false)} style={[styles.modeButton, {borderColor: colors.border}]}>
              <Text style={{color: colors.text, fontWeight: '700'}}>Minimize</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Image source={{uri: currentTrack.thumbnail}} style={[styles.artwork, {borderColor: colors.border}]} />
            <Text style={[styles.modalTitle, {color: colors.text}]} numberOfLines={2}>
              {currentTrack.title}
            </Text>
            <Text style={[styles.modalArtist, {color: colors.mutedText}]} numberOfLines={1}>
              {currentTrack.artist}
            </Text>
            <View style={styles.modalSeekRow}>
              <Text style={[styles.clock, {color: colors.mutedText}]}>{formatClock(positionMs)}</Text>
              <Pressable
                onLayout={onSeekLayout}
                onPress={onSeekPress}
                style={[styles.modalSeekTrack, {borderColor: colors.border, backgroundColor: colors.surface}]}>
                <View style={[styles.seekFill, {width: `${progressPct}%`, backgroundColor: colors.accent}]} />
              </Pressable>
              <Text style={[styles.clock, {color: colors.mutedText}]}>{formatClock(durationMs)}</Text>
            </View>
            <View style={styles.modalControls}>
              <Pressable onPress={() => void seekBy(-10000)} style={[styles.modeButton, {borderColor: colors.border}]}>
                <Text style={{color: colors.text, fontWeight: '700'}}>-10s</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  ensureQueueForCurrent();
                  void playPrevious();
                }}
                style={[styles.modeButton, {borderColor: colors.border}]}>
                <Text style={{color: colors.text, fontWeight: '700'}}>Prev</Text>
              </Pressable>
              <Pressable onPress={() => void toggle()} style={[styles.modeButton, {borderColor: colors.border}]}>
                <Text style={{color: colors.text, fontWeight: '700'}}>{isPlaying ? 'Pause' : 'Play'}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  ensureQueueForCurrent();
                  void playNext(true);
                }}
                style={[styles.modeButton, {borderColor: colors.border}]}>
                <Text style={{color: colors.text, fontWeight: '700'}}>Next</Text>
              </Pressable>
              <Pressable onPress={() => void seekBy(10000)} style={[styles.modeButton, {borderColor: colors.border}]}>
                <Text style={{color: colors.text, fontWeight: '700'}}>+10s</Text>
              </Pressable>
            </View>
            <View style={styles.actionRow}>
              <Pressable onPress={() => void onLike()} style={[styles.modeButton, {borderColor: colors.border}]}>
                <Text style={{color: rating === 'like' ? colors.accent : colors.mutedText, fontWeight: '700'}}>Like</Text>
              </Pressable>
              <Pressable onPress={() => void onDislike()} style={[styles.modeButton, {borderColor: colors.border}]}>
                <Text style={{color: rating === 'dislike' ? colors.accent : colors.mutedText, fontWeight: '700'}}>Dislike</Text>
              </Pressable>
              <Pressable onPress={() => void onAddToPlaylist()} style={[styles.modeButton, {borderColor: colors.border}]}>
                <Text style={{color: colors.mutedText, fontWeight: '700'}}>+ Playlist</Text>
              </Pressable>
              <Pressable onPress={() => setShowQueue(value => !value)} style={[styles.modeButton, {borderColor: colors.border}]}>
                <Text style={{color: showQueue ? colors.accent : colors.mutedText, fontWeight: '700'}}>
                  {showQueue ? 'Hide Queue' : 'Show Queue'}
                </Text>
              </Pressable>
              <Pressable onPress={toggleAutoplayRecommendations} style={[styles.modeButton, {borderColor: colors.border}]}>
                <Text style={{color: autoplayRecommendations ? colors.accent : colors.mutedText, fontWeight: '700'}}>
                  {autoplayRecommendations ? 'Autoplay ON' : 'Autoplay OFF'}
                </Text>
              </Pressable>
            </View>
            <View style={styles.actionRow}>
              {[0.75, 1, 1.25, 1.5].map(rate => (
                <Pressable key={`modal-rate-${rate}`} onPress={() => void setRate(rate)} style={[styles.modeButton, {borderColor: colors.border}]}>
                  <Text style={{color: playbackRate === rate ? colors.accent : colors.mutedText, fontWeight: '700'}}>{`${rate}x`}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.actionRow}>
              {[null, 15, 30, 60].map(value => (
                <Pressable
                  key={`modal-sleep-${String(value)}`}
                  onPress={() => scheduleSleepTimer(value)}
                  style={[styles.modeButton, {borderColor: colors.border}]}>
                  <Text style={{color: sleepMinutesLeft === value ? colors.accent : colors.mutedText, fontWeight: '700'}}>
                    {value === null ? 'Sleep Off' : `${value}m`}
                  </Text>
                </Pressable>
              ))}
            </View>
            {actionStatus ? (
              <Text style={[styles.status, {color: colors.mutedText}]} numberOfLines={2}>
                {actionStatus}
              </Text>
            ) : null}
            {showQueue ? renderQueueList() : null}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
  },
  meta: {flex: 1, minWidth: 0},
  controlsRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  seekRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  clock: {fontSize: 11, width: 38},
  seekTrack: {
    flex: 1,
    height: 8,
    borderWidth: 1,
    borderRadius: 999,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  seekFill: {height: '100%'},
  jumpRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8},
  queueMeta: {fontSize: 11},
  title: {fontWeight: '800', fontSize: 13},
  artist: {fontSize: 11, marginTop: 2},
  upNext: {fontSize: 11},
  spinner: {marginRight: 4},
  button: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  modeRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  actionRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  modeButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  status: {fontSize: 11},
  queueWrap: {
    borderWidth: 1,
    borderRadius: 8,
    maxHeight: 170,
  },
  queueContent: {padding: 8, gap: 8},
  queueRow: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  queueSectionHeader: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 6,
  },
  queueMain: {flex: 1, minWidth: 0},
  queueButtons: {flexDirection: 'row', alignItems: 'center', gap: 6},
  queueBulkRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  queueBtn: {
    width: 28,
    height: 28,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRoot: {flex: 1},
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 16,
  },
  modalHeading: {fontSize: 18, fontWeight: '800'},
  modalContent: {padding: 14, gap: 12, paddingBottom: 28},
  artwork: {
    width: '100%',
    aspectRatio: 1,
    borderWidth: 1,
    borderRadius: 14,
  },
  modalTitle: {fontSize: 22, fontWeight: '900'},
  modalArtist: {fontSize: 14},
  modalSeekRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  modalSeekTrack: {
    flex: 1,
    height: 14,
    borderWidth: 1,
    borderRadius: 999,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  modalControls: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
});
