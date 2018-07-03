#! /usr/bin/env node

// --------------------------------------------------
// IMPORT MODULES
// --------------------------------------------------
// Vendor
const meow = require( 'meow' );
const chalk = require( 'chalk' );

// Project
const { KEYS } = require( '../src/data' );
const pkg = require( '../package' );
const clientPkg = require( `${process.cwd()}/package` );
const { GbDeploy } = require( '../src' );

// --------------------------------------------------
// VARS
// --------------------------------------------------
const { input, flags, showHelp } = meow( `
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
} );

// For consistency, show help menu on `-h`.
if ( flags.h ) {
	showHelp();
}

// --------------------------------------------------
// INIT
// --------------------------------------------------
new GbDeploy( {
	builds: input,
	opts: flags,
	data: ( clientPkg[ KEYS.MAIN ] || {} ),
	clientPkg,
} )
	.run()
	.then( () => {
	} )
	.catch( ( err ) => {
		console.log( chalk.red( err && err.message ? err.message : err ) );
	} );
