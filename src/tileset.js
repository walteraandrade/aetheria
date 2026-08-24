// Terrain tilesets are one-row strips: tile index N is the Nth cell.
// Loading is fire-and-forget — the renderer falls back to flat rectangles
// until the image is ready, so a slow load never blanks the world.

const cache = new Map();

export const tileset = (url) => {
  if (!url) return null;
  if (!cache.has(url)) {
    const img = new Image();
    img.src = url;
    cache.set(url, img);
  }
  const img = cache.get(url);
  return img.complete && img.naturalWidth ? img : null;
};
