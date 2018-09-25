# GB Deployment Tools

## Table of Contents
- [About](#about)
- [Installation](#installation)
- [Setup](#setup)
- [Usage](#usage)
- [Documentation](#documentation)

## About
/// TODO

## Installation

To install these tools in a given project, run the following command:

```
npm install --save-dev gb-deployment-tools
```

## Setup

The GB Deployment Tools are configured via `package.json`. To get started, add the following fields:

```
...
"gb-deployment-tools": {
	"config": {
		...
	},
	"environments": {
		...
	},
	"builds": {
		...
	}
},
...
```

### Config

This field is used for high-level configuration.

| Option | Type | Required |
| --- | --- | --- |
| repoName | String | Y |
| repoOwner | String | Y |
| localBuildsPath | String | Y |
| repoSrc | String | Y |
| repoDst | String | Y |
| repoBuildsPath | String | Y |

### Environments

This field is used to configure project-specific environment info.

| Option | Type | Required |
| --- | --- | --- |
| {environmentName} | Object | Y |
| {environmentName}.name | String | Y |
| {environmentName}.manifest | String | Y |
| {environmentName}.buildScript | String | Y |

### Builds

This field is used to configure project-specific build info.

| Option | Type | Required |
| --- | --- | --- |
| {buildName} | Object | Y |
| {fields}.files | Array | Y |
| {fields}.files[0].src | String | Y |
| {fields}.files[0].base | String | Y |
| {fields}.resolvedFilePrefix | String | Y |

## Usage

/// TODO

## Documentation
Currently, GB Deployment Tools does not include any external documentation.

For an overview of the project's evolution, please consult the CHANGELOG.
