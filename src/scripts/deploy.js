// --------------------------------------------------
// IMPORT MODULES
// --------------------------------------------------
// Node
const { readdirSync, writeFileSync } = require( 'fs' );
const { execSync } = require( 'child_process' );
const path = require( 'path' );

// Vendor
const simpleGit = require( 'simple-git' );

// --------------------------------------------------
// DECLARE VARS
// --------------------------------------------------
const git = simpleGit();

// --------------------------------------------------
// DECLARE FUNCTIONS
// --------------------------------------------------
doDeploy = ( data ) => {
	let {
		builds = [],
		config = {},
		env = {},
	} = data;

	let {
		repoSrc = '',
		repoDest = '',
		repoBuildsPath = './',
	} = config;

	let {
		manifest,
	} = env;

	if (
		!repoSrc
		|| !repoDest
		|| !repoBuildsPath
		|| !manifest
		|| typeof manifest !== 'string'
	) {
		process.exit( 1 );
	}

	// Prepend `repoDest` with current working directory.
	repoDest = `${process.cwd()}/${repoDest}`;

	let buildsDirContents = readdirSync( `${repoDest}/${repoBuildsPath}`, { encoding: 'utf-8' } );

	// Ensure that 'manifest' file exists.
	if ( !buildsDirContents.includes( manifest ) ) {
		process.exit( 1 );
	}

	// Ensure that all files spec'd by current 'build' exist.
	let matchedAllBuilds = builds
		.map( build => build.resolvedFiles )
		.reduce( ( acc, arr ) => { return [ ...acc, ...arr ] }, [] )
		.every( filename => buildsDirContents.includes( filename ) );

	if ( !matchedAllBuilds ) {
		process.exit( 1 );
	}

	// Consume, update, and write 'manifest' data.
	let manifestData = require( `${repoDest}/${repoBuildsPath}/${manifest}` );

	newManifestData = builds.reduce( ( o, build ) => {
		return { ...o, ...formatBuildData( build ) }
	}, manifestData );

	/// TODO: Account for write failure.
	writeFileSync(
		`${repoDest}/${repoBuildsPath}/${manifest}`,
		JSON.stringify( newManifestData, null, 2 ),
		{ encoding: 'utf-8' }
	);

	// Add, commit, push updates to remote, and exit.
	/// TODO: Refactor nested callbacks.
	git.cwd( repoDest );
	git.add( './', ( err, data ) => {
		if ( err ) {
			process.exit( 1 );
		}

		git.commit( '/// TEMP: <env> <build>@<version>', ( err, data ) => {
			if ( err ) {
				process.exit( 1 );
			}

			git.push( 'origin', 'master', ( err, data ) => {
				if ( err ) {
					process.exit( 1 );
				}

				process.exit( 0 );
			} );
		} );
	} );
}

/**
 * Format a given 'build' object for insertion into a 'manifest' file.
 *
 * @param {Object} build
 * @return {Object}
 */
/// TODO: Refactor
formatBuildData = ( build ) => {
	let bundleData = build.resolvedFiles.map( file => {
		let fileData = path.parse( file );

		switch ( fileData.ext ) {
			case '.js':
				return { script: `${build.resolvedFilePrefix || ''}${file}` };
			case '.css':
				return { styles: `${build.resolvedFilePrefix || ''}${file}` };
			default:
				return {};
		}
	} ).reduce( ( o, data ) => {
		return { ...o, ...data };
	}, {} );

	return {
		[ build.name ]: {
			version: build.version,
			...bundleData,
		}
	};
}

// --------------------------------------------------
// INIT
// --------------------------------------------------
process.on( 'message', ( data = {} ) => {
	switch ( data.action ) {
		case 'DEPLOY':
			doDeploy( data.payload );
			break;
		default:
			console.log( `FAILED TO MATCH ACTION: ${data.action}` );
			process.exit( 1 );
			break;
	}
} );
