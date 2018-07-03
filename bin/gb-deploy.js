#! /usr/bin/env node

// --------------------------------------------------
// IMPORT MODULES
// --------------------------------------------------
// Vendor
const meow = require('meow');

// Project
const clientPkg = require(`${process.cwd()}/package`);
const { GbDeploy, utils, DATA } = require('../src');

// --------------------------------------------------
// VARS
// --------------------------------------------------
const { input, flags, showHelp } = meow(`
	USAGE:
		\`gb-deploy\` may be executed directly from the command line, or via the 'scripts' field within a dependent project.

	COMMANDS:
		-h --help
		-e --environment
`, {
	flags: {
		environment: {
			type: 'string',
			alias: 'e',
		},
	},
});

// For consistency, show help menu on `-h`.
if (flags.h) {
	showHelp();
}

// --------------------------------------------------
// INIT
// --------------------------------------------------
new GbDeploy({
	builds: input,
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
