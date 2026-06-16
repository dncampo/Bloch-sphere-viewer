BLOCH SPHERE PLAYGROUND
=======================

An interactive single-qubit Bloch sphere running entirely in the browser.
No build step, no framework, no server-side code. Three.js handles the 3D
scene; the rest is plain JavaScript ES modules and an HTML5 Canvas for the
2D projection panels.

The XY, XZ, and YZ projection panels were the main motivation for writing
this rather than pointing at an existing tool. Most visualizers show only
the 3D view. Having all three orthographic projections live-updating
alongside it makes the geometry of gate sequences easier to follow.


REQUIREMENTS
------------

A modern browser with ES module support (Firefox 60+, Chrome 61+, Safari 11+).
Three.js is loaded from jsDelivr on first use, so an internet connection is
required unless you copy the library locally.

To serve the files you need Python 3 or any static HTTP server. The app uses
ES module imports, which browsers refuse to load from file:// URIs.


HOW TO RUN
----------

    python3 -m http.server 8000

Or, if you have npm available:

    npm start

Then open http://localhost:8000 in a browser.


FEATURES
--------

3D Bloch sphere
    Rendered with Three.js. Orbit by dragging on the sphere surface or empty
    space. Scroll to zoom. The state vector is shown as an amber arrow; drag
    its tip to set the state directly with the mouse.

Gate panel
    Buttons for the eight standard single-qubit gates: X, Y, Z, H, S, S-dagger,
    T, T-dagger. Each gate is applied as a smooth animated rotation of the Bloch
    vector. Gates queue up if you click faster than the animation runs.

Projection panels
    Three 2D orthographic views update in real time alongside the 3D scene.
    XY is viewed from +Z, XZ from -Y, YZ from +X. Axis colors are consistent
    with the 3D view (X red, Y green, Z blue). A dashed circle shows the
    in-plane radius, which is the path traced by rotations about the
    out-of-plane axis.

Motion trace
    The recent path of the state vector is drawn in 3D and in all three panels.
    The Clear trace button resets it. Useful for seeing the arc a gate sequence
    carves out on the sphere.

State readout
    Displayed continuously: the state as amplitudes (alpha, beta), the angles
    theta and phi, measurement probabilities P(0) and P(1), and the raw Bloch
    coordinates (x, y, z).

Reset and Random
    Reset returns to |0> (north pole, +Z). Random places the state at a
    uniformly sampled point on the sphere surface.


CONVENTIONS
-----------

    |psi> = cos(theta/2)|0> + exp(i*phi)*sin(theta/2)|1>

    Bloch vector: (sin(theta)*cos(phi), sin(theta)*sin(phi), cos(theta))

|0> is at +Z. This is the standard physics convention.

Gate rotations follow the right-hand rule. S applies a pi/2 rotation about
Z; S-dagger applies -pi/2. The Hadamard is a pi rotation about the (X+Z)/sqrt(2)
axis, which maps |0> to |+> and |1> to |->.

Animations use an ease-in-out cubic curve. Duration scales with the gate
angle so a pi rotation takes roughly twice as long as a pi/2 rotation.


FILES
-----

    index.html      page structure and import map
    style.css       layout and color scheme
    js/quantum.js   Bloch-vector state, gate table, Rodrigues rotation, trail
    js/bloch3d.js   Three.js scene, OrbitControls, arrow tip drag
    js/planes.js    2D canvas projection panels
    js/main.js      toolbar, readout, render loop, wiring


LICENSE
-------

MIT. Do whatever you like with it.
