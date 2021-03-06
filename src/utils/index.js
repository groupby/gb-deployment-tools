// --------------------------------------------------
// IMPORT MODULES
// --------------------------------------------------
// Vendor
const chalk = require('chalk');

// --------------------------------------------------
// DECLARE FUNCTIONS
// --------------------------------------------------
const normalizeDir = (str = '') => {
	if (
		!str
		|| typeof str !== 'string'
	) {
		return str;
	}

	return (str[str.length - 1] === '/') ? str : `${str}/`;
};

const ensureRepoIsSynced = (statusData = {}) => {
	if (
		!statusData
		|| typeof statusData !== 'object'
	) {
		return null;
	}

	return (!statusData.ahead && !statusData.behind);
};

const ensureRepoIsClean = (statusData = {}) => {
	if (
		!statusData
		|| typeof statusData !== 'object'
	) {
		return null;
	}

	if (
		statusData.not_added.length
		|| statusData.conflicted.length
		|| statusData.created.length
		|| statusData.deleted.length
		|| statusData.modified.length
		|| statusData.renamed.length
	) {
		return false;
	}

	return true;
};

const log = (msg, { method, color, modifier } = {}) => {
	/* eslint-disable-next-line no-console */
	console[method || 'log'](chalk[color || modifier || 'gray'](msg));
};

// --------------------------------------------------
// PUBLIC API
// --------------------------------------------------
module.exports = {
	ensureRepoIsClean,
	ensureRepoIsSynced,
	log,
	normalizeDir,
};
