import {vec3} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Square from './geometry/Square';
import Icosphere from './geometry/Icosphere';
import Mesh from './geometry/Mesh';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';
import Particle from './Particle';


// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  'Load Scene': loadScene, // A function pointer, essentially
  'Clear Inducers': clearPointForces, // A function pointer, essentially
  mode: 0,
  mesh: 0,
  interactStrength: 3,
  particleSpeed: 1,
};

let sphere: Icosphere;
let square: Square;
let demon: Mesh;
let wahoo: Mesh;
let bungo: Mesh;

let time: number = 0.0;
let particlesArray: Array<Particle>;
let inducersArray: [vec3, number][];
let mouseInducer: [vec3, number];

let isInteracting = false;
let isRightClick = false;

function clearPointForces() {
  inducersArray = Array<[vec3, number]>();
}

function loadScene() {
  square = new Square();
  square.create();
  demon = loadOBJ("src/geometry/demon.obj");
  demon.create();
  bungo = loadOBJ("src/geometry/bungo.obj");
  bungo.create();
  wahoo = loadOBJ("src/geometry/wahoo.obj");
  wahoo.create();
  sphere = new Icosphere(vec3.fromValues(0, 0, 0), 20, 5);
  sphere.create();
  
  inducersArray = Array<[vec3, number]>();
  inducersArray.push([vec3.fromValues(0, 0, 0), 1]);
  mouseInducer = [vec3.create(), 0];
  // Set up particles here
  particlesArray = new Array<Particle>();
  let n: number = 20000.0;
  for(let i = 0; i < n; i++) {
    particlesArray.push(new Particle(vec3.fromValues((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20), vec3.fromValues(0, 0, 0)));
  }
}

function loadFile(file: string): string[] {
  var toReturn: string[] = [];
  var rawFile = new XMLHttpRequest();
  rawFile.open("GET", file, false);
  rawFile.onreadystatechange = function ()
  {
      if(rawFile.readyState === 4)
      {
          if(rawFile.status === 200 || rawFile.status == 0)
          {
              var allText = rawFile.responseText;
              toReturn = allText.split("\n");
          }
      }
  }
  rawFile.send(null);
  return toReturn;
}

function loadOBJ(file: string): Mesh {
  var fileContents: string[] = loadFile(file);
  var mesh: Mesh = new Mesh(vec3.fromValues(0, 0, 0));
  var positions: number[] = [];
  var normals: number[] = [];
  var faces: string[] = [];
  for (var i = 0; i < fileContents.length; i++) {
      var line: string[] = fileContents[i].split(" ");
      if (line[0] == "v") {
          positions.push(parseFloat(line[1]));
          positions.push(parseFloat(line[2]));
          positions.push(parseFloat(line[3]));
      }
      if (line[0] == "vn") {
          normals.push(parseFloat(line[1]));
          normals.push(parseFloat(line[2]));
          normals.push(parseFloat(line[3]));
      }
      if (line[0] == "f") {
          faces.push(line[1]);
          faces.push(line[2]);
          faces.push(line[3]);
      }
  }
  for (var i = 0; i < faces.length; i += 3) {
      for (var k = 0; k < 3; k++) {
          var vert: string[] = faces[i + k].split("/");
          var posIndex = parseInt(vert[0]) - 1;
          var normIndex = parseInt(vert[2]) - 1;

          for (var j = 0; j < 3; j++) {
              mesh.positions.push(positions[posIndex * 3 + j]);
          }
          mesh.positions.push(1);

          for (var j = 0; j < 3; j++) {
              mesh.normals.push(normals[normIndex * 3 + j]);
          }
          mesh.normals.push(0);

          mesh.indices.push(i + k);
      }
  }
  return mesh;
}

function main() {
  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  // Add controls to the gui
  const gui = new DAT.GUI();
  gui.add(controls, 'Load Scene');
  gui.add(controls, 'mode', { Rotate: 0, Interact: 1, Place: 2 });
  gui.add(controls, 'interactStrength', 0.1, 10).step(0.1);
  gui.add(controls, 'particleSpeed', 0, 10).step(0.1);
  gui.add(controls, 'mesh', { None: 0, Bungo: 1, Demon: 2, Wahoo: 3 });
  gui.add(controls, 'Clear Inducers');

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScene();

  const camera = new Camera(vec3.fromValues(0, 0, 130), vec3.fromValues(0, 0, 0));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.2, 0.2, 0.2, 1);
  gl.blendFunc(gl.ONE, gl.ONE); // Additive blending

  const particleShader = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/particle-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/particle-frag.glsl')),
  ]);

  const lambertShader = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/lambert-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/lambert-frag.glsl')),
  ]);

  // This function will be called every frame
  function tick() {
    camera.update();
    if (controls.mode == 0) {
      camera.controls.zoomSpeed = 1;
      camera.controls.rotateSpeed = 1;
      camera.controls.translateSpeed = 1;
    }
    else {
      camera.controls.zoomSpeed = 0;
      camera.controls.rotateSpeed = 0;
      camera.controls.translateSpeed = 0;
    }
    stats.begin();
    particleShader.setTime(time++);

    let offsetsArray = [];
    let colorsArray = [];
    let n = particlesArray.length;
    for(let i = 0; i < n; i++) {
        var meshVert = vec3.create();
        var whichMesh = bungo;
        var meshScale = 18;
        var useMesh = false;
        if (controls.mesh == 2) {
          whichMesh = demon;
          meshScale = 0.3;
        }
        else if (controls.mesh == 3) {
          whichMesh = wahoo;
          meshScale = 8;
        }
        if (i * 4 + 3 < whichMesh.positions.length) {
          meshVert[0] = whichMesh.positions[i * 4];
          meshVert[1] = whichMesh.positions[i * 4 + 1];
          meshVert[2] = whichMesh.positions[i * 4 + 2];
          useMesh = true;
        }
        vec3.scale(meshVert, meshVert, meshScale);
        particlesArray[i].update(controls.particleSpeed, inducersArray, meshVert, controls.mesh != 0 && useMesh, mouseInducer, controls.mode == 1 && isInteracting);
        offsetsArray.push(particlesArray[i].position[0]);
        offsetsArray.push(particlesArray[i].position[1]);
        offsetsArray.push(particlesArray[i].position[2]);

        // offsetsArray.push(meshVert[0]);
        // offsetsArray.push(meshVert[1]);
        // offsetsArray.push(meshVert[2]);

        colorsArray.push(particlesArray[i].color[0]);
        colorsArray.push(particlesArray[i].color[1]);
        colorsArray.push(particlesArray[i].color[2]);
        colorsArray.push(particlesArray[i].color[3]); // Alpha channel
    }
    let offsets: Float32Array = new Float32Array(offsetsArray);
    let colors: Float32Array = new Float32Array(colorsArray);
    square.setInstanceVBOs(offsets, colors);
    square.setNumInstances(n);

    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();
    renderer.render(camera, particleShader, [
      square
    ], true);
    renderer.render(camera, lambertShader, [
      sphere
    ], false);
    stats.end();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();

  canvas.addEventListener("mousedown", mouseDown, false);
  function mouseDown(event: MouseEvent): void {
    isInteracting = true;
    if (controls.mode == 0) return;
    var x: number = event.x;
    var y: number = event.y;
  
    x -= canvas.offsetLeft;
    y -= canvas.offsetTop;

    var angle = Math.tan(Math.PI * 0.5 * camera.fovy / 180.);
    var dist = vec3.dist(camera.position, camera.target);
    var xx = vec3.scale(vec3.create(), camera.right, dist * (2 * ((x) * 1/canvas.width) - 1) * angle * camera.aspectRatio); 
    var yy = vec3.scale(vec3.create(), camera.up, dist * (1 - 2 * ((y) * 1/canvas.height)) * angle);
    var point = vec3.add(vec3.create(), xx, yy);
    vec3.add(point, point, camera.target);
  
    var strength = controls.interactStrength;
    if (event.button == 2) {
      strength = -controls.interactStrength;
      isRightClick = true;
    }
    if (controls.mode == 2) inducersArray.push([point, strength]);
    else if (controls.mode == 1) mouseInducer = [point, strength];
  }

  canvas.addEventListener("mousemove", mouseMove, false);
  function mouseMove(event: MouseEvent): void {
    if (controls.mode != 1) return;
    var x: number = event.x;
    var y: number = event.y;
  
    x -= canvas.offsetLeft;
    y -= canvas.offsetTop;

    var angle = Math.tan(Math.PI * 0.5 * camera.fovy / 180.);
    var dist = vec3.dist(camera.position, camera.target);
    var xx = vec3.scale(vec3.create(), camera.right, dist * (2 * ((x) * 1/canvas.width) - 1) * angle * camera.aspectRatio); 
    var yy = vec3.scale(vec3.create(), camera.up, dist * (1 - 2 * ((y) * 1/canvas.height)) * angle);
    var point = vec3.add(vec3.create(), xx, yy);
    vec3.add(point, point, camera.target);
  
    var strength = controls.interactStrength;
    if (isRightClick) {
      strength = -controls.interactStrength;
    }
    mouseInducer = [point, strength];
  }

  canvas.addEventListener("mouseup", mouseUp, false);
  function mouseUp(event: MouseEvent): void {
    isInteracting = false;
    mouseInducer[1] = 0;
    isRightClick = false;
  }
  

  // Start the render loop
  camera.update();
  tick();
}

main();
