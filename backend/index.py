import os
import json
import http.client
import urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer

CACHE_MAX_AGE = int(os.getenv('CACHE_MAX_AGE', '0'))
STEAM_WEB_API_KEY = os.getenv('STEAM_WEB_API_KEY', '')

class RequestHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)

        id_list = [str(id) for id in data['payload'] if str(id).isdigit()]
        if not id_list:
            self.send_error(400, 'Invalid payload')
            return

        if data['api'] == 'app':
            response = []
            for id in id_list:
                conn = http.client.HTTPSConnection("store.steampowered.com")
                conn.request("GET", "/api/appdetails?appids=" + id)
                res = conn.getresponse()
                data = json.loads(res.read())
                if data[id]['success']:
                    response.append(data[id]['data'])
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Cache-Control', 'max-age=' + str(CACHE_MAX_AGE))
            self.end_headers()
            self.wfile.write(json.dumps({"response": response}).encode())
        else:
            if data['api'] == 'file' and STEAM_WEB_API_KEY:
                api = 'IPublishedFileService/GetDetails'
                params = {
                    'key': STEAM_WEB_API_KEY,
                    'appid': 107410,
                    'publishedfileids': id_list,
                    'includetags': True,
                    'includeadditionalpreviews': False,
                    'includechildren': False,
                    'includekvtags': False,
                    'includevotes': False,
                    'short_description': False,
                    'includeforsaledata': False,
                    'includemetadata': False,
                    'return_playtime_stats': False,
                    'strip_description_bbcode': False
                }
                conn = http.client.HTTPSConnection("api.steampowered.com")
                conn.request("GET", "/" + api + "/v1/?" + urllib.parse.urlencode(params))
                res = conn.getresponse()
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Cache-Control', 'max-age=' + str(CACHE_MAX_AGE))
                self.end_headers()
                self.wfile.write(res.read())
            elif data['api'] == 'file':
                api = 'ISteamRemoteStorage/GetPublishedFileDetails'
                params = {'itemcount': len(id_list), 'publishedfileids': id_list}
                headers = {'Content-Type': 'application/x-www-form-urlencoded'}
                conn = http.client.HTTPSConnection("api.steampowered.com")
                conn.request("POST", "/" + api + "/v1/?", urllib.parse.urlencode(params), headers)
                res = conn.getresponse()
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Cache-Control', 'max-age=' + str(CACHE_MAX_AGE))
                self.end_headers()
                self.wfile.write(res.read())
            elif data['api'] == 'collection':
                api = 'ISteamRemoteStorage/GetCollectionDetails'
                params = {'collectioncount': len(id_list), 'publishedfileids': id_list}
                headers = {'Content-Type': 'application/x-www-form-urlencoded'}
                conn = http.client.HTTPSConnection("api.steampowered.com")
                conn.request("POST", "/" + api + "/v1/?", urllib.parse.urlencode(params), headers)
                res = conn.getresponse()
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Cache-Control', 'max-age=' + str(CACHE_MAX_AGE))
                self.end_headers()
                self.wfile.write(res.read())
            else:
                self.send_error(400, 'Invalid api')

def run(server_class=HTTPServer, handler_class=RequestHandler):
    server_address = ('', 8000)
    httpd = server_class(server_address, handler_class)
    httpd.serve_forever()

if __name__ == "__main__":
    run()

################################################
#todo upd modular: 

import os
import json
import http.client
import urllib.parse

CACHE_MAX_AGE = int(os.getenv('CACHE_MAX_AGE', '0'))
STEAM_WEB_API_KEY = os.getenv('STEAM_WEB_API_KEY', '')

def handle_post(request, response):
    content_length = int(request.headers['Content-Length'])
    post_data = request.rfile.read(content_length)
    data = json.loads(post_data)

    id_list = [str(id) for id in data['payload'] if str(id).isdigit()]
    if not id_list:
        response.send_error(400, 'Invalid payload')
        return

    # Your previous script goes here
    # ...