"""Local preview of public/ with the same response headers as production.

Reads the "/*" block of public/_headers (Netlify / Cloudflare Pages format) and adds those
headers to every response, so the Content-Security-Policy is enforced locally too.

Usage: python3 scripts/serve.py [port]    (default port 8765)
"""
import functools
import http.server
import pathlib
import socketserver
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent / "public"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765


def read_headers(path):
    headers, block = [], None
    for line in path.read_text().splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        if not line[0].isspace():
            block = line.strip()
        elif block == "/*":
            name, value = line.strip().split(":", 1)
            headers.append((name.strip(), value.strip()))
    return headers


HEADERS = read_headers(ROOT / "_headers")


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        for name, value in HEADERS:
            self.send_header(name, value)
        super().end_headers()

    def send_error(self, code, message=None, explain=None):
        # Serve the site's own 404 page, as the netlify.toml rule does in production.
        if code == 404 and (ROOT / "404.html").exists():
            body = (ROOT / "404.html").read_bytes()
            self.send_response(404)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(body)
            return
        super().send_error(code, message, explain)


socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("127.0.0.1", PORT), functools.partial(Handler, directory=str(ROOT))) as httpd:
    print(f"Serving {ROOT} at http://localhost:{PORT} (Ctrl+C to stop)", flush=True)
    httpd.serve_forever()
