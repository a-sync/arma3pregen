import os
from http.server import BaseHTTPRequestHandler, HTTPServer
from backend.index import handle_post

PORT = int(os.getenv('PORT', '80'))

class RequestHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/backend/':
            handle_post(self)
        else:
            self.send_error(404, 'Not Found')

    def do_GET(self):
        base_path = self.path.split('?')[0].split('#')[0]

        if base_path in ['/index.html', '/main.css', '/main.js', '/']:
            if base_path == '/':
                file_path = '/index.html'
            else:
                file_path = self.path

            try:
                with open(file_path[1:], 'rb') as file:
                    content = file.read()
                    self.send_response(200)

                    if file_path.endswith('.html'):
                        self.send_header('Content-Type', 'text/html')
                    elif file_path.endswith('.css'):
                        self.send_header('Content-Type', 'text/css')
                    elif file_path.endswith('.js'):
                        self.send_header('Content-Type', 'text/javascript')

                    self.end_headers()
                    self.wfile.write(content)
            except FileNotFoundError:
                self.send_error(404, 'File Not Found')
        else:
            self.send_error(404, 'Not Found')

def run(server_class=HTTPServer, handler_class=RequestHandler):
    server_address = ('', PORT)
    httpd = server_class(server_address, handler_class)
    httpd.serve_forever()

if __name__ == "__main__":
    run()
