#!/usr/bin/env node

/**
 * Post-build script to add .js extensions to local imports in compiled JS files
 * This is required for ES modules in Node.js
 */

import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join, dirname, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distDir = join(__dirname, '../dist');

async function* getFiles(dir) {
const entries = await readdir(dir, { withFileTypes: true });
for (const entry of entries) {
const res = join(dir, entry.name);
if (entry.isDirectory()) {
yield* getFiles(res);
} else if (entry.name.endsWith('.js')) {
yield res;
}
}
}

async function fixImports(filePath) {
let content = await readFile(filePath, 'utf-8');
let modified = false;

// Fix local imports (starting with ./ or ../)
const localImportRegex = /(from\s+['"])(\.\S*?)(['"])/g;

const replacements = [];
let match;
localImportRegex.lastIndex = 0;

while ((match = localImportRegex.exec(content)) !== null) {
const [fullMatch, prefix, path, suffix] = match;

// Skip if already has an extension (.js, .json, .mjs)
if (path.match(/\.(js|json|mjs)$/)) {
continue;
}

// Skip if it's importing from a package (not starting with . or ..)
if (!path.startsWith('.')) {
continue;
}

// Resolve the path to check if it's a directory
const resolvedPath = resolve(dirname(filePath), path);
let newPath = path;

try {
const stats = await stat(resolvedPath);
if (stats.isDirectory()) {
// It's a directory import, add /index.js
newPath = `${path}/index.js`;
} else {
// It's a file import, add .js
newPath = `${path}.js`;
}
} catch {
// File/dir doesn't exist as-is, try with .js extension
try {
await stat(`${resolvedPath}.js`);
newPath = `${path}.js`;
} catch {
// Try as directory with index.js
try {
await stat(join(resolvedPath, 'index.js'));
newPath = `${path}/index.js`;
} catch {
// Can't resolve, just add .js
newPath = `${path}.js`;
}
}
}

if (newPath !== path) {
replacements.push({ from: fullMatch, to: `${prefix}${newPath}${suffix}` });
modified = true;
}
}

// Apply replacements
for (const { from, to } of replacements) {
content = content.replace(from, to);
}

// Fix lodash-es imports (they also need .js extensions)
const lodashImportRegex = /(from\s+['"])(lodash-es\/\S+?)(['"])/g;

content = content.replace(lodashImportRegex, (match, prefix, path, suffix) => {
// Skip if already has .js extension
if (path.endsWith('.js')) {
return match;
}

modified = true;
return `${prefix}${path}.js${suffix}`;
});

if (modified) {
await writeFile(filePath, content, 'utf-8');
console.log(`✓ Fixed imports in ${relative(distDir, filePath)}`);
}
}

async function main() {
console.log('Adding .js extensions to imports in dist/...\n');

let count = 0;
for await (const file of getFiles(distDir)) {
await fixImports(file);
count++;
}

console.log(`\n✓ Processed ${count} files`);
}

main().catch(console.error);
