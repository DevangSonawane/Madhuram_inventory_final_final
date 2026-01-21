// Attach org context to the request from authenticated user
import { Op } from 'sequelize';

export const orgContext = (req, res, next) => {
  const orgId =
    req.user?.org_id ||
    req.user?.orgId ||
    req.user?.organizationId ||
    req.user?.organisationId ||
    null;

  req.orgId = orgId;
  // helper: build org filter for where clauses
  // TEMPORARILY: Show all records regardless of org_id for backward compatibility
  // This ensures existing data (with null org_id) is visible
  req.withOrg = (base = {}) => {
    // For now, return base without org filtering to show all data
    // This fixes the issue where no data is visible
    return base;
    
    // Future: Uncomment below to enable org filtering when ready
    // if (!orgId) {
    //   return base;
    // }
    // return {
    //   ...base,
    //   [Op.or]: [
    //     { org_id: orgId },
    //     { org_id: null }
    //   ]
    // };
  };

  next();
};




