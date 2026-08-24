import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PUBLIC_HOST = "0.0.0.0";
const PUBLIC_PORT = Number(process.env.PORT || 43127);
const INNER_PORT = Number(process.env.INNER_PORT || 43128);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function withoutOrigin(headers) {
  const next = { ...headers };
  delete next.origin;
  delete next.Origin;
  return next;
}

function proxyHttp(req, res) {
  const headers = withoutOrigin(req.headers);
  const upstream = http.request(
    {
      hostname: "127.0.0.1",
      port: INNER_PORT,
      path: req.url,
      method: req.method,
      headers,
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    },
  );
  upstream.on("error", (error) => {
    if (!res.headersSent) {
      res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    }
    res.end(`Proxy error: ${error.message}`);
  });
  req.pipe(upstream);
}

function proxyUpgrade(req, clientSocket, head) {
  const headers = withoutOrigin(req.headers);
  const upstream = net.connect(INNER_PORT, "127.0.0.1", () => {
    const requestLine = `${req.method} ${req.url} HTTP/1.1\r\n`;
    const headerLines = Object.entries(headers)
      .flatMap(([key, value]) => {
        if (value == null) return [];
        const values = Array.isArray(value) ? value : [value];
        return values.map((item) => `${key}: ${item}`);
      })
      .join("\r\n");
    upstream.write(`${requestLine}${headerLines}\r\n\r\n`);
    if (head.length) upstream.write(head);
    upstream.pipe(clientSocket);
    clientSocket.pipe(upstream);
  });
  upstream.on("error", () => clientSocket.destroy());
  clientSocket.on("error", () => upstream.destroy());
}

const server = http.createServer(proxyHttp);
server.on("upgrade", proxyUpgrade);
server.listen(PUBLIC_PORT, PUBLIC_HOST, () => {
  console.log(
    `LambdaCheck proxy on http://127.0.0.1:${PUBLIC_PORT} → Next.js :${INNER_PORT} (Origin stripped)`,
  );
});

const nextBin = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");
const child = spawn(
  process.execPath,
  [nextBin, "dev", "--hostname", "127.0.0.1", "--port", String(INNER_PORT)],
  { cwd: ROOT, stdio: "inherit" },
);

child.on("exit", (code, signal) => {
  server.close();
  process.exit(code ?? (signal ? 1 : 0));
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    child.kill(signal);
  });
}
