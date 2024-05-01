import os
import json
import http.client
import urllib.parse

CACHE_MAX_AGE = int(os.getenv('CACHE_MAX_AGE', '0'))
STEAM_WEB_API_KEY = os.getenv('STEAM_WEB_API_KEY', '')

def handle_post(rh):
    content_length = int(rh.headers['Content-Length'])
    post_data = rh.rfile.read(content_length)
    data = json.loads(post_data)

    id_list = [str(id) for id in data['payload'] if str(id).isdigit()]
    if not id_list:
        rh.send_error(400, 'Invalid payload')
        return

    if data['api'] == 'app':
        resdata = []
        for id in id_list:
            conn = http.client.HTTPSConnection("store.steampowered.com")
            conn.request("GET", "/api/appdetails?appids=" + id)
            res = conn.getresponse()
            data = json.loads(res.read())
            if data[id]['success']:
                resdata.append(data[id]['data'])
        rh.send_response(200)
        rh.send_header('Content-type', 'application/json')
        rh.send_header('Cache-Control', 'max-age=' + str(CACHE_MAX_AGE))
        rh.end_headers()
        rh.wfile.write(json.dumps({"response": resdata}).encode())
    elif data['api'] == 'file' and STEAM_WEB_API_KEY:
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
        rh.send_response(200)
        rh.send_header('Content-type', 'application/json')
        rh.send_header('Cache-Control', 'max-age=' + str(CACHE_MAX_AGE))
        rh.end_headers()
        rh.wfile.write(res.read())
    elif data['api'] == 'file':
        api = 'ISteamRemoteStorage/GetPublishedFileDetails'
        params = {'itemcount': len(id_list), 'publishedfileids': id_list}
        headers = {'Content-Type': 'application/x-www-form-urlencoded'}
        conn = http.client.HTTPSConnection("api.steampowered.com")
        conn.request("POST", "/" + api + "/v1/?", urllib.parse.urlencode(params), headers)
        res = conn.getresponse()
        rh.send_response(200)
        rh.send_header('Content-type', 'application/json')
        rh.send_header('Cache-Control', 'max-age=' + str(CACHE_MAX_AGE))
        rh.end_headers()
        rh.wfile.write(res.read())
    elif data['api'] == 'collection':
        print(f"id_list: {id_list}")
        api = 'ISteamRemoteStorage/GetCollectionDetails'
        params = {'collectioncount': len(id_list), 'publishedfileids': id_list}
        headers = {'Content-Type': 'application/x-www-form-urlencoded'}
        conn = http.client.HTTPSConnection("api.steampowered.com")
        conn.request("POST", "/" + api + "/v1/?", urllib.parse.urlencode(params), headers)
        res = conn.getresponse()
        print(f"Response status: {res.status}")
        print(f"Sending POST request to: {urllib.parse.urlencode(params)}")
        rh.send_response(200)
        rh.send_header('Content-type', 'application/json')
        rh.send_header('Cache-Control', 'max-age=' + str(CACHE_MAX_AGE))
        rh.end_headers()
        rh.wfile.write(res.read())
    else:
        rh.send_error(400, 'Invalid api')
