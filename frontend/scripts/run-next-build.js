const { spawnSync } = require("child_process");
const path = require("path");

const requirePatch = path.join(__dirname, "patch-readlink.js").replace(/\\/g, "/");
const nodeBin = process.execPath;
const nextCli = require.resolve("next/dist/cli/next-build");

const existingNodeOptions = process.env.NODE_OPTIONS;
const patchedNodeOptions = existingNodeOptions
  ? `${existingNodeOptions} --require=${requirePatch}`
  : `--require=${requirePatch}`;

const result = spawnSync(
  nodeBin,
  [nextCli],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_OPTIONS: patchedNodeOptions,
    },
  },
);

if (result.error) {
  console.error(result.error);
  process.exit(result.status ?? 1);
}

process.exit(result.status ?? 0);
