# Arma 3 Preset Generator
Customizable Arma 3 Launcher preset files generated client side from a list of steam workshop IDs.

## Features
 * preset sharing made effortless 💚
 * optional mods can be customized on a simple UI on the fly
 * outputs standard Arma 3 Launcher preset files
 * remembers previously selected optional mods
 * ~~mod data caching on the client side~~

## URL format 
All the preset information is stored in the app URL (preset name, mods/collections, DLCs, optional flags).  
The preset name is parsed from the query component, and the ID list is parsed from the fragment component of the URL.  
Additional information is loaded through various steam APIs but the [steam workshop](https://steamcommunity.com/app/107410/workshop/) is considered the single source of truth.

## Preset name
Append a custom preset name / file name to the URL after `?` and before `#`.  
Only alphanumeric characters + `_` is allowed.

## ID list
Comma `,` separated list of IDs evaluated from left to right in order.  
Mods inherit the optional flag from collections but the last state in order affecting a mod takes precendece when rendering the UI. _(see example C4G RHS KotH)_  

This means that you can override the optional flags of certain items in collections to extend or restrict them. In other words it allows you to mix and combine existing collections and mods to customize the required and optional mods in any way you like.  

The selected optional mods are remembered client side in relation to the preset name.  
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

## Examples
 * FNF: [arma3pregen.devs.space/?FNF#1551644814,1551648858\*](https://arma3pregen.devs.space/?FNF#1551644814,1551648858*)
   * **FNF**
   * [1551644814](https://steamcommunity.com/sharedfiles/filedetails/?id=1551644814) FNF Required Mods Collection (collection)
   * _[1551648858](https://steamcommunity.com/sharedfiles/filedetails/?id=1551648858) FNF Optional Mods Collection (collection)_
 * FNF WW2: [arma3pregen.devs.space/?FNF_WW2#1769913157,2120184260\*](https://arma3pregen.devs.space/?FNF_WW2#1769913157,2120184260*)
   * **FNF_WW2**
   * [1769913157](https://steamcommunity.com/sharedfiles/filedetails/?id=1769913157) FNF WW2 Mod Collection (collection)
   * _[2120184260](https://steamcommunity.com/sharedfiles/filedetails/?id=2120184260) FNF WW2 Optionals (collection)_
 * 77th JSOC: [arma3pregen.devs.space/?77th_JSOC#879092974\*](https://arma3pregen.devs.space/?77th_JSOC#879092974*)
   * **77th_JSOC**
   * _[879092974](https://steamcommunity.com/sharedfiles/filedetails/?id=879092974) 77th JSOC | Public Servers Mod Collection (Official) (collection)_
 * C4G RHS KotH: [arma3pregen.devs.space/?C4G_RHS_KotH#1290398866,\*861133494,\*945476727,\*1180534892,\*1180533757](https://arma3pregen.devs.space/?C4G_RHS#1290398866,*861133494,*945476727,*1180534892,*1180533757)
   * **C4G_RHS_KotH**
   * [1290398866](https://steamcommunity.com/sharedfiles/filedetails/?id=1290398866) RHS - King of the Hill by Sa-Matra (collection)
   * _[861133494](https://steamcommunity.com/sharedfiles/filedetails/?id=861133494) JSRS SOUNDMOD_
   * _[945476727](https://steamcommunity.com/sharedfiles/filedetails/?id=945476727) JSRS SOUNDMOD - RHS AFRF Mod Pack Sound Support_
   * _[1180534892](https://steamcommunity.com/sharedfiles/filedetails/?id=1180534892) JSRS SOUNDMOD - RHS GREF Mod Pack Sound Support_
   * _[1180533757](https://steamcommunity.com/sharedfiles/filedetails/?id=1180533757) JSRS SOUNDMOD - RHS USAF Mod Pack Sound Support_
 * Custom: [arma3pregen.devs.space/?My_Custom_Vietnam_Modlist_2022q2#!1227700,450814997,463939057,@my_local_mod,\*333310405,\*@optional_local_mod,\*!288520](https://arma3pregen.devs.space/?My_Custom_Vietnam_Modlist_2022q2#!1227700,450814997,463939057,@my_local_mod,*333310405,*@optional_local_mod,*!288520)
   * **My_Custom_Vietnam_Modlist_2022q2**
   * [!1227700](https://store.steampowered.com/app/1227700) Arma 3 Creator DLC: S.O.G. Prairie Fire (DLC)
   * [450814997](https://steamcommunity.com/sharedfiles/filedetails/?id=450814997) CBA_A3
   * [463939057](https://steamcommunity.com/sharedfiles/filedetails/?id=463939057) ace
   * @my_local_mod
   * _[333310405](https://steamcommunity.com/sharedfiles/filedetails/?id=333310405) Enhanced Movement_
   * _@optional_local_mod_
   * _[!288520](https://store.steampowered.com/app/288520) Arma 3 Karts (DLC)_

## Self hosting
NodeJS or PHP runtime is required to relay backend calls to the steam API. _(CORS disabled 😔)_  
Spin up an instance on `http://localhost/` with one of these commands:
 * nodejs: `node server.mjs`
 * php: `php -S 0.0.0.0:80`
 * docker (php): `docker-compose up`

_The app can be served from under any subdomain or path._

## Similar projects
 * https://github.com/ColinM9991/Arma-Preset-Creator

## TODO
 * python backend
 * prompt for the preset name before saving if it's not set
 * resolve unmet workshop dependencies on demand
 * preset file to URL converter
