
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import * as THREE from "three";

export default function PlayerControls() {
  const player = useRef<THREE.Group>(null);
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();

  const keys = useRef<Record<string, boolean>>({});

  useFrame(({ camera }, delta) => {
    if (!player.current) return;

    const speed = 5;
    const movement = new THREE.Vector3();

    forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();

    right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();

    if (keys.current["w"] || keys.current["arrowup"]) {
      movement.add(forward);
    }
    if (keys.current["s"] || keys.current["arrowdown"]) {
      movement.sub(forward);
    }
    if (keys.current["d"] || keys.current["arrowright"]) {
      movement.add(right);
    }
    if (keys.current["a"] || keys.current["arrowleft"]) {
      movement.sub(right);
    }

    if (movement.lengthSq() > 0) {
      movement.normalize().multiplyScalar(speed * delta);
      player.current.position.add(movement);
      camera.position.copy(player.current.position);
    }
  });

  return (
    <>
      <PointerLockControls />
    </>
  );
}
