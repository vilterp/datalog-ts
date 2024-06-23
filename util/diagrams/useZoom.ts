import { Ref, useEffect, useReducer, useRef } from "react";
import { linearInterpolate } from "./util";
import { clamp } from "../util";

export type ZoomState = {
  focusPos: number; // [0, 1]
  zoomPct: number; // 1: all the way zoomed out
  viewWidth: number; // pixels
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
      const newZoomAbs = clamp(state.zoomAbs - evt.delta, REAL_ZOOM_ABS_RANGE);
      const zoomState = getZoomState(state);

      const mouseWorldSpacePos = viewToWorld(zoomState, evt.pos);
      const bottomLeg = MAX_ZOOM_ABS - state.zoomAbs;
      const sideLeg = state.focusPos - mouseWorldSpacePos;
      const slope = sideLeg / bottomLeg;

      const newBottomLeg = MAX_ZOOM_ABS - newZoomAbs;
      const newSideLeg = slope * newBottomLeg;
      const newFocusPos = mouseWorldSpacePos + newSideLeg;

      const newState: ZoomStateInternal = {
        ...state,
        focusPos: clamp(newFocusPos, WORLD_SPACE_RANGE),
        zoomAbs: newZoomAbs,
      };

      return correctForEdge(newState);
      // return newState;
    }
  }
}

// TODO: refactor to not need to do this as much
function getZoomState(internal: ZoomStateInternal): ZoomState {
  return {
    focusPos: internal.focusPos,
    viewWidth: internal.viewWidth,
    zoomPct: zoomPercentage(internal.zoomAbs),
  };
}

// ==== Computations ===

const MAX_ZOOM_ABS = 5_000;
const ZOOM_ABS_RANGE: [number, number] = [0, MAX_ZOOM_ABS];
// prevent us from NaN-ing out
const REAL_ZOOM_ABS_RANGE: [number, number] = [0, MAX_ZOOM_ABS - 10];

function correctForEdge(internal: ZoomStateInternal): ZoomStateInternal {
  const state = getZoomState(internal);
  const [worldLeft, worldRight] = visibleWorldSpaceRangeUnclamped(state);
  console.log("range", state, [worldLeft, worldRight]);
  if (worldLeft < 0) {
    const rightShift = -worldLeft;
    console.log("right shifting by", rightShift);
    return {
      ...internal,
      focusPos: clamp(internal.focusPos + rightShift, WORLD_SPACE_RANGE),
    };
  } else if (worldRight > 1) {
    const leftShift = worldRight - 1;
    console.log("left shifting by", leftShift);
    return {
      ...internal,
      focusPos: clamp(internal.focusPos - leftShift, WORLD_SPACE_RANGE),
    };
  }
  return internal;
}

function zoomPercentage(zoomAbs: number): number {
  const res = linearInterpolate(
    [0, MAX_ZOOM_ABS],
    [1, 0],
    clamp(zoomAbs, ZOOM_ABS_RANGE)
  );
  console.log(
    "lerp",
    [0, MAX_ZOOM_ABS],
    [1, 0],
    clamp(zoomAbs, ZOOM_ABS_RANGE),
    res
  );
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

export function visibleWorldSpaceRangeUnclamped(
  zoomState: ZoomState
): [number, number] {
  const halfVisibleWidth = zoomState.zoomPct / 2;
  return [
    zoomState.focusPos - halfVisibleWidth,
    zoomState.focusPos + halfVisibleWidth,
  ];
}
