#! /usr/bin/env node

// --------------------------------------------------
// IMPORT MODULES
// --------------------------------------------------
// Node
const fs = require('fs');

// Vendor
const detectIndent = require('detect-indent');
const meow = require('meow');

// Project
const clientPkg = require(`${process.cwd()}/package`);
const { MOCKS, utils } = require('../src');

// --------------------------------------------------
// VARS
// --------------------------------------------------
const { flags, showHelp } = meow(`
	USAGE:
		\`gb-init\` can be used to quickly insert a 'boilerplate' version of the GB Deployment Toosl configuration object into your project's \`package.json\` file.

		Please note that the 'boilerplate' config. includes placeholder values which must be updated before the release and deployment tools can be used.

	COMMANDS:
		-h --help
`);

// For consistency, show help menu on `-h`.
if (flags.h) {
	showHelp();
}

// --------------------------------------------------
// INIT
// --------------------------------------------------
try {
	const pkgFile = fs.readFileSync(`${process.cwd()}/package.json`, { encoding: 'utf-8' });
	const { indent } = detectIndent(pkgFile);

	fs.writeFileSync(`${process.cwd()}/package.json`, JSON.stringify(Object.assign(clientPkg, MOCKS.CONFIG), null, indent), { encoding: 'utf-8' });
} catch (err) {
	utils.log(err && err.message ? err.message : err, { color: 'red' });
}
