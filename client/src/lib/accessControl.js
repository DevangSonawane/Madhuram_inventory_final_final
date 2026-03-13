import { MENU_CATEGORIES } from '@/constants/menuItems';
import { ACCESS_CONTROL_CATALOG } from '@/constants/accessControlCatalog';

export const ALWAYS_ALLOWED_PAGE_PATHS = ['/profile', '/settings'];

export const buildDefaultAccessControl = () => {
  const pages = {};
  const functions = {};

  ACCESS_CONTROL_CATALOG.forEach((page) => {
    pages[page.pagePath] = true;
    page.functions.forEach((fn) => {
      functions[fn.key] = true;
    });
  });

  return { pages, functions };
};

export const buildNoAccessControl = () => {
  const pages = {};
  const functions = {};

  ACCESS_CONTROL_CATALOG.forEach((page) => {
    pages[page.pagePath] = false;
    page.functions.forEach((fn) => {
      functions[fn.key] = false;
    });
  });

  return { pages, functions };
};

export const normalizeProjectRoutePath = (pathname = '') => {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length <= 1) {
    return '/';
  }
  return `/${segments[1]}`;
};

export const hasPageAccess = (user, pagePath) => {
  if (!pagePath) return true;
  if (pagePath === '/projects') return true;
  if (ALWAYS_ALLOWED_PAGE_PATHS.includes(pagePath)) return true;
  if (user?.role === 'admin') return true;

  const pages = user?.access_control?.pages;
  if (!pages || typeof pages !== 'object') return false;
  return Boolean(pages[pagePath]);
};

export const hasFunctionAccess = (user, functionKey) => {
  if (!functionKey) return true;
  if (user?.role === 'admin') return true;

  const functions = user?.access_control?.functions;
  if (!functions || typeof functions !== 'object') return false;
  return Boolean(functions[functionKey]);
};

export const getAccessibleMenuCategories = (user) => {
  return MENU_CATEGORIES
    .map((category) => ({
      ...category,
      items: category.items.filter((item) => !item.hidden && hasPageAccess(user, item.path)),
    }))
    .filter((category) => category.items.length > 0);
};
