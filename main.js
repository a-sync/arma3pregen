const ACCEPTED_APPIDS = ['107410'];
// helpers
const id = s => document.getElementById(s);
const e = (type, text, options) => {
    const re = document.createElement(type, options);
    if (text !== undefined) re.textContent = text;
    return re;
}

// main
document.addEventListener('DOMContentLoaded', async () => {
    // close the dialog when clicking on the backdrop
    document.addEventListener('click', event => {
        if (!event.target.closest('.show_btn')
            && !event.target.closest('.select_btn')
            && !event.target.closest('#dialog-header')
            && !event.target.closest('#dialog-content')) {
            id('mods').close();
        }
    });

    document.addEventListener('hashchange', function () {
        console.log('The hash has changed!');//debug
    }, false);

    try {
        const presetData = parseUrl();
        if (presetData.ids.length > 0) {
            console.log('dbg:presetData', presetData);//DEBUG
            const preset = await parsePresetData(presetData);

            console.log('dbg:preset', preset);//DEBUG
            render([preset]);//debug

            id('loading').className = 'dnone';
            id('main').className = '';

            //id('debug').textContent = JSON.stringify(mods, null, 2);//DEBUG
            //id('debug').className = '';//DEBUG
        } else {
            if (confirm('Redirect to the README?'))window.location.replace('https://github.com/a-sync/arma3pregen');
            else id('loading-text').textContent = 'No IDs detected.';//dbg
        }
    } catch (err) {
        console.error(err);
        id('loading').textContent = 'Something went wrong... 💩';
        const pre = e('pre', err.message || err);
        id('loading').append(pre);
    }

    //const sup = e('sup', 'Last updated @ ' + updated);
    //id('footer').prepend(sup, e('br'));
});

async function parsePresetData(presetData) {
    const modIds = [];
    const collectionChildren = {};
    const modDetails = [];

    const workshopIds = [];
    const dlcAppIds = [];
    for (const i of presetData.ids) {
        if (!i.local) {
            if (i.dlc) dlcAppIds.push(i.id.slice(1));
            else workshopIds.push(i.id);
        }
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

    console.log('##### modDetails', modDetails);//debug

    //DEBUG: hax to convert format to OLD version
    ////###############################################
    const preset = {
        name: presetData.name,
        html: presetData.name + '.html',
        mods: {
            required: [],
            optional: []
        }
    };

    const addMod = (newMod, required, local) => {
        let id = '';
        let name = '';
        let link = '';

        if (Boolean(newMod._dlc)) {
            id = newMod.steam_appid;
            name = newMod.name;
            link = 'https://store.steampowered.com/app/' + id;
        } else if (local) {
            id = newMod.name;
            name = id;
        } else {
            id = newMod.publishedfileid;
            name = newMod.title;
            link = 'http://steamcommunity.com/sharedfiles/filedetails/?id=' + id;
        }
        preset.mods[required ? 'required' : 'optional'].push({ id, name, link, dlc: Boolean(newMod._dlc) });
    };

    for (const mData of presetData.ids) {
        if (mData.local) {
            addMod({ name: mData.id }, mData.required, mData.local);
        } else {
            if (mData.dlc) {
                const mod = modDetails.find(m => mData.id === m._dlc);
                if (mod) addMod(mod, mData.required);
            } else {
                const mod = modDetails.find(m => mData.id === m.publishedfileid);
                if (mod) {
                    if (mod._children) {
                        for (const mc of mod._children) {
                            const childMod = modDetails.find(m => mc === m.publishedfileid);
                            if (childMod) addMod(childMod, mData.required);
                        }
                    } else addMod(mod, mData.required);
                }
            }
        }
    }

    return preset;
}

function parseUrl() {
    const loc = window.location;
    const re = {
        name: 'arma3pregen',
        ids: []
    };

    if (loc.search.length > 1) {
        re.name = loc.search.slice(1).replaceAll(/\W/g, '');
    }

    if (loc.hash.length > 1) {
        const idsArray = loc.hash.slice(1).split(',');
        for (const i of idsArray) {
            const idMatch = Array.from(i.matchAll(/^\*?(!?\d+|@\w+)\*?$/g));

            if (idMatch.length === 1 && idMatch[0].length === 2) {
                const id = idMatch[0][1];
                re.ids.push({
                    required: Boolean(i === id),
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

// TODO: drag & drop preset html to generate url
// returns [{name,mods:{required,optional,dlc},index,files,type}]
// load and parse each preset file and return all the info
function parsePresets(config) {
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

// build a UI from all the presets data
function render(presets) {
    console.log('# RENDER # ', presets);
    //publishedfileid,file_size,description,preview_url,time_updated
    // TODO: banned & ban reason; visibility; time_created; views; favorited; subscription; tags

    for (const p of presets) {
        const name = e('td', p.name);

        console.log('p.mods', p.mods);//debug
        const dlcReq = p.mods.required.filter(m => Boolean(m.dlc));
        const dlcOpt = p.mods.optional.filter(m => Boolean(m.dlc));
        console.log('dlcReq, dlcOpt', dlcReq, dlcOpt);//debug

        //required col
        const req = e('td', String(p.mods.required.length - dlcReq.length));
        if (dlcReq.length) {
            console.log('dlcReq');
            const dlc = e('span', (dlcReq.length > 1 ? dlcReq.length + ' ' : '') + 'DLC');
            dlc.title = dlcReq.map(m => m.name).join(', ');
            req.append(new Text(' + '), dlc);
        }

        const show_btn = e('button', 'SHOW');
        show_btn.className = 'show_btn';
        show_btn.addEventListener('click', () => {
            showModsModal('required', p);
        });
        req.append(show_btn);

        // optional col
        const opt = e('td');
        const ls_opt_count = Object.keys(JSON.parse(window.localStorage[p.html] || '{}')).length;
        const opt_selected = e('span', String(ls_opt_count));

        opt.append(opt_selected, new Text(' / ' + String(p.mods.optional.length - dlcOpt.length)));
        if (dlcOpt.length) {
            console.log('dlcOpt');
            const dlc = e('span', (dlcOpt.length > 1 ? dlcOpt.length + ' ' : '') + 'DLC');
            dlc.title = dlcOpt.map(m => m.name).join(', ');
            opt.append(new Text(' + '), dlc);
        }

        const select_btn = e('button', 'SELECT');
        select_btn.className = 'select_btn';
        select_btn.addEventListener('click', () => {
            showModsModal('optional', p, opt_selected);
        });
        opt.append(select_btn);

        const dl = e('td');
        const dl_link = e('a', p.html);
        dl_link.addEventListener('click', () => {
            downloadPreset(p);
        });
        dl.append(dl_link);

        const tr = e('tr');
        tr.append(name, req, opt, dl);
        id('presets-body').append(tr);
    }
}

// open the mod list dialog for a preset
function showModsModal(type, preset, opt_selected) {
    id('mods-title').replaceChildren();
    const dl_link = e('a', preset.html);
    dl_link.addEventListener('click', () => {
        downloadPreset(preset);
    });
    id('mods-title').append(new Text(preset.name + ' ' + type + ' mods'), e('br'), dl_link);

    id('dialog-content').replaceChildren();
    const ol = e('ol');
    const mods = type === 'optional' ? preset.mods.optional : preset.mods.required;
    for (const m of mods) {
        const li = e('li');

        if (type === 'optional') {
            const cb = e('input');
            cb.type = 'checkbox';
            cb.name = m.name;
            cb.value = m.link;
            const ls_opt = JSON.parse(window.localStorage[preset.html] || '{}');
            cb.checked = Boolean(ls_opt[m.link]);
            // update the status of an optional mod each time the checkbox state changes
            cb.addEventListener('change', event => {
                const ls_opt = JSON.parse(window.localStorage[preset.html] || '{}');
                if (event.target.checked) {
                    ls_opt[event.target.value] = true;
                } else {
                    delete ls_opt[event.target.value];
                }
                opt_selected.textContent = String(Object.keys(ls_opt).length);
                window.localStorage[preset.html] = JSON.stringify(ls_opt);
            });
            li.append(cb, new Text(' '));
        }

        if (m.link) {
            const a = e('a', m.name);
            a.target = '_blank';
            a.href = m.link;
            li.append(a);
        } else {
            const span = e('span', m.name);
            li.append(span);
        }

        // highlight DLCs in the list
        if (m.link.indexOf('store.steampowered.com/app/') !== -1) {
            li.prepend(new Text(' ❗'));
        }

        ol.append(li);
    }
    id('dialog-content').append(ol);

    if (id('mods').showModal === undefined) {
        dialogPolyfill.registerDialog(id('mods'));
    }
    id('mods').showModal();
}

// generate an HTML file and open the `Save as` system dialog for a preset 
function downloadPreset(preset) {
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
