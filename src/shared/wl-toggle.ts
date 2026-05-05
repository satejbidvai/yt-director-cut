import { addToWatchLater, removeFromWatchLater } from './yt-action';
import { getWLIds, addWLId, removeWLId } from './wl-store';

/**
 * Toggle a video's Watch Later membership via yt-action dispatch + local store.
 *
 * Returns `false` if the `ytd-app` dispatch failed (caller should surface its
 * own module-tagged warning). `onFlip` fires optimistically with the new saved
 * state before the store write settles.
 */
export async function toggleWatchLater(
  videoId: string,
  onFlip: (saved: boolean) => void,
): Promise<boolean> {
  const ids = await getWLIds();
  const isInWL = ids.includes(videoId);

  const dispatched = isInWL
    ? removeFromWatchLater(videoId)
    : addToWatchLater(videoId);

  if (!dispatched) return false;

  // Optimistic flip before the async store write settles.
  onFlip(!isInWL);

  if (isInWL) {
    await removeWLId(videoId);
  } else {
    await addWLId(videoId);
  }
  return true;
}
