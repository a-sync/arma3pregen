import fs from 'fs';
import { createServer } from 'http';
import { URL } from 'url';
import backend from './backend/index.mjs';

const APP_HOST = process.env.app_host || process.env.APP_HOST || '0.0.0.0';
const APP_PORT = parseInt(process.env.app_port || process.env.APP_PORT || '80', 10);

createServer((req, res) => {
    // console.log('DBG: %j %j', (new Date()), req.url);
    const reqUrl = new URL(req.url || '', 'http://localhost');
    const pn = reqUrl.pathname.slice(-1) === '/' ? reqUrl.pathname.slice(0, -1) : reqUrl.pathname;
    const p = pn.split('/').pop() || 'index.html';
    if (['index.html', 'main.css', 'main.js'].includes(p)) {
        let ct = 'text/html';
        if (p === 'main.css') ct = 'text/css';
        else if (p === 'main.js') ct = 'text/javascript';
        res.writeHead(200, { 'Content-Type': ct });
        fs.createReadStream('./' + p).pipe(res);
    }
    else if (p === 'backend') {
        backend(req, res);
    }
    else {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<html><head></head><body>404 &#x1F4A2</body></html>');
    }
}).listen(APP_PORT);

console.log('Web service started %s:%s', APP_HOST, APP_PORT);
