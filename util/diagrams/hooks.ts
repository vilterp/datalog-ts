import { Ref, useEffect, useReducer, useRef } from "react";

export type ZoomState = {
  focusPos: number; // [0, 1] ?
  zoomAbs: number; // [0, infinity]
};

const initialScrollState: ZoomState = {
  focusPos: 0.5,
  zoomAbs: 0,
};

export function useZoom(): [Ref<SVGSVGElement>, ZoomState] {
  const svgRef = useRef<SVGSVGElement>(null);

  const [state, dispatch] = useReducer(reducer, initialScrollState);

  useEffect(() => {
    const svgElement = svgRef.current;
    const handleWheel = (evt: WheelEvent) => {
      evt.preventDefault();
      evt.stopPropagation();
      console.log("scroll", evt);
      dispatch({
        delta: evt.deltaY,
        pos: evt.clientX, // ???
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

  return [svgRef, state];
}

type ZoomEvt = {
  pos: number;
  delta: number;
};

function reducer(state: ZoomState, evt: ZoomEvt): ZoomState {
  return {
    focusPos: evt.pos, // need to map from scroll space back to world space
    zoomAbs: Math.max(0, state.zoomAbs - evt.delta),
  };
}
