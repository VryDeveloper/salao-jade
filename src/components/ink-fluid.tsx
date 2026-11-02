"use client";

import { useEffect, useRef } from "react";

/**
 * "O chá em infusão": simulação de fluido (stable fluids) em WebGL2. Gotas de chá caem na água escura e
 * se desfazem em redemoinhos; o ponteiro mexe a água. Ocupa o pai inteiro, que precisa de `relative`.
 *
 * - Sem WebGL2 (ou sem render em float), não desenha nada: a arte estática por baixo continua.
 * - Movimento reduzido: simula algumas gotas, desenha um quadro parado e não anima.
 * - Pausa fora da tela e com a aba escondida.
 */
export function InkFluid({ background = "#1a1512" }: { background?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    let sim: ReturnType<typeof createSimulation> = null;
    try {
      sim = createSimulation(canvas, hexToRgb(background));
    } catch {
      sim = null; // driver recusou um shader: melhor arte estática que tela quebrada
    }
    if (!sim) return; // sem suporte: fica a arte estática

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let visible = true;
    let frame = 0;
    let last = performance.now();
    let nextDrop = 0;

    const resize = () => sim.resize(host.clientWidth, host.clientHeight);
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    if (reduced) {
      // Um quadro parado já "em infusão": algumas gotas, simuladas sem mostrar o caminho
      for (let i = 0; i < 4; i++) sim.drop();
      for (let i = 0; i < 90; i++) sim.step(1 / 60);
      sim.render();
      return () => {
        ro.disconnect();
        sim.dispose();
      };
    }

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      if (now > nextDrop) {
        sim.drop();
        nextDrop = now + 2200 + Math.random() * 1600;
      }
      sim.step(dt);
      sim.render();
      frame = requestAnimationFrame(loop);
    };
    const start = () => {
      if (frame || !visible || document.hidden) return;
      last = performance.now();
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(host);
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);

    // O ponteiro mexe a água: velocidade na direção do movimento, um fio de tinta no caminho
    let prev: { x: number; y: number } | null = null;
    const onMove = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1 - (e.clientY - rect.top) / rect.height;
      if (prev) sim.stir(x, y, x - prev.x, y - prev.y);
      prev = { x, y };
    };
    const onLeave = () => (prev = null);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);

    sim.drop();
    start();
    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      sim.dispose();
    };
  }, [background]);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />;
}

/* ---------- simulação ---------- */

// Cores do salão: cinábrio, dourado e âmbar de chá. Baixas porque a tinta se acumula (mistura aditiva).
const INKS: [number, number, number][] = [
  [0.7, 0.23, 0.18],
  [0.79, 0.64, 0.36],
  [0.55, 0.3, 0.12],
];
const SIM_RES = 128;
const DYE_RES = 640;
const DYE_DISSIPATION = 0.45; // a tinta some em poucos segundos: bem abaixo disso ela se acumula e cobre a tela
const VELOCITY_DISSIPATION = 0.3;
const PRESSURE_ITERATIONS = 20;
const CURL = 14; // redemoinhos: o que faz a tinta "abrir" em fios

const VERT = `#version 300 es
precision highp float;
in vec2 aPosition;
out vec2 vUv; out vec2 vL; out vec2 vR; out vec2 vT; out vec2 vB;
uniform vec2 texelSize;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  vL = vUv - vec2(texelSize.x, 0.0); vR = vUv + vec2(texelSize.x, 0.0);
  vT = vUv + vec2(0.0, texelSize.y); vB = vUv - vec2(0.0, texelSize.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const HEAD = `#version 300 es
precision highp float; precision highp sampler2D;
in vec2 vUv; in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB;
out vec4 o;
`;

const FRAG = {
  splat: `${HEAD}
uniform sampler2D uTarget; uniform float aspect; uniform vec3 color; uniform vec2 point; uniform float radius;
void main() {
  vec2 p = vUv - point; p.x *= aspect;
  o = vec4(texture(uTarget, vUv).xyz + exp(-dot(p, p) / radius) * color, 1.0);
}`,
  advect: `${HEAD}
uniform sampler2D uVelocity; uniform sampler2D uSource; uniform vec2 velTexel; uniform float dt; uniform float dissipation;
void main() {
  vec2 coord = vUv - dt * texture(uVelocity, vUv).xy * velTexel;
  o = texture(uSource, coord) / (1.0 + dissipation * dt);
}`,
  divergence: `${HEAD}
uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).x, R = texture(uVelocity, vR).x;
  float T = texture(uVelocity, vT).y, B = texture(uVelocity, vB).y;
  vec2 C = texture(uVelocity, vUv).xy;
  if (vL.x < 0.0) L = -C.x; if (vR.x > 1.0) R = -C.x;
  if (vT.y > 1.0) T = -C.y; if (vB.y < 0.0) B = -C.y;
  o = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`,
  curl: `${HEAD}
uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).y, R = texture(uVelocity, vR).y;
  float T = texture(uVelocity, vT).x, B = texture(uVelocity, vB).x;
  o = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`,
  vorticity: `${HEAD}
uniform sampler2D uVelocity; uniform sampler2D uCurl; uniform float curl; uniform float dt;
void main() {
  float L = texture(uCurl, vL).x, R = texture(uCurl, vR).x;
  float T = texture(uCurl, vT).x, B = texture(uCurl, vB).x, C = texture(uCurl, vUv).x;
  vec2 f = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  f /= length(f) + 0.0001; f *= curl * C; f.y *= -1.0;
  o = vec4(clamp(texture(uVelocity, vUv).xy + f * dt, -1000.0, 1000.0), 0.0, 1.0);
}`,
  pressure: `${HEAD}
uniform sampler2D uPressure; uniform sampler2D uDivergence;
void main() {
  float L = texture(uPressure, vL).x, R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x, B = texture(uPressure, vB).x;
  o = vec4((L + R + B + T - texture(uDivergence, vUv).x) * 0.25, 0.0, 0.0, 1.0);
}`,
  gradient: `${HEAD}
uniform sampler2D uPressure; uniform sampler2D uVelocity;
void main() {
  float L = texture(uPressure, vL).x, R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x, B = texture(uPressure, vB).x;
  o = vec4(texture(uVelocity, vUv).xy - vec2(R - L, T - B), 0.0, 1.0);
}`,
  fade: `${HEAD}
uniform sampler2D uTexture; uniform float value;
void main() { o = value * texture(uTexture, vUv); }`,
  display: `${HEAD}
uniform sampler2D uTexture; uniform vec3 bg; uniform float aspect;
void main() {
  // O centro, onde ficam título e botões, fica mais calmo: a tinta vive nas bordas
  vec2 d = (vUv - 0.5) * vec2(aspect, 1.0);
  float calm = mix(0.35, 1.0, smoothstep(0.12, 0.62, length(d)));
  vec3 c = bg + texture(uTexture, vUv).rgb * calm;
  o = vec4(c / (1.0 + max(c - 0.85, 0.0)), 1.0); // segura o brilho onde a tinta acumula
}`,
};

type Program = { use: () => void; u: (name: string) => WebGLUniformLocation | null };
type Target = { fbo: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number };
type Pair = { read: Target; write: Target; swap: () => void };

function createSimulation(canvas: HTMLCanvasElement, bg: [number, number, number]) {
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, preserveDrawingBuffer: false });
  // shortcut: exige WebGL2 + render em float (presente em todo navegador atual); sem isso fica a arte estática
  if (!gl || gl.isContextLost() || !gl.getExtension("EXT_color_buffer_float")) return null;

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
    return s;
  };
  const vert = compile(gl.VERTEX_SHADER, VERT);
  const program = (src: string): Program => {
    const p = gl.createProgram()!;
    gl.attachShader(p, vert);
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, src));
    gl.bindAttribLocation(p, 0, "aPosition");
    gl.linkProgram(p);
    const cache = new Map<string, WebGLUniformLocation | null>();
    return {
      use: () => gl.useProgram(p),
      u: (name) => (cache.has(name) ? cache.get(name)! : (cache.set(name, gl.getUniformLocation(p, name)), cache.get(name)!)),
    };
  };
  let P: Record<keyof typeof FRAG, Program>;
  try {
    P = Object.fromEntries(Object.entries(FRAG).map(([k, src]) => [k, program(src)])) as typeof P;
  } catch {
    return null;
  }

  // Um retângulo que cobre a tela inteira; cada passo é "desenhar o quadro" com um shader diferente
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);

  const target = (w: number, h: number): Target => {
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { fbo, tex, w, h };
  };
  const pair = (w: number, h: number): Pair => {
    const p = { read: target(w, h), write: target(w, h), swap: () => ([p.read, p.write] = [p.write, p.read]) };
    return p;
  };
  const free = (...ts: Target[]) =>
    ts.forEach((t) => {
      gl.deleteTexture(t.tex);
      gl.deleteFramebuffer(t.fbo);
    });

  const bind = (unit: number, t: Target) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t.tex);
    return unit;
  };
  const draw = (out: Target | null) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, out ? out.fbo : null);
    gl.viewport(0, 0, out ? out.w : gl.drawingBufferWidth, out ? out.h : gl.drawingBufferHeight);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  };

  let velocity: Pair, dye: Pair, pressure: Pair, divergence: Target, curl: Target;
  let aspect = 1;
  const allocate = () => {
    const size = (res: number) =>
      aspect >= 1 ? [Math.round(res * aspect), res] : [res, Math.round(res / aspect)];
    const [sw, sh] = size(SIM_RES);
    const [dw, dh] = size(DYE_RES);
    velocity = pair(sw, sh);
    pressure = pair(sw, sh);
    divergence = target(sw, sh);
    curl = target(sw, sh);
    dye = pair(dw, dh);
  };
  const release = () => {
    if (!velocity) return;
    free(velocity.read, velocity.write, pressure.read, pressure.write, divergence, curl, dye.read, dye.write);
  };

  const splat = (x: number, y: number, dx: number, dy: number, color: [number, number, number], radius: number) => {
    P.splat.use();
    gl.uniform1f(P.splat.u("aspect"), aspect);
    gl.uniform2f(P.splat.u("point"), x, y);
    gl.uniform1f(P.splat.u("radius"), (radius / 100) * Math.max(aspect, 1));
    gl.uniform1i(P.splat.u("uTarget"), bind(0, velocity.read));
    gl.uniform3f(P.splat.u("color"), dx, dy, 0);
    draw(velocity.write);
    velocity.swap();
    gl.uniform1i(P.splat.u("uTarget"), bind(0, dye.read));
    gl.uniform3f(P.splat.u("color"), ...color);
    draw(dye.write);
    dye.swap();
  };

  const texel = (t: Target) => [1 / t.w, 1 / t.h] as const;

  return {
    resize(width: number, height: number) {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.round(width * dpr));
      const h = Math.max(1, Math.round(height * dpr));
      if (canvas.width === w && canvas.height === h && velocity) return;
      canvas.width = w;
      canvas.height = h;
      aspect = w / h;
      release();
      allocate();
    },

    /** Uma gota de chá caindo na água: afunda e se abre. */
    drop() {
      const ink = INKS[Math.floor(Math.random() * INKS.length)];
      const strength = 0.36 + Math.random() * 0.2;
      splat(
        0.1 + Math.random() * 0.8,
        0.45 + Math.random() * 0.45,
        (Math.random() - 0.5) * 220,
        -(260 + Math.random() * 380),
        [ink[0] * strength, ink[1] * strength, ink[2] * strength],
        0.25,
      );
    },

    /** O ponteiro passando pela água (coordenadas 0–1, y para cima). */
    stir(x: number, y: number, dx: number, dy: number) {
      // Mexer quase não adiciona tinta: só move a que já está na água
      const ink = INKS[0];
      splat(x, y, dx * 4200, dy * 4200, [ink[0] * 0.018, ink[1] * 0.018, ink[2] * 0.018], 0.12);
    },

    step(dt: number) {
      gl.disable(gl.BLEND);
      const vt = texel(velocity.read);

      P.curl.use();
      gl.uniform2f(P.curl.u("texelSize"), ...vt);
      gl.uniform1i(P.curl.u("uVelocity"), bind(0, velocity.read));
      draw(curl);

      P.vorticity.use();
      gl.uniform2f(P.vorticity.u("texelSize"), ...vt);
      gl.uniform1i(P.vorticity.u("uVelocity"), bind(0, velocity.read));
      gl.uniform1i(P.vorticity.u("uCurl"), bind(1, curl));
      gl.uniform1f(P.vorticity.u("curl"), CURL);
      gl.uniform1f(P.vorticity.u("dt"), dt);
      draw(velocity.write);
      velocity.swap();

      P.divergence.use();
      gl.uniform2f(P.divergence.u("texelSize"), ...vt);
      gl.uniform1i(P.divergence.u("uVelocity"), bind(0, velocity.read));
      draw(divergence);

      P.fade.use();
      gl.uniform1i(P.fade.u("uTexture"), bind(0, pressure.read));
      gl.uniform1f(P.fade.u("value"), 0.8);
      draw(pressure.write);
      pressure.swap();

      P.pressure.use();
      gl.uniform2f(P.pressure.u("texelSize"), ...vt);
      gl.uniform1i(P.pressure.u("uDivergence"), bind(0, divergence));
      for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
        gl.uniform1i(P.pressure.u("uPressure"), bind(1, pressure.read));
        draw(pressure.write);
        pressure.swap();
      }

      P.gradient.use();
      gl.uniform2f(P.gradient.u("texelSize"), ...vt);
      gl.uniform1i(P.gradient.u("uPressure"), bind(0, pressure.read));
      gl.uniform1i(P.gradient.u("uVelocity"), bind(1, velocity.read));
      draw(velocity.write);
      velocity.swap();

      P.advect.use();
      gl.uniform2f(P.advect.u("texelSize"), ...vt);
      gl.uniform2f(P.advect.u("velTexel"), ...vt);
      gl.uniform1f(P.advect.u("dt"), dt);
      gl.uniform1i(P.advect.u("uVelocity"), bind(0, velocity.read));
      gl.uniform1i(P.advect.u("uSource"), bind(0, velocity.read));
      gl.uniform1f(P.advect.u("dissipation"), VELOCITY_DISSIPATION);
      draw(velocity.write);
      velocity.swap();

      gl.uniform2f(P.advect.u("texelSize"), ...texel(dye.read));
      gl.uniform1i(P.advect.u("uVelocity"), bind(0, velocity.read));
      gl.uniform1i(P.advect.u("uSource"), bind(1, dye.read));
      gl.uniform1f(P.advect.u("dissipation"), DYE_DISSIPATION);
      draw(dye.write);
      dye.swap();
    },

    render() {
      P.display.use();
      gl.uniform2f(P.display.u("texelSize"), 1 / gl.drawingBufferWidth, 1 / gl.drawingBufferHeight);
      gl.uniform3f(P.display.u("bg"), ...bg);
      gl.uniform1f(P.display.u("aspect"), aspect);
      gl.uniform1i(P.display.u("uTexture"), bind(0, dye.read));
      draw(null);
    },

    // Sem loseContext(): no dev o React monta duas vezes o mesmo canvas, e um contexto perdido não volta
    dispose() {
      release();
    },
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
