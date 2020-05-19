/**
 * Wrapper for Async Await Routes
 * @param fn
 * @return {void}
 */
const asyncErrorHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(e => {
    next(e);
  });
};

module.exports = asyncErrorHandler;
