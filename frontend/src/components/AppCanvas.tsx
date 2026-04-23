import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const N = 45
const EMERALD = new THREE.Color(0x34d399)
const CYAN = new THREE.Color(0x06b6d4)

export function AppCanvas() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(el.offsetWidth, el.offsetHeight)
    renderer.setClearColor(0x000000, 0)
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, el.offsetWidth / el.offsetHeight, 1, 2000)
    camera.position.set(0, 0, 400)

    const positions = new Float32Array(N * 3)
    const colors = new Float32Array(N * 3)
    const vels: [number, number, number][] = []

    for (let i = 0; i < N; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 900
      positions[i * 3 + 1] = (Math.random() - 0.5) * 600
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200

      vels.push([
        (Math.random() - 0.5) * 0.22,
        (Math.random() - 0.5) * 0.22,
        (Math.random() - 0.5) * 0.08,
      ])

      const c = Math.random() > 0.3 ? EMERALD : CYAN
      colors[i * 3]     = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }

    const ptGeo = new THREE.BufferGeometry()
    ptGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    ptGeo.setAttribute('color',    new THREE.BufferAttribute(colors, 3))

    const ptMat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
    })

    const points = new THREE.Points(ptGeo, ptMat)
    scene.add(points)

    // Sparse connection lines
    const maxLines = N * (N - 1) / 2
    const lineBuf = new Float32Array(maxLines * 6)
    const lineGeo = new THREE.BufferGeometry()
    const linePosAttr = new THREE.BufferAttribute(lineBuf, 3)
    linePosAttr.setUsage(THREE.DynamicDrawUsage)
    lineGeo.setAttribute('position', linePosAttr)

    const lineMat = new THREE.LineBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.07,
    })
    const lineSegs = new THREE.LineSegments(lineGeo, lineMat)
    scene.add(lineSegs)

    const mouse = { x: 0, y: 0 }
    const onMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth  - 0.5) * 2
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', onMouseMove)

    const onResize = () => {
      camera.aspect = el.offsetWidth / el.offsetHeight
      camera.updateProjectionMatrix()
      renderer.setSize(el.offsetWidth, el.offsetHeight)
    }
    window.addEventListener('resize', onResize)

    const THRESHOLD = 160

    let raf: number
    function tick() {
      raf = requestAnimationFrame(tick)

      const pos = ptGeo.attributes.position.array as Float32Array
      for (let i = 0; i < N; i++) {
        pos[i * 3]     += vels[i][0]
        pos[i * 3 + 1] += vels[i][1]
        pos[i * 3 + 2] += vels[i][2]
        if (Math.abs(pos[i * 3])     > 450) vels[i][0] *= -1
        if (Math.abs(pos[i * 3 + 1]) > 300) vels[i][1] *= -1
        if (Math.abs(pos[i * 3 + 2]) > 100) vels[i][2] *= -1
      }
      ptGeo.attributes.position.needsUpdate = true

      let seg = 0
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = pos[i * 3]     - pos[j * 3]
          const dy = pos[i * 3 + 1] - pos[j * 3 + 1]
          const dz = pos[i * 3 + 2] - pos[j * 3 + 2]
          if (dx * dx + dy * dy + dz * dz < THRESHOLD * THRESHOLD) {
            lineBuf[seg++] = pos[i * 3];     lineBuf[seg++] = pos[i * 3 + 1]; lineBuf[seg++] = pos[i * 3 + 2]
            lineBuf[seg++] = pos[j * 3];     lineBuf[seg++] = pos[j * 3 + 1]; lineBuf[seg++] = pos[j * 3 + 2]
          }
        }
      }
      lineGeo.setDrawRange(0, seg / 3)
      linePosAttr.needsUpdate = true

      camera.position.x += (mouse.x * 15 - camera.position.x) * 0.015
      camera.position.y += (-mouse.y * 10 - camera.position.y) * 0.015
      camera.lookAt(scene.position)

      points.rotation.y   += 0.0004
      lineSegs.rotation.y += 0.0004

      renderer.render(scene, camera)
    }

    tick()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      ptGeo.dispose()
      ptMat.dispose()
      lineGeo.dispose()
      lineMat.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.35, zIndex: -1 }}
    />
  )
}
