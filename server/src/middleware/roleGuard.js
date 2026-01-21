// Simple role guard; checks role or email for admin access
export const roleGuard = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles || allowedRoles.length === 0) return next();
    
    const role = req.user?.role;
    const email = req.user?.email;
    
    // Allow if role matches OR if email is itechseed1@gmail.com (main admin)
    const isAdmin = role === 'admin' || email === 'itechseed1@gmail.com';
    
    // Debug logging (can be removed in production)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[roleGuard]', {
        email,
        role,
        isAdmin,
        allowedRoles,
        path: req.path
      });
    }
    
    if (allowedRoles.includes('admin') && isAdmin) {
      return next();
    }
    
    if (role && allowedRoles.includes(role)) {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to perform this action. Admin access required.'
    });
  };
};




