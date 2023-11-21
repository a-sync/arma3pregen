import os
import json
import http.server
import urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer

CACHE_MAX_AGE = int(os.getenv('CACHE_MAX_AGE', '0'))
STEAM_WEB_API_KEY = os.getenv('STEAM_WEB_API_KEY', '')

class RequestHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/backend':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data)

            id_list = [str(id) for id in data['payload'] if str(id).isdigit()]
            if not id_list:
                self.send_error(400, 'Invalid payload')
                return

            # Your previous script goes here
            # ...

        else:
            self.send_error(404, 'Not Found')

    def do_GET(self):
        if self.path in ['/index.html', '/main.css', '/main.js', '/']:
            if self.path == '/':
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
    server_address = ('', 8000)
    httpd = server_class(server_address, handler_class)
    httpd.serve_forever()

if __name__ == "__main__":
    run()


#########################################
#todo: upd modular

import os
import json
import http.server
import urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer
from backend.index import handle_post  # Import the function

class RequestHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/backend':
            handle_post(self, self)  # Call the function
        else:
            self.send_error(404, 'Not Found')

    # Rest of your code...

if __name__ == "__main__":
    run()