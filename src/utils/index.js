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

// --------------------------------------------------
// PUBLIC API
// --------------------------------------------------
module.exports = {
	normalizeDir,
	ensureRepoIsClean,
	ensureRepoIsSynced,
};
