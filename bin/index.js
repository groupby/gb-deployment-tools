// --------------------------------------------------
// IMPORT MODULES
// --------------------------------------------------
// Vendor
const meow = require( 'meow' );
const chalk = require( 'chalk' );

// Project
const pkg = require( '../package' );
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
		-b --build
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
new GbDeploy( { args: input, opts: flags } )
	.run()
	.then( () => {
		/// TODO: Handle success.
	} )
	.catch( ( err ) => {
		/// TODO: Handle error.
		console.log( chalk.red( !!err.message ? err.message : err ) );
	} );
