// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { OtpInput } from "./OtpInput";

afterEach(cleanup);

function renderInput() {
  const handleChange = vi.fn();
  const utils = render(<OtpInput value="" onChange={handleChange} />);
  const boxes = utils.getAllByRole("textbox");
  return { handleChange, boxes, ...utils };
}

describe("OtpInput", () => {
  it("renders exactly six digit boxes", () => {
    const { boxes } = renderInput();
    expect(boxes).toHaveLength(6);
    expect(boxes[0].getAttribute("autocomplete")).toBe("one-time-code");
  });

  it("accepts a Latin digit and advances focus", () => {
    const { handleChange, boxes } = renderInput();
    fireEvent.change(boxes[0], { target: { value: "4" } });
    expect(handleChange).toHaveBeenLastCalledWith("4");
    expect(document.activeElement).toBe(boxes[1]);
  });

  it("normalizes Arabic-Indic digits (Arabic and Persian ranges) to Latin", () => {
    const { handleChange, boxes } = renderInput();
    // Arabic-Indic ٤ (U+0664) then extended Arabic-Indic ۷ (U+06F7)
    fireEvent.change(boxes[0], { target: { value: "٤" } });
    expect(handleChange).toHaveBeenLastCalledWith("4");
    fireEvent.change(boxes[1], { target: { value: "۷" } });
    expect(handleChange).toHaveBeenLastCalledWith("7");
  });

  it("distributes a pasted code across the boxes", () => {
    const { handleChange, boxes } = renderInput();
    const pasteEvent = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(pasteEvent, "clipboardData", {
      value: { getData: () => "123456" },
    });
    fireEvent(boxes[0], pasteEvent);
    expect(handleChange).toHaveBeenLastCalledWith("123456");
    expect(document.activeElement).toBe(boxes[5]);
  });

  it("strips non-numeric characters from pasted content and caps at six", () => {
    const { handleChange, boxes } = renderInput();
    const pasteEvent = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(pasteEvent, "clipboardData", {
      value: { getData: () => " 12-34-56-78 " },
    });
    fireEvent(boxes[0], pasteEvent);
    expect(handleChange).toHaveBeenLastCalledWith("123456");
  });

  it("ignores non-numeric typing", () => {
    const { handleChange, boxes } = renderInput();
    fireEvent.change(boxes[0], { target: { value: "a" } });
    expect(handleChange).not.toHaveBeenCalled();
  });
});
