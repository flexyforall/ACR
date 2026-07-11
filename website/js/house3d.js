/* ============================================================
   CEDUR — depth-parallax renderer for the hero building.
   Renders the house cutout + its depth map through a tiny WebGL
   shader: pixels shift along the depth field as the tilt changes,
   which reads as a subtle 3D rotation. The page drives tilt via
   window.__houseTilt(rx, ry); falls back to the plain <img> when
   WebGL is unavailable.
   ============================================================ */

(() => {
  'use strict';

  const holder = document.getElementById('building');
  const img = document.getElementById('buildingImg');
  if (!holder || !img) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'building-gl';
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
  if (!gl) return; // keep the <img> fallback

  const VS = `
    attribute vec2 p;
    varying vec2 v;
    void main() {
      v = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5);
      gl_Position = vec4(p, 0.0, 1.0);
    }`;
  // single-tap depth displacement — enough for small tilts
  const FS = `
    precision mediump float;
    varying vec2 v;
    uniform sampler2D uCol;
    uniform sampler2D uDep;
    uniform vec2 uTilt;   /* radians-ish tilt, x = yaw, y = pitch */
    void main() {
      float d = texture2D(uDep, v).r - 0.5;
      vec2 off = uTilt * d;
      vec4 c = texture2D(uCol, v + off);
      /* fade the displaced sample near the uv border to avoid streaks */
      vec2 b = smoothstep(vec2(0.0), vec2(0.015), v + off) *
               (vec2(1.0) - smoothstep(vec2(0.985), vec2(1.0), v + off));
      gl_FragColor = vec4(c.rgb, c.a * b.x * b.y);
    }`;

  function shader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uTilt = gl.getUniformLocation(prog, 'uTilt');
  gl.uniform1i(gl.getUniformLocation(prog, 'uCol'), 0);
  gl.uniform1i(gl.getUniformLocation(prog, 'uDep'), 1);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);

  function texture(unit, image) {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  const load = src => new Promise(res => {
    const i = new Image();
    i.onload = () => res(i);
    i.src = src;
  });

  let tilt = [0, 0];
  window.__houseTilt = (yaw, pitch) => { tilt = [yaw, pitch]; };

  Promise.all([load(img.currentSrc || img.src), load(window.__HOUSE_DEPTH || 'assets/house-depth.webp')]).then(([col, dep]) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(1819 * (dpr > 1.5 ? 2 : 1));
    canvas.height = Math.round(1015 * (dpr > 1.5 ? 2 : 1));
    gl.viewport(0, 0, canvas.width, canvas.height);
    texture(0, col);
    texture(1, dep);
    holder.appendChild(canvas);
    img.style.display = 'none';

    let last = [99, 99];
    (function draw() {
      if (Math.abs(tilt[0] - last[0]) > 1e-5 || Math.abs(tilt[1] - last[1]) > 1e-5) {
        gl.uniform2f(uTilt, tilt[0], tilt[1]);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        last = [tilt[0], tilt[1]];
      }
      requestAnimationFrame(draw);
    })();
  });
})();
