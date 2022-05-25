# Arma 3 Preset Generator
Customizable Arma 3 Launcher preset files generated client side from a list of steam workshop IDs.

## Features
 * preset sharing made effortless 💚
 * optional mods can be customized on a simple UI on the fly
 * outputs standard Arma 3 Launcher preset files
 * remembers previously selected optional mods
 * ~~mod data caching on the client side~~

Listed IDs are evaluated from left to right in order.  
Mods inherit the optional flag from collections but the last state in order affecting a mod takes precendece when rendering the UI. This means that you can override the optional flags of certain items in collections to extend / restrict them, in other words it allows you to mix and combine existing collections and mods to customize the required and optional presets in any way you like.  

The selected optional mods are remembered client side in relation to the file name prefix.  
You should also take advantage of the workshop collection feature and create permanent links with workshop IDs pointing to the currently used required and optional collections. _(see examples)_

## Sources
All the preset information (name, included DLCs, required and optional mods) is stored in the app URL.  
The [steam workshop](https://steamcommunity.com/app/107410/workshop/) is considered the single source of truth.  

## Options
### Preset name prefix
Append a custom preset name / file name prefix to the url after `?` and before `#`.

### Workshop IDs (collection, mod)
Append a `,` separated list of workshop collection and/or mod IDs to the end of the app url.  
Only numbers and the optional `*` prefix/suffix is allowed.

### Optional mods
Append or prepend a `*` to flag an ID optional.

### Local mod IDs
IDs starting with `@` are added to the preset as local mods.  
Only alphanumeric characters + `_` and the optional `*` prefix/suffix is allowed.

### DLC / CDLC mods
Items starting with `!` are added to the preset as DLC/CDLC AppIDs.  
Only numbers and the optional `*` prefix/suffix is allowed.

### Examples:
 * FNF: `https://arma3pregen.devs.space/?FNF#1551644814,1551648858*`
   * [FNF Required Mods Collection](https://steamcommunity.com/sharedfiles/filedetails/?id=1551644814) (collection)
   * _[FNF Optional Mods Collection](https://steamcommunity.com/sharedfiles/filedetails/?id=1551648858) (collection)_
 * 77th JSOC: `https://arma3pregen.devs.space/?77th_JSOC#879092974*`
   * _[77th JSOC | Public Servers Mod Collection (Official)](https://steamcommunity.com/sharedfiles/filedetails/?id=879092974) (collection)_
 * C4G RHS KoTH: `https://arma3pregen.devs.space/?C4G_RHS#1290398866,*861133494,*945476727,*1180534892,*1180533757`
   * [RHS - King of the Hill by Sa-Matra](https://steamcommunity.com/sharedfiles/filedetails/?id=1290398866) (collection)
   * _[JSRS SOUNDMOD](https://steamcommunity.com/sharedfiles/filedetails/?id=861133494)_
   * _[JSRS SOUNDMOD - RHS AFRF Mod Pack Sound Support](https://steamcommunity.com/sharedfiles/filedetails/?id=945476727)_
   * _[JSRS SOUNDMOD - RHS GREF Mod Pack Sound Support](https://steamcommunity.com/sharedfiles/filedetails/?id=1180534892)_
   * _[JSRS SOUNDMOD - RHS USAF Mod Pack Sound Support](https://steamcommunity.com/sharedfiles/filedetails/?id=1180533757)_
 * Custom: `https://arma3pregen.devs.space/?My_Custom_Vietnam_Modlist_2022q2#!1227700,450814997,463939057,@my_local_mod,*333310405,*@optional_local_mod,*!288520`
   * [Arma 3 Creator DLC: S.O.G. Prairie Fire](https://store.steampowered.com/app/1227700) (DLC)
   * [CBA_A3](https://steamcommunity.com/sharedfiles/filedetails/?id=450814997)
   * [ace](https://steamcommunity.com/sharedfiles/filedetails/?id=463939057)
   * @my_local_mod local mod file.
   * _[Enhanced Movement](https://steamcommunity.com/sharedfiles/filedetails/?id=333310405)_
   * _@optional_local_mod_
   * _[Arma 3 Karts](https://store.steampowered.com/app/288520) (DLC)_

## Runing locally
_PHP ~~or Nodejs~~ runtime is required to relay backend calls to the steam API. (cors disabled)_  
Eg.:  
 - ~~nodejs: `node server.js`~~
 - php: `php -S 0.0.0.0:80`
 - docker (php): `docker-compose up`

Open `http://localhost:80/` in a browser.  

# TODO
 * nodejs backend
 * add backend caching (nodb)
 * shortlink support (nodb backend)
   * custom logo url
 * copy to clipboard (if it works with the launcher) ??????????

