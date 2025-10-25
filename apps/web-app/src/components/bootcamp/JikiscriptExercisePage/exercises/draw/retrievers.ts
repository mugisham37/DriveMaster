import { Circle, Ellipse, Line, Rectangle, Shape, Triangle } from "./shapes";

export function getRectangleAt(
  shapes: Shape[],
  x: number,
  y: number,
  width: number,
  height: number
): Rectangle | undefined {
  return shapes.find((shape) => {
    if (shape instanceof Rectangle) {
      if (x !== undefined) {
        if (shape.x != x) {
          return false;
        }
      }

      if (y !== undefined) {
        if (shape.y != y) {
          return false;
        }
      }

      if (width !== undefined) {
        if (shape.width != width) {
          return false;
        }
      }
      if (height !== undefined) {
        if (shape.height != height) {
          return false;
        }
      }
      return true;
    }
    return false;
  }) as Rectangle | undefined;
}
export function getLineAt(
  shapes: Shape[],
  x1: number,
  y1: number,
  x2: number,
  y2: number
): Line | undefined {
  return shapes.find((shape) => {
    if (shape instanceof Line) {
      return (
        shape.x1 == x1 && shape.y1 == y1 && shape.x2 == x2 && shape.y2 == y2
      );
    }
    return false;
  }) as Line | undefined;
}
export function getCircleAt(
  shapes: Shape[],
  cx: number,
  cy: number,
  radius: number
): Circle | undefined {
  return shapes.find((shape) => {
    if (shape instanceof Circle) {
      return shape.cx == cx && shape.cy == cy && shape.radius == radius;
    }
    return false;
  }) as Circle | undefined;
}
export function getEllipseAt(
  shapes: Shape[],
  x: number,
  y: number,
  rx: number,
  ry: number
): Ellipse | undefined {
  return shapes.find((shape) => {
    if (shape instanceof Ellipse) {
      return shape.x == x && shape.y == y && shape.rx == rx && shape.ry == ry;
    }
    return false;
  }) as Ellipse | undefined;
}
export function getTriangleAt(
  shapes: Shape[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number
): Triangle | undefined {
  return shapes.find((shape) => {
    if (shape instanceof Triangle) {
      const arePointsEqual = (p1: number[], p2: number[]) =>
        p1[0] === p2[0] && p1[1] === p2[1];

      const shapePoints = [
        [shape.x1, shape.y1],
        [shape.x2, shape.y2],
        [shape.x3, shape.y3],
      ];
      const points = [
        [x1, y1],
        [x2, y2],
        [x3, y3],
      ];

      const match = (a: number[], b: number[], c: number[]) =>
        arePointsEqual(shapePoints[0]!, a) &&
        arePointsEqual(shapePoints[1]!, b) &&
        arePointsEqual(shapePoints[2]!, c);

      return (
        match(points[0]!, points[1]!, points[2]!) ||
        match(points[0]!, points[2]!, points[1]!) ||
        match(points[1]!, points[0]!, points[2]!) ||
        match(points[1]!, points[2]!, points[0]!) ||
        match(points[2]!, points[0]!, points[1]!) ||
        match(points[2]!, points[1]!, points[0]!)
      );
    }
    return false;
  }) as Triangle | undefined;
}
