/**
 * Shared Watch Later video ID store.
 *
 * Backed by chrome.storage.local (10 MB limit vs sync's 100 KB).
 * Two consumers:
 *   - hide-playlist-feed: reads IDs to generate CSS selectors.
 *   - watch-later-toggle: writes IDs after add/remove via the native UI.
 *
 * Change propagation uses chrome.storage.onChanged, so cross-tab updates
 * are automatic.
 */

const STORAGE_KEY = 'watchLaterIds';
const TAG = '[productive-yt:wl-store]';

// ---------------------------------------------------------------------------
// InnerTube fetch
// ---------------------------------------------------------------------------

/** YouTube InnerTube client version — update if requests start failing. */
const CLIENT_VERSION = '2.20260101.00.00';
const ORIGIN = 'https://www.youtube.com';

/**
 * Generate the SAPISIDHASH authorization token that YouTube's InnerTube API
 * requires for authenticated requests. Reads the SAPISID cookie from
 * document.cookie and computes SHA-1(timestamp + " " + SAPISID + " " + origin).
 */
async function getSapisidHash(): Promise<string | null> {
  const sapisid =
    /SAPISID=([^;]+)/.exec(document.cookie)?.[1] ??
    /__Secure-3PAPISID=([^;]+)/.exec(document.cookie)?.[1];
  if (!sapisid) return null;
  const timestamp = Math.floor(Date.now() / 1000);
  const input = `${timestamp} ${sapisid} ${ORIGIN}`;

  const msgBuffer = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return `SAPISIDHASH ${timestamp}_${hashHex}`;
}

interface InnerTubeResponse {
  contents?: {
    twoColumnBrowseResultsRenderer?: {
      tabs?: Array<{
        tabRenderer?: {
          content?: {
            sectionListRenderer?: {
              contents?: Array<{
                itemSectionRenderer?: {
                  contents?: Array<{
                    playlistVideoListRenderer?: {
                      contents?: InnerTubeItem[];
                    };
                  }>;
                };
              }>;
            };
          };
        };
      }>;
    };
  };
  onResponseReceivedActions?: Array<{
    appendContinuationItemsAction?: {
      continuationItems?: InnerTubeItem[];
    };
  }>;
}

type InnerTubeItem =
  | { playlistVideoRenderer: { videoId: string } }
  | {
      continuationItemRenderer: {
        continuationEndpoint?: {
          commandExecutorCommand?: {
            commands?: Array<{
              continuationCommand?: { token: string };
            }>;
          };
        };
      };
    };

function extractContinuationToken(
  item: Extract<InnerTubeItem, { continuationItemRenderer: unknown }>,
): string | undefined {
  const commands =
    item.continuationItemRenderer.continuationEndpoint
      ?.commandExecutorCommand?.commands;
  if (!commands) return undefined;
  for (const cmd of commands) {
    if (cmd.continuationCommand?.token) return cmd.continuationCommand.token;
  }
  return undefined;
}

function extractVideosAndToken(items: InnerTubeItem[]): {
  ids: string[];
  continuation: string | undefined;
} {
  const ids: string[] = [];
  let continuation: string | undefined;

  for (const item of items) {
    if ('playlistVideoRenderer' in item) {
      ids.push(item.playlistVideoRenderer.videoId);
    } else if ('continuationItemRenderer' in item) {
      continuation = extractContinuationToken(item) ?? continuation;
    }
  }

  return { ids, continuation };
}

async function innerTubeBrowse(
  body: Record<string, unknown>,
): Promise<InnerTubeResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Origin': ORIGIN,
  };

  const authHash = await getSapisidHash();
  if (authHash) headers['Authorization'] = authHash;

  const res = await fetch('https://www.youtube.com/youtubei/v1/browse', {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({
      ...body,
      context: {
        client: { clientName: 'WEB', clientVersion: CLIENT_VERSION },
      },
    }),
  });
  if (!res.ok) throw new Error(`InnerTube ${res.status} ${res.statusText}`);
  return res.json() as Promise<InnerTubeResponse>;
}

async function fetchWLFromInnerTube(): Promise<string[]> {
  const MAX_PAGES = 50;
  const allIds: string[] = [];

  const initial = await innerTubeBrowse({ browseId: 'VLWL' });
  const contents =
    initial.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer
      ?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer
      ?.contents?.[0]?.playlistVideoListRenderer?.contents;

  if (!contents) return allIds;

  let { ids, continuation } = extractVideosAndToken(contents);
  allIds.push(...ids);

  let page = 1;
  while (continuation && page < MAX_PAGES) {
    const contRes = await innerTubeBrowse({ continuation });
    const contItems =
      contRes.onResponseReceivedActions?.[0]?.appendContinuationItemsAction
        ?.continuationItems;
    if (!contItems) break;

    ({ ids, continuation } = extractVideosAndToken(contItems));
    allIds.push(...ids);
    page++;

    // Small delay to avoid hammering YouTube
    await new Promise((r) => setTimeout(r, 100));
  }

  return allIds;
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

export async function getWLIds(): Promise<string[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const value = result[STORAGE_KEY];
  return Array.isArray(value) ? (value as string[]) : [];
}

async function setWLIds(ids: string[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: ids });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch the full Watch Later playlist via InnerTube, cache it, and return
 * the video IDs. Falls back to the last cached value on any error.
 */
export async function fetchAndCacheWLIds(): Promise<string[]> {
  try {
    const ids = await fetchWLFromInnerTube();
    await setWLIds(ids);
    return ids;
  } catch (err) {
    console.warn(TAG, 'InnerTube fetch failed, falling back to cache:', err);
    return getWLIds();
  }
}

/** Add a video ID to the cached WL set (deduped). */
export async function addWLId(videoId: string): Promise<void> {
  const ids = await getWLIds();
  if (!ids.includes(videoId)) {
    ids.push(videoId);
    await setWLIds(ids);
  }
}

/** Remove a video ID from the cached WL set. */
export async function removeWLId(videoId: string): Promise<void> {
  const ids = await getWLIds();
  const filtered = ids.filter((id) => id !== videoId);
  if (filtered.length !== ids.length) {
    await setWLIds(filtered);
  }
}

/**
 * Subscribe to WL ID list changes via chrome.storage.onChanged.
 * Returns an unsubscribe function.
 */
export function onWLChange(cb: (ids: string[]) => void): () => void {
  const listener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string,
  ) => {
    if (areaName !== 'local') return;
    const change = changes[STORAGE_KEY];
    if (!change) return;
    const newVal = change.newValue;
    cb(Array.isArray(newVal) ? (newVal as string[]) : []);
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
