// Gates a route to specific roles. Must run AFTER `protect`, since it reads
// req.user which `protect` attaches from the verified JWT.
const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: "You do not have permission to perform this action." });
  }

  next();
};

module.exports = requireRole;
