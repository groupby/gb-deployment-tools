// --------------------------------------------------
// IMPORT MODULES
// --------------------------------------------------
// Node
const { execSync } = require( 'child_process' );

// Vendor
const merge = require( 'deepmerge' );
const octokit = require( '@octokit/rest' );
const semver = require( 'semver' );
const simpleGit = require( 'simple-git/promise' );

// Project
const { GbBase } = require( './gb-base' );
const { KEYS, MESSAGES, RELEASE_TYPES, BRANCHES } = require( './data' );
const utils = require( './utils' );

// --------------------------------------------------
// DECLARE VARS
// --------------------------------------------------
const git = simpleGit();
const githubClient = octokit();

// --------------------------------------------------
// CORE
// --------------------------------------------------
class GbRelease extends GbBase {
	constructor( {
		releaseType = '',
		opts = {},
		data = {},
		clientPkg = {},
	} = {} ) {
		super();

		this.data = data || {};
		this.clientPkg = clientPkg;

		// NOTE: Force script to run in 'production' env.
		this.settings = merge( opts, { environment: 'production' } );

		this.opts = opts;
		this.releaseType = releaseType;
		this.repoOwner = data.config && data.config.repoOwner ? data.config.repoOwner : opts.repoOwner;
		this.repoName = data.config && data.config.repoName ? data.config.repoName : opts.repoName;
	}

	run() {
		return new Promise( async ( resolve, reject ) => {
			try {
				if ( !this.releaseType ) {
					throw new Error( `${MESSAGES.ERROR.MISSING_RELEASE} <${RELEASE_TYPES.join( '|' ).toLowerCase()}>` );
				}

				// Increment semver-compliant release identifier to ensure release type is valid.
				if ( !semver.inc( '0.0.0', this.releaseType ) ) {
					throw new Error( `${MESSAGES.ERROR.INVALID_RELEASE_TYPE} <${this.releaseType}>` );
				}

				if ( !this.repoOwner ) {
					throw new Error( MESSAGES.ERROR.MISSING_REPO_OWNER );
				}

				if ( !this.repoName ) {
					throw new Error( MESSAGES.ERROR.MISSING_REPO_NAME );
				}

				// Ensure current branch is `master`.
				let branchData = await git.branch();
				if ( branchData.current !== BRANCHES.PRODUCTION ) {
					throw new Error( `${MESSAGES.ERROR.INVALID_RELEASE_BRANCH} Current branch: <${branchData.current}>` );
				}

				// Check repo sync'd, clean, etc.
				let statusData = await git.status();

				if ( !utils.ensureRepoIsSynced( statusData ) ) {
					throw new Error( MESSAGES.ERROR.REPO_OUT_OF_SYNC );
				}

				if ( !utils.ensureRepoIsClean( statusData ) ) {
					throw new Error( MESSAGES.ERROR.REPO_UNCLEAN );
				}

				// Bump version, commit, tag, and push.
				await this.doRelease();

				// Archive current state of development branch.
				let archiveBranch = `${BRANCHES.DEVELOPMENT}-${this.getTransientVersion()}`;
				await git.checkoutBranch( archiveBranch, `origin/${BRANCHES.DEVELOPMENT}` );
				await git.push( 'origin', archiveBranch );

				// Spin off new development branch from production.
				console.log( 'PRE BRANCH RESET' );
				await git.checkout( BRANCHES.DEVELOPMENT );
				await git.reset( [ '--hard', `origin/${BRANCHES.PRODUCTION}` ] );
				await git.push( [ '-u', 'origin', BRANCHES.DEVELOPMENT, '-f' ] );
				console.log( 'POST BRANCH RESET' );

				// Refresh PRs.
				await this.updatePrs();

				// Build.
				await this.doBuild();

				// Clone.
				await this.doClone();

				// To migrate everything: generate builds strings; parse them; and pass the results to 'doMigrate'.
				let buildStrings = Object.keys( this.getData( 'builds' ) ).map( build => `${build}@${semver.inc( this.clientPkg.version, this.releaseType )}` );
				let builds = this.parseBuildStrings( buildStrings );
				await this.doMigrate( builds );

				// Commit.
				await this.doDeploy( { builds, type: 'release' } );

				// Clean.
			 	this.doCleanup();

				// Restore production branch.
				execSync( 'git checkout master' ); /// TEMP
			} catch ( err ) {
				reject( err ) ;
			}
		} );
	}

	/**
	 * Ensure that all open PRs against `master` are present on updated development branch.
	 *
	 * @return {Promise}
	 */
	updatePrs() {
		let allPrs;

		return new Promise( ( resolve, reject ) => {
			githubClient.authenticate( {
				type: 'token',
				token: process.env.GITHUB_CODE, /// TODO: Ensure that this exists...
			} );

			githubClient.pullRequests.getAll( {
				owner: this.repoOwner,
				repo: this.repoName,
			} ).then( ( { data = [] } = {} ) => {
				allPrs = data;
				const developPrs = allPrs.filter( pr => pr.state === 'open' && pr.base.ref === BRANCHES.DEVELOPMENT );
				return this.closePrs( developPrs );
			} ).then( () => {
				const productionPrs = allPrs.filter( pr => pr.state === 'open' && pr.base.ref === BRANCHES.PRODUCTION );
				return this.openPrs( productionPrs );
			} ).then( () => {
				resolve( true ); /// TODO: Determine 'success' message.
			} ).catch( reject );
		} );
	}

	/// TODO: Consider moving this to `GbBase`.
	doRelease() {
		return new Promise( async ( resolve, reject ) => {
			const from = execSync( 'git describe --tags --abbrev=0', { encoding: 'utf-8' } ).trim();
			execSync( `npm version ${this.releaseType}` );
			const to = execSync( 'git describe --tags', { encoding: 'utf-8' } ).trim();

			githubClient.authenticate( {
				type: 'token',
				token: process.env.GITHUB_CODE, /// TODO: Ensure that this exists...
			} );

			const commitData = await this.getCommitMessages( { from, to } );
			const msg = this.getReleaseMessage( commitData );

			git.push( 'origin', BRANCHES.PRODUCTION )
				.then( () => {
					return githubClient.repos.createRelease( {
						owner: this.repoOwner,
						repo: this.repoName,
						tag_name: to,
						body: msg,
					} );
				} ).then( resolve, reject );
		} );
	}

	getReleaseMessage( commitData ) {
		try {
			const commitStr = commitData.all
				.filter( c => c.hash !== commitData.latest.hash )
				.map( c => `- ${c.message}` )
				.reduce( ( str, msg ) => (`${str}\n${msg}`), '' );

			if ( !commitStr ) {
				throw new Error( ERRORS.UNABLE_TO_PARSE_COMMITS );
			}

			return `${MESSAGES.RELEASE.PREFIX}:\n${commitStr}`;
		} catch ( err ) => {
			return MESSAGES.RELEASE.DEFAULT;
		}
	}

	getCommitMessages( data = {} ) {
		const { from, to } = data;

		if ( !from || !to ) {
			return null;
		}

		return git.log( {
			from,
			to,
		} );
	}

	/**
	 * Given an array of PRs, close them.
	 *
	 * @return {Promise}
	 */
	closePrs( prs ) {
		return prs.map( pr => {
			return new Promise( ( resolve, reject ) => {
				githubClient.pullRequests.update( {
					owner: this.repoOwner,
					repo: this.repoName,
					number: pr.number,
					state: 'closed',
				} ).then( ( response ) => {
					resolve( response )
				} ).catch( ( err ) => {
					reject( err );
				} );
			} );
		} );
	}

	/**
	 * Given an array of PRs, open them against the development branch.
	 *
	 * @return {Promise}
	 */
	openPrs( prs ) {
		return prs.map( pr => {
			return new Promise( ( resolve, reject ) => {
				githubClient.pullRequests.create( {
					owner: this.repoOwner,
					repo: this.repoName,
					title: pr.title,
					head: pr.head.ref,
					base: BRANCHES.DEVELOPMENT,
				} ).then( resolve, reject );
			} );
		} );
	}
}

// --------------------------------------------------
// PUBLIC API
// --------------------------------------------------
module.exports = GbRelease;
