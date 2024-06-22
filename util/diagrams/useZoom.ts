import { Ref, useEffect, useReducer, useRef } from "react";
import { linearInterpolate } from "./util";

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
      return {
        ...state,
        focusPos: viewToWorld(zoomState, evt.pos),
        zoomAbs: Math.max(0, state.zoomAbs - evt.delta),
      };
    }
  }
}

// ==== Computations ===

const SENSITIVITY = 0.001;

function zoomPercentage(zoomAbs: number): number {
  return (1 / (1 + Math.exp(SENSITIVITY * zoomAbs))) * 2;
}

export function worldToView(state: ZoomState, worldPoint: number): number {
  const worldRange = visibleWorldSpaceRange(state);
  return linearInterpolate(worldRange, [0, state.viewWidth], worldPoint);
}

export function viewToWorld(state: ZoomState, viewPoint: number): number {
  const worldRange = visibleWorldSpaceRange(state);
  const res = linearInterpolate([0, state.viewWidth], worldRange, viewPoint);
  console.log("view to world", { worldRange, viewPoint, res });
  return res;
}

export function visibleWorldSpaceRange(zoomState: ZoomState): [number, number] {
  const halfVisibleWidth = zoomState.zoomPct / 2;
  return [
    Math.max(0, zoomState.focusPos - halfVisibleWidth),
    Math.min(zoomState.focusPos + halfVisibleWidth, 1),
  ];
}
