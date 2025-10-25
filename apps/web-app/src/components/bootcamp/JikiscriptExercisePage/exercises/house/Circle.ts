import { ExecutionContext } from "@/lib/interpreter/executor";
import * as Jiki from "@/lib/interpreter/jikiObjects";
import HouseExercise from "./HouseExercise";
import { changeBrightness, storeShape } from "./Component";
import { guardValidHex } from "./helpers";

function fn(this: HouseExercise) {
  const drawCircle = (
    executionCtx: ExecutionContext,
    circle: Jiki.Instance
  ) => {
    if (circle.shape) {
      this.animateShapeOutOfView(executionCtx, (circle.shape as { element: SVGElement }).element);
    }

    this.fillColorHex(executionCtx, circle.getField("fill_color_hex") as Jiki.JikiString);
    this.circle(
      executionCtx,
      circle.getField("cx") as Jiki.JikiNumber,
      circle.getField("cy") as Jiki.JikiNumber,
      circle.getField("radius") as Jiki.JikiNumber
    );
    storeShape(this, circle);

    this.events.push(
      `circle:position:${circle.getUnwrappedField(
        "cx"
      )},${circle.getUnwrappedField("cy")}`
    );
  };
  const changeCircleBrightness = (
    executionCtx: ExecutionContext,
    circle: Jiki.Instance
  ) => {
    changeBrightness(executionCtx, this, circle);
    this.events.push(
      `circle:brightness:${circle.getUnwrappedField("brightness")}`
    );
  };

  const Circle = new Jiki.Class("Circle");
  Circle.addConstructor(function (
    executionCtx: ExecutionContext,
    object: Jiki.Instance,
    cx: Jiki.JikiObject,
    cy: Jiki.JikiObject,
    radius: Jiki.JikiObject,
    fillColorHex: Jiki.JikiObject,
    z_index: Jiki.JikiObject
  ) {
    if (!(cx instanceof Jiki.JikiNumber)) {
      return executionCtx.logicError("Ooops! Cx must be a number.");
    }
    if (!(cy instanceof Jiki.JikiNumber)) {
      return executionCtx.logicError("Ooops! Cy must be a number.");
    }
    if (!(radius instanceof Jiki.JikiNumber)) {
      return executionCtx.logicError("Ooops! Radius must be a number.");
    }
    if (!(z_index instanceof Jiki.JikiNumber)) {
      return executionCtx.logicError("Ooops! Z-index must be a number.");
    }
    guardValidHex(executionCtx, fillColorHex);

    object.setField("cx", cx);
    object.setField("cy", cy);
    object.setField("radius", radius);
    object.setField("fill_color_hex", fillColorHex);
    object.setField("z_index", z_index);
    drawCircle(executionCtx, object);
  });
  Circle.addGetter(
    "cx",
    "public",
    function (_executionCtx: ExecutionContext, object: Jiki.Instance) {
      return object.getField("cx");
    }
  );
  Circle.addGetter(
    "cy",
    "public",
    function (_executionCtx: ExecutionContext, object: Jiki.Instance) {
      return object.getField("cy");
    }
  );

  Circle.addSetter(
    "cx",
    "public",
    function (
      executionCtx: ExecutionContext,
      object: Jiki.Instance,
      cx: Jiki.JikiObject
    ) {
      if (!(cx instanceof Jiki.JikiNumber)) {
        return executionCtx.logicError("Ooops! Cx must be a number.");
      }
      object.setField("cx", cx);

      drawCircle(executionCtx, object);
    }
  );
  Circle.addSetter(
    "cy",
    "public",
    function (
      executionCtx: ExecutionContext,
      object: Jiki.Instance,
      cy: Jiki.JikiObject
    ) {
      if (!(cy instanceof Jiki.JikiNumber)) {
        return executionCtx.logicError("Ooops! Cy must be a number.");
      }
      object.setField("cy", cy);

      drawCircle(executionCtx, object);
    }
  );
  Circle.addSetter(
    "brightness",
    "public",
    function (
      executionCtx: ExecutionContext,
      object: Jiki.Instance,
      brightness: Jiki.JikiObject
    ) {
      if (!(brightness instanceof Jiki.JikiNumber)) {
        return executionCtx.logicError("Ooops! Brightness must be a number.");
      }
      if (brightness.value < 0 || brightness.value > 100) {
        executionCtx.logicError("Brightness must be between 0 and 100");
      }
      object.setField("brightness", brightness);
      changeCircleBrightness(executionCtx, object);
    }
  );
  return Circle;
}

export function buildCircle(binder: HouseExercise) {
  return fn.bind(binder)();
}
