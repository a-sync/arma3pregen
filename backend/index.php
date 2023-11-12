<?php
define('CACHE_MAX_AGE', intval(@getenv('CACHE_MAX_AGE')));
define('STEAM_WEB_API_KEY', strval(@getenv('STEAM_WEB_API_KEY')));

header('Content-Type: application/json');
try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $body = file_get_contents('php://input');
        if (!$body) throw new Error('Invalid request body');

        $postData = json_decode($body, true);
        $idList = [];

        if (is_array($postData['payload'])) {
            foreach ($postData['payload'] as $id) {
                if (ctype_digit($id)) $idList[] = $id;
            }
        }
        if (count($idList) === 0) throw new Error('Invalid payload');

        $re = '';
        if ($postData['api'] === 'app') {
            $response = [];
            foreach ($idList as $id) {
                $appId = intval($id);
                try {
                    $res = file_get_contents('https://store.steampowered.com/api/appdetails?appids=' . $appId);
                    $json = json_decode($res, true);
                    if (isset($json[$appId]) && $json[$appId]['success'] === true) {
                        $response[] = $json[$appId]['data'];
                    }
                } catch (Error $err) {
                }
            }

            $re = json_encode(['response' => $response]);
        } else {
            $api = '';
            $pl = [];
            if ($postData['api'] === 'file' && STEAM_WEB_API_KEY !== '') {
                $api = 'IPublishedFileService/GetDetails';
                $pl = [
                    'key' => STEAM_WEB_API_KEY,
                    'appid' => 107410,
                    'publishedfileids' => $idList,
                    'includetags' => true,
                    'includeadditionalpreviews' => false,
                    'includechildren' => false,
                    'includekvtags' => false,
                    'includevotes' => false,
                    'short_description' => false,
                    'includeforsaledata' => false,
                    'includemetadata' => false,
                    'return_playtime_stats' => false,
                    'strip_description_bbcode' => false
                ];

                $re = file_get_contents('https://api.steampowered.com/' . $api . '/v1/?' . http_build_query($pl), false, stream_context_create([
                    'http' => [
                        'method'  => 'GET',
                        'header'  => 'User-Agent: arma3pregen/1.0'
                    ]
                ]));
            }
            elseif ($postData['api'] === 'file') {
                $api = 'ISteamRemoteStorage/GetPublishedFileDetails';
                $pl = [
                    'itemcount' => count($idList),
                    'publishedfileids' => $idList
                ];

                 $re = file_get_contents('https://api.steampowered.com/' . $api . '/v1/?', false, stream_context_create([
                    'http' => [
                        'method'  => 'POST',
                        'header'  => 'Content-Type: application/x-www-form-urlencoded; User-Agent: arma3pregen/1.0',
                        'content' => http_build_query($pl)
                    ]
                ]));
            }
            elseif ($postData['api'] === 'collection') {
                $api = 'ISteamRemoteStorage/GetCollectionDetails';
                $pl = [
                    'collectioncount' => count($idList),
                    'publishedfileids' => $idList
                ];

                $re = file_get_contents('https://api.steampowered.com/' . $api . '/v1/?', false, stream_context_create([
                    'http' => [
                        'method'  => 'POST',
                        'header'  => 'Content-Type: application/x-www-form-urlencoded; User-Agent: arma3pregen/1.0',
                        'content' => http_build_query($pl)
                    ]
                ]));
            }
            else throw new Error('Invalid api');
        }

        header('Cache-Control: max-age=' . CACHE_MAX_AGE);
        die($re);
    } else throw new Error('Invalid method');
} catch (Error $err) {
    http_response_code(400);
    die(json_encode(['error' => $err->getMessage()]));
}
