import DrawExercise from "../draw";
import { ExecutionContext, ExternalFunction } from "@/lib/interpreter/executor";

export default class WeatherExercise extends DrawExercise {
  public constructor() {
    super("weather");
  }

  public override animateShapeIntoView(
    executionCtx: ExecutionContext,
    shape: SVGElement
  ) {
    super.animateShapeIntoView(executionCtx, shape);
    executionCtx.fastForward(50);
  }

  public showReportBackground() {
    const report = document.createElement("div");
    report.classList.add("weather-report");
    this.view.prepend(report);

    const top = document.createElement("div");
    top.classList.add("top");
    report.appendChild(top);

    const mainIcon = document.createElement("div");
    mainIcon.classList.add("main-icon");
    top.appendChild(mainIcon);

    const middle = document.createElement("div");
    middle.classList.add("middle");
    report.appendChild(middle);

    const ml = document.createElement("div");
    ml.innerHTML = "7am";
    middle.appendChild(ml);

    const mm = document.createElement("div");
    mm.innerHTML = "8am";
    middle.appendChild(mm);

    const mr = document.createElement("div");
    mr.innerHTML = "9am";
    middle.appendChild(mr);

    const bottom = document.createElement("div");
    bottom.classList.add("bottom");
    report.appendChild(bottom);

    for (let i = 0; i < 3; i++) {
      const elem = document.createElement("div");
      bottom.appendChild(elem);
    }
  }

  // TODO: How do I get just the ones I want out of DrawExercise
  // (circle, fillColorHex, fillColorRGB, fillColorHSL)
  // and then add the new ones to this?
  public override availableFunctions: ExternalFunction[] = [
    {
      name: "clear",
      func: this.clear.bind(this) as (...args: unknown[]) => unknown,
      description: "Clears the canvas.",
    },
    {
      name: "rectangle",
      func: this.rectangle.bind(this) as (...args: unknown[]) => unknown,
      description:
        "drew a rectangle at coordinates (${arg1}, ${arg2}) with a width of ${arg3} and a height of ${arg4}",
    },
    {
      name: "triangle",
      func: this.triangle.bind(this) as (...args: unknown[]) => unknown,
      description:
        "drew a rectangle with three points: (${arg1}, ${arg2}), (${arg3}, ${arg4}), and (${arg5}, ${arg6})",
    },
    {
      name: "circle",
      func: this.circle.bind(this) as (...args: unknown[]) => unknown,
      description:
        "drew a circle with its center at (${arg1}, ${arg2}), and a radius of ${arg3}",
    },
    {
      name: "ellipse",
      func: this.ellipse.bind(this) as (...args: unknown[]) => unknown,
      description:
        "drew an ellipse with its center at (${arg1}, ${arg2}), a radial width of ${arg3}, and a radial height of ${arg4}",
    },
    {
      name: "fill_color_hex",
      func: this.fillColorHex.bind(this) as (...args: unknown[]) => unknown,
      description: "Changes the fill color using a hex string",
    },
    {
      name: "fill_color_rgb",
      func: this.fillColorRGB.bind(this) as (...args: unknown[]) => unknown,
      description: "Changes the fill color using red, green and blue values",
    },
    {
      name: "fill_color_hsl",
      func: this.fillColorHSL.bind(this) as (...args: unknown[]) => unknown,
      description:
        "Changes the fill color using hue, saturation and lumisity values",
    },
  ];

  public getExerciseSpecificFunctions() {
    return [];
  }
}
