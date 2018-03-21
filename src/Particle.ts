import {vec3, vec4} from 'gl-matrix';

class Particle {
  position: vec3;
  prevposition: vec3;
  velocity: vec3;
  color: vec4;

  constructor(position: vec3, velocity: vec3) {
    this.position = position;
    this.prevposition = vec3.copy(vec3.create(), position);
    this.velocity = velocity;
    this.color = vec4.create();
  }

  update(timeStep: number, inducers: Array<[vec3, number]>, meshPoint: vec3, useMesh: boolean, mousePoint: [vec3, number], useMouse: boolean) {
    let acceleration = vec3.create();
    for (var i = 0; i < inducers.length; i++) {
      let inducer = inducers[i];
      let diff = vec3.subtract(vec3.create(), inducer[0], this.position);
      let dist = vec3.length(diff);
      let force;
      if (dist != 0) {
        let dir = vec3.normalize(vec3.create(), diff);
        force = vec3.scale(vec3.create(), dir, 1/(dist * dist) * inducer[1]);
      }
      else {
        force = vec3.create();
      }

      let f = vec3.length(force);
      let maxf = 0.1 * Math.abs(inducer[1]);
      if (f > maxf) {
        vec3.scale(force, force, maxf/f);
      }

      vec3.add(acceleration, acceleration, force);
    }
    if (useMesh) {
      let diff = vec3.subtract(vec3.create(), meshPoint, this.position);
      let dist = vec3.length(diff);
      let force;
      if (dist != 0) {
        let dir = vec3.normalize(vec3.create(), diff);
        force = vec3.scale(vec3.create(), dir, 1/(dist * dist) * 3);
      }
      else {
        force = vec3.create();
      }

      let f = vec3.length(force);
      let maxf = 0.1 * Math.abs(3);
      if (f > maxf) {
        vec3.scale(force, force, maxf/f);
      }

      vec3.add(acceleration, acceleration, force);
    }
    if (useMouse) {
      let diff = vec3.subtract(vec3.create(), mousePoint[0], this.position);
      let dist = vec3.length(diff);
      let force;
      if (dist != 0) {
        let dir = vec3.normalize(vec3.create(), diff);
        force = vec3.scale(vec3.create(), dir, 1/(dist * dist) * mousePoint[1]);
      }
      else {
        force = vec3.create();
      }

      let f = vec3.length(force);
      let maxf = 0.1 * Math.abs(mousePoint[1]);
      if (f > maxf) {
        vec3.scale(force, force, maxf/f);
      }

      vec3.add(acceleration, acceleration, force);
    }
    
    
    vec3.add(this.velocity, this.velocity, vec3.scale(vec3.create(), acceleration, timeStep));
    if (useMesh) {
      var dist = vec3.distance(this.position, meshPoint);
      dist /= 10;
      dist = Math.max(Math.min(dist, 1), 0.8);
      vec3.scale(this.velocity, this.velocity, dist);
    }
    if (useMouse) {
      var dist = vec3.distance(this.position, mousePoint[0]);
      dist /= 10;
      dist = Math.max(Math.min(dist, 1), 0.8);
      vec3.scale(this.velocity, this.velocity, dist);
    }
    let speed = vec3.length(this.velocity);
    let maxSpeed = 1;
    // if (speed > maxSpeed) {
    //   vec3.scale(this.velocity, this.velocity, maxSpeed/speed);
    //   speed = maxSpeed;
    // }
    vec3.scale(this.velocity, this.velocity, 0.999);
    vec3.add(this.position, this.position, vec3.scale(vec3.create(), this.velocity, timeStep));

    var bounds = 50;
    // this.position[0] = Math.max(Math.min(this.position[0], bounds), -bounds);
    // this.position[1] = Math.max(Math.min(this.position[1], bounds), -bounds);
    // this.position[2] = Math.max(Math.min(this.position[2], bounds), -bounds);
    var dist = vec3.length(this.position);
    if (dist > bounds) {
      vec3.scale(this.position, this.position, bounds/dist);
      this.velocity = vec3.create();
      dist = bounds;
    }

    // if (this.position[0] == this.prevposition[0]) this.velocity[0] = 0;
    // if (this.position[1] == this.prevposition[1]) this.velocity[1] = 0;
    // if (this.position[2] == this.prevposition[2]) this.velocity[2] = 0;
    vec3.copy(this.prevposition, this.position);

    let a = vec3.fromValues(0.5, 0.5, 0.5);
    let b = vec3.fromValues(0.5, 0.5, 0.5);
    let c = vec3.fromValues(1, 1, 1);
    let d = vec3.fromValues(0, 0.1, 0.2);
    speed = Math.max(Math.min(speed/maxSpeed, 1), 0);
    dist = Math.max(Math.min(dist/bounds, 1), 0);
    this.color[0] = a[0] + b[0] * Math.cos(2 * Math.PI * (c[0] * speed + d[0]));
    this.color[1] = a[1] + b[1] * Math.cos(2 * Math.PI * (c[1] * dist + d[1]));
    this.color[2] = a[2] + b[2] * Math.cos(2 * Math.PI * (c[2] * speed + d[2]));
    this.color[3] = 1;
  }
};

export default Particle;