#! /usr/bin/env node

// --------------------------------------------------
// IMPORT MODULES
// --------------------------------------------------
// Vendor
const meow = require('meow');

// Project
const clientPkg = require(`${process.cwd()}/package`);
const { GbRelease, utils, DATA } = require('../src');

// --------------------------------------------------
// VARS
// --------------------------------------------------
const { input, flags, showHelp } = meow(`
	USAGE:
		\`gb-release\` may be executed directly from the command line, or via the 'scripts' field within a dependent project.

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
new GbRelease({
	releaseType: input[0],
	opts: flags,
	data: (clientPkg[DATA.KEYS.MAIN] || {}),
	clientPkg,
})
	.run()
	.then((data) => {
		utils.log(data);
	})
	.catch((err) => {
		utils.log(err && err.message ? err.message : err, { color: 'red' });
	});
