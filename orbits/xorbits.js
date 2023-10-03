/**
 * @file
 *
 * Summary.
 *
 * <p>Similar to the two cubes <a href="/cwdc/13-webgl/doc-test2">example</a>.</p>
 *
 * <p>There are two cubes and an X. The cubes also orbit around the X as satelytes.</p>
 *
 * An animation of a colored X orbiting clockwise,
 * is rendered about the y-axis, in the x-z plane, in a circle of radius 10.
 *
 * <p>The first cube is half of a unit cube, and orbits clockwise around X with a radius of 8,
 * while the second cube is one third of a unit cube, and orbits counter-clockwise around X
 * with a radius of 6.</p>
 *
 * <p>The X also spins on its own y-axis "rev" times per full orbit, where "rev" is given in the URL (default 365).</p>
 *
 * <p>The transformation is applied passing the model matrix to the vertex shader. </p>
 *
 * Notes:
 * <ol>
 *  <li>the only modified code is in the {@link draw} and {@link animate} functions,
 *  plus the vertex shader.</li>
 *  <li>it uses the type {@link Matrix4} from the teal book utilities in cuon-matrix.js</li>
 * </ol>
 *
 * @author Paulo Roma
 * @date 27/09/2016
 */

"use strict";

// prettier-ignore
var axisVertices = new Float32Array([
  0.0, 0.0, 0.0,
  1.5, 0.0, 0.0,
  0.0, 0.0, 0.0,
  0.0, 1.5, 0.0,
  0.0, 0.0, 0.0,
  0.0, 0.0, 1.5
]);

// RGB
// prettier-ignore
var axisColors = new Float32Array([
  1.0, 0.0, 0.0, 1.0,
  1.0, 0.0, 0.0, 1.0,
  0.0, 1.0, 0.0, 1.0,
  0.0, 1.0, 0.0, 1.0,
  0.0, 0.0, 1.0, 1.0,
  0.0, 0.0, 1.0, 1.0
]);

/**
 * Handle to buffers on the GPU.
 * @type {WebGLBuffer}
 */
// prettier-ignore
var vertexBuffer;
var vertexColorBuffer;
var indexBuffer;
var axisBuffer;
var axisColorBuffer;

/**
 * Handle to the compiled shader program on the GPU.
 * @type {WebGLShader}
 */
var shader;

/**
 * Model transformation.
 * @type {Matrix4}
 */
var modelMatrix;

/**
 * <p>View matrix.</p>
 * One strategy is to identify a
 * <a href="/cs336/examples/lighting/content/doc-lighting2/global.html#viewMatrix">transformation</a>
 * to our camera frame, then invert it. <br>
 *
 * <p>Alternatively use the LookAt function, specifying the view (eye) point,
 * a point at which to look, and a direction for "up".<br>
 * Approximate view point for above is (1.77, 3.54, 3.06)</p>
 * @type {Matrix4}
 */
// prettier-ignore
var viewMatrix = new Matrix4().setLookAt(
  5.77, 3.54, 25.06,  // eye
  0, 0, 0,            // at - looking at the origin
  0, 1, 0             // up vector - y axis
);

/**
 * For projection we can use an orthographic projection, specifying
 * the clipping volume explicitly.<br>
 * Note that right - left is 1.5 times top - bottom,
 * corresponding to the screen aspect ratio 600 x 400<br>
 * var projection = new Matrix4().setOrtho(-1.5, 1.5, -1, 1, 4, 6)
 *
 * <p>Or, use a perspective projection specified with a
 * field of view, an aspect ratio, and distance to near and far
 * clipping planes.<br>
 * Here use aspect ratio 3/2 corresponding to canvas size 600 x 400</p>
 * @type {Matrix4}
 */
var projection;

/**
 * <p>A cube model.</p>
 *
 * Creates data (numVertices, vertices, colors, and normal vectors)
 * for a unit cube.
 *
 * (Note this is a "self-invoking" anonymous function.)
 * @type {cube_data}
 * @see https://threejs.org/docs/#api/en/core/BufferGeometry
 */
var cube = (() => {
  // vertices of cube
  // prettier-ignore
  var rawVertices = new Float32Array([
    -0.5, -0.5, 0.5,
    0.5, -0.5, 0.5,
    0.5, 0.5, 0.5,
    -0.5, 0.5, 0.5,
    -0.5, -0.5, -0.5,
    0.5, -0.5, -0.5,
    0.5, 0.5, -0.5,
    -0.5, 0.5, -0.5
  ]);

  // prettier-ignore
  var rawColors = new Float32Array([
    1.0, 0.0, 0.0, 1.0,  // red
    0.0, 1.0, 0.0, 1.0,  // green
    0.0, 0.0, 1.0, 1.0,  // blue
    1.0, 1.0, 0.0, 1.0,  // yellow
    1.0, 0.0, 1.0, 1.0,  // magenta
    0.0, 1.0, 1.0, 1.0,  // cyan
  ]);

  // prettier-ignore
  var rawNormals = new Float32Array([
    0, 0, 1,
    1, 0, 0,
    0, 0, -1,
    -1, 0, 0,
    0, 1, 0,
    0, -1, 0
  ]);

  // prettier-ignore
  var indices = new Uint16Array([
    0, 1, 2, 0, 2, 3,  // +z face
    1, 5, 6, 1, 6, 2,  // +x face
    5, 4, 7, 5, 7, 6,  // -z face
    4, 0, 3, 4, 3, 7,  // -x face
    3, 2, 6, 3, 6, 7,  // +y face
    4, 5, 1, 4, 1, 0   // -y face
  ]);

  var verticesArray = [];
  var colorsArray = [];
  var normalsArray = [];
  for (var i = 0; i < 36; ++i) {
    // for each of the 36 vertices...
    var face = Math.floor(i / 6);
    var index = indices[i];

    // (x, y, z): three numbers for each point
    for (var j = 0; j < 3; ++j) {
      verticesArray.push(rawVertices[3 * index + j]);
    }

    // (r, g, b, a): four numbers for each point
    for (var j = 0; j < 4; ++j) {
      colorsArray.push(rawColors[4 * face + j]);
    }

    // three numbers for each point
    for (var j = 0; j < 3; ++j) {
      normalsArray.push(rawNormals[3 * face + j]);
    }
  }

  /**
   * Returned value is an object with four attributes:
   * numVertices, vertices, colors, and normals.
   *
   * @return {Object<{numVertices: Number,
   *                  vertices: Float32Array,
   *                  colors: Float32Array,
   *                  normals: Float32Array}>}
   * cube associated attributes.
   * @callback cube_data
   */
  return {
    numVertices: 36, // number of indices
    vertices: new Float32Array(verticesArray), // 36 * 3 = 108
    colors: new Float32Array(colorsArray), // 36 * 4 = 144
    normals: new Float32Array(normalsArray), // 36 * 3 = 108
  };
})();

/**
 * <p>Matrix for taking normals into eye space.</p>
 * Return a matrix to transform normals, so they stay
 * perpendicular to surfaces after a linear transformation.
 * @param {Matrix4} model model matrix.
 * @param {Matrix4} view view matrix.
 * @returns {Float32Array} elements of the transpose of the inverse of the modelview matrix.
 */
function makeNormalMatrixElements(model, view) {
  var n = new Matrix4(view).multiply(model);
  n.transpose();
  n.invert();
  n = n.elements;
  // prettier-ignore
  return new Float32Array([
    n[0], n[1], n[2],
    n[4], n[5], n[6],
    n[8], n[9], n[10],
  ]);
}

/**
 * Convert an angle in degrees to radians.
 *
 * @function
 * @param {Number} deg angle in degrees.
 * @returns {Number} angle in radians.
 */
const deg2rad = (deg) => (deg * Math.PI) / 180.0;

/**
 * Render our geometry.
 *
 * @param {WebGLRenderingContext} gl WebGL context.
 * @param {Number} rad rotation angle for the cubes.
 */
function draw(gl, rad, localRad) {
  // clear the framebuffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // bind the shader and set attributes
  gl.useProgram(shader);
  var positionIndex = gl.getAttribLocation(shader, "a_Position");
  var colorIndex = gl.getAttribLocation(shader, "a_Color");
  gl.enableVertexAttribArray(positionIndex);
  gl.enableVertexAttribArray(colorIndex);

  // bind buffers for points
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.vertexAttribPointer(positionIndex, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  gl.vertexAttribPointer(colorIndex, 4, gl.FLOAT, false, 0, 0);

  let X_ = 8 //
  let Y_ = 8 //

  // identity transformation
  var x1 = X_ * Math.cos(rad);
  var z1 = Y_ * Math.sin(rad);

  let model = new Matrix4()
    .translate(x1, 0, z1)
    .multiply(modelMatrix)
    .rotate(localRad, 0, 1, 0) // Rotacionar em torno do eixo Y local;
    .rotate(-45, 0, 0, 1)
    .scale(1, 8, 1);

  // set uniforms in shader for projection * view * model transformation
  let loc = gl.getUniformLocation(shader, "model");
  gl.uniformMatrix4fv(loc, false, model.elements);
  loc = gl.getUniformLocation(shader, "view");
  gl.uniformMatrix4fv(loc, false, viewMatrix.elements);
  loc = gl.getUniformLocation(shader, "projection");
  gl.uniformMatrix4fv(loc, false, projection.elements);
  loc = gl.getUniformLocation(shader, "normalMatrix");
  gl.uniformMatrix3fv(loc, false, makeNormalMatrixElements(model, viewMatrix));

  // draw the X left leg: cube scaled by 8 in y and rotated -45° in z
  gl.drawArrays(gl.TRIANGLES, 0, cube.numVertices);

  loc = gl.getUniformLocation(shader, "model");
  model = new Matrix4()
    .translate(x1, 0, z1)
    .multiply(modelMatrix)
    .rotate(localRad, 0, 1, 0) // Rotacionar em torno do eixo Y local;
    .rotate(45, 0, 0, 1)
    .scale(1, 8, 1);
  gl.uniformMatrix4fv(loc, false, model.elements);

  // draw the X right leg: cube scaled by 8 in y and rotated 45° in z
  gl.drawArrays(gl.TRIANGLES, 0, cube.numVertices);

  // second cube
  var x2 = (X_ + 4) * Math.cos(rad);
  var z2 = (X_ + 4) * Math.sin(rad);
  var loc2 = gl.getUniformLocation(shader, "model");
  var model2 = new Matrix4()
    .translate(x2, 0, z2)
    .multiply(modelMatrix)
    .scale(1 / 2, 1 / 2, 1 / 2)
    .rotate(localRad*3, 0, 1, 0); // Rotacionar em torno do eixo Y local;

  gl.uniformMatrix4fv(loc2, false, model2.elements);
  gl.drawArrays(gl.TRIANGLES, 0, cube.numVertices);

  // third cube
  var x3 = (X_ + 6) * Math.cos(-rad);
  var z3 = (X_ + 6) * Math.sin(-rad);
  var loc3 = gl.getUniformLocation(shader, "model");
  var model3 = new Matrix4()
    .translate(x3, 0, z3)
    .multiply(modelMatrix)
    .scale(1 / 3, 1 / 3, 1 / 3)
    .rotate(localRad*2, 0, 1, 0); // Rotacionar em torno do eixo Y local;

  gl.uniformMatrix4fv(loc3, false, model3.elements);
  gl.drawArrays(gl.TRIANGLES, 0, cube.numVertices);

  // draw axes (not transformed by model transformation)
  gl.bindBuffer(gl.ARRAY_BUFFER, axisBuffer);
  gl.vertexAttribPointer(positionIndex, 3, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, axisColorBuffer);
  gl.vertexAttribPointer(colorIndex, 4, gl.FLOAT, false, 0, 0);

  loc = gl.getUniformLocation(shader, "model");
  model = new Matrix4().translate(x1, 0, z1).multiply(modelMatrix).scale(1, 1, 1.0);
  gl.uniformMatrix4fv(loc, false, model.elements);
  // draw axes
  gl.drawArrays(gl.LINES, 0, 6);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

/**
 * <p>Entry point when page is loaded.</p>
 *
 * Basically, this function does setup that "should" only have to be done once, <br>
 * while {@link draw} does things that have to be repeated each time the canvas is
 * redrawn.
 */
function mainEntrance() {
  // retrieve <canvas> element
  var canvas = document.getElementById("theCanvas");

  // get the rendering context for WebGL
  var gl = canvas.getContext("webgl2");
  if (!gl) {
    console.log("Failed to get the rendering context for WebGL2");
    return;
  }

  let aspect = canvas.clientWidth / canvas.clientHeight;
  projection = new Matrix4().setPerspective(50, aspect, 0.4, 100);

  // load and compile the shader pair, using utility from the teal book
  var vshaderSource = document.getElementById("vertexShader").textContent;
  var fshaderSource = document.getElementById("fragmentShader").textContent;
  if (!initShaders(gl, vshaderSource, fshaderSource)) {
    console.log("Failed to initialize shaders.");
    return;
  }

  // retain a handle to the shader program, then unbind it
  // (This looks odd, but the way initShaders works is that it "binds" the shader and
  // stores the handle in an extra property of the gl object.  That's ok, but will really
  // mess things up when we have more than one shader pair.)
  shader = gl.program;
  gl.useProgram(null);

  // request a handle for a chunk of GPU memory
  vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log("Failed to create the buffer object");
    return;
  }

  // "bind" the buffer as the current array buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

  // load our data onto the GPU (uses the currently bound buffer)
  gl.bufferData(gl.ARRAY_BUFFER, cube.vertices, gl.STATIC_DRAW);

  // now that the buffer is filled with data, we can unbind it
  // (we still have the handle, so we can bind it again when needed)
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // buffer for vertex colors
  vertexColorBuffer = gl.createBuffer();
  if (!vertexColorBuffer) {
    console.log("Failed to create the buffer object");
    return;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cube.colors, gl.STATIC_DRAW);

  // axes
  axisBuffer = gl.createBuffer();
  if (!axisBuffer) {
    console.log("Failed to create the buffer object");
    return;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, axisBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, axisVertices, gl.STATIC_DRAW);

  // buffer for axis colors
  axisColorBuffer = gl.createBuffer();
  if (!axisColorBuffer) {
    console.log("Failed to create the buffer object");
    return;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, axisColorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, axisColors, gl.STATIC_DRAW);

  // specify a fill color for clearing the framebuffer
  gl.clearColor(0.0, 0.8, 0.8, 1.0);

  // enable z-buffer
  gl.enable(gl.DEPTH_TEST);

  // code to actually render our geometry

  modelMatrix = new Matrix4();

  /**
   * A closure to set up an animation loop in which the
   * angle grows by "increment" each frame.
   * @return {updateModelMatrix}
   * @function
   * @global
   */
  var animate = (() => {
    // Initialize variables for animation control
    var angle = 0.0;          // Current rotation angle around the Y-axis
    var orbitAngle = 0.0;     // Current angle for orbiting
    var increment = 1.0;      // Increment in rotation angle per frame
    var orbitIncrement = 1.0; // Increment in angle for orbiting
    var frameCount = 0;       // Frame counter

    // The animation function
    return function () {
      // Update the rotation angle around the Y-axis
      angle += increment;

      // Ensure angle stays within 360 degrees
      angle %= 360;

      // Update the angle for orbiting
      orbitAngle += orbitIncrement;

      // Call the draw function with the updated angles for the cubes
      draw(gl, deg2rad(angle), orbitAngle);

      // Increase the frame count
      frameCount++;

      // Request the next frame
      requestAnimationFrame(animate);
    };
  })();

  animate();
}

/**
 * Triggers the {@link mainEntrance} animation.
 *
 * @event load - run the animation.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/load_event
 */
window.addEventListener("load", (event) => {
  mainEntrance();
});
