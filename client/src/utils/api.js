export async function apiFetch(endpoint, options = {}, token = null) {
  const normalizedEndpoint = String(endpoint).replace(/^\/+/, "");
  const url = `/api/${normalizedEndpoint}`;
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const mergedHeaders = {
    ...headers,
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers: mergedHeaders,
  });

  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(errorBody.error || errorBody.message);
  }

  return response.json();
}

export default apiFetch;
