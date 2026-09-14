// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearWishlist,
  getWishlistIds,
  isInWishlist,
  removeFromWishlist,
  subscribeWishlist,
  toggleWishlist,
} from "./wishlist";

describe("device-local wishlist", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts empty and stores only product ids", () => {
    expect(getWishlistIds()).toEqual([]);
    expect(isInWishlist("p1")).toBe(false);
    const added = toggleWishlist("p1");
    expect(added).toBe(true);
    expect(getWishlistIds()).toEqual(["p1"]);
    expect(isInWishlist("p1")).toBe(true);
  });

  it("toggles an id back off", () => {
    toggleWishlist("p1");
    const added = toggleWishlist("p1");
    expect(added).toBe(false);
    expect(getWishlistIds()).toEqual([]);
  });

  it("prepends new ids and removes a single id", () => {
    toggleWishlist("p1");
    toggleWishlist("p2");
    expect(getWishlistIds()).toEqual(["p2", "p1"]);
    removeFromWishlist("p1");
    expect(getWishlistIds()).toEqual(["p2"]);
  });

  it("emits a change event on every mutation", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeWishlist(listener);
    toggleWishlist("p1");
    toggleWishlist("p1");
    clearWishlist();
    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
    toggleWishlist("p2");
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("caps the list at 500 ids", () => {
    for (let i = 0; i < 550; i += 1) toggleWishlist(`p${i}`);
    expect(getWishlistIds()).toHaveLength(500);
  });

  it("ignores corrupted storage without throwing", () => {
    localStorage.setItem("omran.wishlist.ids.v1", "{not-json");
    expect(() => getWishlistIds()).not.toThrow();
    expect(getWishlistIds()).toEqual([]);
    localStorage.setItem("omran.wishlist.ids.v1", JSON.stringify(["ok", 42, null, { x: 1 }]));
    expect(getWishlistIds()).toEqual(["ok"]);
  });
});
