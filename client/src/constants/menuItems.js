import { 
  LayoutDashboard, 
  Package, 
  Warehouse, 
  ShoppingCart, 
  FileText, 
  ArrowRightLeft, 
  TrendingDown, 
  Undo2, 
  Users, 
  BarChart3, 
  History,
  Briefcase,
  // ClipboardList,
  // CheckSquare,
  Layers,
  Truck,
  FileCheck,
  Eye,
  Hammer,
  Receipt,
  FolderOpen,
} from "lucide-react";

export const MENU_CATEGORIES = [
  {
    category: "Main",
    items: [
      {
        title: "Dashboard",
        path: "/",
        icon: LayoutDashboard,
      },
    ]
  },
  {
    category: "Project Management",
    items: [
      {
        title: "Projects",
        path: "/projects",
        icon: Briefcase,
      },
      // {
      //   title: "BOQ Management",
      //   path: "/boq",
      //   icon: ClipboardList,
      // },
      // {
      //   title: "MAS",
      //   path: "/mas",
      //   icon: CheckSquare,
      // },
    ]
  },
  {
    category: "Procurement",
    items: [
      {
        title: "Sample Management",
        path: "/samples",
        icon: Layers,
      },
      {
        title: "Purchase Requests",
        path: "/purchase-requests",
        icon: ShoppingCart,
        hidden: true,
      },
      {
        title: "Vendor Comparison",
        path: "/vendor-comparison",
        icon: ArrowRightLeft,
      },
      {
        title: "Purchase Orders",
        path: "/purchase-orders",
        icon: FileText,
      },
      {
        title: "Vendors",
        path: "/vendors",
        icon: Users,
      },
    ]
  },
  {
    category: "Delivery & Inspection",
    items: [
      {
        title: "Delivery Challans",
        path: "/challans",
        icon: Truck,
      },
      {
        title: "MER",
        path: "/mer",
        icon: FileCheck,
        hidden: true,
      },
      {
        title: "MIR",
        path: "/mir",
        icon: Eye,
        hidden: true,
      },
      {
        title: "ITR",
        path: "/itr",
        icon: Hammer,
        hidden: true,
      },
    ]
  },
  {
    category: "Billing",
    items: [
      {
        title: "Billing & Invoices",
        path: "/billing",
        icon: Receipt,
        hidden: true,
      },
    ]
  },
  {
    category: "Inventory",
    items: [
      {
        title: "Inventory",
        path: "/inventory",
        icon: Warehouse,
        hidden: true,
      },
      {
        title: "Stock Overview",
        path: "/stock-areas",
        icon: Warehouse,
        hidden: true,
      },
      {
        title: "Product Master",
        path: "/materials",
        icon: Package,
        hidden: true,
      },
      {
        title: "Stock Transfers",
        path: "/stock-transfers",
        icon: ArrowRightLeft,
        hidden: true,
      },
      {
        title: "Consumption",
        path: "/consumption",
        icon: TrendingDown,
        hidden: true,
      },
      {
        title: "Returns",
        path: "/returns",
        icon: Undo2,
        hidden: true,
      },
    ]
  },
  {
    category: "Documents",
    items: [
      {
        title: "Repository",
        path: "/documents",
        icon: FolderOpen,
        hidden: true,
      },
    ]
  },
  {
    category: "Analytics",
    items: [
      {
        title: "Reports",
        path: "/reports",
        icon: BarChart3,
        hidden: true,
      },
      {
        title: "Audit Logs",
        path: "/audit-logs",
        icon: History,
        hidden: true,
      },
    ]
  },
  // {
  //   category: "Administration",
  //   items: [
  //     {
  //       title: "User Management",
  //       path: "/users",
  //       // icon: UserCog,
  //     },
  //   ]
  // }
];
