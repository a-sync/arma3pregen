<?php
header('Content-Type: application/json');
// header('Cache-Control: max-age=' . intval(getenv('CACHE_MAX_AGE')));
try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $_POST = json_decode(file_get_contents('php://input'), true);
        $api = '';
        $idList = [];
        $pl = [];

        if (is_array($_POST['payload'])) {
            foreach ($_POST['payload'] as $id) {
                if (ctype_digit($id)) $idList[] = $id;
            }
        }
        if (count($idList) === 0) throw new Error('Invalid payload');

        if ($_POST['api'] === 'file') {
            $api = 'ISteamRemoteStorage/GetPublishedFileDetails';
            $pl = [
                'itemcount' => count($idList),
                'publishedfileids' => $idList
            ];
        } elseif ($_POST['api'] === 'collection') {
            $api = 'ISteamRemoteStorage/GetCollectionDetails';
            $pl = [
                'collectioncount' => count($idList),
                'publishedfileids' => $idList
            ];
        } elseif ($_POST['api'] === 'app') {
            $response = [];
            foreach ($idList as $id) {
                $appId = intval($id);
                try {
                    $res = file_get_contents('https://store.steampowered.com/api/appdetails?appids=' . $appId);
                    $json = json_decode($res, true);
                    if (isset($json[$appId]) && $json[$appId]['success'] === true) {
                        $response[] = $json[$appId]['data'];
                    }
                } catch (Error $err) {}
            }

            die(json_encode(['response' => $response]));
        } else throw new Error('Invalid api');

        $context = stream_context_create([
            'http' => [
                'method'  => 'POST',
                'header'  => 'Content-Type: application/x-www-form-urlencoded; User-Agent: arma3pregen/1.0',
                'content' => http_build_query($pl)
            ]
        ]);

        die(file_get_contents('https://api.steampowered.com/' . $api . '/v1/?', false, $context));
    } else throw new Error('Invalid method');
} catch (Error $err) {
    $msg = 'Bad Request. ' . $err->getMessage();
    http_response_code(400);
    die(json_encode(['error' => $msg]));
}
