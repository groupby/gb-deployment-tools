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
const clientPkg = require( `${process.cwd()}/package` ); /// TODO: Account for possibility that CLI script is not running in project root.
const { GbRelease } = require( '../src' );

// --------------------------------------------------
// VARS
// --------------------------------------------------
const { input, flags, showHelp } = meow( `
	USAGE:
		\`gb-release\` may be executed directly from the command line, or via the 'scripts' field within a dependent project.

	COMMANDS:
		-h --help
`, {
	flags: {
		/// TODO
	},
} );

// For consistency, show help menu on `-h`.
if ( flags.h ) {
	showHelp();
}

// --------------------------------------------------
// INIT
// --------------------------------------------------
new GbRelease( {
	releaseType: input[ 0 ],
	opts: flags,
	data: ( clientPkg[ KEYS.GB_RELEASE_KEY ] || {} ),
	clientPkg,
} )
	.run()
	.then( ( data ) => {
		/// TODO: Handle success.
		console.log( data ); /// TEMP
	} )
	.catch( ( err ) => {
		/// TODO: Handle error.
		console.log( chalk.red( err && err.message ? err.message : err ) );
	} );
