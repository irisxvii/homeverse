
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import { useEffect, useRef } from "react";
import * as THREE from "three";

function PlayerControls() {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const direction = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const forward = useRef(new THREE.Vector3());

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFrame((_, delta) => {
    const speed = 5;
    const movement = direction.current.set(0, 0, 0);

    camera.getWorldDirection(forward.current);
    forward.current.y = 0;
    forward.current.normalize();

    right.current.crossVectors(forward.current, camera.up).normalize();

    if (keys.current["w"] || keys.current["arrowup"]) {
      movement.add(forward.current);
    }
    if (keys.current["s"] || keys.current["arrowdown"]) {
      movement.sub(forward.current);
    }
    if (keys.current["d"] || keys.current["arrowright"]) {
      movement.add(right.current);
    }
    if (keys.current["a"] || keys.current["arrowleft"]) {
      movement.sub(right.current);
    }

    if (movement.lengthSq() > 0) {
      movement.normalize().multiplyScalar(speed * delta);

      camera.position.add(movement);

      // Keep the camera at eye level
      camera.position.y = 1.7;

      // Keep the player on the road for now
      camera.position.x = THREE.MathUtils.clamp(
        camera.position.x,
        -2.1,
        2.1
      );
    }
  });

  return <PointerLockControls />;
}

function Window({
  position,
  width = 1.3,
  height = 1.2,
}: {
  position: [number, number, number];
  width?: number;
  height?: number;
}) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[width + 0.2, height + 0.2, 0.14]} />
        <meshStandardMaterial color="#e9dfce" />
      </mesh>
      <mesh position={[0, 0, 0.08]}>
        <boxGeometry args={[width, height, 0.04]} />
        <meshStandardMaterial color="#638b99" roughness={0.25} />
      </mesh>
      <mesh position={[0, 0, 0.11]}>
        <boxGeometry args={[0.045, height, 0.025]} />
        <meshStandardMaterial color="#e9dfce" />
      </mesh>
    </group>
  );
}

function House({
  position,
  rotation = 0,
  color,
  accent,
}: {
  position: [number, number, number];
  rotation?: number;
  color: string;
  accent: string;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[5.5, 3, 5.5]} />
        <meshStandardMaterial color={color} />
      </mesh>

      <mesh position={[0, 3.85, 0]} castShadow>
        <boxGeometry args={[5.5, 1.7, 5.5]} />
        <meshStandardMaterial color={color} />
      </mesh>

      <mesh position={[0, 4.75, 0]} castShadow>
        <boxGeometry args={[6, 0.25, 6]} />
        <meshStandardMaterial color="#514d48" />
      </mesh>

      <mesh position={[0, 3.05, 0]}>
        <boxGeometry args={[5.7, 0.15, 5.7]} />
        <meshStandardMaterial color="#eee5d8" />
      </mesh>

      <mesh position={[-2.15, 3.7, 2.79]}>
        <boxGeometry args={[1.1, 1.4, 0.12]} />
        <meshStandardMaterial color={accent} />
      </mesh>

      <mesh position={[0, 1.05, 2.79]}>
        <boxGeometry args={[1, 2.1, 0.13]} />
        <meshStandardMaterial color="#65432f" />
      </mesh>

      {[-1.7, 1.7].map((x) => (
        <Window key={x} position={[x, 2, 2.82]} />
      ))}
      {[-1.5, 1.5].map((x) => (
        <Window key={x} position={[x, 4, 2.82]} />
      ))}

      {[2.82, -2.82].map((x) => (
        <ReactSideWindows key={x} x={x} />
      ))}

      <mesh position={[0, 3.18, 3.2]}>
        <boxGeometry args={[4.2, 0.18, 1.3]} />
        <meshStandardMaterial color="#c8bca9" />
      </mesh>

      <mesh position={[0, 3.95, 3.8]}>
        <boxGeometry args={[4.2, 0.09, 0.09]} />
        <meshStandardMaterial color="#eee5d8" />
      </mesh>

      {Array.from({ length: 11 }, (_, i) => (
        <mesh key={i} position={[-1.9 + i * 0.38, 3.57, 3.8]}>
          <boxGeometry args={[0.07, 0.7, 0.07]} />
          <meshStandardMaterial color="#eee5d8" />
        </mesh>
      ))}

      {[-2, 2].map((x) => (
        <mesh key={x} position={[x, 3.55, 3.2]}>
          <boxGeometry args={[0.12, 0.8, 1.2]} />
          <meshStandardMaterial color={accent} />
        </mesh>
      ))}

      <mesh position={[0, 2.25, 3.45]}>
        <boxGeometry args={[2.1, 0.12, 1.3]} />
        <meshStandardMaterial color={accent} />
      </mesh>

      {[-0.9, 0.9].map((x) => (
        <mesh key={x} position={[x, 1.15, 3.9]}>
          <boxGeometry args={[0.12, 2.2, 0.12]} />
          <meshStandardMaterial color="#e9dfce" />
        </mesh>
      ))}

      <mesh position={[0, 0.12, 3.1]}>
        <boxGeometry args={[1.8, 0.24, 0.8]} />
        <meshStandardMaterial color="#aaa49a" />
      </mesh>
    </group>
  );
}

function ReactSideWindows({ x }: { x: number }) {
  return (
    <>
      {[-1.5, 1.5].map((z) => (
        <Window
          key={`lower-${z}`}
          position={[x, 2, z]}
          width={1.4}
          height={1.35}
        />
      ))}
      {[-1.5, 1.5].map((z) => (
        <Window
          key={`upper-${z}`}
          position={[x, 4, z]}
          width={1.4}
          height={1.2}
        />
      ))}
    </>
  );
}

function CompoundEntry({ side, z }: { side: number; z: number }) {
  return (
    <group position={[side * 4.5, 0, z]}>
      {[-3.5, 3.5].map((offset) => (
        <mesh key={offset} position={[0, 0.7, offset]}>
          <boxGeometry args={[0.35, 1.4, 3.5]} />
          <meshStandardMaterial color="#c9bda8" />
        </mesh>
      ))}

      {[-1.7, 1.7].map((offset) => (
        <mesh key={offset} position={[0, 1, offset]}>
          <boxGeometry args={[0.5, 2, 0.5]} />
          <meshStandardMaterial color="#ded1bb" />
        </mesh>
      ))}

      <mesh position={[0.06, 0.85, 0]}>
        <boxGeometry args={[0.12, 1.55, 2.9]} />
        <meshStandardMaterial color="#414b49" metalness={0.4} />
      </mesh>

      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[0.14, 0.85, -1.3 + i * 0.325]}>
          <boxGeometry args={[0.08, 1.55, 0.055]} />
          <meshStandardMaterial color="#92978d" metalness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function ElectricPole({
  position,
}: {
  position: [number, number, number];
}) {
  return (
    <group position={position}>
      <mesh position={[0, 3.5, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.2, 7, 8]} />
        <meshStandardMaterial color="#77756d" />
      </mesh>

      <mesh position={[0, 6.5, 0]}>
        <boxGeometry args={[2, 0.13, 0.16]} />
        <meshStandardMaterial color="#555650" />
      </mesh>

      {[-0.75, 0, 0.75].map((x) => (
        <mesh key={x} position={[x, 6.75, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.35, 8]} />
          <meshStandardMaterial color="#d5d0bd" />
        </mesh>
      ))}
    </group>
  );
}

function StreetDetails() {
  return (
    <>
      {[-1, 1].map((side) =>
        [-10, -32, -54].map((z) => (
          <ElectricPole
            key={`${side}-${z}`}
            position={[side * 5.8, 0, z]}
          />
        ))
      )}

      {[-1, 1].map((side) =>
        [-0.65, 0, 0.65].map((offset) => (
          <mesh
            key={`${side}-${offset}`}
            position={[side * 5.8 + offset, 6.65, -32]}
          >
            <boxGeometry args={[0.035, 0.035, 65]} />
            <meshStandardMaterial color="#454641" />
          </mesh>
        ))
      )}

      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * 3.35, -0.015, -35]}
        >
          <boxGeometry args={[0.22, 0.12, 120]} />
          <meshStandardMaterial color="#555a54" />
        </mesh>
      ))}

      {[
        [-4.5, -9],
        [4.5, -27],
        [-4.5, -47],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.12, 0.17, 0.7, 7]} />
            <meshStandardMaterial color="#65503b" />
          </mesh>
          <mesh position={[0, 0.9, 0]}>
            <sphereGeometry args={[0.65, 7, 6]} />
            <meshStandardMaterial color="#52764b" />
          </mesh>
        </group>
      ))}
    </>
  );
}

function Scooter({
  position,
  rotation = 0,
  color = "#b83d35",
}: {
  position: [number, number, number];
  rotation?: number;
  color?: string;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-0.65, 0.65].map((z) => (
        <group key={z} position={[0, 0.28, z]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.28, 0.28, 0.16, 16]} />
            <meshStandardMaterial color="#242525" />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.13, 0.13, 0.18, 12]} />
            <meshStandardMaterial color="#a7a49a" />
          </mesh>
        </group>
      ))}

      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[0.48, 0.55, 0.9]} />
        <meshStandardMaterial color={color} />
      </mesh>

      <mesh position={[0, 0.85, 0.48]}>
        <boxGeometry args={[0.52, 0.75, 0.16]} />
        <meshStandardMaterial color={color} />
      </mesh>

      <mesh position={[0, 1.12, -0.18]}>
        <boxGeometry args={[0.45, 0.16, 0.65]} />
        <meshStandardMaterial color="#292827" />
      </mesh>

      <mesh position={[0, 1.3, 0.55]}>
        <cylinderGeometry args={[0.045, 0.045, 0.65, 8]} />
        <meshStandardMaterial color="#777875" />
      </mesh>

      <mesh position={[0, 1.62, 0.55]}>
        <boxGeometry args={[0.8, 0.07, 0.09]} />
        <meshStandardMaterial color="#444746" />
      </mesh>

      <mesh position={[0, 1.05, 0.58]}>
        <boxGeometry args={[0.25, 0.17, 0.08]} />
        <meshStandardMaterial
          color="#fff0bd"
          emissive="#fff0bd"
          emissiveIntensity={0.3}
        />
      </mesh>

      {[-0.38, 0.38].map((x) => (
        <mesh key={x} position={[x, 1.75, 0.55]}>
          <sphereGeometry args={[0.09, 10, 10]} />
          <meshStandardMaterial color="#333b3b" />
        </mesh>
      ))}
    </group>
  );
}

function RoadEnvironment() {
  const houses = [
    { z: -7, color: "#d8cfc0", accent: "#927b65" },
    { z: -25, color: "#d7d9ce", accent: "#9bafaa" },
    { z: -44, color: "#d8c5b5", accent: "#9c7865" },
  ];

  return (
    <>
      <ambientLight intensity={1.3} />
      <directionalLight position={[8, 12, 5]} intensity={2} castShadow />

      <color attach="background" args={["#b9c9c0"]} />
      <fog attach="fog" args={["#b9c9c0", 35, 95]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, -35]}>
        <planeGeometry args={[100, 120]} />
        <meshStandardMaterial color="#78866b" />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -35]}>
        <planeGeometry args={[5, 120]} />
        <meshStandardMaterial color="#454b4b" roughness={0.95} />
      </mesh>

      {[-1, 1].map((side) => (
        <mesh
          key={side}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[side * 2.85, 0.02, -35]}
        >
          <planeGeometry args={[0.7, 120]} />
          <meshStandardMaterial color="#99958a" />
        </mesh>
      ))}

      {[-1, 1].map((side) => (
        <mesh
          key={side}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[side * 7, -0.08, -35]}
        >
          <planeGeometry args={[8, 120]} />
          <meshStandardMaterial color="#738064" />
        </mesh>
      ))}

      <StreetDetails />

      <Scooter position={[-4.1, 0, -13]} color="#b83d35" />
      <Scooter position={[4.1, 0, -36]} rotation={Math.PI} color="#263f58" />

      {houses.map((house, index) => (
        <group key={house.z}>
          <House
            position={[-7.5, 0, house.z]}
            rotation={Math.PI / 2}
            color={house.color}
            accent={house.accent}
          />
          <House
            position={[7.5, 0, house.z - 7]}
            rotation={-Math.PI / 2}
            color={index === 1 ? "#d8c9b6" : "#d2d6ca"}
            accent={index === 1 ? "#897b69" : "#9bafaa"}
          />
          <CompoundEntry side={-1} z={house.z + 2} />
          <CompoundEntry side={1} z={house.z - 5} />
        </group>
      ))}
    </>
  );
}

export default function GameWorld() {
  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <Canvas
        shadows
        camera={{
          position: [0, 1.7, 7],
          fov: 65,
        }}
      >
        <RoadEnvironment />
        <PlayerControls />
      </Canvas>

      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          color: "white",
          background: "rgba(0,0,0,0.55)",
          padding: "10px 18px",
          borderRadius: 8,
          fontFamily: "Arial",
          fontSize: 13,
          pointerEvents: "none",
        }}
      >
        Click to look around · WASD to move · ESC to unlock mouse
      </div>
    </div>
  );
}