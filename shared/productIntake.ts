export const IMAGE_SOURCES = ["Facebook", "Instagram", "WhatsApp", "Telegram", "Upload", "Camera", "Sync"] as const;
export type ImageSource = (typeof IMAGE_SOURCES)[number];
export type ImageVerificationStatus = "NEEDS_REVIEW" | "VERIFIED";

export type ProductImageIntake = {
  id: string;
  productName: string;
  sku: string;
  imageSource: ImageSource;
  imageSourceRef: string;
  imageVerificationStatus: ImageVerificationStatus;
  imageMatchKey: string;
  intakeChannel: ImageSource;
  intakeNotes: string;
  imageName: string;
  imageDataUrl: string;
  createdAt: string;
};

export const DEFAULT_IMAGE_VERIFICATION_STATUS: ImageVerificationStatus = "NEEDS_REVIEW";

export function buildImageMatchKey(productName: string, sku: string): string {
  return (sku || productName).trim().toLowerCase().replace(/\s+/g, "-");
}
