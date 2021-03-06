// Node
const path = require('path');
const { fork } = require('child_process');

// Vendor
const del = require('del');
const moment = require('moment');
const semver = require('semver');

const { KEYS, MESSAGES } = require('./data');
const utils = require('./utils');

class GbBase {
	/**
	 * Convert 'build strings' (ie. '<build>@<version>') to the correct format, enrich, and return.
	 *
	 * @param {Array<string>} builds
	 * @return {Array<Object>}
	 */
	parseBuildStrings(builds = []) {
		builds = Array.isArray(builds) ? builds : [builds];

		const defaults = { files: [] };

		const validBuilds = this.getData(KEYS.BUILDS);

		return builds
			// Split.
			.map(build => build.split('@'))
			// Coerce to object.
			.map(([name, version]) => ({ name, version }))
			// Set version if required.
			.map(build => (semver.valid(build.version) ? build : { ...build, ...{ version: this.getTransientVersion() } }))
			// Enrich with data provided by project.
			.map(build => (validBuilds[build.name] ? { ...validBuilds[build.name], ...build } : build))
			// Merge with defaults.
			.map(build => ({ ...defaults, ...build }))
			// Resolve file names.
			.map(build => ({ ...build, ...{ resolvedFiles: this.getResolvedFileNames(build) } }));
	}

	/**
	 * Given a `key`, extract the corresponding info.
	 *
	 * If the `key` does not exist, fall back to an empty object.
	 *
	 * @param {string} key
	 * @return {Object}
	 */
	getData(key) {
		return this.data[key] || {};
	}

	/**
	 * Get a 'transient' version identifier.
	 *
	 * This is used for cases where a given build does not include a semver-compliant version identifier.
	 *
	 * @return {string}
	 */
	getTransientVersion() {
		const m = moment();

		return `${m.format('YYYY-MM-DD')}-${m.unix()}`;
	}

	/**
	 * Given an object of 'build' data, extract the 'files', parse them, and generate an array of 'resolved' file names.
	 *
	 * @param {Object} build
	 * @return {Array}
	 */
	getResolvedFileNames(build = {}) {
		if (!build || typeof build !== 'object' || !build.files || !build.files.length) {
			return null;
		}

		return build.files
			.map((file) => {
				const fileData = path.parse(file.src);

				return `${file.base || fileData.name}-${build.version}${fileData.ext}`;
			});
	}

	/**
	 * Wrapper around the `build` script.
	 *
	 * @return {Promise}
	 */
	doBuild() {
		return new Promise((resolve, reject) => {
			const config = this.getData(KEYS.CONFIG);

			let { localBuildsPath = './' } = config;

			localBuildsPath = utils.normalizeDir(localBuildsPath);

			const f = fork(`${__dirname}/scripts/build.js`, [], { cwd: `${process.cwd()}/${localBuildsPath}` });

			f.send({
				action: 'BUILD',
				payload: {
					env: this.getData(KEYS.ENVS)[this.settings.environment],
				},
			});

			f.on('close', (exitCode) => {
				switch (+exitCode) {
				case 0:
					resolve();
					break;
				default:
					reject(new Error(MESSAGES.ERROR.FAILED_TO_BUILD));
					break;
				}
			});
		});
	}

	/**
	 * Remove files/folders introduced as part of the clone, build, migrate, and/or deployment processes.
	 *
	 * @return {Promise}
	 */
	doCleanup() {
		return new Promise((resolve, reject) => {
			const config = this.getData(KEYS.CONFIG);

			let { repoDest = './' } = config;

			repoDest = utils.normalizeDir(repoDest);

			if (!repoDest) {
				reject(new Error(MESSAGES.ERROR.FAILED_TO_CLEAN));
				return;
			}

			del(repoDest).then(resolve, reject);
		});
	}

	/**
	 * Wrapper around the `clone` script.
	 *
	 * @return {Promise}
	 */
	doClone() {
		return new Promise((resolve, reject) => {
			const f = fork(`${__dirname}/scripts/clone.js`);

			f.send({
				action: 'CLONE',
				payload: {
					config: this.getData(KEYS.CONFIG),
				},
			});

			f.on('close', (exitCode) => {
				switch (+exitCode) {
				case 0:
					resolve();
					break;
				default:
					reject(new Error(MESSAGES.ERROR.FAILED_TO_CLONE));
					break;
				}
			});
		});
	}

	/**
	 * Wrapper around the `commit` script.
	 *
	 * @return {Promise}
	 */
	doCommit(data = {}) {
		return new Promise((resolve, reject) => {
			const f = fork(`${__dirname}/scripts/commit.js`);

			f.send({
				action: 'COMMIT',
				payload: {
					...{
						config: this.getData(KEYS.CONFIG),
						env: this.getData(KEYS.ENVS)[this.settings.environment],
					},
					...data,
				},
			});

			f.on('close', (exitCode) => {
				switch (+exitCode) {
				case 0:
					resolve();
					break;
				default:
					reject(new Error(MESSAGES.ERROR.FAILED_TO_COMMIT));
					break;
				}
			});
		});
	}

	/**
	 * Wrapper around the `migrate` script.
	 *
	 * @return {Promise}
	 */
	doMigrate(builds = []) {
		return new Promise((resolve, reject) => {
			const config = this.getData(KEYS.CONFIG);

			let { repoDest = './', repoBuildsPath = './' } = config;

			repoDest = utils.normalizeDir(repoDest);
			repoBuildsPath = utils.normalizeDir(repoBuildsPath);

			const f = fork(`${__dirname}/scripts/migrate.js`);

			const paths = builds
				.map(build => build.files.map((file, i) => ({
					src: file.src,
					dest: `${repoDest}${repoBuildsPath}${build.resolvedFiles[i]}`,
				})))
				.reduce((acc, arr) => [...acc, ...arr], []);

			f.send({
				action: 'MIGRATE',
				payload: {
					paths,
				},
			});

			f.on('close', (exitCode) => {
				switch (+exitCode) {
				case 0:
					resolve();
					break;
				default:
					reject(new Error(MESSAGES.ERROR.FAILED_TO_MIGRATE));
					break;
				}
			});
		});
	}
}

module.exports = {
	GbBase,
};
