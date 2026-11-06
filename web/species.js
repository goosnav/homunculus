// Spawn identities are a closed list. Asset paths never come from player input.
export const SPECIES={
 human:{asset:'resident',premise:'an unhappy man',label:'human'},
 slug:{asset:'creatures/slug',premise:'an unhappy long-nosed slug',label:'slug'},
 worm:{asset:'creatures/worm',premise:'an unhappy long-nosed worm',label:'worm'},
 mass:{asset:'creatures/mass',premise:'an unhappy living biological mass',label:'mass'},
};
export const speciesId=value=>Object.hasOwn(SPECIES,value)?value:'human';
export function randomSpecies(random=Math.random){const value=random();return Object.keys(SPECIES)[Number.isFinite(value)?Math.min(3,Math.max(0,Math.floor(value*4))):0];}
