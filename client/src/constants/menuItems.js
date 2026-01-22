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
  ClipboardList,
  CheckSquare,
  Layers,
  Truck,
  FileCheck,
  Eye,
  Hammer,
  Receipt,
  FolderOpen
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
      {
        title: "BOQ Management",
        path: "/boq",
        icon: ClipboardList,
      },
      {
        title: "MAS",
        path: "/mas",
        icon: CheckSquare,
      },
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
      },
      {
        title: "MIR",
        path: "/mir",
        icon: Eye,
      },
      {
        title: "ITR",
        path: "/itr",
        icon: Hammer,
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
      },
    ]
  },
  {
    category: "Inventory",
    items: [
      {
        title: "Stock Overview",
        path: "/stock-areas",
        icon: Warehouse,
      },
      {
        title: "Product Master",
        path: "/materials",
        icon: Package,
      },
      {
        title: "Stock Transfers",
        path: "/stock-transfers",
        icon: ArrowRightLeft,
      },
      {
        title: "Consumption",
        path: "/consumption",
        icon: TrendingDown,
      },
      {
        title: "Returns",
        path: "/returns",
        icon: Undo2,
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
      },
      {
        title: "Audit Logs",
        path: "/audit-logs",
        icon: History,
      },
    ]
  }
];
