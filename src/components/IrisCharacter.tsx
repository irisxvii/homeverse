// import { useEffect, useMemo, useRef } from 'react'
// import { useFrame } from '@react-three/fiber'
// import * as THREE from 'three'

// /* ------------------------------------------------------------------ */
// /*  Types, palette, math helpers                                       */
// /* ------------------------------------------------------------------ */

// type V3 = [number, number, number]
// type V2 = [number, number]
// type Side = 1 | -1

// const C = {
//   skin: '#bf7f55',
//   skinDark: '#a56a45',
//   mouth: '#4d1a22',
//   lip: '#9a4a44',
//   hair: ['#26171b', '#301d22', '#1c1114', '#3a2428'],
//   jeans: '#8793b9',
//   jeansDark: '#6e7aa4',
//   jeansLight: '#a0aacb',
//   cuff: '#aaa8c0',
//   sneaker: '#efe2cb',
//   sneakerSole: '#d9c6a4',
//   sneakerShade: '#d8c4a0',
//   jacket: '#7b2535',
//   jacketDark: '#5f1b29',
//   bag: '#c9a77d',
//   bagDark: '#b08c62',
//   strap: '#b8946a',
//   gold: '#b98d4b',
//   white: '#f7f1e8',
//   ink: '#1d1214',
// }

// const LEAN = 0.07 // forward lean of the upper body (radians)

// function mulberry32(seed: number) {
//   let a = seed
//   return () => {
//     a |= 0
//     a = (a + 0x6d2b79f5) | 0
//     let t = Math.imul(a ^ (a >>> 15), 1 | a)
//     t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
//     return ((t ^ (t >>> 14)) >>> 0) / 4294967296
//   }
// }

// const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x))
// const sstep = (e0: number, e1: number, x: number) => {
//   const t = clamp((x - e0) / (e1 - e0), 0, 1)
//   return t * t * (3 - 2 * t)
// }
// const gauss = (x: number, y: number, cx: number, cy: number, sx: number, sy: number) =>
//   Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2))
// /** Rounded end profile: ~1 in the middle, closes smoothly to 0 at t = 0 and 1. */
// const endRound = (t: number) => Math.pow(Math.max(1e-4, Math.sin(Math.PI * t)), 0.28)

// /** Cosine-interpolated [y, rx, rz] table lookup (body cross-sections). */
// type Knot = [number, number, number]
// function interp(table: Knot[], y: number): [number, number] {
//   const first = table[0]
//   const last = table[table.length - 1]
//   if (y <= first[0]) return [first[1], first[2]]
//   if (y >= last[0]) return [last[1], last[2]]
//   for (let i = 1; i < table.length; i++) {
//     if (y <= table[i][0]) {
//       const a = table[i - 1]
//       const b = table[i]
//       const k = (1 - Math.cos(((y - a[0]) / (b[0] - a[0])) * Math.PI)) / 2
//       return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]
//     }
//   }
//   return [last[1], last[2]]
// }

// // Skin torso cross-sections (half-width, half-depth) by height.
// const TORSO_T: Knot[] = [
//   [1.12, 0.27, 0.2],
//   [1.22, 0.225, 0.158],
//   [1.3, 0.205, 0.145],
//   [1.42, 0.205, 0.15],
//   [1.52, 0.215, 0.158],
//   [1.62, 0.222, 0.168],
//   [1.7, 0.19, 0.145],
//   [1.76, 0.1, 0.09],
// ]
// const torso = (y: number) => interp(TORSO_T, y)

// // Jeans pelvis cross-sections.
// const JEANS_T: Knot[] = [
//   [0.96, 0.3, 0.215],
//   [1.05, 0.3, 0.215],
//   [1.14, 0.278, 0.196],
//   [1.2, 0.248, 0.174],
//   [1.245, 0.228, 0.16],
// ]
// const jeans = (y: number) => interp(JEANS_T, y)

// /* ------------------------------------------------------------------ */
// /*  Geometry builders                                                  */
// /* ------------------------------------------------------------------ */

// /** Smooth normals across vertices that share a position (seams, caps, poles). */
// function weldNormals(g: THREE.BufferGeometry) {
//   g.computeVertexNormals()
//   const pos = g.attributes.position
//   const nor = g.attributes.normal
//   const groups = new Map<string, number[]>()
//   for (let i = 0; i < pos.count; i++) {
//     const k = `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`
//     const l = groups.get(k)
//     if (l) l.push(i)
//     else groups.set(k, [i])
//   }
//   groups.forEach((list) => {
//     if (list.length < 2) return
//     let x = 0
//     let y = 0
//     let z = 0
//     list.forEach((i) => {
//       x += nor.getX(i)
//       y += nor.getY(i)
//       z += nor.getZ(i)
//     })
//     const l = Math.hypot(x, y, z) || 1
//     list.forEach((i) => nor.setXYZ(i, x / l, y / l, z / l))
//   })
//   nor.needsUpdate = true
// }

// interface LoftOpts {
//   radial?: number
//   segs?: number
//   cap?: boolean
//   /** Extra radius multiplier around the circumference – used for fabric folds. */
//   wobble?: (t: number, a: number) => number
// }

// const AX_Z = new THREE.Vector3(0, 0, 1)
// const AX_X = new THREE.Vector3(1, 0, 0)

// /**
//  * Lofted surface: an elliptical cross-section swept along a smooth curve.
//  * radius(t) -> [rx, rz]. For a vertical path rx = left/right, rz = front/back.
//  * Frames are parallel-transported so there is no twisting.
//  */
// function buildLoft(points: V3[], radius: (t: number) => [number, number], o: LoftOpts = {}) {
//   const radial = o.radial ?? 12
//   const segs = o.segs ?? 16
//   const curve = new THREE.CatmullRomCurve3(
//     points.map((p) => new THREE.Vector3(...p)),
//     false,
//     'centripetal',
//   )
//   const centers: THREE.Vector3[] = []
//   const tangents: THREE.Vector3[] = []
//   for (let i = 0; i <= segs; i++) {
//     const t = i / segs
//     centers.push(curve.getPointAt(t))
//     tangents.push(curve.getTangentAt(t).normalize())
//   }
//   const ref = Math.abs(tangents[0].z) > 0.95 ? AX_X : AX_Z
//   const B = tangents[0].clone().cross(ref).normalize()
//   const N = B.clone().cross(tangents[0]).normalize()

//   const pos: number[] = []
//   const uv: number[] = []
//   const idx: number[] = []
//   for (let i = 0; i <= segs; i++) {
//     if (i > 0) {
//       const q = new THREE.Quaternion().setFromUnitVectors(tangents[i - 1], tangents[i])
//       B.applyQuaternion(q)
//       N.applyQuaternion(q)
//     }
//     const t = i / segs
//     const [rx, rz] = radius(t)
//     for (let j = 0; j <= radial; j++) {
//       const a = (j / radial) * Math.PI * 2
//       const w = o.wobble ? o.wobble(t, a) : 1
//       const cx = Math.cos(a) * rx * w
//       const cz = Math.sin(a) * rz * w
//       pos.push(
//         centers[i].x + B.x * cx + N.x * cz,
//         centers[i].y + B.y * cx + N.y * cz,
//         centers[i].z + B.z * cx + N.z * cz,
//       )
//       uv.push(j / radial, t)
//     }
//   }
//   const row = radial + 1
//   for (let i = 0; i < segs; i++) {
//     for (let j = 0; j < radial; j++) {
//       const a = i * row + j
//       const b = (i + 1) * row + j
//       idx.push(a, b, a + 1, b, b + 1, a + 1)
//     }
//   }
//   if (o.cap) {
//     const s0 = pos.length / 3
//     pos.push(centers[0].x, centers[0].y, centers[0].z)
//     uv.push(0.5, 0)
//     for (let j = 0; j < radial; j++) idx.push(s0, j, j + 1)
//     const e0 = pos.length / 3
//     const last = centers[segs]
//     pos.push(last.x, last.y, last.z)
//     uv.push(0.5, 1)
//     const base = segs * row
//     for (let j = 0; j < radial; j++) idx.push(e0, base + j + 1, base + j)
//   }
//   const g = new THREE.BufferGeometry()
//   g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
//   g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
//   g.setIndex(idx)
//   weldNormals(g)
//   return g
// }

// /** Box with properly rounded edges and smooth shading. */
// function roundedBox(w: number, h: number, d: number, r: number, seg = 5) {
//   const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg)
//   const p = g.attributes.position
//   const hx = w / 2 - r
//   const hy = h / 2 - r
//   const hz = d / 2 - r
//   const v = new THREE.Vector3()
//   const inner = new THREE.Vector3()
//   for (let i = 0; i < p.count; i++) {
//     v.fromBufferAttribute(p, i)
//     inner.set(clamp(v.x, -hx, hx), clamp(v.y, -hy, hy), clamp(v.z, -hz, hz))
//     const dir = v.clone().sub(inner)
//     if (dir.lengthSq() > 0) {
//       dir.normalize().multiplyScalar(r)
//       v.copy(inner).add(dir)
//     }
//     p.setXYZ(i, v.x, v.y, v.z)
//   }
//   weldNormals(g)
//   return g
// }

// /** Grid patch between two curves; z comes from zf so it hugs a surface. */
// function ribbonGeo(
//   top: (u: number) => V2,
//   bot: (u: number) => V2,
//   nu: number,
//   nv: number,
//   zf: (x: number, y: number) => number,
// ) {
//   const pos: number[] = []
//   const idx: number[] = []
//   for (let i = 0; i <= nu; i++) {
//     const u = i / nu
//     const [x0, y0] = top(u)
//     const [x1, y1] = bot(u)
//     for (let j = 0; j <= nv; j++) {
//       const v = j / nv
//       const x = x0 + (x1 - x0) * v
//       const y = y0 + (y1 - y0) * v
//       pos.push(x, y, zf(x, y))
//     }
//   }
//   const row = nv + 1
//   for (let i = 0; i < nu; i++) {
//     for (let j = 0; j < nv; j++) {
//       const a = i * row + j
//       const b = (i + 1) * row + j
//       idx.push(a, a + 1, b, b, a + 1, b + 1)
//     }
//   }
//   const g = new THREE.BufferGeometry()
//   g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
//   g.setIndex(idx)
//   g.computeVertexNormals()
//   return g
// }

// const bez =
//   (p0: V2, c: V2, p1: V2) =>
//   (u: number): V2 => {
//     const a = (1 - u) ** 2
//     const b = 2 * u * (1 - u)
//     const d = u * u
//     return [a * p0[0] + b * c[0] + d * p1[0], a * p0[1] + b * c[1] + d * p1[1]]
//   }

// function useGeo<T extends THREE.BufferGeometry>(factory: () => T): T {
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   const g = useMemo(factory, [])
//   useEffect(() => () => g.dispose(), [g])
//   return g
// }

// /** Procedural "ikat" zig-zag pattern – drawn on a canvas, no image files. */
// function makeIkatTexture() {
//   const c = document.createElement('canvas')
//   c.width = 256
//   c.height = 128
//   const g = c.getContext('2d')!
//   g.fillStyle = '#34408a'
//   g.fillRect(0, 0, 256, 128)
//   g.lineJoin = 'round'
//   g.shadowColor = '#d8d6ee'
//   g.shadowBlur = 4
//   for (let row = 0; row < 4; row++) {
//     const y0 = row * 32 + 16
//     g.strokeStyle = row % 2 ? '#c9c8e6' : '#eeeaf4'
//     g.lineWidth = 7
//     g.beginPath()
//     for (let x = 0; x <= 256; x += 16) {
//       const y = y0 + ((x / 16) % 2 ? -9 : 9)
//       if (x === 0) g.moveTo(x, y)
//       else g.lineTo(x, y)
//     }
//     g.stroke()
//     g.fillStyle = '#5a68b3'
//     for (let x = 8; x < 256; x += 32) {
//       g.beginPath()
//       g.moveTo(x, y0 - 3)
//       g.lineTo(x + 4, y0 + 1)
//       g.lineTo(x, y0 + 5)
//       g.lineTo(x - 4, y0 + 1)
//       g.closePath()
//       g.fill()
//     }
//   }
//   const t = new THREE.CanvasTexture(c)
//   t.wrapS = t.wrapT = THREE.RepeatWrapping
//   t.repeat.set(2.5, 1.3)
//   t.colorSpace = THREE.SRGBColorSpace
//   t.anisotropy = 4
//   return t
// }

// /* ------------------------------------------------------------------ */
// /*  Head surface model (shared by geometry + feature placement)        */
// /* ------------------------------------------------------------------ */

// // Base head ellipsoid radii.
// const HEAD = { a: 0.221, b: 0.252, c: 0.228 }

// /** Jaw narrows towards the chin. */
// const jawK = (y: number) => 1 - 0.3 * sstep(0.0, -0.25, y)

// /** Cheeks, brow ridge, eye sockets, nose bridge, chin, muzzle – extra depth on the face. */
// function faceBump(x: number, y: number) {
//   const ax = Math.abs(x)
//   return (
//     0.016 * gauss(ax, y, 0.118, -0.06, 0.06, 0.06) + // cheeks
//     0.009 * gauss(ax, y, 0.09, 0.088, 0.075, 0.02) + // brow ridge
//     -0.005 * gauss(ax, y, 0.09, 0.0, 0.045, 0.03) + // eye sockets
//     0.014 * gauss(ax, y, 0, -0.01, 0.02, 0.07) + // nose bridge
//     0.012 * gauss(ax, y, 0, -0.215, 0.06, 0.04) + // chin
//     0.007 * gauss(ax, y, 0, -0.115, 0.07, 0.045) // muzzle / lip area
//   )
// }

// /** Height of the sculpted face surface at (x, y) – features are seated on this. */
// const faceZ = (x: number, y: number) => {
//   const xo = x / jawK(y)
//   const arg = 1 - (xo / HEAD.a) ** 2 - (y / HEAD.b) ** 2
//   return HEAD.c * Math.sqrt(Math.max(0.04, arg)) + faceBump(x, y)
// }

// function makeHeadGeometry() {
//   const g = new THREE.SphereGeometry(1, 56, 42)
//   const p = g.attributes.position
//   for (let i = 0; i < p.count; i++) {
//     const ux = p.getX(i)
//     const uy = p.getY(i)
//     const uz = p.getZ(i)
//     const y = uy * HEAD.b
//     const x = ux * HEAD.a * jawK(y)
//     let z = uz * HEAD.c
//     z += faceBump(x, y) * sstep(0.1, 0.55, uz)
//     p.setXYZ(i, x, y, z)
//   }
//   weldNormals(g)
//   return g
// }

// function circleOnFace(cx: number, cy: number, r: number, off: number) {
//   const g = new THREE.CircleGeometry(r, 20)
//   const p = g.attributes.position
//   for (let i = 0; i < p.count; i++) {
//     const x = p.getX(i) + cx
//     const y = p.getY(i) + cy
//     p.setXYZ(i, x, y, faceZ(x, y) + off)
//   }
//   g.computeVertexNormals()
//   return g
// }

// /* ------------------------------------------------------------------ */
// /*  Small reusable building blocks                                     */
// /* ------------------------------------------------------------------ */

// interface MatProps {
//   color: string
//   rough?: number
//   map?: THREE.Texture
//   transparent?: boolean
//   opacity?: number
//   side?: THREE.Side
//   /** Subtle faceted shading (flat normals on a moderately tessellated mesh). */
//   facet?: boolean
//   offset?: boolean
//   metal?: number
// }

// function Mat({ color, rough = 0.78, map, transparent, opacity, side, facet = false, offset = false, metal = 0 }: MatProps) {
//   return (
//     <meshStandardMaterial
//       color={color}
//       roughness={rough}
//       metalness={metal}
//       flatShading={facet}
//       map={map}
//       transparent={transparent}
//       opacity={opacity}
//       side={side}
//       polygonOffset={offset}
//       polygonOffsetFactor={offset ? -4 : 0}
//       polygonOffsetUnits={offset ? -4 : 0}
//     />
//   )
// }

// interface LoftProps extends LoftOpts {
//   points: V3[]
//   radius: (t: number) => [number, number]
//   color: string
//   facet?: boolean
//   rough?: number
//   map?: THREE.Texture
//   side?: THREE.Side
// }

// function Loft({ points, radius, color, facet, rough, map, side, radial, segs, cap, wobble }: LoftProps) {
//   const geo = useGeo(() => buildLoft(points, radius, { radial, segs, cap, wobble }))
//   return (
//     <mesh geometry={geo}>
//       <Mat color={color} facet={facet} rough={rough} map={map} side={side} />
//     </mesh>
//   )
// }

// interface BlobProps {
//   pos?: V3
//   scale?: V3 | number
//   rot?: V3
//   r?: number
//   detail?: number
//   color: string
//   rough?: number
// }

// /** Smooth rounded lump – used for knuckles, flowers, ears, nose etc. */
// function Blob({ pos = [0, 0, 0], scale = 1, rot = [0, 0, 0], r = 0.1, detail = 2, color, rough }: BlobProps) {
//   return (
//     <mesh position={pos} rotation={rot} scale={scale}>
//       <icosahedronGeometry args={[r, detail]} />
//       <Mat color={color} rough={rough} />
//     </mesh>
//   )
// }

// interface SegProps {
//   from: V3
//   to: V3
//   r1: number
//   r2: number
//   color: string
//   sides?: number
//   rough?: number
//   metal?: number
// }

// /** Thin tapered rod between two points – used only for fine details (arms of glasses, laces, strings). */
// function Segment({ from, to, r1, r2, color, sides = 8, rough, metal }: SegProps) {
//   const a = new THREE.Vector3(...from)
//   const b = new THREE.Vector3(...to)
//   const dir = b.clone().sub(a)
//   const len = dir.length()
//   const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
//   const mid = a.clone().add(b).multiplyScalar(0.5)
//   return (
//     <mesh position={mid} quaternion={q}>
//       <cylinderGeometry args={[r2, r1, len, sides, 1]} />
//       <Mat color={color} rough={rough} metal={metal} />
//     </mesh>
//   )
// }

// function Ball({ pos, r, color = C.skin }: { pos: V3; r: number; color?: string }) {
//   return (
//     <mesh position={pos}>
//       <sphereGeometry args={[r, 18, 14]} />
//       <Mat color={color} />
//     </mesh>
//   )
// }

// /* ------------------------------------------------------------------ */
// /*  Hair – layered sculpted masses + individual curved locks           */
// /* ------------------------------------------------------------------ */

// interface Lock {
//   geo: THREE.BufferGeometry
//   color: string
//   phase: number
//   sway: number
// }

// function buildHair(): Lock[] {
//   const rnd = mulberry32(11)
//   const pick = () => C.hair[Math.floor(rnd() * C.hair.length)]
//   const out: Lock[] = []

//   // Strand profile: swells just below the root, then tapers to a soft tip.
//   const taper = (base: number) => (t: number): [number, number] => {
//     const w = base * (0.6 + 0.4 * Math.sin(Math.min(1, t * 3.5) * (Math.PI / 2))) * (1 - 0.8 * Math.pow(t, 1.5)) + 0.007
//     return [w * 1.1, w * 0.85]
//   }

//   interface Hang {
//     a: number
//     y0: number
//     R0: number
//     len: number
//     base: number
//     waves: number
//     amp: number
//     flare: number
//     bias?: number
//     color: string
//     sway: number
//   }
//   // A lock that starts on the scalp at azimuth `a` and flows down in an S-curve.
//   const hang = (o: Hang) => {
//     const phase = rnd() * Math.PI * 2
//     const N = 7
//     const sign = o.a > 0 ? 1 : -1
//     const pts: V3[] = []
//     for (let k = 0; k <= N; k++) {
//       const u = k / N
//       const y = o.y0 - u * o.len
//       const spread = Math.sin(Math.min(1, u * 1.5) * (Math.PI / 2))
//       const wv = Math.sin(u * Math.PI * o.waves + phase)
//       const R = o.R0 + o.flare * spread + Math.cos(u * Math.PI * o.waves + phase) * o.amp * 0.3 * u
//       const aa = o.a + sign * (o.bias ?? 0.3) * u + wv * o.amp * u
//       pts.push([Math.sin(aa) * R, y, Math.cos(aa) * R * 0.95 - 0.02])
//     }
//     out.push({ geo: buildLoft(pts, taper(o.base), { radial: 7, segs: 18, cap: true }), color: o.color, phase, sway: o.sway })
//   }

//   // Wide dark masses underneath – give the silhouette its volume.
//   for (let i = 0; i < 8; i++) {
//     const sign = i % 2 ? 1 : -1
//     const a = sign * (1.15 + Math.floor(i / 2) * 0.55)
//     hang({
//       a,
//       y0: 0.05 - rnd() * 0.06,
//       R0: 0.21,
//       len: 0.34 + rnd() * 0.12,
//       base: 0.085 + rnd() * 0.025,
//       waves: 1.3,
//       amp: 0.08 + rnd() * 0.05,
//       flare: 0.1 + 0.07 * Math.sin(Math.abs(a)),
//       color: i % 3 ? C.hair[0] : C.hair[2],
//       sway: 0.5,
//     })
//   }

//   // Individual flowing wavy locks.
//   for (let i = 0; i < 28; i++) {
//     const side = rnd() < 0.5 ? -1 : 1
//     const a = side * (1.0 + rnd() * (Math.PI - 1.0))
//     hang({
//       a,
//       y0: 0.17 - rnd() * 0.18,
//       R0: 0.215,
//       len: 0.36 + rnd() * 0.3,
//       base: 0.042 + rnd() * 0.032,
//       waves: 1.6 + rnd() * 1.1,
//       amp: 0.12 + rnd() * 0.12,
//       flare: 0.07 + 0.1 * Math.sin(Math.abs(a)) + rnd() * 0.04,
//       color: pick(),
//       sway: 1,
//     })
//   }

//   // Crown strands sweeping from the whorl across the scalp and back.
//   const surf = (th: number, a: number, k = 1.04): V3 => [
//     HEAD.a * 1.12 * k * Math.sin(th) * Math.sin(a),
//     -0.02 + HEAD.b * 1.1 * k * Math.cos(th),
//     HEAD.c * 1.14 * k * Math.sin(th) * Math.cos(a) - 0.02,
//   ]
//   for (let i = 0; i < 12; i++) {
//     const a = rnd() * Math.PI * 2
//     const front = Math.cos(a) > 0.45
//     const thMax = front ? 0.92 : 1.25
//     const phase = rnd() * 6.28
//     const pts: V3[] = []
//     for (let k = 0; k < 5; k++) {
//       const th = 0.1 + (k / 4) * (thMax - 0.1)
//       pts.push(surf(th, a + 0.12 * Math.sin(k * 1.3 + phase)))
//     }
//     if (!front) {
//       const l = pts[4]
//       pts.push([l[0] * 1.06, l[1] - 0.12, l[2] * 1.06])
//       pts.push([l[0] * 1.1, l[1] - 0.24 - rnd() * 0.08, l[2] * 1.1])
//     }
//     out.push({ geo: buildLoft(pts, taper(0.036), { radial: 7, segs: 16, cap: true }), color: pick(), phase, sway: 0.15 })
//   }

//   // Face-framing curls: sweep from the parting over the temple and spiral by the jaw.
//   const sc = (x: number, y: number, k = 1.06): V3 => {
//     const arg = 1 - (x / (HEAD.a * k)) ** 2 - (y / (HEAD.b * k)) ** 2
//     return [x, y, HEAD.c * k * Math.sqrt(Math.max(0.03, arg))]
//   }
//   for (const s of [-1, 1]) {
//     for (let j = 0; j < 2; j++) {
//       const o = j * 0.014
//       const pts: V3[] = [
//         sc(s * (0.012 + o), 0.247),
//         sc(s * (0.085 + o), 0.218),
//         sc(s * (0.15 + o), 0.15),
//         sc(s * (0.2 + o), 0.07),
//         [s * (0.246 + o), -0.03, 0.075 - o],
//         [s * (0.262 + o), -0.12, 0.074 - o],
//         [s * (0.248 + o), -0.2 - j * 0.03, 0.055],
//       ]
//       out.push({
//         geo: buildLoft(pts, taper(0.034 - j * 0.006), { radial: 7, segs: 20, cap: true }),
//         color: j ? C.hair[1] : C.hair[0],
//         phase: s * 2 + j,
//         sway: 0.6,
//       })
//     }
//   }
//   return out
// }

// function Hair() {
//   const group = useRef<THREE.Group>(null)
//   const locks = useMemo(buildHair, [])
//   useEffect(() => () => locks.forEach((l) => l.geo.dispose()), [locks])

//   useFrame(({ clock }) => {
//     const t = clock.elapsedTime
//     group.current?.children.forEach((ch) => {
//       const u = ch.userData as { phase?: number; sway?: number }
//       if (u.sway === undefined) return
//       const ph = u.phase ?? 0
//       ch.rotation.z = Math.sin(t * 1.3 + ph) * 0.012 * u.sway
//       ch.rotation.x = Math.sin(t * 1.7 + ph * 1.3) * 0.007 * u.sway
//     })
//   })

//   return (
//     <group ref={group}>
//       {/* crown cap */}
//       <mesh scale={[HEAD.a * 1.12, HEAD.b * 1.1, HEAD.c * 1.14]} position={[0, -0.02, -0.02]}>
//         <sphereGeometry args={[1, 32, 20, 0, Math.PI * 2, 0, 0.95]} />
//         <Mat color={C.hair[1]} side={THREE.DoubleSide} />
//       </mesh>
//       {/* back + side cap, open at the front for the face */}
//       <mesh scale={[HEAD.a * 1.12, HEAD.b * 1.1, HEAD.c * 1.14]} position={[0, -0.02, -0.02]}>
//         <sphereGeometry args={[1, 32, 22, Math.PI / 2 + 1.0, Math.PI * 2 - 2.0, 0.5, 1.9]} />
//         <Mat color={C.hair[0]} side={THREE.DoubleSide} />
//       </mesh>
//       {locks.map((l, i) => (
//         <mesh key={i} geometry={l.geo} userData={{ phase: l.phase, sway: l.sway }}>
//           <Mat color={l.color} facet rough={0.7} />
//         </mesh>
//       ))}
//     </group>
//   )
// }

// /* ------------------------------------------------------------------ */
// /*  Face                                                               */
// /* ------------------------------------------------------------------ */

// const eyeZ = (x: number, y: number) => 0.0169 * Math.sqrt(Math.max(0, 1 - (x / 0.047) ** 2 - (y / 0.0432) ** 2))

// function Eye({ s }: { s: Side }) {
//   const x = s * 0.088
//   // Upper eyelid: a skin patch over the top of the eyeball, arched at the lash line.
//   const ex = (u: number) => s * -0.049 * Math.cos(Math.PI * u)
//   const lid = useGeo(() =>
//     ribbonGeo(
//       (u) => [ex(u), 0.004 + 0.044 * Math.sin(Math.PI * u)],
//       (u) => [ex(u), 0.004 + 0.03 * Math.pow(Math.sin(Math.PI * u), 0.9)],
//       20,
//       3,
//       (px, py) => eyeZ(px, py) + 0.004,
//     ),
//   )
//   const lashPts = useMemo<V3[]>(() => {
//     const pts: V3[] = []
//     for (let k = 0; k <= 8; k++) {
//       const u = k / 8
//       const px = ex(u)
//       const py = 0.004 + 0.03 * Math.pow(Math.sin(Math.PI * u), 0.9)
//       pts.push([px, py, eyeZ(px, py) + 0.005])
//     }
//     pts.push([s * 0.064, 0.013, 0.004]) // outer flick
//     return pts
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [])

//   return (
//     <group position={[x, 0, faceZ(x, 0) - 0.002]} rotation={[0, s * 0.3, 0]}>
//       <mesh scale={[1, 0.92, 0.36]}>
//         <sphereGeometry args={[0.047, 22, 16]} />
//         <Mat color={C.white} rough={0.35} />
//       </mesh>
//       {/* iris, pupil, catchlight */}
//       <mesh position={[0.004, -0.003, 0.008]} scale={[1, 1, 0.3]}>
//         <sphereGeometry args={[0.032, 20, 14]} />
//         <Mat color="#4a2a1d" rough={0.3} />
//       </mesh>
//       <mesh position={[0.004, -0.003, 0.016]} scale={[1, 1, 0.3]}>
//         <sphereGeometry args={[0.017, 16, 12]} />
//         <Mat color={C.ink} rough={0.3} />
//       </mesh>
//       <mesh position={[0.013, 0.008, 0.026]}>
//         <sphereGeometry args={[0.006, 8, 6]} />
//         <meshBasicMaterial color="#ffffff" />
//       </mesh>
//       <mesh geometry={lid}>
//         <Mat color={C.skin} side={THREE.DoubleSide} offset />
//       </mesh>
//       <Loft
//         points={lashPts}
//         radius={(t) => [0.0042 + 0.0022 * Math.sin(Math.PI * Math.min(1, t * 1.1)), 0.0042]}
//         color={C.ink}
//         radial={6}
//         segs={16}
//         cap
//       />
//     </group>
//   )
// }

// function Brow({ s, ys }: { s: Side; ys: number[] }) {
//   const pts = useMemo<V3[]>(
//     () => [0.03, 0.075, 0.12, 0.152].map((ax, i): V3 => [s * ax, ys[i], faceZ(s * ax, ys[i]) + 0.006]),
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//     [],
//   )
//   return (
//     <Loft
//       points={pts}
//       radius={(t) => [0.0085 * (1 - 0.55 * Math.pow(t, 1.5)) + 0.002, 0.005]}
//       color={C.hair[2]}
//       radial={8}
//       segs={14}
//       cap
//     />
//   )
// }

// function Glasses() {
//   return (
//     <group>
//       {[-1, 1].map((s) => {
//         const x = s * 0.088
//         const z = faceZ(x, 0) + 0.026
//         return (
//           <group key={s} position={[x, 0.004, z]} rotation={[0, s * 0.25, 0]}>
//             <mesh>
//               <torusGeometry args={[0.066, 0.0065, 10, 36]} />
//               <Mat color={C.gold} rough={0.3} metal={0.4} />
//             </mesh>
//             <mesh position={[0, 0, -0.004]}>
//               <circleGeometry args={[0.064, 28]} />
//               <Mat color="#cfe4ff" transparent opacity={0.1} />
//             </mesh>
//             <Segment from={[s * 0.064, 0.008, -0.01]} to={[s * 0.128, 0.006, -0.19]} r1={0.0048} r2={0.0048} color={C.gold} sides={6} rough={0.3} metal={0.4} />
//           </group>
//         )
//       })}
//       <mesh position={[0, 0.016, faceZ(0, 0.016) + 0.026]} rotation={[0, 0, Math.PI]}>
//         <torusGeometry args={[0.02, 0.0048, 8, 14, Math.PI]} />
//         <Mat color={C.gold} rough={0.3} metal={0.4} />
//       </mesh>
//     </group>
//   )
// }

// // Lopsided, confident grin: right corner lifts higher.
// const SM_P0: V2 = [-0.062, -0.09]
// const SM_P1: V2 = [0.076, -0.07]
// const upperLip = bez(SM_P0, [0.005, -0.108], SM_P1)
// const lowerLip = bez(SM_P0, [0.03, -0.158], SM_P1)

// function Mouth() {
//   const cavity = useGeo(() => ribbonGeo(upperLip, lowerLip, 30, 6, (x, y) => faceZ(x, y) + 0.0025))
//   const teeth = useGeo(() =>
//     ribbonGeo(
//       (u) => {
//         const p = upperLip(u)
//         return [p[0], p[1] - 0.0012]
//       },
//       (u) => {
//         const a = upperLip(u)
//         const b = lowerLip(u)
//         const k = 0.42 * Math.pow(Math.sin(Math.PI * u), 0.5)
//         return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]
//       },
//       30,
//       3,
//       (x, y) => faceZ(x, y) + 0.0038,
//     ),
//   )
//   const lipPts = (fn: (u: number) => V2, dy: number): V3[] =>
//     Array.from({ length: 9 }, (_, k): V3 => {
//       const p = fn(k / 8)
//       return [p[0], p[1] + dy, faceZ(p[0], p[1] + dy) + 0.0045]
//     })
//   const upPts = useMemo(() => lipPts(upperLip, 0), [])
//   const loPts = useMemo(() => lipPts(lowerLip, -0.0035), [])
//   return (
//     <group>
//       <mesh geometry={cavity}>
//         <Mat color={C.mouth} side={THREE.DoubleSide} offset />
//       </mesh>
//       <mesh geometry={teeth}>
//         <Mat color={C.white} side={THREE.DoubleSide} offset rough={0.4} />
//       </mesh>
//       <Loft points={upPts} radius={(t) => [0.0032 + 0.0042 * Math.sin(Math.PI * t), 0.0042]} color={C.lip} radial={8} segs={16} cap />
//       <Loft points={loPts} radius={(t) => [0.0036 + 0.0066 * Math.sin(Math.PI * t), 0.0052]} color={C.lip} radial={8} segs={16} cap />
//     </group>
//   )
// }

// function Face() {
//   const eyes = useRef<THREE.Group>(null)
//   const blushL = useGeo(() => circleOnFace(-0.135, -0.05, 0.036, 0.004))
//   const blushR = useGeo(() => circleOnFace(0.135, -0.05, 0.036, 0.004))

//   // blink
//   useFrame(({ clock }) => {
//     if (!eyes.current) return
//     const p = clock.elapsedTime % 3.7
//     eyes.current.scale.y = p > 3.56 ? 0.12 : 1
//   })

//   return (
//     <group>
//       <group ref={eyes}>
//         <Eye s={-1} />
//         <Eye s={1} />
//       </group>

//       {/* playful brows: both lifted, the left one with a scheming slant */}
//       <Brow s={-1} ys={[0.072, 0.094, 0.094, 0.082]} />
//       <Brow s={1} ys={[0.09, 0.114, 0.11, 0.092]} />

//       {/* nose: bridge comes from the head sculpt; tip + wings here */}
//       <Blob pos={[0, -0.043, faceZ(0, -0.043) + 0.007]} r={0.024} scale={[0.95, 0.8, 1.05]} color={C.skin} />
//       {[-1, 1].map((s) => (
//         <Blob key={s} pos={[s * 0.017, -0.05, faceZ(s * 0.017, -0.05) + 0.001]} r={0.013} scale={[1, 0.9, 0.9]} color={C.skin} />
//       ))}
//       {[-1, 1].map((s) => (
//         <Blob key={`n${s}`} pos={[s * 0.009, -0.058, faceZ(0, -0.058) + 0.012]} r={0.005} detail={1} color="#6a3a2a" />
//       ))}

//       {/* blush */}
//       <mesh geometry={blushL}>
//         <Mat color="#d9735f" transparent opacity={0.28} offset side={THREE.DoubleSide} />
//       </mesh>
//       <mesh geometry={blushR}>
//         <Mat color="#d9735f" transparent opacity={0.28} offset side={THREE.DoubleSide} />
//       </mesh>

//       <Mouth />

//       {/* ears */}
//       {[-1, 1].map((s) => (
//         <Blob key={s} pos={[s * 0.215, -0.01, -0.01]} r={0.042} scale={[0.5, 1, 0.75]} color={C.skin} />
//       ))}

//       <Glasses />
//     </group>
//   )
// }

// function Head() {
//   const geo = useGeo(makeHeadGeometry)
//   return (
//     <group>
//       <mesh geometry={geo}>
//         <Mat color={C.skin} rough={0.7} />
//       </mesh>
//       <Face />
//       <Hair />
//     </group>
//   )
// }

// /* ------------------------------------------------------------------ */
// /*  Arms + hands                                                       */
// /* ------------------------------------------------------------------ */

// function Hand({ s }: { s: Side }) {
//   // index → pinky, laid out front to back; hand rests on the hip with fingers curling in.
//   const fingers: [number, number][] = [
//     [0.0275, 1.0],
//     [0.01, 1.1],
//     [-0.0075, 1.04],
//     [-0.025, 0.84],
//   ]
//   return (
//     <group>
//       {/* palm + heel of the hand */}
//       <Blob pos={[-s * 0.012, -0.05, 0.002]} r={0.042} scale={[0.5, 1.1, 1.0]} color={C.skin} />
//       <Blob pos={[-s * 0.008, -0.022, 0.006]} r={0.034} scale={[0.6, 0.8, 1.0]} color={C.skin} />
//       {fingers.map(([z, k], i) => {
//         const L = 0.07 * k
//         const pts: V3[] = [
//           [-s * 0.012, -0.08, z],
//           [-s * 0.019, -0.08 - L * 0.55, z + 0.001],
//           [-s * 0.031, -0.08 - L * 0.95, z + 0.002],
//         ]
//         return <Loft key={i} points={pts} radius={(t) => [0.0098 - 0.0032 * t, 0.0092 - 0.003 * t]} color={C.skin} radial={8} segs={8} cap />
//       })}
//       {/* thumb */}
//       <Loft
//         points={[
//           [-s * 0.008, -0.035, 0.036],
//           [-s * 0.012, -0.066, 0.057],
//           [-s * 0.02, -0.092, 0.053],
//         ]}
//         radius={(t) => [0.0125 - 0.0045 * t, 0.0115 - 0.004 * t]}
//         color={C.skin}
//         radial={8}
//         segs={8}
//         cap
//       />
//     </group>
//   )
// }

// function Scrunchie() {
//   const geo = useGeo(() => {
//     const R = 0.05
//     const g = new THREE.TorusGeometry(R, 0.026, 14, 40)
//     const p = g.attributes.position
//     for (let i = 0; i < p.count; i++) {
//       const x = p.getX(i)
//       const y = p.getY(i)
//       const z = p.getZ(i)
//       const phi = Math.atan2(y, x)
//       const cx = Math.cos(phi) * R
//       const cy = Math.sin(phi) * R
//       const k = 1 + 0.2 * Math.sin(phi * 9)
//       p.setXYZ(i, cx + (x - cx) * k, cy + (y - cy) * k, z * k * 1.2)
//     }
//     weldNormals(g)
//     return g
//   })
//   return (
//     <mesh geometry={geo}>
//       <Mat color={C.jacket} rough={0.95} />
//     </mesh>
//   )
// }

// function Arm({ side }: { side: Side }) {
//   const s = side
//   const shoulder: V3 = [s * 0.27, 1.64, 0]
//   const elbow: V3 = [s * 0.53, 1.4, -0.05]
//   const wrist: V3 = [s * 0.3, 1.21, 0.11]
//   const upper: V3[] = [shoulder, [s * 0.405, 1.535, -0.04], elbow]
//   const fore: V3[] = [elbow, [s * 0.425, 1.298, 0.035], wrist]

//   // orientation + position for the wrist accessory (axis along the forearm)
//   const dir = new THREE.Vector3(...elbow).sub(new THREE.Vector3(...wrist)).normalize()
//   const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir)
//   const bandPos = new THREE.Vector3(...wrist).lerp(new THREE.Vector3(...elbow), 0.2)

//   return (
//     <group>
//       <Loft
//         points={upper}
//         radius={(t) => [0.054 - 0.012 * t + 0.006 * Math.sin(Math.PI * t), 0.05 - 0.01 * t + 0.005 * Math.sin(Math.PI * t)]}
//         color={C.skin}
//         radial={14}
//         segs={14}
//       />
//       <Loft
//         points={fore}
//         radius={(t) => {
//           const r = 0.045 - 0.012 * t + 0.008 * Math.sin(Math.PI * Math.min(1, t * 1.6))
//           return [r, r * 0.88]
//         }}
//         color={C.skin}
//         radial={14}
//         segs={14}
//       />
//       <Ball pos={shoulder} r={0.062} />
//       <Ball pos={elbow} r={0.046} />
//       {/* olecranon – the point of the elbow */}
//       <Blob pos={[elbow[0] + s * 0.012, elbow[1] - 0.004, elbow[2] - 0.03]} r={0.03} scale={[1, 1, 0.8]} color={C.skin} />

//       {/* wrist bump + hand resting on hip */}
//       <group position={wrist}>
//         <Blob pos={[0, 0.008, 0]} r={0.03} scale={[1, 0.8, 0.95]} color={C.skin} />
//         <Hand s={s} />
//       </group>

//       {s === -1 ? (
//         <group position={bandPos} quaternion={q} scale={[1, 1, 1]}>
//           <Scrunchie />
//         </group>
//       ) : (
//         // watch
//         <group position={bandPos} quaternion={q}>
//           <mesh>
//             <torusGeometry args={[0.044, 0.01, 8, 28]} />
//             <Mat color="#4b3226" />
//           </mesh>
//           <mesh position={[0, 0.047, 0]}>
//             <cylinderGeometry args={[0.033, 0.033, 0.014, 22]} />
//             <Mat color="#8a6a4a" rough={0.4} metal={0.3} />
//           </mesh>
//           <mesh position={[0, 0.056, 0]}>
//             <cylinderGeometry args={[0.025, 0.025, 0.004, 22]} />
//             <Mat color="#efe5d2" rough={0.4} />
//           </mesh>
//         </group>
//       )}
//     </group>
//   )
// }

// /* ------------------------------------------------------------------ */
// /*  Legs + shoes                                                       */
// /* ------------------------------------------------------------------ */

// function Shoe({ side }: { side: Side }) {
//   const s = side
//   // chunky rounded sole
//   const sole = useGeo(() =>
//     buildLoft(
//       [
//         [0, 0.048, -0.23],
//         [0, 0.048, 0.0],
//         [0, 0.058, 0.29],
//       ],
//       (t) => {
//         const e = endRound(t)
//         return [0.045 * e + 0.002, (0.118 + 0.014 * Math.sin(Math.PI * t)) * e + 0.004]
//       },
//       { radial: 16, segs: 22, cap: true },
//     ),
//   )
//   // upper: tall at the ankle, sloping down to a rounded toe box
//   const upper = useGeo(() =>
//     buildLoft(
//       [
//         [0, 0.19, -0.17],
//         [0, 0.165, 0.03],
//         [0, 0.12, 0.26],
//       ],
//       (t) => {
//         const e = endRound(t)
//         const h = 0.05 + 0.085 * Math.pow(1 - t, 1.2)
//         const w = 0.104 + 0.02 * Math.sin(Math.PI * t)
//         return [h * e + 0.003, w * e + 0.004]
//       },
//       { radial: 16, segs: 24, cap: true },
//     ),
//   )
//   return (
//     <group position={[s * 0.34, 0, 0.1]} rotation={[0, s * 0.3, 0]}>
//       <mesh geometry={sole}>
//         <Mat color={C.sneakerSole} />
//       </mesh>
//       <mesh geometry={upper}>
//         <Mat color={C.sneaker} rough={0.8} />
//       </mesh>
//       {/* toe cap + heel counter */}
//       <Blob pos={[0, 0.1, 0.215]} r={0.1} scale={[1.02, 0.68, 1.15]} color={C.sneakerShade} />
//       <Blob pos={[0, 0.17, -0.17]} r={0.075} scale={[1.2, 1.25, 0.7]} color={C.sneakerShade} />
//       {/* laces following the slope of the upper */}
//       {[0.07, 0.12, 0.17].map((z) => {
//         const t = (z + 0.17) / 0.43
//         const y = 0.19 - 0.07 * t + 0.05 + 0.085 * Math.pow(1 - t, 1.2) + 0.004
//         return <Segment key={z} from={[-0.056, y - 0.01, z]} to={[0.056, y - 0.01, z]} r1={0.0072} r2={0.0072} color={C.white} sides={6} />
//       })}
//     </group>
//   )
// }

// function Leg({ side }: { side: Side }) {
//   const s = side
//   const pts: V3[] = [
//     [s * 0.13, 1.12, 0.0],
//     [s * 0.2, 0.84, 0.03],
//     [s * 0.27, 0.58, 0.04],
//     [s * 0.31, 0.4, 0.025],
//     [s * 0.328, 0.29, 0.012],
//   ]
//   return (
//     <group>
//       {/* baggy denim: soft taper, drape creases, knee fold, fabric stacking above the cuff */}
//       <Loft
//         points={pts}
//         radius={(t) => [0.19 + 0.05 * Math.pow(t, 1.3), 0.18 + 0.045 * Math.pow(t, 1.3)]}
//         wobble={(t, a) =>
//           1 +
//           0.03 * Math.sin(a * 3 + 1.0 + s) * (0.4 + 0.6 * t) +
//           0.022 * Math.sin(a * 5 + t * 2.5) +
//           0.05 * Math.exp(-(((t - 0.45) / 0.1) ** 2)) * Math.max(0, Math.sin(a)) +
//           0.03 * Math.sin(t * 34) * sstep(0.62, 0.95, t) * (1 + 0.3 * Math.sin(a * 2))
//         }
//         color={C.jeans}
//         facet
//         radial={16}
//         segs={30}
//       />
//       {/* rolled cuff */}
//       <Loft
//         points={[
//           [s * 0.328, 0.325, 0.012],
//           [s * 0.329, 0.185, 0.013],
//         ]}
//         radius={(t) => [0.248 + 0.01 * Math.sin(Math.PI * t), 0.232 + 0.01 * Math.sin(Math.PI * t)]}
//         color={C.cuff}
//         facet
//         radial={20}
//         segs={4}
//         cap
//       />
//       <Shoe side={s} />
//     </group>
//   )
// }

// function Pelvis() {
//   return (
//     <group>
//       <Loft
//         points={[
//           [0, 0.96, 0],
//           [0, 1.245, 0],
//         ]}
//         radius={(t) => jeans(0.96 + t * 0.285)}
//         wobble={(t, a) => 1 + 0.02 * Math.sin(a * 4 + t * 3)}
//         color={C.jeans}
//         facet
//         radial={24}
//         segs={12}
//         cap
//       />
//       {/* waistband */}
//       <Loft
//         points={[
//           [0, 1.195, 0],
//           [0, 1.25, 0],
//         ]}
//         radius={(t) => {
//           const [rx, rz] = jeans(1.195 + t * 0.055)
//           return [rx + 0.007, rz + 0.007]
//         }}
//         color={C.jeansLight}
//         radial={24}
//         segs={3}
//       />
//       <mesh position={[0, 1.222, jeans(1.222)[1] + 0.01]} rotation={[Math.PI / 2, 0, 0]}>
//         <cylinderGeometry args={[0.02, 0.02, 0.012, 14]} />
//         <Mat color={C.gold} rough={0.35} metal={0.4} />
//       </mesh>
//     </group>
//   )
// }

// /* ------------------------------------------------------------------ */
// /*  Torso, top, jacket, bag                                            */
// /* ------------------------------------------------------------------ */

// function Torso({ topTex }: { topTex: THREE.Texture }) {
//   const [bx, bz] = torso(1.31)
//   void bx
//   return (
//     <group>
//       {/* skin: midriff, chest and back – the sleeveless top is a shell over it */}
//       <Loft
//         points={[
//           [0, 1.12, 0],
//           [0, 1.76, 0],
//         ]}
//         radius={(t) => torso(1.12 + t * 0.64)}
//         color={C.skin}
//         rough={0.7}
//         radial={30}
//         segs={28}
//         cap
//       />
//       <Blob pos={[0, 1.31, bz - 0.003]} r={0.012} scale={[1, 1.4, 0.5]} color={C.skinDark} />

//       {/* patterned sleeveless top, following the body contour */}
//       <Loft
//         points={[
//           [0, 1.42, 0],
//           [0, 1.735, 0],
//         ]}
//         radius={(t) => {
//           const [rx, rz] = torso(1.42 + t * 0.315)
//           return [rx * 1.045 + 0.004, rz * 1.05 + 0.004]
//         }}
//         wobble={(t, a) => 1 + 0.012 * Math.sin(a * 3 + t * 6)}
//         color="#ffffff"
//         map={topTex}
//         rough={0.9}
//         radial={30}
//         segs={14}
//       />

//       {/* shoulders + neck */}
//       <Loft
//         points={[
//           [-0.27, 1.64, 0],
//           [-0.13, 1.7, 0],
//           [0, 1.715, 0],
//           [0.13, 1.7, 0],
//           [0.27, 1.64, 0],
//         ]}
//         radius={(t) => [0.052 - 0.006 * Math.sin(Math.PI * t), 0.075 - 0.01 * Math.sin(Math.PI * t)]}
//         color={C.skin}
//         radial={14}
//         segs={26}
//         cap
//       />
//       <Loft
//         points={[
//           [0, 1.68, -0.005],
//           [0, 1.78, 0.005],
//           [0, 1.87, 0.02],
//         ]}
//         radius={(t) => [0.058 + 0.022 * (1 - t) ** 2, 0.056 + 0.02 * (1 - t) ** 2]}
//         color={C.skin}
//         radial={16}
//         segs={12}
//         cap
//       />
//     </group>
//   )
// }

// function Jacket() {
//   const frontZ = jeans(1.1)[1] + 0.03
//   return (
//     <group>
//       {/* tied band: gathered folds around the hips */}
//       <Loft
//         points={[
//           [0, 1.03, 0],
//           [0, 1.19, 0],
//         ]}
//         radius={(t) => {
//           const [rx, rz] = jeans(1.03 + t * 0.16)
//           return [rx + 0.03, rz + 0.03]
//         }}
//         wobble={(t, a) => 1 + 0.035 * Math.sin(a * 7 + t * 4) + 0.02 * Math.sin(a * 3)}
//         color={C.jacket}
//         rough={0.95}
//         facet
//         radial={28}
//         segs={8}
//       />
//       {/* body of the jacket hanging behind */}
//       <Loft
//         points={[
//           [-0.1, 1.1, -0.2],
//           [-0.1, 0.9, -0.235],
//           [-0.1, 0.66, -0.225],
//         ]}
//         radius={(t) => [0.17 + 0.1 * t, 0.04]}
//         wobble={(t, a) => 1 + 0.06 * Math.sin(a * 4 + t * 3)}
//         color={C.jacketDark}
//         rough={0.95}
//         facet
//         radial={14}
//         segs={14}
//         cap
//       />
//       {/* knot */}
//       <Blob pos={[0.03, 1.1, frontZ + 0.005]} r={0.075} detail={2} scale={[1.2, 1, 0.8]} color={C.jacket} rough={0.95} />
//       <Blob pos={[-0.03, 1.12, frontZ + 0.015]} r={0.045} detail={2} scale={[1.3, 0.8, 0.8]} color={C.jacketDark} rough={0.95} />
//       {/* dangling sleeves – flattened cloth tubes with a gentle S-curve */}
//       <Loft
//         points={[
//           [0.0, 1.09, 0.23],
//           [-0.05, 0.99, 0.225],
//           [-0.09, 0.88, 0.215],
//           [-0.11, 0.77, 0.205],
//         ]}
//         radius={(t) => [0.058 - 0.014 * t, 0.036 - 0.006 * t]}
//         wobble={(t, a) => 1 + 0.06 * Math.sin(a * 3 + t * 5)}
//         color={C.jacket}
//         rough={0.95}
//         facet
//         radial={12}
//         segs={16}
//         cap
//       />
//       <Loft
//         points={[
//           [0.06, 1.09, 0.23],
//           [0.1, 1.0, 0.222],
//           [0.14, 0.9, 0.212],
//           [0.16, 0.8, 0.2],
//         ]}
//         radius={(t) => [0.056 - 0.014 * t, 0.036 - 0.006 * t]}
//         wobble={(t, a) => 1 + 0.06 * Math.sin(a * 3 + t * 5 + 1)}
//         color={C.jacketDark}
//         rough={0.95}
//         facet
//         radial={12}
//         segs={16}
//         cap
//       />
//       {/* creases pulling into the knot */}
//       <Blob pos={[-0.18, 1.07, 0.16]} r={0.06} scale={[1.2, 0.5, 0.8]} color={C.jacketDark} />
//       <Blob pos={[0.22, 1.06, 0.15]} r={0.06} scale={[1.2, 0.5, 0.8]} color={C.jacketDark} />
//     </group>
//   )
// }

// function Charm() {
//   const petals = [0, 1, 2, 3, 4, 5].map((i) => (i / 6) * Math.PI * 2)
//   return (
//     <group>
//       <Segment from={[0, 0, 0]} to={[0, -0.075, 0]} r1={0.004} r2={0.004} color="#7d5b3a" sides={5} />
//       {/* cream flower */}
//       <group position={[-0.04, -0.1, 0.01]}>
//         {petals.map((a) => (
//           <Blob key={a} pos={[Math.cos(a) * 0.024, Math.sin(a) * 0.024, 0]} r={0.017} detail={1} scale={[1, 1, 0.7]} color="#d6e6e4" />
//         ))}
//         <Blob r={0.014} detail={1} color="#e9b44c" pos={[0, 0, 0.006]} />
//       </group>
//       {/* little orange flower */}
//       <group position={[0.02, -0.065, 0.015]}>
//         {petals.slice(0, 5).map((a) => (
//           <Blob key={a} pos={[Math.cos(a) * 0.016, Math.sin(a) * 0.016, 0]} r={0.012} detail={1} scale={[1, 1, 0.7]} color="#dd6b45" />
//         ))}
//         <Blob r={0.009} detail={1} color="#f2d27a" pos={[0, 0, 0.005]} />
//       </group>
//       {/* tiny critter */}
//       <group position={[0.035, -0.14, 0.01]}>
//         <Blob r={0.05} detail={2} scale={[1.05, 0.9, 0.9]} color="#e8c7a2" />
//         <Blob pos={[-0.03, 0.04, 0]} r={0.016} detail={1} color="#e8c7a2" />
//         <Blob pos={[0.03, 0.04, 0]} r={0.016} detail={1} color="#e8c7a2" />
//         <mesh position={[-0.017, 0.006, 0.043]}>
//           <sphereGeometry args={[0.006, 8, 6]} />
//           <meshBasicMaterial color={C.ink} />
//         </mesh>
//         <mesh position={[0.017, 0.006, 0.043]}>
//           <sphereGeometry args={[0.006, 8, 6]} />
//           <meshBasicMaterial color={C.ink} />
//         </mesh>
//         <Blob pos={[0, -0.014, 0.046]} r={0.007} detail={1} color="#d58f7e" />
//       </group>
//     </group>
//   )
// }

// const STRAP_TOP: V3 = [0.17, 1.745, 0.02]
// const BAG_ATTACH: V3 = [-0.37, 1.12, 0.03]

// function CrossbodyBag() {
//   const bag = useRef<THREE.Group>(null)
//   const charm = useRef<THREE.Group>(null)

//   // One ribbon: from the bag, up the front of the body, over the shoulder, down the back, back to the bag.
//   const strapPath = useMemo<V3[]>(() => {
//     const front = (x: number, y: number): V3 => {
//       const [rx, rz] = torso(y)
//       return [x, y, rz * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2)) + 0.03]
//     }
//     const back = (x: number, y: number): V3 => {
//       const [rx, rz] = torso(y)
//       return [x, y, -(rz * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2)) + 0.03)]
//     }
//     return [
//       BAG_ATTACH,
//       [-0.335, 1.15, 0.04],
//       [-0.27, 1.21, 0.07],
//       front(-0.19, 1.28),
//       front(-0.1, 1.4),
//       front(-0.02, 1.5),
//       front(0.06, 1.6),
//       front(0.12, 1.68),
//       STRAP_TOP,
//       back(0.1, 1.68),
//       back(0.0, 1.58),
//       back(-0.08, 1.46),
//       back(-0.17, 1.34),
//       [-0.27, 1.23, -0.06],
//       [-0.335, 1.15, -0.03],
//       BAG_ATTACH,
//     ]
//   }, [])

//   const body = useGeo(() => roundedBox(0.28, 0.22, 0.12, 0.03))
//   const flap = useGeo(() => roundedBox(0.29, 0.12, 0.134, 0.028))
//   const lip = useGeo(() => roundedBox(0.285, 0.05, 0.02, 0.01))
//   const buckle = useGeo(() => roundedBox(0.04, 0.05, 0.02, 0.008, 3))
//   const pocket = useGeo(() => roundedBox(0.2, 0.09, 0.03, 0.012, 4))

//   useFrame(({ clock }) => {
//     const t = clock.elapsedTime
//     if (bag.current) bag.current.rotation.z = Math.sin(t * 1.4 + 1) * 0.03
//     if (charm.current) charm.current.rotation.z = Math.sin(t * 2.2) * 0.14
//   })

//   return (
//     <group>
//       <Loft points={strapPath} radius={() => [0.021, 0.0065]} color={C.strap} radial={10} segs={90} />

//       <group ref={bag} position={BAG_ATTACH} rotation={[0, -0.3, 0]}>
//         <mesh geometry={body} position={[0, -0.13, 0]}>
//           <Mat color={C.bag} rough={0.85} />
//         </mesh>
//         {/* flap */}
//         <mesh geometry={flap} position={[0, -0.045, 0.006]}>
//           <Mat color={C.bagDark} rough={0.85} />
//         </mesh>
//         <mesh geometry={lip} position={[0, -0.12, 0.068]} rotation={[0.2, 0, 0]}>
//           <Mat color={C.bagDark} rough={0.85} />
//         </mesh>
//         {/* buckle + front pocket */}
//         <mesh geometry={buckle} position={[0, -0.1, 0.078]}>
//           <Mat color="#8e6b46" rough={0.45} metal={0.2} />
//         </mesh>
//         <mesh geometry={pocket} position={[0, -0.2, 0.065]}>
//           <Mat color={C.bag} rough={0.85} />
//         </mesh>
//         <group ref={charm} position={[-0.07, -0.235, 0.075]}>
//           <Charm />
//         </group>
//       </group>
//     </group>
//   )
// }

// /* ------------------------------------------------------------------ */
// /*  Iris                                                               */
// /* ------------------------------------------------------------------ */

// export interface IrisCharacterProps {
//   position?: V3
//   rotation?: V3
//   /** Overall size multiplier. 1 ≈ 2 world units tall. */
//   size?: number
// }

// export function IrisCharacter({ position = [0, 0, 0], rotation = [0, 0, 0], size = 0.85 }: IrisCharacterProps) {
//   const root = useRef<THREE.Group>(null)
//   const pivot = useRef<THREE.Group>(null)
//   const head = useRef<THREE.Group>(null)
//   const chest = useRef<THREE.Group>(null)

//   const topTex = useMemo(() => makeIkatTexture(), [])
//   useEffect(() => () => topTex.dispose(), [topTex])

//   // subtle idle: bouncy weight shift, breathing, head sway
//   useFrame(({ clock }) => {
//     const t = clock.elapsedTime
//     if (root.current) {
//       root.current.rotation.z = Math.sin(t * 0.8) * 0.012
//     }
//     if (pivot.current) {
//       pivot.current.position.y = 1.1 + Math.sin(t * 2.4) * 0.008
//       pivot.current.rotation.x = LEAN + Math.sin(t * 1.2) * 0.01
//     }
//     if (head.current) {
//       head.current.rotation.z = 0.07 + Math.sin(t * 1.1) * 0.025
//       head.current.rotation.y = 0.1 + Math.sin(t * 0.6) * 0.06
//       head.current.rotation.x = -0.02 + Math.sin(t * 1.7) * 0.012
//     }
//     if (chest.current) {
//       const b = 1 + Math.sin(t * 1.6) * 0.01
//       chest.current.scale.set(b, 1, b)
//     }
//   })

//   return (
//     <group position={position} rotation={rotation} scale={size}>
//       <group ref={root}>
//         <Leg side={-1} />
//         <Leg side={1} />
//         <Pelvis />
//         <Jacket />

//         {/* upper body leans forward from the hips */}
//         <group ref={pivot} position={[0, 1.1, 0]} rotation={[LEAN, 0, 0]}>
//           <group position={[0, -1.1, 0]}>
//             <group ref={chest}>
//               <Torso topTex={topTex} />
//             </group>
//             <Arm side={-1} />
//             <Arm side={1} />
//             <CrossbodyBag />
//             <group ref={head} position={[0, 2.0, 0]} scale={0.96}>
//               <Head />
//             </group>
//           </group>
//         </group>
//       </group>
//     </group>
//   )
// }

// export default IrisCharacter
