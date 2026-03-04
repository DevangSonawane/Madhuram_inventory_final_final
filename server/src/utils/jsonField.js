export const parseJsonLike = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
};

export const jsonTextField = (DataTypes, fallbackFactory) => ({
  type: DataTypes.TEXT,
  allowNull: true,
  get() {
    const raw = this.getDataValue(this.fieldName);
    if (raw == null) return fallbackFactory();
    try {
      return JSON.parse(raw);
    } catch {
      return fallbackFactory();
    }
  },
  set(value) {
    if (value == null || value === '') {
      this.setDataValue(this.fieldName, null);
      return;
    }
    if (typeof value === 'string') {
      this.setDataValue(this.fieldName, value);
      return;
    }
    this.setDataValue(this.fieldName, JSON.stringify(value));
  }
});
