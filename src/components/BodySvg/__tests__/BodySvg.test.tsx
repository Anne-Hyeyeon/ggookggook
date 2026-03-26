import { render } from "@testing-library/react";
import { BodySvgFront } from "../BodySvgFront";
import { BodySvgBack } from "../BodySvgBack";

const renderInSvg = (ui: React.ReactElement) =>
  render(
    <svg viewBox="0 0 200 500" xmlns="http://www.w3.org/2000/svg">
      {ui}
    </svg>,
  );

describe("BodySvg image overlay redesign", () => {
  it("renders a front body image while preserving interactive regions", () => {
    const { container } = renderInSvg(<BodySvgFront onRegionClick={jest.fn()} />);

    const image = container.querySelector('image[data-body-asset="front"]');

    expect(image).not.toBeNull();
    expect(image?.getAttribute("x")).toBe("0");
    expect(image?.getAttribute("y")).toBe("0");
    expect(image?.getAttribute("width")).toBe("200");
    expect(image?.getAttribute("height")).toBe("500");
    expect(container.querySelector("#region-head")).not.toBeNull();
    expect(container.querySelector("#region-face")).not.toBeNull();
    expect(container.querySelector("#region-chest")).not.toBeNull();
    expect(container.querySelector("#region-foot")).not.toBeNull();
  });

  it("renders a back body image while preserving interactive regions", () => {
    const { container } = renderInSvg(<BodySvgBack onRegionClick={jest.fn()} />);

    const image = container.querySelector('image[data-body-asset="back"]');

    expect(image).not.toBeNull();
    expect(image?.getAttribute("x")).toBe("0");
    expect(image?.getAttribute("y")).toBe("0");
    expect(image?.getAttribute("width")).toBe("200");
    expect(image?.getAttribute("height")).toBe("500");
    expect(container.querySelector("#region-head")).not.toBeNull();
    expect(container.querySelector("#region-back")).not.toBeNull();
    expect(container.querySelector("#region-hip")).not.toBeNull();
    expect(container.querySelector("#region-foot")).not.toBeNull();
  });
});
