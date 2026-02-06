const path = require("path");
const binding_path = path.join(
  __dirname,
  "../../build/Release/tree_sitter_sass_binding.node",
);

try {
  module.exports = require(binding_path);
} catch (e) {
  try {
    module.exports = require(
      path.join(__dirname, "../../build/Debug/tree_sitter_sass_binding.node"),
    );
  } catch (e2) {
    throw new Error(
      "Could not find tree-sitter-sass native binding. " +
        "Make sure the native addon is built. Run: npm run build",
    );
  }
}

try {
  module.exports.nodeTypeInfo = require("../../src/node-types.json");
} catch (e) {}
