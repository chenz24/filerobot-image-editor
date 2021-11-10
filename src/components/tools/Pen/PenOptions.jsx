/** External Dependencies */
import React, { useCallback, useContext, useEffect, useRef } from 'react';

/** Internal Dependencies */
import { useAnnotation } from 'hooks';
import { TOOLS_IDS } from 'utils/constants';
import AnnotationOptions from 'components/common/AnnotationOptions';
import AppContext from 'context';
import getPointerOffsetPositionBoundedToObject from 'utils/getPointerOffsetPositionBoundedToObject';
import randomId from 'utils/randomId';
import { SELECT_ANNOTATION, SET_ANNOTATION } from 'actions';

const eventsOptions = {
  passive: true,
};

const PenOptions = () => {
  const { dispatch, designLayer } = useContext(AppContext);
  const [pen, savePenDebounced, savePenNoDebounce] = useAnnotation(
    {
      name: TOOLS_IDS.PEN,
      tension: 0.5,
      lineCap: 'round',
    },
    false,
  );
  const canvasRef = useRef(null);
  const updatedPen = useRef({
    points: [],
    moved: false,
    id: '',
  });

  const getPointerPosition = useCallback((e) => {
    const canvasBoundingRect =
      canvasRef.current.content.getBoundingClientRect();
    const canvasScale = canvasRef.current.scale();
    const pos = getPointerOffsetPositionBoundedToObject(e, canvasBoundingRect);

    return [
      pos.offsetX / canvasScale.x - (designLayer.attrs.xPadding || 0),
      pos.offsetY / canvasScale.y - (designLayer.attrs.yPadding || 0),
    ];
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!updatedPen.current.moved) {
      updatedPen.current = {
        moved: true,
        id: randomId(TOOLS_IDS.PEN),
        points: [...updatedPen.current.points, ...getPointerPosition(e)],
      };

      savePenNoDebounce({
        id: updatedPen.current.id,
        name: TOOLS_IDS.PEN,
        points: updatedPen.current.points,
      });
    } else {
      updatedPen.current.points = updatedPen.current.points.concat(
        getPointerPosition(e),
      );

      dispatch({
        type: SET_ANNOTATION,
        payload: {
          id: updatedPen.current.id,
          points: updatedPen.current.points,
          dismissHistory: true,
        },
      });
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    if (updatedPen.current.id) {
      dispatch({
        type: SELECT_ANNOTATION,
        payload: {
          annotationId: updatedPen.current.id,
        },
      });
    }

    updatedPen.current = null;
    canvasRef.current.off('mousemove touchmove', handlePointerMove);
    canvasRef.current.off('mouseleave touchcancel', handlePointerUp);
    document.removeEventListener('mouseup', handlePointerUp, eventsOptions);
    document.removeEventListener('touchend', handlePointerUp, eventsOptions);
    document.removeEventListener('mouseleave', handlePointerUp, eventsOptions);
    document.removeEventListener('touchcancel', handlePointerUp, eventsOptions);
  }, []);

  const handlePointerDown = useCallback((e) => {
    if (e.target.attrs.draggable) {
      return;
    }
    e.evt.preventDefault();

    updatedPen.current = { points: getPointerPosition(e) };

    canvasRef.current.on('mousemove touchmove', handlePointerMove);
    canvasRef.current.on('mouseleave touchcancel', handlePointerUp);
    document.addEventListener('mouseup', handlePointerUp, eventsOptions);
    document.addEventListener('touchend', handlePointerUp, eventsOptions);
    document.addEventListener('mouseleave', handlePointerUp, eventsOptions);
    document.addEventListener('touchcancel', handlePointerUp, eventsOptions);
  }, []);

  useEffect(() => {
    canvasRef.current = designLayer?.getStage();
    if (canvasRef.current) {
      canvasRef.current.on('mousedown touchstart', handlePointerDown);
    }

    return () => {
      if (canvasRef.current) {
        canvasRef.current.off('mousedown touchstart', handlePointerDown);
      }
    };
  }, []);

  return (
    <AnnotationOptions
      annotation={pen}
      updateAnnotation={savePenDebounced}
      hideFillOption
    />
  );
};

export default PenOptions;