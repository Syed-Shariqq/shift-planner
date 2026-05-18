import jwt from "jsonwebtoken";

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication token is required" });
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return res.status(401).json({ error: "Authentication token is required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = {
      id: decoded.id,
      role: decoded.role,
      department: decoded.department,
      name: decoded.name,
    };

    if (!user.id || !user.role || !user.department || !user.name) {
      return res.status(401).json({ error: "Invalid authentication token" });
    }

    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid authentication token" });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "Admin") {
    return res.status(403).json({ error: "Admin access is required" });
  }

  return next();
};
