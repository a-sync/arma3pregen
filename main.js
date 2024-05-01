// helpers
const id = s => document.getElementById(s);
const e = (type, text, options) => {
    const re = document.createElement(type, options);
    if (text !== undefined) re.textContent = text;
    return re;
}
const uniqueArray = arr => [...new Set(arr)];

// main
document.addEventListener('DOMContentLoaded', async () => {
    if (id('mods').showModal === undefined) {
        document.querySelector('head').insertAdjacentHTML('afterbegin', [
            '\<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/dialog-polyfill@latest/dist/dialog-polyfill.min.css"\>',
            '\<script src="https://cdn.jsdelivr.net/npm/dialog-polyfill@latest/dist/dialog-polyfill.min.js"\>\<\/script\>'
        ].join(''));
    }

    // close the dialog when clicking on the backdrop
    document.addEventListener('click', event => {
        if (!event.target.closest('a[data-id]')
            && !event.target.closest('#dialog-header')
            && !event.target.closest('#dialog-content')) {
            id('mods').close();
        }
    });

    window.addEventListener('hashchange', init);
    await init();
});

let PRESET_NAME = 'arma3pregen';
let PRESET_DATA = [];
function getModById(id) {
    return PRESET_DATA.find(v => {
        if (id.slice(0, 1) === '@' && id === v.id) return true;
        else if (id.slice(0, 1) === '!' && Number(id.slice(1)) === v.steam_appid) return true;
        else if (id === v.publishedfileid) return true;
        else return false;
    });
}

const DBG = 1;
let filePond = null;
async function init() {
    id('main').className = 'dnone';
    id('loading').className = '';
    id('mods-body').replaceChildren();
    id('dl-button').removeEventListener('click', downloadPreset);

    if (filePond === null) {
        FilePond.registerPlugin(FilePondPluginFileValidateType);
        filePond = FilePond.create(id('fupl'), {
            itemInsertLocation: 'after',
            credits: false,
            dropOnPage: true,
            dropOnElement: false,
            dropValidation: true,
            allowRemove: false
        });

        //debug
        filePond.on('processfile', (err, file) => {
            if (err) console.error(err);
            else console.log('new fupl', file); // debug
        });
        //debug
    }

    try {
        const presetIds = parseUrl();
        PRESET_NAME = presetIds.name;
        document.title = 'Arma 3 Preset Generator - ' + PRESET_NAME.replaceAll(/_/g, ' ');
        if (DBG) console.log('dbg:presetIds', presetIds);

        if (presetIds.ids.length > 0) {
            PRESET_DATA = await parsePresetIds(presetIds);
            if (DBG) console.log('dbg:presetData', PRESET_DATA);

            render(presetIds);
            id('dl-button').addEventListener('click', downloadPreset);
            id('loading').className = 'dnone';
            id('main').className = '';
        } else {
            id('dl-button').className = 'dnone';
            id('loading').replaceChildren();
            id('loading').textContent = 'No valid IDs found in the URL.';
            id('loading').appendChild(e('br'));
            const a = e('a', 'README');
            a.href = 'https://github.com/a-sync/arma3pregen#readme';
            id('loading').appendChild(a);
            id('main').className = '';
        }
    } catch (err) {
        console.error(err);
        id('loading-text').textContent = 'Something went wrong... 💩';
        const pre = e('pre', err.message || err);
        id('loading').append(pre);
    }
}

function parseIds(str) {
    const re = [];
    const idsArray = str.split(',');

    for (const i of idsArray) {
        const idMatch = Array.from(i.matchAll(/^\*?(!?\d+|@\w+)\*?$/g));

        if (idMatch.length === 1 && idMatch[0].length === 2) {
            const id = idMatch[0][1];
            re.push({
                optional: Boolean(i !== id),
                local: Boolean(id.slice(0, 1) === '@'),
                dlc: Boolean(id.slice(0, 1) === '!'),
                id
            });
        } else {
            console.error('Skipping invalid ID in list', i);
        }
    }

    return re;
}

function parseUrl() {
    const loc = window.location;
    const re = {
        name: 'arma3pregen',
        ids: []
    };

    if (loc.search.length > 1) {
        const qs = decodeURIComponent(loc.search.slice(1));
        const sepIndex = qs.indexOf('=');

        let pname = '';
        if (sepIndex > -1) {
            const qsParam = qs.slice(0, sepIndex);
            pname = qsParam.replaceAll(/\W/g, '');
            re.ids = re.ids.concat(parseIds(qs.slice(sepIndex + 1)));
        } else {
            if (/^\d+$/.test(qs)) re.ids = re.ids.concat(parseIds(qs));
            else if (/^\w+$/.test(qs)) pname = qs.replaceAll(/\W/g, '');
            else re.ids = re.ids.concat(parseIds(qs));
        }

        if (pname) re.name = pname;
    }

    if (loc.hash.length > 1) re.ids = re.ids.concat(parseIds(loc.hash.slice(1)));

    return re;
}

const VALID_APP_IDS = [107410]; // Arma 3
async function parsePresetIds(presetIds) {
    const modDetails = [];
    const workshopIds = [];
    const dlcAppIds = [];
    for (const i of presetIds.ids) {
        if (i.local) {
            modDetails.push({
                id: i.id,
                _local: true
            });
        } else {
            if (i.dlc) dlcAppIds.push(i.id.slice(1));
            else workshopIds.push(i.id);
        }
    }

    const modIds = [];
    const collectionChildren = {};

    if (workshopIds.length > 0) {
        const collections = await fetch('backend/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api: 'collection', payload: workshopIds })
        }).then(res => res.json());

        if (collections.error) console.error(collections.error);
        else if (collections.response && collections.response.resultcount > 0) {
            for (const cd of collections.response.collectiondetails) {
                if (cd.result === 1 && cd.children && cd.children.length > 0) {
                    collectionChildren[cd.publishedfileid] = cd.children.map(cdc => {
                        modIds.push(cdc.publishedfileid);
                        return cdc.publishedfileid;
                    });
                }
            }
        }
    }

    if (workshopIds.length + modIds.length > 0) {
        const mods = await fetch('backend/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api: 'file', payload: workshopIds.concat(modIds) })
        }).then(res => res.json());

        if (mods.error) console.error(mods.error);
        else if (mods.response && (mods.response.resultcount > 0 || (mods.response.publishedfiledetails && mods.response.publishedfiledetails.length > 0))) {
            for (const f of mods.response.publishedfiledetails) {
                if (VALID_APP_IDS.includes(f.consumer_app_id) || VALID_APP_IDS.includes(f.consumer_appid)) {
                    if (collectionChildren[f.publishedfileid]) f._children = collectionChildren[f.publishedfileid];
                    if (f.result && f.result !== 9) modDetails.push(f);
                }
            }
        }
    }

    if (dlcAppIds.length) {
        const dlcs = await Promise.all(dlcAppIds.map(appId => fetch('backend/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api: 'app', payload: [appId] })
        }).then(res => res.json()).catch(err => err)));

        for (const dlc of dlcs) {
            if (dlc.error || dlc instanceof Error) console.error(dlc.error || dlc);
            else {
                for (const d of dlc.response) {
                    if (d.fullgame && VALID_APP_IDS.includes(parseInt(d.fullgame.appid, 10))) {
                        d._dlc = '!' + d.steam_appid;
                        modDetails.push(d);
                    }
                }
            }
        }
    }

    const optionalFlags = {};
    for (const i of presetIds.ids) {
        const opt = Boolean(i.optional);
        optionalFlags[i.id] = opt;

        if (collectionChildren[i.id]) {
            for (const c of collectionChildren[i.id]) {
                optionalFlags[c] = opt;
            }
        }
    }

    return modDetails.map(m => {
        if (Boolean(m._dlc)) m._optional = Boolean(optionalFlags[m._dlc]);
        else if (Boolean(m.publishedfileid)) m._optional = Boolean(optionalFlags[m.publishedfileid]);
        else m._optional = Boolean(optionalFlags[m.id]);

        return m;
    });
}

function render(ids) {
    const optionals = JSON.parse(window.localStorage['opt_' + PRESET_NAME] || '{}');

    for (const i of ids.ids) {
        const m = getModById(i.id);
        if (m) {
            renderSingleItem(i.id, m, null, optionals);
            if (m._children) {
                for (const c of m._children) {
                    const cm = getModById(c);
                    if (cm) renderSingleItem(cm.publishedfileid, cm, m, optionals);
                    else console.error('No mod found for child ID', cm);
                }
            }
        } else console.error('No mod found for ID', i.id);
    }

    const collectionTrs = document.querySelectorAll('#mods-body tr.collection');
    for (const cTr of Array.from(collectionTrs)) {
        updSelectedSubmodsNum(cTr);
    }

    renderDownloadButton();
}

function renderSingleItem(i, mod, collection, optionals) {
    let n = 'n/a';
    if ('title' in mod) n = mod.title;
    else if ('name' in mod) n = mod.name;
    else if ('id' in mod) n = mod.id;

    const tr = e('tr');
    const td = e('td');
    const cb = e('input');
    cb.dataset.id = i;

    if (collection) {
        tr.className = 'submod';
        cb.dataset.collectionId = collection.publishedfileid;
    }
    else tr.className = 'mod';

    let h3;
    let sup;
    if (Boolean(mod._local)) {
        td.textContent = n;
        cb.name = 'm[]';
    } else {
        const a = e('a', n);
        a.dataset.id = i;
        if (mod._dlc) a.href = 'https://store.steampowered.com/app/' + String(i).slice(1);
        else a.href = 'https://steamcommunity.com/sharedfiles/filedetails/?id=' + String(i);
        a.addEventListener('click', event => {
            event.preventDefault();
            showInfoModal({ id: i, name: n, link: a.href, mod, collection });
        });

        if (Boolean(mod._children)) {
            h3 = e('h3');
            h3.append(a);
            const l = mod._children.length;
            sup = e('sup', '(' + (Boolean(mod._optional) ? 0 : l) + '/' + l + ')');
            tr.className = 'collection';
        } else {
            td.append(a);
            cb.name = 'm[]';
        }
    }

    cb.type = 'checkbox';
    cb.value = String(i);

    const label = e('label');
    if (Boolean(mod._optional)) {
        if (collection && !Boolean(collection._optional)) {
            cb.setAttribute('disabled', 'disabled');
            label.className = 'disabled';
        }
        if (optionals[cb.value]) cb.checked = true;

        if (Boolean(mod._children)) cb.addEventListener('change', collectionCheckbox);
        else cb.addEventListener('change', modCheckbox);
    } else {
        cb.setAttribute('disabled', 'disabled');
        cb.checked = true;
        label.className = 'not-optional disabled';
    }

    label.append(cb);
    if (h3 && sup) td.append(h3, label, sup);
    else td.append(label);
    tr.append(td);

    id('mods-body').append(tr);
}

function updSelectedSubmodsNum(collectionTr) {
    let total = 0;
    let selected = 0;
    let nextEl = collectionTr.nextElementSibling;
    while (nextEl) {
        if (!nextEl.classList.contains('submod')) break;
        total++;
        const modInput = nextEl.querySelector('input[type=checkbox]');
        if (modInput && modInput.checked) selected++;
        nextEl = nextEl.nextElementSibling;
    }
    const collectionSel = collectionTr.querySelector('sup');
    if (collectionSel) collectionSel.textContent = selected + '/' + total;
    const collectionInput = collectionTr.querySelector('input[type=checkbox]');
    if (selected > 0 && selected < total) collectionInput.indeterminate = true;
    else collectionInput.indeterminate = false;
    return { total, selected };
}

function replicateCheckboxState(cb) {
    const cbs = document.querySelectorAll("#mods-body tr td label input[name='m[]']");
    for (const c of Array.from(cbs)) {
        if (c.value === cb.value && c.checked !== cb.checked) {
            c.checked = cb.checked;
            const ev = {
                _replica: true,
                target: c
            };
            modCheckbox(ev);
        }
    }
}

function collectionCheckbox(event) {
    const opt = JSON.parse(window.localStorage['opt_' + PRESET_NAME] || '{}');
    if (event.target.checked) opt[event.target.value] = true;
    else delete opt[event.target.value];

    const tr = event.target.parentNode.parentNode.parentNode;
    let nextEl = tr.nextElementSibling;
    while (nextEl) {
        if (!nextEl.classList.contains('submod')) break;
        const modInput = nextEl.querySelector('input[type=checkbox]');
        if (modInput && !modInput.disabled) {
            const changed = Boolean(modInput.checked !== event.target.checked);
            modInput.checked = event.target.checked;
            if (modInput.checked) opt[modInput.value] = modInput.checked;
            else delete opt[modInput.value];
            if (changed) replicateCheckboxState(modInput);
        }
        nextEl = nextEl.nextElementSibling;
    }

    updSelectedSubmodsNum(tr);
    renderDownloadButton();

    window.localStorage['opt_' + PRESET_NAME] = JSON.stringify(opt);
}

function modCheckbox(event) {
    const opt = JSON.parse(window.localStorage['opt_' + PRESET_NAME] || '{}');
    if (event.target.checked) opt[event.target.value] = true;
    else delete opt[event.target.value];

    const tr = event.target.parentNode.parentNode.parentNode;
    if (tr.classList.contains('submod')) {
        let prevEl = tr.previousElementSibling;
        while (prevEl) {
            if (prevEl.classList.contains('collection')) break;
            prevEl = prevEl.previousElementSibling;
        }
        if (prevEl) {
            const collectionInput = prevEl.querySelector('input[type=checkbox]');
            if (collectionInput) {
                let allTrue = true;
                let nextEl = prevEl.nextElementSibling;
                while (nextEl) {
                    if (!nextEl.classList.contains('submod')) break;
                    const modInput = nextEl.querySelector('input[type=checkbox]');
                    if (modInput) {
                        if (modInput.checked === false) {
                            allTrue = false;
                            break;
                        }
                    }
                    nextEl = nextEl.nextElementSibling;
                }
                collectionInput.checked = allTrue;
                if (collectionInput.checked) opt[collectionInput.value] = true;
                else delete opt[collectionInput.value];
            }
            updSelectedSubmodsNum(prevEl);
        }
    }

    if (!Boolean(event._replica)) {
        replicateCheckboxState(event.target);
        renderDownloadButton();
    }

    window.localStorage['opt_' + PRESET_NAME] = JSON.stringify(opt);
}

function renderDownloadButton() {
    id('dl-button-filename').textContent = PRESET_NAME;

    const selected = { req: [], opt: [] };
    const cbs = document.querySelectorAll("#mods-body tr td label input[name='m[]']");
    for (const c of Array.from(cbs)) {
        if (c.checked) {
            const label = c.parentElement;
            if (label.classList.contains('not-optional')) selected.req.push(c.value);
            else selected.opt.push(c.value);
        }
    }

    const unique = { req: uniqueArray(selected.req), opt: uniqueArray(selected.opt) };
    const uniqueAll = unique.req.concat(unique.opt);

    const size = uniqueAll.reduce((p, c) => {
        const m = getModById(c);
        if (m && m.file_size) return p + parseInt(m.file_size, 10);
        else return p;
    }, 0);

    let dlBtnDescText = 'No mods selected.';
    if (uniqueAll.length > 0) {
        dlBtnDescText = 'Contains ';
        if (unique.req.length > 0) {
            dlBtnDescText += unique.req.length + ' required ';
            if (unique.opt.length > 0) {
                dlBtnDescText += 'and '
            }
        }
        if (unique.opt.length > 0) {
            dlBtnDescText += unique.opt.length + ' optional ';
        }
        if (uniqueAll.length > 1) dlBtnDescText += 'mods.';
        else dlBtnDescText += 'mod.';

        if (size) dlBtnDescText += ' (' + formatBytes(size) + ')';
    }

    id('dl-button-desc').textContent = dlBtnDescText;
}

function showInfoModal(data) {
    if (DBG) console.log('dbg:showInfoModal', data);
    const mt = id('modal-title');
    mt.replaceChildren();
    const dc = id('dialog-content');
    dc.replaceChildren();

    const link = e('a', '🔗');
    link.href = data.link;
    link.setAttribute('target', '_blank');
    mt.append(new Text(data.name), new Text(' '), link);

    if (data.mod) {
        if (data.mod._dlc) {
            if (data.mod.genres && data.mod.genres.length > 0) {
                mt.append(e('br'));
                for (const g of data.mod.genres) {
                    mt.append(e('code', g.description));
                }
            }

            if (data.mod.header_image) {
                const picDiv = e('div');
                picDiv.className = 'pic-container';
                const img = e('img');
                img.src = data.mod.header_image;
                picDiv.append(img);
                dc.append(picDiv);
            }

            if (data.mod.release_date || (data.mod.developers && data.mod.developers.length) || (data.mod.publishers && data.mod.publishers.length) || data.mod.website) {
                const detailsTable = e('table');
                detailsTable.className = 'details';
                const detailsTbody = e('tbody');
                if (data.mod.release_date) {
                    const tr = e('tr');
                    tr.append(e('td', 'Release Date'), e('td', data.mod.release_date.date));
                    detailsTbody.append(tr);
                }
                if (data.mod.developers && data.mod.developers.length > 0) {
                    const tr = e('tr');
                    const s = data.mod.developers.length > 1 ? 's' : '';
                    tr.append(e('td', 'Developer' + s), e('td', data.mod.developers.join(', ')));
                    detailsTbody.append(tr);
                }
                if (data.mod.publishers && data.mod.publishers.length > 0) {
                    const tr = e('tr');
                    const s = data.mod.publishers.length > 1 ? 's' : '';
                    tr.append(e('td', 'Publisher' + s), e('td', data.mod.publishers.join(', ')));
                    detailsTbody.append(tr);
                }
                if (data.mod.website) {
                    const tr = e('tr');
                    const a = e('a', data.mod.website);
                    a.href = data.mod.website;
                    a.setAttribute('target', '_blank');
                    const webTd = e('td');
                    webTd.append(a);
                    tr.append(e('td', 'Website'), webTd);
                    detailsTbody.append(tr);
                }
                detailsTable.append(detailsTbody);
                dc.append(detailsTable);
            }

            const desc = data.mod.detailed_description || data.mod.short_description;
            if (desc) {
                const descDiv = e('div');
                descDiv.innerHTML = desc;
                descDiv.className = 'description';
                dc.append(descDiv);
            }
        } else {
            if (data.mod.banned) {
                const span = e('span', '🚫');
                if (data.mod.ban_reason && data.mod.ban_reason.length > 0) {
                    span.setAttribute('title', data.mod.ban_reason);
                }
                mt.append(new Text(' '), span);
            }

            if (data.mod.tags && data.mod.tags.length > 0) {
                mt.append(e('br'));
                for (const t of data.mod.tags) {
                    mt.append(e('code', t.tag));
                }
            }

            const picUrl = data.mod.preview_url || data.mod.file_url;
            if (picUrl) {
                const picDiv = e('div');
                picDiv.className = 'pic-container';
                const img = e('img');
                img.src = picUrl;
                picDiv.append(img);
                dc.append(picDiv);
            }

            if (data.mod.file_size || data.mod.time_created || data.mod.time_updated || (data.mod._children || data.mod._children.length)) {
                const detailsTable = e('table');
                detailsTable.className = 'details';
                const detailsTbody = e('tbody');
                if (data.mod.file_size) {
                    const tr = e('tr');
                    if (data.mod._children) {
                        let size = 0;
                        for (const c of data.mod._children) {
                            const m = getModById(c);
                            if (m && m.file_size) size += parseInt(m.file_size, 10);
                        }
                        tr.append(e('td', 'Total Size'), e('td', formatBytes(size)));
                    } else tr.append(e('td', 'File Size'), e('td', formatBytes(parseInt(data.mod.file_size, 10))));
                    detailsTbody.append(tr);
                }
                if (data.mod._children && data.mod._children.length > 0) {
                    const tr = e('tr');
                    tr.append(e('td', 'Items'), e('td', data.mod._children.length));
                    detailsTbody.append(tr);
                }
                if (data.mod.time_created) {
                    const tr = e('tr');
                    const dt = new Date(data.mod.time_created * 1000);
                    tr.append(e('td', 'Posted'), e('td', dt.toLocaleString()));
                    detailsTbody.append(tr);
                }
                if (data.mod.time_updated) {
                    const tr = e('tr');
                    const dt = new Date(data.mod.time_updated * 1000);
                    tr.append(e('td', 'Updated'), e('td', dt.toLocaleString()));
                    detailsTbody.append(tr);
                }
                detailsTable.append(detailsTbody);
                dc.append(detailsTable);
            }

            const desc = data.mod.description || data.mod.file_description
            if (desc) {
                const descDiv = e('div');
                descDiv.innerHTML = parseSteamBBCode(desc);
                descDiv.className = 'description';
                dc.append(descDiv);
            }
        }
    }

    if (id('mods').showModal === undefined) {
        dialogPolyfill.registerDialog(id('mods'));
    }
    id('mods').showModal();
}

// https://steamcommunity.com/comment/ForumTopic/formattinghelp
function parseSteamBBCode(source) {
    const nl = '(\\r\\n|\\r|\\n)?'; // Note: trimming group for superfluous line breaks
    const codes = [
        ['\\[h1\\](.+?)\\[/h1\\]' + nl, '<h1>$1</h1>'],
        ['\\[h2\\](.+?)\\[/h2\\]' + nl, '<h2>$1</h2>'],
        ['\\[h3\\](.+?)\\[/h3\\]' + nl, '<h3>$1</h3>'],
        ['\\[b\\](.+?)\\[/b\\]', '<b>$1</b>'],
        ['\\[u\\](.+?)\\[/u\\]', '<u>$1</u>'],
        ['\\[i\\](.+?)\\[/i\\]', '<i>$1</i>'],
        ['\\[strike\\](.+?)\\[/strike\\]', '<s>$1</s>'],
        ['\\[spoiler\\](.+?)\\[/spoiler\\]', '<span class="spoiler">$1</span>'],
        ['\\[noparse\\](.+?)\\[/noparse\\]', '<pre class="noparse">$1</pre>'],// TODO
        ['\\[hr\\]\\[/hr\\]' + nl, '<hr>'],
        ['\\[hr\\]' + nl, '<hr>'],
        ['\\[url\\](.+?)\\[/url\\]', '<a target="_blank" href="$1">$1</a>'],
        ['\\[url=(.+?)\\](.+?)\\[/url\\]', '<a target="_blank" href="$1">$2</a>'],
        ['\\[list\\]' + nl + '(.+?)\\[/list\\]' + nl, '<ul>$2</ul>'],
        ['\\[olist\\]' + nl + '(.+?)\\[/olist\\]' + nl, '<ol>$2</ol>'],
        ['\\[\\*\\](.+?)\\[/\\*\\]' + nl, '<li>$1</li>'],
        ['\\[\\*\\]' + nl, '<li>'],
        ['\\[quote\\]' + nl + '(.+?)\\[/quote\\]' + nl, '<blockquote>$2</blockquote>'],
        ['\\[quote=(.+?)\\]' + nl + '(.+?)\\[/quote\\]' + nl, '<blockquote><cite>$1</cite><br>$3</blockquote>'],
        ['\\[code\\]' + nl + '(.+?)\\[/code\\]' + nl, '<pre>$2</pre>'],
        ['\\[img\\](.+?)\\[/img\\]', '<img src="$1">'],
        ['\\[table\\]' + nl + '(.+?)\\[/table\\]' + nl, '<table>$2</table>'],
        ['\\[th\\]' + nl + '(.+?)\\[/th\\]' + nl, '<th>$2</th>'],
        ['\\[tr\\]' + nl + '(.+?)\\[/tr\\]' + nl, '<tr>$2</tr>'],
        ['\\[td\\]' + nl + '(.+?)\\[/td\\]' + nl, '<td>$2</td>'],
        ['(\\s)(https://store\\.steampowered\\.com/app/\\d+/?)', '$1<a target="_blank" href="$2">$2</a>'],
        ['(\\s)(https://steamcommunity\\.com/sharedfiles/filedetails/\\?id=\\d+)', '$1<a target="_blank" href="$2">$2</a>'],
        ['(\\s)(?:youtube\\.com/(?:[^/]+/.+/|(?:v|e(?:mbed)?)/|.*[?&]v=)|youtu\\.be/)([^"&?/\\s]{11})', '$1<a target="_blank" href="$2">$2</a>'],
        ['(\\r\\n|\\r|\\n)', '<br>']
        // TODO: preview cards for youtube, steam store and steam workshop
    ];

    return codes.reduce(
        (src, code) => src.replace(new RegExp(code[0], 'gims'), code[1]),
        source
    );
}

function formatBytes(bytes, decimals) {
    if (decimals === undefined) decimals = 2;
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function downloadPreset() {
    const mods = new Set();
    const cbs = document.querySelectorAll("#mods-body tr td label input[name='m[]']");
    for (const c of Array.from(cbs)) {
        if (c.checked) {
            mods.add(c.value);
        }
    }

    const modContainers = [];
    const dlcContainers = [];

    for (const mId of mods) {
        const mod = getModById(mId);
        if (mod) {
            if (Boolean(mod._dlc)) {
                const link = 'https://store.steampowered.com/app/' + mod.steam_appid || mod._dlc.slice(1);
                dlcContainers.push('<tr data-type="DlcContainer"><td data-type="DisplayName">' + he.encode(mod.name) + '</td><td><a href="' + link + '" data-type="Link">' + link + '</a></td></tr>');
            } else if (Boolean(mod._local)) {
                modContainers.push('<tr data-type="ModContainer"><td data-type="DisplayName">' + he.encode(mod.id) + '</td><td><span class="from-local">Local</span></td><td><span class="whups" data-type="Link" data-meta="local:' + mod.id + '|' + mod.id + '|" /></td></tr>');
            } else {
                const link = 'https://steamcommunity.com/sharedfiles/filedetails/?id=' + mod.publishedfileid;
                modContainers.push('<tr data-type="ModContainer"><td data-type="DisplayName">' + he.encode(mod.title) + '</td><td><span class="from-steam">Steam</span></td><td><a href="' + link + '" data-type="Link">' + link + '</a></td></tr>');
            }
        }
    }

    const PRESET_LOGO = 'https://community.bistudio.com/wikidata/images/thumb/6/6c/Arma3LauncherIcon.png/192px-Arma3LauncherIcon.png';
    const PRESET_TEMPLATE = '<?xml version="1.0" encoding="utf-8"?><html><!--Created by https://github.com/a-sync/arma3pregen--><head><meta name="arma:Type" content="preset" /><meta name="arma:PresetName" content="{PRESET_NAME}" /><meta name="generator" content="Arma 3 Preset Generator - https://github.com/a-sync/arma3pregen" /><title>Arma 3 - Preset {PRESET_NAME}</title><link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet" type="text/css" /><style>body{margin:0;padding:0;color:#fff;background:#000}body,td,th{font:95%/1.3 Roboto, Segoe UI, Tahoma, Arial, Helvetica, sans-serif}td{padding:3px 30px 3px 0}h1{padding:20px 20px 0 72px;color:white;font-weight:200;font-family:segoe ui;font-size:3em;margin:0;background:transparent url(' + PRESET_LOGO + ') 3px 15px no-repeat;background-size: 64px auto;}em{font-variant:italic;color:silver}.before-list{padding:5px 20px 10px}.mod-list{background:#222222;padding:20px}.dlc-list{background:#222222;padding:20px}.footer{padding:20px;color:gray}.whups{color:gray}a{color:#D18F21;text-decoration:underline}a:hover{color:#F1AF41;text-decoration:none}.from-steam{color:#449EBD}.from-local{color:gray}</style></head><body><h1>Arma 3 - Preset <strong>{PRESET_NAME}</strong></h1><p class="before-list"><em>To import this preset, drag this file onto the Launcher window. Or click the MODS tab, then PRESET in the top right, then IMPORT at the bottom, and finally select this file.</em></p><div class="mod-list"><table>{MOD_LIST}</table></div><div class="dlc-list"><table>{DLC_LIST}</table></div><div class="footer"><span>Created by <a href="https://github.com/a-sync/arma3pregen">https://github.com/a-sync/arma3pregen</a></span></div></body></html>';

    const source = PRESET_TEMPLATE
        .replaceAll('{PRESET_NAME}', PRESET_NAME)
        .replace('{MOD_LIST}', modContainers.join(''))
        .replace('{DLC_LIST}', dlcContainers.join(''));
    const element = document.createElement('a');
    element.href = 'data:text/html;charset=utf-8,' + encodeURIComponent(source);
    element.download = PRESET_NAME + '.html';
    element.style.display = 'none';
    document.body.append(element);
    element.click();
    element.remove();
}

// TODO: create UI to drag & drop/upload preset html to generate url
function TODO_parsePresetFile(source) {
    const re = {
        name: 'arma3pregen',
        ids: []
    };

    // parses the html source and returns regex results
    const parseA3LPreset = (src) => {
        const name = src.match(/<meta name="arma:PresetName" content="(.*?)" \/>/);
        // TODO: detect local mods
        const mods = src.matchAll(/<tr data-type="(Mod|Dlc)Container">[\s\S]*?<td data-type="DisplayName">(.*?)<\/td>[\s\S]*?<a href="(.*?)" data-type="Link">(.*?)<\/a>/g); // TODO: detect local mods
        return {
            name,
            mods
        }
    };

    const presetData = parseA3LPreset(source);

    const pname = presetData.name[1].replace(/\W/g, '');
    if (pname) re.name = pname;

    for (const m of presetData.mods) {
        console.log('dbg:m of presetData.mods', m); // DEBUG
        if (m[3] !== m[4]) {
            console.warn('Link mismatch', m);
        }

        if (m[1] === 'Mod') {
            // TODO: parse id/local mod name, and push to ids
        } else if (m[1] === 'Dlc') {
            // TODO: parse appid, and push to dlc ids
        }
    }

    return re;
}
