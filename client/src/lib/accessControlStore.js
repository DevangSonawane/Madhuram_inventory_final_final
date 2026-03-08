const ACCESS_CONTROL_STORAGE_KEY = 'inventory_access_control_overrides';

const safeParse = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
};

export const getAllAccessControlOverrides = () => {
  if (typeof window === 'undefined') return {};
  return safeParse(localStorage.getItem(ACCESS_CONTROL_STORAGE_KEY) || '{}', {});
};

export const getUserAccessControlOverride = (userId) => {
  if (!userId) return null;
  const all = getAllAccessControlOverrides();
  return all[userId] || null;
};

export const saveUserAccessControlOverride = (userId, accessControl) => {
  if (typeof window === 'undefined' || !userId) return;
  const all = getAllAccessControlOverrides();
  all[userId] = accessControl;
  localStorage.setItem(ACCESS_CONTROL_STORAGE_KEY, JSON.stringify(all));
};

export const resolveUserAccessControl = (user) => {
  if (!user || !user.user_id) return user;
  const localOverride = getUserAccessControlOverride(user.user_id);
  if (!localOverride) return user;
  return {
    ...user,
    access_control: localOverride,
  };
};
