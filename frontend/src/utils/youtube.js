const YOUTUBE_ID_PATTERN =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i;

export const extractYouTubeVideoId = (url) => {
  if (!url) return null;

  const matched = url.match(YOUTUBE_ID_PATTERN);
  if (matched?.[1]) return matched[1];

  try {
    const parsed = new URL(url);
    const videoId = parsed.searchParams.get('v');
    return videoId && videoId.length === 11 ? videoId : null;
  } catch {
    return null;
  }
};

export const getYouTubeThumbnail = (url, quality = 'maxresdefault') => {
  const videoId = extractYouTubeVideoId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/${quality}.jpg` : '';
};

export const getYouTubeEmbedUrl = (url, params = {}) => {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return '';

  const searchParams = new URLSearchParams({
    autoplay: '0',
    mute: '1',
    controls: '1',
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    ...Object.fromEntries(
      Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => [key, String(value)])
    ),
  });

  return `https://www.youtube.com/embed/${videoId}?${searchParams.toString()}`;
};
