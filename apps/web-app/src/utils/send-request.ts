// Utility function to send requests, preserving exact behavior from Rails implementation
export function sendRequest({
  endpoint,
  method = 'GET',
  body,
  headers = {},
}: {
  endpoint: string
  method?: string
  body?: string | undefined
  headers?: Record<string, string>
}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...headers,
  }

  const fetch = window.fetch(endpoint, {
    method,
    headers: defaultHeaders,
    body: body || null,
    credentials: 'same-origin',
  }).then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  })

  return { fetch }
}