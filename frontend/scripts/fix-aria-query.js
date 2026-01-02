const fs = require("fs");
const path = require("path");

const ariaTargetPath = path.join(
  __dirname,
  "..",
  "node_modules",
  "aria-query",
  "lib",
  "etc",
  "roles",
  "dpub",
  "docErrataRole.js",
);

function patchAriaQuery() {
  try {
    const needsPatch =
      !fs.existsSync(ariaTargetPath) ||
      fs.statSync(ariaTargetPath).size === 0 ||
      !fs.readFileSync(ariaTargetPath, "utf8").includes("docErrataRole");

    if (!needsPatch) {
      return;
    }

    const content = `"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var docErrataRole = {
  abstract: false,
  accessibleNameRequired: false,
  baseConcepts: [],
  childrenPresentational: false,
  nameFrom: [],
  prohibitedProps: [],
  props: {},
  relatedConcepts: [],
  requireContextRole: [],
  requiredContextRole: [],
  requiredOwnedElements: [],
  requiredProps: {},
  superClass: [["roletype", "structure", "section"]]
};
var _default = exports.default = docErrataRole;
`;
    fs.writeFileSync(ariaTargetPath, content, "utf8");
    // eslint-disable-next-line no-console
    console.log("[postinstall-fixes] patched empty docErrataRole definition");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("[postinstall-fixes] unable to patch aria-query:", error);
  }
}

function patchNextReadlink() {
  const collectBuildTracesPath = path.join(
    __dirname,
    "..",
    "node_modules",
    "next",
    "dist",
    "build",
    "collect-build-traces.js",
  );

  try {
    if (!fs.existsSync(collectBuildTracesPath)) {
      return;
    }
    const source = fs.readFileSync(collectBuildTracesPath, "utf8");
    const guard = "e.code === 'EINVAL' || e.code === 'ENOENT' || e.code === 'UNKNOWN'";
    if (!source.includes(guard)) {
      return;
    }
    if (source.includes(`${guard} || e.code === 'EISDIR'`)) {
      return;
    }
    const updated = source.replace(
      guard,
      `${guard} || e.code === 'EISDIR'`,
    );
    if (updated === source) {
      return;
    }
    fs.writeFileSync(collectBuildTracesPath, updated, "utf8");
    // eslint-disable-next-line no-console
    console.log("[postinstall-fixes] patched next collect-build-traces readlink guard");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("[postinstall-fixes] unable to patch next.js collect-build-traces:", error);
  }
}

function patchPagesManifestPlugin() {
  const pluginPath = path.join(
    __dirname,
    "..",
    "node_modules",
    "next",
    "dist",
    "build",
    "webpack",
    "plugins",
    "pages-manifest-plugin.js",
  );

  try {
    if (!fs.existsSync(pluginPath)) {
      return;
    }
    const source = fs.readFileSync(pluginPath, "utf8");
    if (source.includes("this.distDir === \"\\\\?\"")) {
      return;
    }

    let updated = source.replace(
      "nodeServerAppPaths = appPaths;\n        }\n        // handle parallel",
      "nodeServerAppPaths = appPaths;\n        }\n        const distDir = !this.distDir ? null : this.distDir === \"\\\\?\" ? _path.default.join(process.cwd(), \".next\") : this.distDir;\n        // handle parallel",
    );

    updated = updated.replace(
      "if (this.distDir) {\n            const pagesManifestPath = _path.default.join(this.distDir, 'server', _constants.PAGES_MANIFEST);",
      "if (distDir) {\n            const pagesManifestPath = _path.default.join(distDir, 'server', _constants.PAGES_MANIFEST);",
    );

    updated = updated.replace(
      "if (this.appDirEnabled) {\n            if (this.distDir) {\n                const appPathsManifestPath = _path.default.join(this.distDir, 'server', _constants.APP_PATHS_MANIFEST);",
      "if (this.appDirEnabled) {\n            if (distDir) {\n                const appPathsManifestPath = _path.default.join(distDir, 'server', _constants.APP_PATHS_MANIFEST);",
    );

    if (updated !== source) {
      fs.writeFileSync(pluginPath, updated, "utf8");
      // eslint-disable-next-line no-console
      console.log("[postinstall-fixes] patched next pages-manifest-plugin distDir guard");
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("[postinstall-fixes] unable to patch next.js pages manifest plugin:", error);
  }
}

patchAriaQuery();
patchNextReadlink();
patchPagesManifestPlugin();
