/**
 * Dispatch YouTube's internal `yt-action` custom events on `ytd-app`.
 *
 * YouTube's Polymer shell listens for `yt-action` events with
 * `actionName: 'yt-service-request'` and routes them to the matching
 * InnerTube endpoint. This lets us drive playlist edits (and potentially
 * other service calls) without opening any UI panel.
 */

/**
 * Dispatch a service-request action on `ytd-app`.
 * Returns `false` if the app element is missing.
 */
export function dispatchYtServiceRequest(payload: Record<string, unknown>): boolean {
  const appElement = document.querySelector('ytd-app');
  if (!appElement) return false;

  appElement.dispatchEvent(
    new CustomEvent('yt-action', {
      bubbles: true,
      detail: {
        actionName: 'yt-service-request',
        returnValue: [],
        args: [{ data: {} }, payload],
        optionalAction: false,
      },
    }),
  );
  return true;
}

// ---------------------------------------------------------------------------
// Watch Later convenience helpers
// ---------------------------------------------------------------------------

export function addToWatchLater(videoId: string): boolean {
  return dispatchYtServiceRequest({
    clickTrackingParams: '',
    commandMetadata: {
      webCommandMetadata: { sendPost: true, apiUrl: '/youtubei/v1/browse/edit_playlist' },
    },
    playlistEditEndpoint: {
      playlistId: 'WL',
      actions: [{ addedVideoId: videoId, action: 'ACTION_ADD_VIDEO' }],
    },
  });
}

export function removeFromWatchLater(videoId: string): boolean {
  return dispatchYtServiceRequest({
    clickTrackingParams: '',
    commandMetadata: {
      webCommandMetadata: { sendPost: true, apiUrl: '/youtubei/v1/browse/edit_playlist' },
    },
    playlistEditEndpoint: {
      playlistId: 'WL',
      actions: [{ action: 'ACTION_REMOVE_VIDEO_BY_VIDEO_ID', removedVideoId: videoId }],
    },
  });
}
