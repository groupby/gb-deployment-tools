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
const projectData = require( `${process.cwd()}/package` ); /// TODO: Account for possibility that CLI script is not running in project root.
const GbDeploy = require( '../src' );

// --------------------------------------------------
// VARS
// --------------------------------------------------
const { input, flags, showHelp } = meow( `
	USAGE:
		${pkg.name} exposes the following commands: ${Object.keys( pkg.bin ).join( ' ' )}.

		Execute these commands directly from the command line, or via the 'scripts' field within a dependent project.

	COMMANDS:
		-h --help
		-e --environment
`, {
	flags: {
		build: {
			type: 'string',
			alias: 'b',
		},
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
	data: ( projectData[ KEYS.GB_DEPLOY_KEY ] || {} ),
} )
	.run()
	.then( () => {
		/// TODO: Handle success.
	} )
	.catch( ( err ) => {
		/// TODO: Handle error.
		console.log( chalk.red( err && err.message ? err.message : err ) );
	} );
