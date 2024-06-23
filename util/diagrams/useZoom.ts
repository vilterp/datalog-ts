import { Ref, useEffect, useReducer, useRef } from "react";
import { linearInterpolate } from "./util";
import { average, clamp } from "../util";

export type ZoomState = {
  focusPos: number;
  zoomPct: number;
  viewWidth: number;
};

type ZoomStateInternal = {
  focusPos: number; // [0, 1]
  zoomAbs: number; // [0, infinity]
  viewWidth: number;
};

const initialScrollState: ZoomStateInternal = {
  focusPos: 0.5,
  zoomAbs: 0,
  viewWidth: 0, // get initial somehow?
};

export function useZoom(): [Ref<SVGSVGElement>, ZoomState] {
  const svgRef = useRef<SVGSVGElement>(null);

  const [state, dispatch] = useReducer(reducer, initialScrollState);

  const zoomState: ZoomState = {
    focusPos: state.focusPos,
    zoomPct: zoomPercentage(state.zoomAbs),
    viewWidth: state.viewWidth,
  };

  useEffect(() => {
    const svgElement = svgRef.current;

    // Wheel element handler
    const handleWheel = (evt: WheelEvent) => {
      evt.preventDefault();
      evt.stopPropagation();
      dispatch({
        type: "Zoom",
        delta: evt.deltaY,
        pos: evt.clientX,
      });
    };

    // ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width } = entry.contentRect;
        dispatch({ type: "Resize", newWidth: width });
      }
    });

    // Install
    if (svgElement) {
      svgElement.addEventListener("wheel", handleWheel, { passive: false });
      resizeObserver.observe(svgElement);
    }

    return () => {
      if (svgElement) {
        svgElement.removeEventListener("wheel", handleWheel);
        resizeObserver.disconnect();
      }
    };
  }, []);

  return [svgRef, zoomState];
}

type ZoomEvt =
  | {
      type: "Zoom";
      pos: number; // in view space
      delta: number;
    }
  | { type: "Resize"; newWidth: number };

function reducer(state: ZoomStateInternal, evt: ZoomEvt): ZoomStateInternal {
  switch (evt.type) {
    case "Resize": {
      return {
        ...state,
        viewWidth: evt.newWidth,
      };
    }
    case "Zoom": {
      // TODO: avoid this allocation
      const zoomState: ZoomState = {
        focusPos: state.focusPos,
        zoomPct: zoomPercentage(state.zoomAbs),
        viewWidth: state.viewWidth,
      };
      const [worldLeft, worldRight] = visibleWorldSpaceRange(zoomState);
      const focusPosRaw = linearInterpolate(
        [0, state.viewWidth],
        [
          clamp(worldLeft, WORLD_SPACE_RANGE),
          clamp(worldRight, WORLD_SPACE_RANGE),
        ],
        evt.pos
      );
      const mouseFocusPos = clamp(focusPosRaw, WORLD_SPACE_RANGE);
      const oldFocusPos = state.focusPos;
      const newFocusPos = average([oldFocusPos, mouseFocusPos]);
      return {
        ...state,
        focusPos: newFocusPos,
        zoomAbs: Math.max(0, state.zoomAbs - evt.delta),
      };
    }
  }
}

// ==== Computations ===

const MAX_ZOOM_ABS = 10_000;
const ZOOM_ABS_RANGE: [number, number] = [0, MAX_ZOOM_ABS];

function zoomPercentage(zoomAbs: number): number {
  const res = linearInterpolate(
    [0, MAX_ZOOM_ABS],
    [1, 0],
    clamp(zoomAbs, ZOOM_ABS_RANGE)
  );
  console.log("zoomAbs", zoomAbs, "res", res);
  return res;
}

export function worldToView(state: ZoomState, worldPoint: number): number {
  const worldRange = visibleWorldSpaceRange(state);
  return linearInterpolate(worldRange, [0, state.viewWidth], worldPoint);
}

export function viewToWorld(state: ZoomState, viewPoint: number): number {
  const worldRange = visibleWorldSpaceRange(state);
  const res = linearInterpolate([0, state.viewWidth], worldRange, viewPoint);
  return res;
}

const WORLD_SPACE_RANGE: [number, number] = [0, 1];

export function visibleWorldSpaceRange(zoomState: ZoomState): [number, number] {
  const halfVisibleWidth = zoomState.zoomPct / 2;
  return [
    clamp(zoomState.focusPos - halfVisibleWidth, WORLD_SPACE_RANGE),
    clamp(zoomState.focusPos + halfVisibleWidth, WORLD_SPACE_RANGE),
  ];
}
