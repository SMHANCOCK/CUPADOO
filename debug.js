// debug.js
export const DEBUG = true;

export function log(...args){
  if(DEBUG) console.log('[DEBUG]', ...args);
}
export function warn(...args){
  if(DEBUG) console.warn('[WARN]', ...args);
}
export function error(...args){
  console.error('[ERROR]', ...args); // always show errors
}
