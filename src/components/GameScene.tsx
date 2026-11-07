import { Canvas } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'

export default function GameScene() {
  return (
    <div className="scene-root">
      <Canvas camera={{ position: [0, 1.3, 5.6], fov: 34 }} dpr={[1, 2]}>
        <hemisphereLight color="#fff2e6" groundColor="#d9b9a6" intensity={1.1} />
        <directionalLight position={[3, 5, 4]} intensity={2.4} color="#ffe2c4" />
        <directionalLight position={[-4, 2, -2]} intensity={0.7} color="#bcd0ff" />

        <ContactShadows position={[0, 0.002, 0]} opacity={0.4} scale={6} blur={2.6} far={1.4} color="#5a3a40" />

        <OrbitControls
          makeDefault
          target={[0, 1.05, 0]}
          enablePan={false}
          minDistance={3}
          maxDistance={9}
          minPolarAngle={Math.PI * 0.25}
          maxPolarAngle={Math.PI * 0.52}
        />
      </Canvas>
    </div>
  )
}