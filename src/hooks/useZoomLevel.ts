import { useThree } from "@react-three/fiber";
import { useState, useRef } from "react";
import { useFrame } from "@react-three/fiber";

/**
 * Hook to track camera distance and calculate zoom level
 * @param targetPosition - Position to calculate distance from (default: origin)
 * @returns zoom level (0-1, where 1 is fully zoomed in)
 */
export function useZoomLevel(targetPosition: [number, number, number] = [0, 0, 0]) {
  const { camera } = useThree();
  const [zoomLevel, setZoomLevel] = useState(0);
  const lastZoomLevel = useRef(0);

  useFrame(() => {
    // Calculate distance from camera to target
    const dx = camera.position.x - targetPosition[0];
    const dy = camera.position.y - targetPosition[1];
    const dz = camera.position.z - targetPosition[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Map distance to zoom level (0-1)
    // Assuming max distance is 200 and min distance (for indoor view) is 30
    const maxDistance = 200;
    const minDistance = 30;
    
    const normalizedZoom = 1 - Math.max(0, Math.min(1, (distance - minDistance) / (maxDistance - minDistance)));
    
    // Only update if the change is significant (threshold: 0.05 = 5%)
    if (Math.abs(normalizedZoom - lastZoomLevel.current) > 0.05) {
      lastZoomLevel.current = normalizedZoom;
      setZoomLevel(normalizedZoom);
    }
  });

  return zoomLevel;
}
