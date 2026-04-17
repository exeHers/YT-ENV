import http from 'node:http';

const PORT = Number(process.env.PIPED_PROXY_PORT || 8787);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

const readBody = req =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

const sanitizeHeaders = headers => {
  const next = {};
  for (const [key, value] of Object.entries(headers)) {
    if (!value) continue;
    const normalized = key.toLowerCase();
    if (
      normalized === 'host' ||
      normalized === 'origin' ||
      normalized === 'referer' ||
      normalized === 'content-length' ||
      normalized.startsWith('sec-')
    ) {
      continue;
    }
    next[key] = value;
  }
  return next;
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  const requestUrl = new URL(req.url || '/', `http://localhost:${PORT}`);
  if (requestUrl.pathname !== '/proxy') {
    res.writeHead(404, {'Content-Type': 'application/json', ...CORS_HEADERS});
    res.end(JSON.stringify({error: 'Not found'}));
    return;
  }

  const target = requestUrl.searchParams.get('url');
  if (!target) {
    res.writeHead(400, {'Content-Type': 'application/json', ...CORS_HEADERS});
    res.end(JSON.stringify({error: 'Missing url query parameter'}));
    return;
  }

  try {
    const method = req.method || 'GET';
    const bodyBuffer = await readBody(req);
    const headers = sanitizeHeaders(req.headers);
    const response = await fetch(target, {
      method,
      headers,
      body: ['GET', 'HEAD'].includes(method.toUpperCase()) ? undefined : bodyBuffer,
      redirect: 'follow',
    });

    const raw = Buffer.from(await response.arrayBuffer());
    const responseHeaders = {...CORS_HEADERS};
    response.headers.forEach((value, key) => {
      const normalized = key.toLowerCase();
      if (normalized === 'content-encoding') return;
      if (normalized.startsWith('access-control-')) return;
      responseHeaders[key] = value;
    });

    res.writeHead(response.status, responseHeaders);
    res.end(raw);
  } catch (error) {
    res.writeHead(502, {'Content-Type': 'application/json', ...CORS_HEADERS});
    res.end(
      JSON.stringify({
        error: 'Proxy request failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    );
  }
});

server.listen(PORT, () => {
  console.log(`[YT ENV proxy] listening on http://localhost:${PORT}/proxy`);
});
