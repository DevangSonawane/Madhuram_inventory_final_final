import { 
  LayoutDashboard, 
  Package, 
  Warehouse, 
  ShoppingCart, 
  FileText, 
  ArrowDownToLine, 
  Send, 
  ArrowRightLeft, 
  User, 
  Utensils, 
  Undo2, 
  Users, 
  BarChart3, 
  History,
  Settings,
  HelpCircle
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
    category: "Inventory",
    items: [
      {
        title: "Materials",
        path: "/materials",
        icon: Package,
      },
      {
        title: "Stock Areas",
        path: "/stock-areas",
        icon: Warehouse,
      },
      {
        title: "Person Stock",
        path: "/person-stock",
        icon: User,
      },
    ]
  },
  {
    category: "Procurement",
    items: [
      {
        title: "Purchase Requests",
        path: "/purchase-requests",
        icon: ShoppingCart,
      },
      {
        title: "Purchase Orders",
        path: "/purchase-orders",
        icon: FileText,
      },
      {
        title: "Business Partners",
        path: "/business-partners",
        icon: Users,
      },
    ]
  },
  {
    category: "Operations",
    items: [
      {
        title: "Inward Entry",
        path: "/inward-entry",
        icon: ArrowDownToLine,
      },
      {
        title: "Material Requests",
        path: "/material-requests",
        icon: Send,
      },
      {
        title: "Stock Transfers",
        path: "/stock-transfers",
        icon: ArrowRightLeft,
      },
      {
        title: "Consumption",
        path: "/consumption",
        icon: Utensils,
      },
      {
        title: "Returns",
        path: "/returns",
        icon: Undo2,
      },
    ]
  },
  {
    category: "Analytics & System",
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
      {
        title: "Settings",
        path: "/settings",
        icon: Settings,
      },
      {
        title: "Support",
        path: "/support",
        icon: HelpCircle,
      }
    ]
  }
];
