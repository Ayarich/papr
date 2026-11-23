"use client";
import { useEffect, useRef, useState } from "react";

/**
 * The animated background on the home page, made with Three.js:
 * a field of points that rolls like terrain (or a page of data) and ripples where you move the mouse.
 * It follows light/dark mode, pauses when scrolled out of view, and stays still if the device asks for reduced motion.
 */
export default function HeroScene() {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      const el = ref.current;
      if (disposed || !el) return;

      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
      } catch {
        return; // No WebGL: the hero keeps its plain background.
      }
      const pr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(pr);
      renderer.setClearColor(0x000000, 0);
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
      camera.position.set(0, 7.5, 24);
      camera.lookAt(0, 0, -6);

      // A grid of points on a flat plane; the shader below lifts them into waves.
      const COLS = 180, ROWS = 90, GAP = 0.42;
      const positions = new Float32Array(COLS * ROWS * 3);
      let k = 0;
      for (let j = 0; j < ROWS; j++) {
        for (let i = 0; i < COLS; i++) {
          positions[k++] = (i - COLS / 2) * GAP + 6; // shift right so it sits behind the empty side of the hero
          positions[k++] = 0;
          positions[k++] = (j - ROWS / 2) * GAP - 4;
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

      const uniforms = {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(999, 999) },
        uColor: { value: new THREE.Color("#2B3036") },
        uOpacity: { value: 0.55 },
        uPR: { value: pr },
      };
      const material = new THREE.ShaderMaterial({
        uniforms,
        transparent: true,
        depthWrite: false,
        vertexShader: /* glsl */ `
          uniform float uTime; uniform vec2 uMouse; uniform float uPR;
          varying float vAlpha; varying float vHeight;
          void main() {
            vec3 p = position;
            float w = sin(p.x * 0.32 + uTime * 0.55) * 0.75
                    + cos(p.z * 0.42 + uTime * 0.38) * 0.65
                    + sin((p.x + p.z) * 0.16 + uTime * 0.27) * 1.1;
            float d = distance(p.xz, uMouse);
            w += exp(-d * d * 0.035) * sin(d * 1.3 - uTime * 3.0) * 1.1;   // ripple under the pointer
            p.y = w;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = (1.6 + (w + 2.0) * 0.55) * uPR * (24.0 / -mv.z);
            vAlpha = smoothstep(70.0, 14.0, -mv.z) * smoothstep(-34.0, -18.0, p.x - 6.0);
            vHeight = w;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor; uniform float uOpacity;
          varying float vAlpha; varying float vHeight;
          void main() {
            float r = length(gl_PointCoord - 0.5);
            if (r > 0.5) discard;
            float a = smoothstep(0.5, 0.05, r) * vAlpha * uOpacity * (0.55 + 0.45 * smoothstep(-2.0, 2.5, vHeight));
            gl_FragColor = vec4(uColor, a);
          }`,
      });
      const points = new THREE.Points(geometry, material);
      scene.add(points);

      // Colours come from the CSS theme variables, so light/dark mode just works.
      const applyTheme = () => {
        const cs = getComputedStyle(document.documentElement);
        uniforms.uColor.value.set(cs.getPropertyValue("--particle").trim() || "#2B3036");
        uniforms.uOpacity.value = parseFloat(cs.getPropertyValue("--particle-opacity")) || 0.6;
      };
      applyTheme();
      const themeObs = new MutationObserver(applyTheme);
      themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", applyTheme);

      const resize = () => {
        const w = el.clientWidth, h = el.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        // On narrow screens pull the camera back so the waves still fill the view
        camera.position.z = w < 700 ? 30 : 24;
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(el);

      // Mouse position projected onto the wave plane
      const raycaster = new THREE.Raycaster();
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const hit = new THREE.Vector3();
      const target = new THREE.Vector2(999, 999);
      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        if (e.clientY > r.bottom) return;
        const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        if (raycaster.ray.intersectPlane(plane, hit)) target.set(hit.x, hit.z);
      };
      window.addEventListener("pointermove", onMove, { passive: true });

      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let visible = true;
      const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
      io.observe(el);

      const clock = new THREE.Clock();
      let raf = 0;
      const frame = () => {
        raf = requestAnimationFrame(frame);
        if (!visible || document.hidden) return;
        const t = clock.getElapsedTime();
        uniforms.uTime.value = t;
        uniforms.uMouse.value.lerp(target, 0.06);
        camera.position.x = Math.sin(t * 0.08) * 1.6;
        camera.lookAt(0, 0, -6);
        renderer.render(scene, camera);
      };
      if (still) {
        uniforms.uTime.value = 4;
        renderer.render(scene, camera);
      } else {
        frame();
      }
      setReady(true);

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", onMove);
        mq.removeEventListener("change", applyTheme);
        themeObs.disconnect(); ro.disconnect(); io.disconnect();
        geometry.dispose(); material.dispose(); renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => { disposed = true; cleanup(); };
  }, []);

  return <div ref={ref} className={`hero-canvas${ready ? " ready" : ""}`} aria-hidden="true" />;
}
