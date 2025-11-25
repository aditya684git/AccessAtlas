from http.server import HTTPServer, BaseHTTPRequestHandler
import json


class Handler(BaseHTTPRequestHandler):
    def _set_json_headers(self, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_OPTIONS(self):
        self._set_json_headers()

    def do_GET(self):
        if self.path == '/health':
            self._set_json_headers()
            self.wfile.write(json.dumps({'status': 'ok'}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == '/detect':
            # Some Python environments may not have multipart helpers available.
            # Read and ignore the request body, then return a deterministic mock response.
            try:
                length = int(self.headers.get('content-length', 0))
            except Exception:
                length = 0
            if length:
                _ = self.rfile.read(length)
            mock_response = {
                'detections': [
                    {'label': 'person', 'confidence': 0.92, 'bbox': [50, 40, 200, 300]},
                    {'label': 'bottle', 'confidence': 0.76, 'bbox': [220, 180, 260, 310]}
                ],
                'spoken': 'Detected 2 objects: person and bottle.'
            }
            self._set_json_headers()
            self.wfile.write(json.dumps(mock_response).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()


def run(server_class=HTTPServer, handler_class=Handler, port=8000):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f'Mock detection server running on http://0.0.0.0:{port}')
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('Shutting down mock server')
        httpd.server_close()


if __name__ == '__main__':
    run()
