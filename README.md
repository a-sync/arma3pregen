# Arma 3 Preset Generator
Customizable Arma 3 Launcher preset files generated client side from a list of steam workshop IDs.

## Features
 * preset sharing made effortless 💚
 * optional mods can be customized on a simple UI on the fly
 * outputs standard Arma 3 Launcher preset files
 * ~~mod data caching on the client side~~

## Sources
All the preset information (name, included DLCs, required and optional mods) is stored in the app URL.  
The [steam workshop](https://steamcommunity.com/app/107410/workshop/) is considered the single source of truth.  

## Options
### Workshop IDs (collection, mod, DLC/CDLC)
Append a `,` separated list of workshop collection, mod and DLC IDs to the end of the app url.  
Only numbers and the `*` prefix/suffix is allowed.

### Local mod IDs
Items starting with `@` are added to the preset as local mods.  
Only alphanumeric characters and `_` is allowed.

### Optional mods
Append or prepend a `*` to mark an ID optional.

### DLC / CDLC mods
Items starting with `!` are added to the preset as DLC mods.

### Preset name prefix
Append a custom preset name / file name prefix to the url after `?` and before `#`.

### Examples:
 * FNF: http://localhost/?FNF#1551644814,1551648858*
 * 77th JSOC: http://localhost/?77th_JSOC#879092974*
 * C4G RHS KoTH: http://localhost/?C4G_RHS#1290398866,*861133494,*945476727,*1180534892,*1180533757
 * Custom: http://localhost/?My_Custom_Vietnam_Modlist_2022q2#!1227700,450814997,463939057,@my_local_mod,*333310405,*@optional_local_mod,*!288520

## Runing locally
_PHP or Nodejs runtime is required to relay backend calls to the steam API. (cors disabled)_  
Eg.:  
 - nodejs: `node server.js`
 - php: `php -S 0.0.0.0:80`
 - docker (php): `docker-compose up`

# TODO
 * nodejs backend
 * add backend caching (nodb)
 * shortlink support (nodb backend)
   * custom logo url
