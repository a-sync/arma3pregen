# Arma 3 Preset Generator
Customizable Arma 3 Launcher preset files generated client side from a list of steam workshop IDs.

## Features
 * preset sharing made effortless 💚
 * optional mods can be customized on a simple web interface on the fly
 * outputs standard Arma 3 Launcher preset files
 * remembers previously selected optional mods
 * converts existing Arma 3 preset and list files
 * ~~client-side mod data caching~~

## URL format 
All the preset information _(preset name, mods/collections, DLCs, optional flags)_ is stored in the app URL's query string component.  
Additional information is fetched from various steam APIs but the [steam workshop](https://steamcommunity.com/app/107410/workshop/) is considered the single source of truth.

## Preset name
Custom preset name or file name can be appended to the URL after `?`.  
Only alphanumeric characters and underscore (`_`) are allowed.  
If the preset name is set, the ID list must be separated with `=`.

## ID list
Comma `,` separated list of IDs evaluated from left to right in order. Appended to the URL after `?` or `=`.  
Mods inherit the optional flag from collections, but the last state in order affecting a mod takes precedence when rendering the UI. _(see example C4G RHS KotH)_  

This means that you can override the optional flags of certain items in collections to extend or restrict them. In other words it allows you to mix and combine existing collections and mods to customize the required and optional mods in any way you like.  

The selected optional mods are remembered client-side in relation to the preset name.  
You should also take advantage of the workshop collection feature and create permanent links with workshop IDs pointing to the currently used required and optional collections. _(see examples FNF and FNF WW2)_

### Optional mods
Append or prepend a `*` to flag an ID optional.

### Workshop IDs (collection, mod)
Only numbers and the optional `*` prefix/suffix is allowed.

### DLC IDs
Items starting with `!` are added to the preset as DLC/CDLC AppIDs.  
Only numbers and the optional `*` prefix/suffix is allowed.

### Local mod IDs
Items starting with `@` are added to the preset as local mods.  
Only alphanumeric characters + `_` and the optional `*` prefix/suffix is allowed.

## Limitations
Both the client (web browser) and the server (web server) impose restrictions on the maximum supported length of a URL. A reasonable limit is approximately 2000 characters across various applications. This allows for approximately 150 mods in a single arma3pregen URL.  
If you need more then you can use collections to condense the list into a single workshop ID.

## Examples
 * FNF: [arma3pregen.devs.space/?FNF=1551644814,1551648858\*](https://arma3pregen.devs.space/?FNF=1551644814,1551648858*)
   * **FNF**
   * [1551644814](https://steamcommunity.com/sharedfiles/filedetails/?id=1551644814) FNF Required Mods Collection (collection)
   * _[1551648858](https://steamcommunity.com/sharedfiles/filedetails/?id=1551648858) FNF Optional Mods Collection (collection)_
 * FNF WW2: [arma3pregen.devs.space/?FNF_WW2=1769913157,2120184260\*](https://arma3pregen.devs.space/?FNF_WW2=1769913157,2120184260*)
   * **FNF_WW2**
   * [1769913157](https://steamcommunity.com/sharedfiles/filedetails/?id=1769913157) FNF WW2 Mod Collection (collection)
   * _[2120184260](https://steamcommunity.com/sharedfiles/filedetails/?id=2120184260) FNF WW2 Optionals (collection)_
 * 77th JSOC: [arma3pregen.devs.space/?77th_JSOC=2982471935\*](https://arma3pregen.devs.space/?77th_JSOC=2982471935*)
   * **77th_JSOC**
   * _[2982471935](https://steamcommunity.com/sharedfiles/filedetails/?id=2982471935) 77th JSOC | Public Servers Mod Collection (Official) (collection)_
 * C4G RHS KotH: [arma3pregen.devs.space/?C4G_RHS_KotH=1290398866,\*861133494,\*945476727,\*1180534892,\*1180533757](https://arma3pregen.devs.space/?C4G_RHS_KotH=1290398866,*861133494,*945476727,*1180534892,*1180533757)
   * **C4G_RHS_KotH**
   * [1290398866](https://steamcommunity.com/sharedfiles/filedetails/?id=1290398866) RHS - King of the Hill by Sa-Matra (collection)
   * _[861133494](https://steamcommunity.com/sharedfiles/filedetails/?id=861133494) JSRS SOUNDMOD_
   * _[945476727](https://steamcommunity.com/sharedfiles/filedetails/?id=945476727) JSRS SOUNDMOD - RHS AFRF Mod Pack Sound Support_
   * _[1180534892](https://steamcommunity.com/sharedfiles/filedetails/?id=1180534892) JSRS SOUNDMOD - RHS GREF Mod Pack Sound Support_
   * _[1180533757](https://steamcommunity.com/sharedfiles/filedetails/?id=1180533757) JSRS SOUNDMOD - RHS USAF Mod Pack Sound Support_
 * Custom: [arma3pregen.devs.space/?My_Custom_Vietnam_Modlist_2022q2=!1227700,450814997,463939057,@my_local_mod,\*333310405,\*@optional_local_mod,\*!288520](https://arma3pregen.devs.space/?My_Custom_Vietnam_Modlist_2022q2=!1227700,450814997,463939057,@my_local_mod,*333310405,*@optional_local_mod,*!288520)
   * **My_Custom_Vietnam_Modlist_2022q2**
   * [!1227700](https://store.steampowered.com/app/1227700) Arma 3 Creator DLC: S.O.G. Prairie Fire (DLC)
   * [450814997](https://steamcommunity.com/sharedfiles/filedetails/?id=450814997) CBA_A3
   * [463939057](https://steamcommunity.com/sharedfiles/filedetails/?id=463939057) ace
   * @my_local_mod
   * _[333310405](https://steamcommunity.com/sharedfiles/filedetails/?id=333310405) Enhanced Movement_
   * _@optional_local_mod_
   * _[!288520](https://store.steampowered.com/app/288520) Arma 3 Karts (DLC)_

## Self hosting
NodeJS, PHP, Python or Docker is required to relay backend calls to the steam API. _(CORS disabled 😔)_  
Spin up an instance on `http://localhost/` with one of these commands:
 * nodejs: `node server.js`
 * python: `python server.py`
 * php: `php -S 0.0.0.0:80`
 * docker (php): `docker-compose up`

_The app can be served from under any subdomain or path._

### Environmental variables
`PORT` controls the listener port of NodeJS and Python servers. _[default: 80]_  
`CACHE_MAX_AGE` controls the browser cache for backend requests in seconds. _[default: 0]_  
`STEAM_WEB_API_KEY` enables the usage of [API key](https://steamcommunity.com/dev/apikey) protected steam endpoints. (optional but recommended ⚠) _[default: empty]_  
 ⤷ _the public API fails on some workshop IDs where the key protected one returns details just fine 🤷‍♂️_

## Similar projects
 * https://github.com/ColinM9991/Arma-Preset-Creator
 * https://github.com/AgentBlackout/A3PresetTools
 * https://github.com/prozyon/A3-preset-analyzer
 * https://github.com/DWaffles/Arma-3-Modpack-Calculator
 * https://github.com/butaosuinu/arma3_steam-collection_to_preset_converter
 * https://github.com/Freddo3000/a3update.py
 * https://github.com/byjokese/Arma-Server-Config-Generator
 * https://github.com/Elenui/Arma3-Mod-Manager
 * https://github.com/Setlerr/arma-3-html-exporter
 * https://github.com/ProPanek/Arma3ModsPresetParser
 * https://github.com/lukegotjellyfish/ArmaPresetSorter
 * https://github.com/VurtualRuler98/arma3-preset-script
 * https://github.com/cconsi/PresetProcessor
 * https://github.com/TehGreatFred/armaModIDFormatter

## TODO
 * prompt for the preset name before saving if it's not set
 * resolve unmet workshop dependencies on demand
 * add a section for the most recently updated mods ordered by date DESC
 * show mod size and last update on hover in modlist
