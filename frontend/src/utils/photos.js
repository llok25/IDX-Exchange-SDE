export function getFirstPhoto(value) {
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (!Array.isArray(value)) return null;

  const firstUrl = value.find(
    (item) => typeof item === 'string' && /^https?:\/\//i.test(item.trim()),
  );
  return firstUrl ? firstUrl.trim() : null;
}
