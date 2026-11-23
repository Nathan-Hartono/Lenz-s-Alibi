"""Local dev server for Lenz's Alibi.

    python server.py            -> serves this folder on http://localhost:8140 and opens the browser
    python server.py 9000       -> custom port
    python server.py --no-open  -> don't open a browser tab
"""
import http.server
import os
import sys
import webbrowser

PORT = next((int(a) for a in sys.argv[1:] if a.isdigit()), 8140)
os.chdir(os.path.dirname(os.path.abspath(__file__)))


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Always serve fresh files while developing.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler) as httpd:
        url = f"http://localhost:{PORT}/"
        print(f"Lenz's Alibi running at {url}  (Ctrl+C to stop)")
        if "--no-open" not in sys.argv:
            webbrowser.open(url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
