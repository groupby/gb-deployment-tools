# GB Deployment Tools

## Table of Contents
- [About](#about)
- [Installation](#installation)
- [Setup](#setup)
- [Usage](#usage)
- [Documentation](#documentation)

## About

A collection of Node-based tools for managing the release and deployment of GroupBy Services projects.

## Installation

The GB Deployment Tools are *not* available via the npm registry, and must be installed directly from Groupby's Github account.

To install the GB Deployment Tools in a given project, run the following command:

```
npm install groupby/gb-deployment-tools
```

## Setup

The Gb Deployment Tools are configured via the project's `package.json` file. To begin, add the following field to `package.json`:

```
"gb-deployment-tools": {
	"config": {},
	"builds": {},
	"environments": {}
}
```

## Usage

Once installed, GB Deployment Tools exposes the following commands:
- `gb-release`
- `gb-deploy`

These commands can be run via `node`, followed by the path to their respective binary files. For example:

```
// From the root of the repository:
node node_modules/.bin/gb-release major
```

Alternatively, the commands may be aliased using the `scripts` field within the `package.json` file. For example:

```
// Assuming that `package.json` contains the following key/value pair: "release:major": "gb-release major"
npm run release:major
```

### `gb-release`

This command is used to create new major, minor, or patch-type releases. This command completes the following operations:
- Generates a new commit and tag based on the 'release type' provided.
- Pushes the commit and tag to remote repository.
- Creates a new release on Github.

#### Examples:

```
// Create a new major release.
gb-release major
```

### `gb-deploy`

This command is used to deploy versioned releases to production, as well as to deploy feature branches to the lower environment.

Please note that only builds which have been released via `gb-release` may be deployed to the production environment.

#### Examples:

```
// Deploy version 1.1.0 of the 'search' build to production.
gb-deploy search@1.1.0 -e production

// Generate a 'search' build using the current branch and deploy it to the lower environment.
gb-deploy search -e lower
```

## Documentation
Currently, GB Deployment Tools does not include any external documentation.

For an overview of the project's evolution, please consult the CHANGELOG.
