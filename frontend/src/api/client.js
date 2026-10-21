const API_BASE = '/api/properties';

async function getJson(url, { signal } = {}) {
  let response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Unable to reach the listings service. Please try again.');
  }

  if (!response.ok) {
    let message = `Request failed (${response.status}${response.statusText ? ` ${response.statusText}` : ''}).`;
    try {
      const body = await response.json();
      if (typeof body.error === 'string' && body.error.trim()) {
        message = body.error;
      }
    } catch {
      // Keep the HTTP status message when the response is not JSON.
    }
    throw new Error(message);
  }

  try {
    return await response.json();
  } catch {
    throw new Error('The listings service returned an invalid response.');
  }
}

export function fetchProperties(params = {}, { signal } = {}) {
  const searchParams = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(name, String(value));
    }
  }
  const query = searchParams.toString();
  return getJson(`${API_BASE}${query ? `?${query}` : ''}`, { signal });
}

export function fetchPropertyDetail(id, { signal } = {}) {
  return getJson(`${API_BASE}/${encodeURIComponent(id)}`, { signal });
}
