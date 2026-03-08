export const ACCESS_CONTROL_CATALOG = [
  {
    pagePath: '/',
    pageTitle: 'Dashboard',
    category: 'Main',
    description: 'Project overview, status snapshots, and quick actions.',
    functions: [
      { key: 'dashboard.view', label: 'View Dashboard', description: 'Open dashboard and read summary widgets.' },
      { key: 'dashboard.view_metrics', label: 'View Metrics', description: 'See KPI cards and high-level project metrics.' },
      { key: 'dashboard.quick_actions', label: 'Use Quick Actions', description: 'Access dashboard shortcut actions.' },
    ],
  },
  {
    pagePath: '/projects',
    pageTitle: 'Projects',
    category: 'Project Management',
    description: 'Manage project list and core project details.',
    functions: [
      { key: 'projects.view', label: 'View Projects', description: 'See project list and project information.' },
      { key: 'projects.create', label: 'Create Project', description: 'Create a new project entry.' },
      { key: 'projects.edit', label: 'Edit Project', description: 'Edit existing project details.' },
      { key: 'projects.delete', label: 'Delete Project', description: 'Delete a project record.' },
    ],
  },
  {
    pagePath: '/boq',
    pageTitle: 'BOQ Management',
    category: 'Project Management',
    description: 'Handle bill of quantities and related items.',
    functions: [
      { key: 'boq.view', label: 'View BOQ', description: 'Open and review BOQ data.' },
      { key: 'boq.create', label: 'Create BOQ', description: 'Add new BOQ entries.' },
      { key: 'boq.edit', label: 'Edit BOQ', description: 'Update BOQ entries.' },
      { key: 'boq.approve', label: 'Approve BOQ', description: 'Approve or finalize BOQ items.' },
    ],
  },
  {
    pagePath: '/mas',
    pageTitle: 'MAS',
    category: 'Project Management',
    description: 'Material approval and status workflows.',
    functions: [
      { key: 'mas.view', label: 'View MAS', description: 'Read MAS records and statuses.' },
      { key: 'mas.create', label: 'Create MAS', description: 'Create MAS records.' },
      { key: 'mas.edit', label: 'Edit MAS', description: 'Edit MAS details.' },
      { key: 'mas.approve', label: 'Approve MAS', description: 'Approve MAS workflow items.' },
    ],
  },
  {
    pagePath: '/samples',
    pageTitle: 'Sample Management',
    category: 'Procurement',
    description: 'Track samples from request to approval.',
    functions: [
      { key: 'samples.view', label: 'View Samples', description: 'View sample list and records.' },
      { key: 'samples.create', label: 'Create Sample', description: 'Add a new sample entry.' },
      { key: 'samples.edit', label: 'Edit Sample', description: 'Modify sample details.' },
      { key: 'samples.approve', label: 'Approve Sample', description: 'Approve or reject sample items.' },
    ],
  },
  {
    pagePath: '/purchase-orders',
    pageTitle: 'Purchase Orders',
    category: 'Procurement',
    description: 'Create, manage, and track purchase orders.',
    functions: [
      { key: 'purchase_orders.view', label: 'View POs', description: 'Open purchase order list and details.' },
      { key: 'purchase_orders.create', label: 'Create PO', description: 'Create new purchase orders.' },
      { key: 'purchase_orders.edit', label: 'Edit PO', description: 'Update purchase order details.' },
      { key: 'purchase_orders.approve', label: 'Approve PO', description: 'Approve or release purchase orders.' },
    ],
  },
  {
    pagePath: '/vendors',
    pageTitle: 'Vendors',
    category: 'Procurement',
    description: 'Maintain vendor records and comparisons.',
    functions: [
      { key: 'vendors.view', label: 'View Vendors', description: 'View vendor list and profiles.' },
      { key: 'vendors.create', label: 'Create Vendor', description: 'Add vendor records.' },
      { key: 'vendors.edit', label: 'Edit Vendor', description: 'Update vendor details.' },
      { key: 'vendors.delete', label: 'Delete Vendor', description: 'Remove vendor records.' },
    ],
  },
  {
    pagePath: '/challans',
    pageTitle: 'Delivery Challans',
    category: 'Delivery & Inspection',
    description: 'Manage delivery challans and incoming records.',
    functions: [
      { key: 'challans.view', label: 'View Challans', description: 'View challan list and details.' },
      { key: 'challans.create', label: 'Create Challan', description: 'Create delivery challans.' },
      { key: 'challans.edit', label: 'Edit Challan', description: 'Update challan details.' },
      { key: 'challans.verify', label: 'Verify Challan', description: 'Verify received challans.' },
    ],
  },
];

export const ACCESS_CONTROL_PAGE_PATHS = ACCESS_CONTROL_CATALOG.map((page) => page.pagePath);

export const ACCESS_CONTROL_FUNCTION_KEYS = ACCESS_CONTROL_CATALOG.flatMap((page) =>
  page.functions.map((fn) => fn.key)
);
