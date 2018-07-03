// --------------------------------------------------
// IMPORT MODULES
// --------------------------------------------------
// Node
const { readdirSync, writeFileSync } = require('fs');
const path = require('path');

// Vendor
const simpleGit = require('simple-git/promise');

// Project
const utils = require('../utils');

// --------------------------------------------------
// DECLARE VARS
// --------------------------------------------------
const git = simpleGit();

const TYPES = {
	deploy: {
		identifier: 'deploy',
		commitMsgPrefix: 'DEPLOY',
	},
	release: {
		identifier: 'release',
		commitMsgPrefix: 'RELEASE',
	},
};

// --------------------------------------------------
// DECLARE FUNCTIONS
// --------------------------------------------------
/**
 * Format a given 'build' object for insertion into a 'manifest' file.
 *
 * @param {Object} build
 * @return {Object}
 */
const formatBuildData = (build = {}) => {
	let {
		resolvedFilePrefix = '',
	} = build;

	resolvedFilePrefix = utils.normalizeDir(resolvedFilePrefix);

	const bundleData = build.resolvedFiles.map((file) => {
		const fileData = path.parse(file);

		switch (fileData.ext) {
		case '.js':
			return { script: `${resolvedFilePrefix}${file}` };
		case '.css':
			return { styles: `${resolvedFilePrefix}${file}` };
		default:
			return {};
		}
	}).reduce((o, data) => ({ ...o, ...data }), {});

	return {
		[build.name]: {
			version: build.version,
			...bundleData,
		},
	};
};

// / TODO: Move to `utils`.
const getMessagePrefix = (type, env) => {
	const data = TYPES[type] || {};

	let msg = '';

	msg += data.commitMsgPrefix ? `[${data.commitMsgPrefix}]` : '';
	msg += env ? `[${env}]` : '';

	return msg;
};

const doCommit = (data) => {
	const {
		builds = [],
		config = {},
		env = {},
		type = null,
	} = data;

	const {
		repoSrc = '',
		repoDest = '',
		repoBuildsPath = './',
	} = config;

	const {
		manifest,
	} = env;

	if (
		!repoSrc
		|| !repoDest
		|| !repoBuildsPath
		|| !manifest
		|| !type
		|| typeof manifest !== 'string'
	) {
		process.exit(1);
	}

	// Prepend `repoDest` with current working directory.
	const dest = `${process.cwd()}/${repoDest}`;

	const buildsDirContents = readdirSync(`${dest}/${repoBuildsPath}`, { encoding: 'utf-8' });

	// Ensure that all files spec'd by current 'build' exist.
	const matchedAllBuilds = builds
		.map(build => build.resolvedFiles)
		.reduce((acc, arr) => [...acc, ...arr], [])
		.every(filename => buildsDirContents.includes(filename));

	if (!matchedAllBuilds) {
		process.exit(1);
	}

	// Perform 'deploy'-specific validation and updates.
	if (type === TYPES.deploy.identifier) {
		if (!buildsDirContents.includes(manifest)) {
			process.exit(1);
		}

		// Consume, update, and write 'manifest' data.
		const manifestData = require(`${dest}/${repoBuildsPath}/${manifest}`);
		const newManifestData = builds.reduce((o, build) => ({ ...o, ...formatBuildData(build) }), manifestData);

		// / TODO: Account for write failure.
		writeFileSync(
			`${dest}/${repoBuildsPath}/${manifest}`,
			JSON.stringify(newManifestData, null, 2),
			{ encoding: 'utf-8' },
		);
	}

	// Add, commit, push updates to remote, and exit.
	git.cwd(dest)
		.then(() => git.add('./'))
		.then(() => {
			// / TODO: Pull logic out into dedicated functions.
			const buildStrings = builds.map(build => `${build.name}@${build.version}`);
			const msg = `${getMessagePrefix(type, type === TYPES.deploy.identifier ? env.name : null)}: ${buildStrings.join('; ')}`;
			return git.commit(msg);
		})
		.then(() => git.push('origin', 'master'))
		.then(() => process.exit(0))
		.catch(() => process.exit(1));
};

// --------------------------------------------------
// INIT
// --------------------------------------------------
process.on('message', (data = {}) => {
	switch (data.action) {
	case 'COMMIT':
		doCommit(data.payload);
		break;
	default:
		process.exit(1);
		break;
	}
});
