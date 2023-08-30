const { request } = require('https');
const CACHE_MAX_AGE = parseInt(process.env.CACHE_MAX_AGE || '0', 10);
const STEAM_WEB_API_KEY = process.env.STEAM_WEB_API_KEY || '';

module.exports = async (req, res) => {
    try {
        if (req.method === 'POST') {
            const body = await new Promise(resolve => {
                let body = '';
                req.on('data', chunk => body += chunk);
                req.on('end', () => resolve(body));
            });
            if (!body) throw new Error('Invalid request body');

            const postData = JSON.parse(body);
            const idList = [];

            if ('payload' in postData && Array.isArray(postData.payload)) {
                for (const id of postData.payload) {
                    if (id && /^\d+$/.test(id)) idList.push(id);
                }
            }
            if (idList.length === 0) throw new Error('Invalid payload');

            let re;
            if (postData.api === 'app') {
                const response = [];
                for (const id of idList) {
                    const appId = parseInt(id, 10);
                    try {
                        const r = await get('https://store.steampowered.com/api/appdetails?appids=' + id);
                        const j = JSON.parse(r);
                        if (appId in j && j[appId]['success'] === true) response.push(j[appId]['data']);
                    } catch (err) { }
                }

                re = JSON.stringify({ response });
            } else {
                let api = '';
                const pl = {};
                if (postData.api === 'file1') {
                    api = 'ISteamRemoteStorage/GetPublishedFileDetails';
                    pl.itemcount = idList.length;
                    pl.publishedfileids = idList;
                    re = await post('https://api.steampowered.com/' + api + '/v1/?', pl);
                } else if (postData.api === 'file') {
                    //todo: if !STEAM_WEB_API_KEY, throw error

                    // https://api.steampowered.com/IPublishedFileService/GetDetails/v1/?publishedfileids%5B0%5D=1286101012&includetags=true&includeadditionalpreviews=true&includechildren=true&includekvtags=true&includevotes=true&short_description=&includemetadata=true&appid=107410&strip_description_bbcode=true&includereactions=true
                    api = 'IPublishedFileService/GetDetails';
                    pl.key = STEAM_WEB_API_KEY;
                    pl.appid = 107410;
                    pl.publishedfileids = idList;
                    pl.includetags = true;
                    pl.includeadditionalpreviews = true;
                    pl.includechildren = true;
                    pl.includekvtags = true;
                    pl.includevotes = true;
                    pl.short_description = false;
                    pl.includemetadata = true;
                    pl.strip_description_bbcode = true;
                    pl.includereactions = true;
                    re = await post('https://api.steampowered.com/' + api + '/v1/?', pl);
                } else if (postData.api === 'collection') {
                    api = 'ISteamRemoteStorage/GetCollectionDetails';
                    pl.collectioncount = idList.length;
                    pl.publishedfileids = idList;
                    re = await post('https://api.steampowered.com/' + api + '/v1/?', pl);
                } else throw new Error('Invalid api');

            }

            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Cache-Control': 'max-age=' + CACHE_MAX_AGE
            });
            res.end(re);
        } else throw new Error('Invalid method');
    } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message || String(err) }));
    }
}

function get(url) {
    const opt = {
        method: 'GET',
        headers: { 'User-Agent': 'arma3pregen/1.0' }
    };

    return new Promise((resolve, reject) => {
        const req = request(url, opt, resp => {
            let data = '';
            resp.on('data', chunk => data += chunk);
            resp.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.end();
    });
}

function post(url, body) {
    const params = new URLSearchParams();
    for (const k in body) {
        if (Array.isArray(body[k])) body[k].forEach((l, i) => params.append(k + '[' + i + ']', l));
        else params.append(k, body[k]);
    }

    const opt = {
        method: 'POST',
        headers: {
            'User-Agent': 'arma3pregen/1.0',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(params.toString())
        }
    };

    return new Promise((resolve, reject) => {
        const req = request(url, opt, resp => {
            let data = '';
            resp.on('data', chunk => data += chunk);
            resp.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.write(params.toString());
        req.end();
    });
}
