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

async function init() {
    id('main').className = 'dnone';
    id('loading').className = '';
    id('mods-body').replaceChildren();
    id('dl-button').removeEventListener('click', downloadPreset);

    try {
        const presetIds = parseUrl();
        PRESET_NAME = presetIds.name;
        console.log('dbg:presetIds', presetIds);

        if (presetIds.ids.length > 0) {
            PRESET_DATA = await parsePresetIds(presetIds);
            console.log('dbg:presetData', PRESET_DATA);

            render(presetIds);
            id('dl-button').addEventListener('click', downloadPreset);
        } else {
            if (confirm('Redirect to the README?')) window.location.replace('https://github.com/a-sync/arma3pregen');
            else id('loading').textContent = 'No IDs detected.';
        }
    } catch (err) {
        console.error(err);
        id('loading-text').textContent = 'Something went wrong... 💩';
        const pre = e('pre', err.message || err);
        id('loading').append(pre);
    }
}

function parseUrl() {
    const loc = window.location;
    const re = {
        name: 'arma3pregen',
        ids: []
    };

    if (loc.search.length > 1) {
        re.name = loc.search.slice(1).replaceAll(/\W/g, '');
        if (re.name.length < 1) re.name = 'arma3pregen';
    }

    if (loc.hash.length > 1) {
        const idsArray = loc.hash.slice(1).split(',');
        for (const i of idsArray) {
            const idMatch = Array.from(i.matchAll(/^\*?(!?\d+|@\w+)\*?$/g));

            if (idMatch.length === 1 && idMatch[0].length === 2) {
                const id = idMatch[0][1];
                re.ids.push({
                    optional: Boolean(i !== id),
                    local: Boolean(id.slice(0, 1) === '@'),
                    dlc: Boolean(id.slice(0, 1) === '!'),
                    id
                });
            } else {
                console.error('Skipping invalid ID in list', i);
            }
        }
    }

    return re;
}

async function parsePresetIds(presetIds) {
    const modIds = [];
    const collectionChildren = {};
    const modDetails = [];
    const workshopIds = [];
    const dlcAppIds = [];
    const optionalFlags = {};
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

        if (i.optional) optionalFlags[i.id] = true;
        else optionalFlags[i.id] = false;
    }

    const collections = await fetch('backend/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ api: 'collection', payload: workshopIds })
    }).then(res => res.json());

    if (collections.response.resultcount > 0) {
        for (const cd of collections.response.collectiondetails) {
            if (cd.result === 1 && cd.children && cd.children.length > 0) {
                collectionChildren[cd.publishedfileid] = cd.children.map(cdc => {
                    if (optionalFlags[cdc.publishedfileid] === undefined) {
                        //TODO: or if collection id comes after the mod id or missing in the workshopId list
                        //if missing, the latter collection state is inherited
                        optionalFlags[cdc.publishedfileid] = Boolean(optionalFlags[cd.publishedfileid]);
                    }
                    modIds.push(cdc.publishedfileid);
                    return cdc.publishedfileid;
                });
            }
        }
    }

    const mods = await fetch('backend/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ api: 'file', payload: workshopIds.concat(modIds) })
    }).then(res => res.json());

    if (mods.response.resultcount > 0) {
        for (const f of mods.response.publishedfiledetails) {
            if (collectionChildren[f.publishedfileid]) f._children = collectionChildren[f.publishedfileid];
            modDetails.push(f);
        }
    }

    if (dlcAppIds.length) {
        const dlcs = await fetch('backend/', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ api: 'app', payload: dlcAppIds })
        }).then(res => res.json());

        for (const d of dlcs.response) {
            d._dlc = '!' + d.steam_appid;
            modDetails.push(d);
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

    id('loading').className = 'dnone';
    id('main').className = '';
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
        if (m && m.file_size) return p + m.file_size;
        else return p;
    }, 0);

    let dlBtnDescText = '';
    if (uniqueAll.length > 0) {
        dlBtnDescText = 'Includes ';
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

        dlBtnDescText += ' (' + formatBytes(size) + ')';
    }

    id('dl-button-desc').textContent = dlBtnDescText;
}

function showInfoModal(data) {
    // console.log('dbg:showInfoModal', data);
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
                            if (m && m.file_size) size += m.file_size;
                        }
                        tr.append(e('td', 'Total Size'), e('td', formatBytes(size)));
                    } else tr.append(e('td', 'File Size'), e('td', formatBytes(data.mod.file_size)));
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

            if (data.mod.description) {
                const descDiv = e('div');
                descDiv.innerHTML = parseSteamBBCode(data.mod.description);
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

function parseSteamBBCode(source) {
    const nl = '(\\r\\n|\\r|\\n)?';
    const codes = [
        ['\\[h1\\](.+?)\\[/h1\\]' + nl, '<h1>$1</h1>'],
        ['\\[h2\\](.+?)\\[/h2\\]' + nl, '<h2>$1</h2>'],
        ['\\[h3\\](.+?)\\[/h3\\]' + nl, '<h3>$1</h3>'],
        ['\\[b\\](.+?)\\[/b\\]', '<b>$1</b>'],
        ['\\[u\\](.+?)\\[/u\\]', '<u>$1</u>'],
        ['\\[i\\](.+?)\\[/i\\]', '<i>$1</i>'],
        ['\\[strike\\](.+?)\\[/strike\\]', '<s>$1</s>'],
        ['\\[spoiler\\](.+?)\\[/spoiler\\]', '<span class="spoiler">$1</span>'],
        // TODO: ['\\[noparse\\](.+?)\\[/noparse\\]', '<span class="noparse">$1</span>'],
        ['\\[hr\\]\\[/hr\\]' + nl, '<hr>'],
        ['\\[url\\](.+?)\\[/url\\]', '<a href="$1">$1</a>'],
        ['\\[url=(.+?)\\](.+?)\\[/url\\]', '<a href="$1">$2</a>'],
        ['\\[list\\]' + nl + '(.+?)\\[/list\\]' + nl, '<ul>$2</ul>'],
        ['\\[olist\\]' + nl + '(.+?)\\[/olist\\]' + nl, '<ol>$2</ol>'],
        ['\\[\\*\\](.+?)' + nl, '<li>$1'],
        ['\\[\\*\\](.+?)\\[/\\*\\]' + nl, '<li>$1</li>'],
        ['\\[quote\\]' + nl + '(.+?)\\[/quote\\]' + nl, '<blockquote>$2</blockquote>'],
        ['\\[quote=(.+?)\\]' + nl + '(.+?)\\[/quote\\]' + nl, '<blockquote><cite>$1</cite><br>$3</blockquote>'],
        ['\\[code\\]' + nl + '(.+?)\\[/code\\]' + nl, '<pre>$2</pre>'],
        ['(\\r\\n|\\r|\\n)', '<br>'],
        // TODO: youtube, steam store, steam workshop links
    ];

    return codes.reduce(
        (source, code) => source.replace(new RegExp(code[0], 'gms'), code[1]),
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
    console.log('dbg.downloadPreset');//debug
}





// generate an HTML file and open the `Save as` system dialog for a preset 
function downloadPreset_OLD(preset) {
    const logo = 'https://community.bistudio.com/wikidata/images/thumb/6/6c/Arma3LauncherIcon.png/192px-Arma3LauncherIcon.png';
    const preset_template = '<?xml version="1.0" encoding="utf-8"?><html><!--Created by https://a-sync.github.io/arma3pregen--><head><meta name="arma:Type" content="preset" /><meta name="arma:PresetName" content="{PRESET_NAME}" /><meta name="generator" content="Arma 3 Launcher - https://a-sync.github.io/arma3pregen" /><title>Arma 3</title><link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet" type="text/css" /><style>body{margin:0;padding:0;color:#fff;background:#000}body,td,th{font:95%/1.3 Roboto, Segoe UI, Tahoma, Arial, Helvetica, sans-serif}td{padding:3px 30px 3px 0}h1{padding:20px 20px 0 72px;color:white;font-weight:200;font-family:segoe ui;font-size:3em;margin:0;background:transparent url(' + logo + ') 3px 15px no-repeat;background-size: 64px auto;}em{font-variant:italic;color:silver}.before-list{padding:5px 20px 10px}.mod-list{background:#222222;padding:20px}.dlc-list{background:#222222;padding:20px}.footer{padding:20px;color:gray}.whups{color:gray}a{color:#D18F21;text-decoration:underline}a:hover{color:#F1AF41;text-decoration:none}.from-steam{color:#449EBD}.from-local{color:gray}</style></head><body><h1>Arma 3 - Preset <strong>{PRESET_NAME}</strong></h1><p class="before-list"><em>Drag this file over the the Arma 3 Launcher or load it from Mods / Preset / Import.</em></p><div class="mod-list"><table>{MOD_LIST}</table></div><div class="dlc-list"><table>{DLC_LIST}</table></div><div class="footer"><span>Created by <a href="https://a-sync.github.io/arma3pregen">https://a-sync.github.io/arma3pregen</a></span></div></body></html>';

    // combine the required mods with the selected optionals
    const mods = [].concat(preset.mods.required);
    const ls_opt = JSON.parse(window.localStorage[preset.html] || '{}');
    for (const om of preset.mods.optional) {
        if (ls_opt[om.link] !== undefined) {
            mods.push(om);
        }
    }

    const modcontainers = mods.map(m => {
        if (Boolean(m.dlc)) return '';

        let from = 'local">Local';
        let local = '';
        let link = '';

        if (m.link === '') {
            local = '<span class="whups" data-type="Link" data-meta="local:' + m.id + '|' + m.id + '|" />';
        } else {
            from = 'steam">Steam';
            link = '<a href="' + m.link + '" data-type="Link">' + m.link + '</a>';
        }

        return '<tr data-type="ModContainer"><td data-type="DisplayName">' + m.name + '</td><td><span class="from-' + from + '</span></td><td>' + local + link + '</td></tr>';
        // // TODO: local
        // // http://steamcommunity.com/sharedfiles/filedetails/?id=
        // return '<tr data-type="ModContainer"><td data-type="DisplayName">' + m.name + '</td><td><span class="from-steam">Steam</span></td><td><a href="' + m.link + '" data-type="Link">' + m.link + '</a></td></tr>';
    });

    const dlccontainers = mods.filter(m => Boolean(m.dlc)).map(m => '<tr data-type="DlcContainer"><td data-type="DisplayName">' + m.name + '</td><td><a href="' + m.link + '" data-type="Link">' + m.link + '</a></td></tr>');

    const source = preset_template
        .replaceAll('{PRESET_NAME}', preset.name)
        .replace('{MOD_LIST}', modcontainers.join(''))
        .replace('{DLC_LIST}', dlccontainers.join(''));
    const element = document.createElement('a');
    element.href = 'data:text/html;charset=utf-8,' + encodeURIComponent(source);
    element.download = preset.html;
    element.style.display = 'none';
    document.body.append(element);
    element.click();
    element.remove();
}

// TODO: drag & drop preset html to generate url
// returns [{name,mods:{required,optional,dlc},index,files,type}]
// load and parse each preset file and return all the info
//TODO: detect local mods
function parsePresetsSource(config) {
    const presets = [];

    // parses the html source and returns regex results combined with additional data
    const parseA3LPreset = (html_source, additional) => {
        const name = html_source.match(/<meta name="arma:PresetName" content="(.*?)" \/>/);
        const mods = html_source.matchAll(/<tr data-type="(Mod|Dlc)Container">[\s\S]*?<td data-type="DisplayName">(.*?)<\/td>[\s\S]*?<a href="(.*?)" data-type="Link">(.*?)<\/a>/g);
        return {
            name,
            mods,
            ...additional
        }
    };
    //TODO: sanitize name
    // r.name ? r.name[1].replace(/\W/g, '') : ''
    /*
    // sort mods, 
    //TODO: detect local mods
        for (const m of r.mods) {
            if (m[3] !== m[4]) {
                console.warn('Link mismatch', m);
            }

            if (m[1] === 'Mod') {
                
            } else if (m[1] === 'Dlc') {
                
            }
        }
    */

    // marshalls all requests together so we can run them parallel
    const promises = config.reduce((p, files, index) => {
        for (const type of ['required', 'optional']) {
            if (files[type] !== undefined && files[type] !== '') {
                p.push(fetch('servers-and-mods/' + files[type])
                    .then(res => res.text())
                    .then(text => parseA3LPreset(text, { index, files, type })));
            }
        }
        return p;
    }, []);

    // wait for all the requests to resolve and sort / format the data
    return Promise.all(promises.map(p => p.catch(e => e))).then(res_arr => {
        for (const r of res_arr) {
            if (r instanceof Error) {
                console.error(r);
            } else {
                const html = r.files[r.type];
                if (presets[r.index] === undefined) {
                    presets[r.index] = {
                        name: r.name ? r.name[1] : html,
                        html: html,
                        mods: {
                            dlc: [],
                            required: [],
                            optional: []
                        }
                    };
                }

                if (r.type === 'required') {
                    presets[r.index].name = r.name ? r.name[1] : html;
                    presets[r.index].html = html;
                }

                for (const m of r.mods) {
                    if (m[3] !== m[4]) {
                        console.warn('Link mismatch', m);
                    }

                    if (m[1] === 'Mod') {
                        presets[r.index].mods[r.type].push({
                            name: m[2],
                            link: m[3]
                        });
                    } else if (m[1] === 'Dlc') {
                        presets[r.index].mods.dlc.push({
                            name: m[2],
                            link: m[3]
                        });
                    }
                }
            }
        }

        return presets;
    });
}
