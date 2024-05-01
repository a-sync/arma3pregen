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

    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'arma3pregen/1.0'
    }

    if data['api'] == 'app':
        resdata = []
        for id in id_list:
            conn = http.client.HTTPSConnection("store.steampowered.com")
            conn.request("GET", "/api/appdetails?appids=" + id, None, headers)
            res = conn.getresponse()
            if res.status != 200:
                continue
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
        params = [(f"publishedfileids[{i}]", str(id_)) for i, id_ in enumerate(id_list)]
        additional_params = {
            'key': STEAM_WEB_API_KEY,
            'appid': 107410,
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
        combined_params = params + tuple((key, str(value)) for key, value in additional_params.items())

        conn = http.client.HTTPSConnection("api.steampowered.com")
        conn.request("GET", "/" + api + "/v1/?" + urllib.parse.urlencode(combined_params), headers)
        res = conn.getresponse()

        rh.send_response(res.status)
        rh.send_header('Content-type', 'application/json')
        rh.send_header('Cache-Control', 'max-age=' + str(CACHE_MAX_AGE))
        rh.end_headers()
        rh.wfile.write(res.read())
    elif data['api'] == 'file':
        api = 'ISteamRemoteStorage/GetPublishedFileDetails'
        params = [(f"publishedfileids[{i}]", str(id_)) for i, id_ in enumerate(id_list)]
        params.append(('itemcount', len(id_list)))

        conn = http.client.HTTPSConnection("api.steampowered.com")
        conn.request("POST", "/" + api + "/v1/?", urllib.parse.urlencode(params), headers)
        res = conn.getresponse()

        rh.send_response(res.status)
        rh.send_header('Content-type', 'application/json')
        rh.send_header('Cache-Control', 'max-age=' + str(CACHE_MAX_AGE))
        rh.end_headers()
        rh.wfile.write(res.read())
    elif data['api'] == 'collection':
        api = 'ISteamRemoteStorage/GetCollectionDetails'
        params = [(f"publishedfileids[{i}]", str(id_)) for i, id_ in enumerate(id_list)]
        params.append(('collectioncount', len(id_list)))

        conn = http.client.HTTPSConnection("api.steampowered.com")
        conn.request("POST", "/" + api + "/v1/?", urllib.parse.urlencode(params), headers)
        res = conn.getresponse()

        rh.send_response(res.status)
        rh.send_header('Content-type', 'application/json')
        rh.send_header('Cache-Control', 'max-age=' + str(CACHE_MAX_AGE))
        rh.end_headers()
        rh.wfile.write(res.read())
    else:
        rh.send_error(400, 'Invalid api')
