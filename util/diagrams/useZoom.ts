import { Ref, useEffect, useReducer, useRef } from "react";
import { linearInterpolate } from "./util";

export type ZoomState = {
  focusPos: number;
  zoomPct: number;
};

type ZoomStateInternal = {
  focusPos: number; // [0, 1] ?
  zoomAbs: number; // [0, infinity]
};

const initialScrollState: ZoomStateInternal = {
  focusPos: 0.5,
  zoomAbs: 0,
};

export function useZoom(): [Ref<SVGSVGElement>, ZoomState] {
  const svgRef = useRef<SVGSVGElement>(null);

  const [state, dispatch] = useReducer(reducer, initialScrollState);

  const zoomState: ZoomState = {
    focusPos: state.focusPos,
    zoomPct: zoomPercentage(state.zoomAbs),
  };

  useEffect(() => {
    const svgElement = svgRef.current;
    const handleWheel = (evt: WheelEvent) => {
      evt.preventDefault();
      evt.stopPropagation();
      dispatch({
        delta: evt.deltaY,
        pos: evt.clientX,
      });
    };

    if (svgElement) {
      svgElement.addEventListener("wheel", handleWheel, { passive: false });
    }

    return () => {
      if (svgElement) {
        svgElement.removeEventListener("wheel", handleWheel);
      }
    };
  }, []);

  return [svgRef, zoomState];
}

type ZoomEvt = {
  pos: number; // in view space
  delta: number;
};

function reducer(state: ZoomStateInternal, evt: ZoomEvt): ZoomStateInternal {
  return {
    focusPos: viewToWorld(state, viewWidth, evt.pos),
    zoomAbs: Math.max(0, state.zoomAbs - evt.delta),
  };
}

// computations

const SENSITIVITY = 0.001;

function zoomPercentage(zoomAbs: number): number {
  return (1 / (1 + Math.exp(SENSITIVITY * zoomAbs))) * 2;
}

// where 'world space' is [0, 1]
export function worldToView(
  state: ZoomState,
  viewWidth: number,
  point: number
): number {
  const worldRange = visibleWorldSpaceRange(state);
  return linearInterpolate(worldRange, [0, viewWidth], point);
}

export function viewToWorld(
  state: ZoomState,
  viewWidth: number,
  point: number
): number {
  const worldRange = visibleWorldSpaceRange(state);
  return linearInterpolate([0, viewWidth], worldRange, point);
}

function visibleWorldSpaceRange(zoomState: ZoomState): [number, number] {
  const halfVisibleWidth = zoomState.zoomPct / 2;
  return [
    zoomState.focusPos - halfVisibleWidth,
    zoomState.focusPos + halfVisibleWidth,
  ];
}
