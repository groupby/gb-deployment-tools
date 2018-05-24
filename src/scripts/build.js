// --------------------------------------------------
// IMPORT MODULES
// --------------------------------------------------
// Node
const { exec, execSync } = require( 'child_process' );

// --------------------------------------------------
// DECLARE FUNCTIONS
// --------------------------------------------------
const doBuild = ( data = {} ) => {
	let {
		env = {},
	} = data;

	let {
		buildScript = '',
	} = env;

	if (
		!buildScript
	) {
		process.exit( 1 );
	}

	/// TODO
	exec( buildScript, ( err, stdout, stderr ) => {
		if ( err ) {
			process.exit( 1 );
		} else {
			process.exit( 0 );
		}
	} );
};

// --------------------------------------------------
// INIT
// --------------------------------------------------
process.on( 'message', ( data = {} ) => {
	switch ( data.action ) {
		case 'BUILD':
			doBuild( data.payload );
			break;
		default:
			console.log( `FAILED TO MATCH ACTION: ${data.action}` );
			process.exit( 1 );
			break;
	}
} );
