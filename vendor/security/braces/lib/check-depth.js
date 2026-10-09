"use strict";
// Public walkers also accept caller-created ASTs. Check iteratively, including cycles.
module.exports = (ast) => {
  const stack = [[ast, 0, false]];
  const ancestors = new Set();
  while (stack.length) {
    const [node, depth, leave] = stack.pop();
    if (!node || typeof node !== 'object') continue;
    if (leave) { ancestors.delete(node); continue; }
    if (depth > 128 || ancestors.has(node)) throw new SyntaxError('Brace AST nesting exceeds 128 or contains a cycle');
    ancestors.add(node);
    stack.push([node, depth, true]);
    for (const child of node.nodes || []) stack.push([child, depth + 1, false]);
  }
};
