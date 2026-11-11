export function getPhotos(value) {
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(value)) return [];

  return value.filter(
    (item) => typeof item === 'string' && /^https?:\/\//i.test(item.trim()),
  ).map((item) => item.trim());
}

export function getFirstPhoto(value) {
  return getPhotos(value)[0] || null;
}
