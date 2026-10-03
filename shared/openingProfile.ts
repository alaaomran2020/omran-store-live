/**
 * OMRAN TOYS — Opening Data Source of Truth.
 *
 * Any public opening/branch/contact surface must derive from this record or be
 * checked against it in tests/build. Do not publish a different phone, date,
 * primary opening branch, or company naming without updating this file first.
 */
export const OPENING_PROFILE = {
  companyName: "شركة عمران التجارية",
  storeBrand: "عمران تويز",
  officialDomain: "omrantoys.store",
  officialUrl: "https://omrantoys.store/",
  opening: {
    officialDate: "2026-11-29",
    displayDate: "29/11/2026",
    primaryBranchId: "sayyid-al-badawi",
  },
  contacts: {
    whatsapp: "201555570269",
    whatsappDisplay: "01555570269",
    landline: "20403336336",
    landlineDisplay: "0403336336",
  },
  branches: [
    {
      id: "sayyid-al-badawi",
      name: "فرع السيد البدوي",
      address: "ميدان السيد البدوي، شارع درب الأبشيهي، طنطا.",
      city: "طنطا",
      isPrimary: true,
    },
    {
      id: "al-stad",
      name: "فرع الاستاد",
      address: "أمام نادي سيتي كلوب ومطعم سي السيد، طنطا.",
      city: "طنطا",
      isPrimary: false,
    },
  ],
} as const;
