import fs from 'fs';

const loadJSON = (path) => JSON.parse(fs.readFileSync(new URL(path, import.meta.url)));

const pkg = loadJSON('../package.json');
const manifest = loadJSON('../public/manifest.json');

if (pkg.version !== manifest.version) {
    console.log(`updating manifest.json version: ${manifest.version} -> ${pkg.version}`)
    manifest.version = pkg.version;
    fs.writeFileSync(new URL('../public/manifest.json', import.meta.url), JSON.stringify(manifest, null, 2));

} else {
    console.log(`manifest.json version (${manifest.version}) is the same as package.json version (${manifest.version}) - no need to update`)
}
