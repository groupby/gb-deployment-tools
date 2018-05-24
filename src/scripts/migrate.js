// --------------------------------------------------
// IMPORT MODULES
// --------------------------------------------------
// Node
const { exec, execSync } = require( 'child_process' );
const path = require( 'path' );

// Vendor
const cpFile = require( 'cp-file' );

// --------------------------------------------------
// DECLARE FUNCTIONS
// --------------------------------------------------
const doMigrate = ( data = {} ) => {
	let {
		paths = [],
	} = data;

	if (
		!paths
		|| !Array.isArray( paths )
		|| !paths.length
	) {
		process.exit( 1 );
	}

	let promises = paths.map( ( { src, dest } ) => cpFile( src, dest ) );

	Promise.all( promises )
		.then( () => {
			process.exit( 0 );
		} )
		.catch( err => {
			process.exit( 1 );
		} );
};

// --------------------------------------------------
// INIT
// --------------------------------------------------
process.on( 'message', ( data = {} ) => {
	switch ( data.action ) {
		case 'MIGRATE':
			doMigrate( data.payload );
			break;
		default:
			console.log( `FAILED TO MATCH ACTION: ${data.action}` );
			process.exit( 1 );
			break;
	}
} );
