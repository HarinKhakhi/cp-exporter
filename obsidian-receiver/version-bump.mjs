import { readFileSync, writeFileSync } from "fs";

const targetVersion = process.argv[2];
const manifestFile = "manifest.json";
const packageFile = "package.json";
const versionsFile = "versions.json";

// read manifest.json
let manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
// read package.json
let packageJson = JSON.parse(readFileSync(packageFile, "utf8"));
// read versions.json
let versions = JSON.parse(readFileSync(versionsFile, "utf8"));

// update manifest.json with target version
const { minAppVersion } = manifest;
manifest.version = targetVersion;

// update package.json with target version
packageJson.version = targetVersion;

// update versions.json with target version and minAppVersion from manifest.json
versions[targetVersion] = minAppVersion;

// write files
writeFileSync(manifestFile, JSON.stringify(manifest, null, "\t"));
writeFileSync(packageFile, JSON.stringify(packageJson, null, "\t"));
writeFileSync(versionsFile, JSON.stringify(versions, null, "\t"));
