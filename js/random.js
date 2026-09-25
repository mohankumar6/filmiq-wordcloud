// random.js
// Placeholder for the seeded RNG module. app.js currently provides a working rnd().
// This file exists so we can split functionality later.

// Example export-like global (not using modules):
function seededRng(seed){let t = seed||Date.now(); return function(){ t=(t*1664525+1013904223)>>>0; return t/4294967296 }}
