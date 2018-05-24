// --------------------------------------------------
// DECLARE FUNCTIONS
// --------------------------------------------------
const normalizeDir = ( str = '' ) => {
	if (
		!str
		|| typeof str !== 'string'
	) {
		return str;
	}

	return ( str[ str.length - 1 ] === '/' ) ? str : `${str}/`;
};

// --------------------------------------------------
// PUBLIC API
// --------------------------------------------------
module.exports = {
	normalizeDir,
}
