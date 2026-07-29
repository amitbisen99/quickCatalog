/**
 * Placeholder handler for routes that are wired up (path, middleware,
 * auth) but whose business logic hasn't been built yet. Later phases
 * replace these exports one at a time without touching the route files.
 */
module.exports = (label) => (req, res) => {
  res.status(501).json({
    success: false,
    message: `${label} is not implemented yet`,
  });
};
