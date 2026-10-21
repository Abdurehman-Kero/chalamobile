// Role guard. Use after the auth middleware:  router.post('/', allow('owner'), ...)
module.exports = function allow(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Your account does not have access to this', code: 'FORBIDDEN' });
    }
    next();
  };
};
