export type ProductShareOutcome = "shared" | "copied" | "dismissed" | "unavailable";

export type ProductShareOptions = {
  url: string;
  nativeShare?: (data: ShareData) => Promise<void>;
  copyToClipboard?: (text: string) => Promise<void>;
};

const shareData = (url: string): ShareData => ({
  title: "عمران للألعاب",
  text: "شاهد منتجات عمران للألعاب على Instagram وFacebook.",
  url,
});

function wasDismissed(error: unknown) {
  return typeof error === "object" && error !== null && "name" in error && error.name === "AbortError";
}

export async function shareProductsPage({
  url,
  nativeShare,
  copyToClipboard,
}: ProductShareOptions): Promise<ProductShareOutcome> {
  if (nativeShare) {
    try {
      await nativeShare(shareData(url));
      return "shared";
    } catch (error) {
      if (wasDismissed(error)) return "dismissed";
    }
  }

  if (copyToClipboard) {
    try {
      await copyToClipboard(url);
      return "copied";
    } catch {
      return "unavailable";
    }
  }

  return "unavailable";
}
