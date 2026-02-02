const EMPTY_CONTACT = {
  name: "",
  phone: "",
};

export const EMPTY_PO = {
  title: "Purchase Order",
  companyName: "",
  companySubtitle: "",
  companyAddress: "",
  companyEmail: "",
  companyGstNo: "",
  source: "Manual",
  sourceFileName: "",
  indentNo: "",
  indentDate: "",
  orderNo: "",
  poDate: "",
  vendor: {
    name: "",
    site: "",
    contactPerson: "",
    address: "",
    contacts: {
      primary: { ...EMPTY_CONTACT },
      secondary: { ...EMPTY_CONTACT },
    },
  },
  itemsGroup: {
    title: "",
    description: "",
  },
  items: [],
  subtotalAmount: "",
  discount: {
    percent: "",
    amount: "",
  },
  afterDiscountAmount: "",
  taxes: {
    cgst: {
      percent: "",
      amount: "",
    },
    sgst: {
      percent: "",
      amount: "",
    },
  },
  totalAmount: "",
  summary: {
    discountPercent: "",
    tax: "",
    delivery: "",
    payment: "",
  },
  notes: [],
  termsAndConditions: [],
  authorisedSignatory: "",
};
