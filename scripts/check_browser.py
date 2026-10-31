"""Serve the repository locally while running browser tests; no public traffic."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import subprocess
import threading

root = Path(__file__).resolve().parents[1]
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(root)))
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
try:
    env = dict(os.environ, TEST_URL=f"http://127.0.0.1:{server.server_port}")
    result = subprocess.run(["node", "tests/browser.mjs"], cwd=root, env=env)
finally:
    server.shutdown()
    server.server_close()
    thread.join()
raise SystemExit(result.returncode)
