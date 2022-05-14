# Arma 3 Launcher presets generated client side from a list of steam workshop IDs

## Usage
Add a list of workshop collection and/or mod IDs to the end of the url separated by commas.  
Append a `*` to mark an ID optional.  

Examples:
 * FNF: http://localhost:3000/#1551644814,1551648858*
 * 77th JSOC: 
 * C4G RHS HC: 

Non numeric items are added to the preset as local mods.

Examples:
 * http://localhost:3000/#1551644814,1551648858*,@my_custom_mod

## How?
 * collection and mod data is gathered on the client side and cached
 * produces standard Arma 3 Launcher preset files
 * custom downloads generated on the fly with selected optional mods 💚

## Sources
The [steam workshop](https://steamcommunity.com/app/107410/workshop/) is considered the single source of truth.  
All preset information (name, included DLCs, required and optional mods) are parsed from the list of workshop IDs provided.  

## Runing locally
Fetch API requires the content to be served via http(s).  
Eg.:  
 - nodejs: `npx serve .`  
 - php: `php -S 0.0.0.0:3000`  
 - python: `python -m http.server 3000`  
