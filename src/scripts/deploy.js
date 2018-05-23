// --------------------------------------------------
// IMPORT MODULES
// --------------------------------------------------
// Node
const { readdirSync, writeFileSync } = require( 'fs' );
const { execSync } = require( 'child_process' );

// Vendor
const simpleGit = require( 'simple-git' );

// --------------------------------------------------
// DECLARE VARS
// --------------------------------------------------
const git = simpleGit();

// --------------------------------------------------
// DECLARE FUNCTIONS
// --------------------------------------------------
/**
 * Perform all 'production deployment' steps.
 *
 * @param {Object} data
 */
doProductionDeployment = ( data ) => {
	let {
		builds = [],
		config = {}
	} = data;

	let {
		repoSrc = '',
		repoDest = '',
		buildsPath = '',
		manifests = {},
	} = config;

	// Prepend `repoDest` with current working directory.
	repoDest = `${process.cwd()}/${repoDest}`;

	let manifestData;

	/// TODO: Yank this into a function.
	if (
		!repoSrc
		|| !repoDest
		|| !buildsPath
		|| !manifests
		|| !manifests.production
		|| typeof manifests.production !== 'string'
	) {
		console.log( 'RECEIVED INVALID CONFIG DATA, ABORTING' );
		process.exit( 1 );
	}

	git.clone( repoSrc, repoDest, [], ( err, data ) => {
		if ( err ) {
			console.log( 'FAILED TO CLONE' ); /// TEMP
			process.exit( 0 );
		}

		let buildsDirContents = readdirSync( `${repoDest}/${buildsPath}`, { encoding: 'utf-8' } );

		// Ensure that 'manifest' file exists.
		if ( !buildsDirContents.includes( manifests.production ) ) {
			console.log( 'DIRECTORY DOES NOT CONTAIN MANIFEST, ABORTING' ); /// TEMP
			process.exit( 1 );
		}

		// Update `builds` data to include 'resolved' names (ie. <prefix?>-<name>-<suffix?>-<version>).
		// TODO:
		// - Consider moving this to parent script.
		// - Consider moving logic into dedicated function.
		builds = builds.map( build => (
			{
				...build,
				...{ resolvedName: `${build.prefix || ''}${build.name}${build.suffix || ''}-${build.version}` }
			}
		) );

		// Ensure that all files spec'd by current 'build' exist.
		let matchedAllBuilds = builds
			.map( build => build.extensions.map( ext => `${build.resolvedName}${ext}` ) )
			.reduce( ( acc, arr ) => { return [ ...acc, ...arr ] }, [] )
			.every( filename => buildsDirContents.includes( filename ) );

		if ( !matchedAllBuilds ) {
			console.log( 'DIRECTORY DOES NOT CONTAIN ALL BUILDS, ABORTING' ); /// TEMP
			process.exit( 1 );
		}

		// Consume, update, and write 'manifest' data.
		manifestData = require( `${repoDest}/${buildsPath}/${manifests.production}` );

		newManifestData = builds.reduce( ( o, build ) => {
			return { ...o, ...formatBuildData( build ) }
		}, manifestData );

		/// TODO: Account for write failure.
		writeFileSync(
			`${repoDest}/${buildsPath}/${manifests.production}`,
			JSON.stringify( newManifestData, null, 2 ),
			{ encoding: 'utf-8' }
		);

		// Add, commit, push updates to remote, and exit.
		git.cwd( repoDest );
		git.add( './', ( err, data ) => {
			if ( err ) {
				console.log( 'FAILED TO ADD FILES, ABORTING' ); /// TEMP
				process.exit( 1 );
			}

			git.commit( '/// TEMP: TEST COMMIT', ( err, data ) => {
				if ( err ) {
					console.log( 'FAILED TO COMMIT FILES, ABORTING' ); /// TEMP
					process.exit( 1 );
				}

				git.push( 'origin', 'master', ( err, data ) => {
					if ( err ) {
						console.log( 'FAILED TO PUSH FILES, ABORTING' ); /// TEMP
						process.exit( 1 );
					}
					process.exit( 0 );
				} );
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
	let bundleData = build.extensions.map( ext => {
		switch ( ext ) {
			case '.js':
				return { script: `${build.path}${build.resolvedName}${ext}` };
			case '.css':
				return { styles: `${build.path}${build.resolvedName}${ext}` };
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
		case 'DEPLOY:PRODUCTION':
			doProductionDeployment( data.payload );
			break;
		default:
			console.log( 'FAILED TO MATCH `data.action`, ABORTING' ); /// TEMP
			process.exit( 1 );
			break;
	}
} );
