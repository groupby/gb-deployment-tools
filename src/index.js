// --------------------------------------------------
// IMPORT MODULES
// --------------------------------------------------
// Node
const { fork } = require( 'child_process' );

// Vendor
const merge = require( 'deepmerge' );
const semver = require( 'semver' );
const simpleGit = require( 'simple-git' );

// Project
const pkg = require( `${process.cwd()}/package` );

// --------------------------------------------------
// DECLARE VARS
// --------------------------------------------------
const git = simpleGit();

const VALID_ENVIRONMENTS = {
	'lower': true,
	'production': true,
};

// --------------------------------------------------
// CORE
// --------------------------------------------------
class GbDeploy {
	constructor( { builds = [], opts = {} } = {} ) {
		this.settings = merge( {}, opts ); // Clone `opts`.
		this.builds = this.parseBuilds( builds );
		this.validBuilds = this.getValidBuilds( pkg );
		this.opts = opts;
	}

	run() {
		return new Promise( async ( resolve, reject ) => {
			// Ensure that `builds` and `environment` are valid.
			if ( !this.validateBuilds() ) {
				reject( '/// TODO: Must include one or more valid `builds`' );
				return;
			}

			if ( !this.validateEnvironment() ) {
				reject( '/// TODO: Must include a valid `environment`' );
				return;
			}

			if ( this.settings.environment === 'production' ) {
				// Ensure that each `build` to be deployed includes a version identifier.
				if ( !this.builds.every( build => !!build.version ) ) {
					reject( '/// TODO: When deploying to production, all builds must include a version' );
					return;
				}

				// Ensure that current branch is `master`.
				/// TODO: Consider doing this at instantiation time?
				let branchData = await this.getLocalBranches();

				if ( branchData.current.toLowerCase() !== 'master' ) {
					reject( '/// TODO: Production deployments can only be completed from the `master` branch.' );
					return;
				}

				// Ensure that latest commit is a version.
				// let commitData = await this.getCommits();
				//
				// if ( !semver.valid( commitData.all[ 0 ].message ) ) {
				// 	reject( '/// TODO: When deploying to production, the latest commit message must be a semver compliant release identifier.' );
				// }

				let f = fork( `${__dirname}/scripts/deploy.js` );

				/// TODO: Add fallbacks for data provided to child process via `.send( ... )`
				f.send( {
					action: 'DEPLOY:PRODUCTION',
					payload: {
						builds: this.flattenBuildData(), // We need to pass in all the supporting info defined in the project's `package.json` file.
						repoSrc: pkg[ 'gb-deploy' ][ 'config' ][ 'repoSrc' ],
						repoDest: `${process.cwd()}/${pkg[ 'gb-deploy' ][ 'config' ][ 'repoDest' ]}`,
						buildsPath: pkg[ 'gb-deploy' ][ 'config' ][ 'buildsPath' ],
						manifestName: pkg[ 'gb-deploy' ][ 'config' ][ 'manifests' ][ 'production' ],
					},
				} );

				f.on( 'close', ( exitCode ) => {
					console.log( 'CHILD PROCESS CLOSED --> LOGGING OUT `args`' ); /// TEMP
					console.log( exitCode ); /// TEMP

					switch ( +exitCode ) {
						case 0:
							resolve();
							break;
						default:
							reject();
							break;
					}
				} );
			} else {
				// ELSE (ie. `e` IS NOT `production`)`
					// IF `e` IS VALID
						// VALIDATE BUILDS
							// GENERATE BUILDS
							// CLONE `cust_<cust-id>_builds` REPO
							// MIGRATE BUILD FILES TO NEW REPO, APPEND DATE AND SHA INFO
							// UPDATE CORRECT 'MANIFEST' FILE
							// COMMIT UPDATES
							// PUSH TO REMOTE

				console.log( 'IS NOT PRODUCTION' ); /// TEMP
				resolve( true ); /// TEMP
			}
		} );
	}

	// Validation methods
	validateEnvironment() {
		return Object.keys( VALID_ENVIRONMENTS ).includes( this.settings.environment );
	}

	validateBuilds() {
		return !!this.builds && this.builds.length && this.builds.every( build => Object.keys( this.validBuilds ).includes( build.name ) );
	}

	parseBuilds( builds=[] ) {
		builds = Array.isArray( builds ) ? builds : [ builds ];

		return builds.map( build => build.split( '@' ) ).map( ( [ name, version ] ) => ( { name, version } ) );
	}

	getValidBuilds( pkg ) {
		return (
			!!pkg
			&& typeof pkg === 'object'
			&& !Array.isArray( pkg )
			&& pkg[ 'gb-deploy' ]
			&& pkg[ 'gb-deploy' ][ 'builds' ]
		) ? pkg[ 'gb-deploy' ][ 'builds' ] : {};
	}

	flattenBuildData() {
		return this.builds.map( build => ( { ...this.validBuilds[ build.name ], ...build } ) );
	}

	getLocalBranches() {
		return new Promise( ( resolve, reject ) => {
			git.branchLocal( ( err, data ) => {
				if ( err ) {
					reject( err );
				} else {
					resolve( data );
				}
			} );
		} );
	}

	getCommits() {
		return new Promise( ( resolve, reject ) => {
			git.log( [], ( err, data ) => {
				if ( err ) {
					reject( err );
				} else {
					resolve( data );
				}
			} );
		} );
	}
}


// --------------------------------------------------
// PUBLIC API
// --------------------------------------------------
module.exports = GbDeploy;
