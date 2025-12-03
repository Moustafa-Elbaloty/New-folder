const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {

        console.warn("authorizeRole: req.user is undefined - protect middleware missing or token invalid");
        return res.status(401).json({
          success: false,
          error: "unauthorized",
          message: "Unauthorized: no user data found",
        });
      }

      // 2. ensure user has a role
      const role = req.user.role;
      if (!role) {
        console.warn(`authorizeRole: user (${req.user.id || "unknown"}) has no role`);
        return res.status(403).json({
          success: false,
          error: "forbidden",
          message: "Access denied: user role not set",
        });
      }

      // 3. check allowed roles
      if (!allowedRoles.includes(role)) {
        console.warn(`authorizeRole: user (${req.user.id}) role="${role}" not in allowed: ${allowedRoles.join(",")}`);
        return res.status(403).json({
          success: false,
          error: "forbidden",
          message: "Access denied: insufficient permissions",
        });
      }

      // 4. allowed — continue
      return next();
    } catch (err) {
      console.error("authorizeRole error:", err);
      return res.status(500).json({
        success: false,
        error: "server_error",
        message: "Internal server error in authorization middleware",
      });
    }
  };
};

module.exports = { authorizeRole };