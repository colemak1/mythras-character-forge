import * as THREE from 'https://esm.sh/three@0.170.0';
import * as CANNON from 'https://esm.sh/cannon-es@0.20.0';

const { Vector3, Quaternion, Matrix4 } = THREE;
const viewUp = new Vector3(0, .86, -.51).normalize();
const viewNormal = new Vector3(0, -viewUp.z, viewUp.y);
const viewBasis = new Matrix4().makeBasis(new Vector3(1, 0, 0), viewUp, viewNormal);
const keyLight = new Vector3(-.45, .82, .51).normalize();
const shapes = new Map();

function ring(count, radius, y, angle = 0) {
  return Array.from({ length: count }, (_, i) => {
    const a = angle + i * 2 * Math.PI / count;
    return new Vector3(radius * Math.cos(a), y, radius * Math.sin(a));
  });
}

function verticesFor(sides) {
  switch (sides) {
    case 2: return [...ring(16, .90, .15), ...ring(16, .90, -.15)];
    case 3: return [...ring(3, .98, .57), ...ring(3, .98, -.57)];
    case 4: return [new Vector3(0, 1.1, 0), ...ring(3, 1.04, -.37)];
    case 6: return [...ring(4, .83, .59, Math.PI / 4), ...ring(4, .83, -.59, Math.PI / 4)];
    case 8: return [new Vector3(0, 1, 0), new Vector3(0, -1, 0), ...ring(4, 1, 0)];
    case 10: return [new Vector3(0, 1.08, 0), new Vector3(0, -1.08, 0), ...ring(5, .94, 0, -Math.PI / 2)];
    case 12:
    case 20: {
      const geometry = sides === 12 ? new THREE.DodecahedronGeometry(1) : new THREE.IcosahedronGeometry(1);
      const points = [];
      const positions = geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        const point = new Vector3().fromBufferAttribute(positions, i);
        if (!points.some(v => v.distanceToSquared(point) < 1e-10)) points.push(point);
      }
      geometry.dispose();
      return points;
    }
    default: throw new RangeError('Unsupported combat die d' + sides);
  }
}

// Find the outward support planes and order each face's corners around its normal.
function hullFaces(points) {
  const faces = new Map();
  const tolerance = 1e-5;
  for (let a = 0; a < points.length - 2; a++) {
    for (let b = a + 1; b < points.length - 1; b++) {
      for (let c = b + 1; c < points.length; c++) {
        const normal = points[b].clone().sub(points[a]).cross(points[c].clone().sub(points[a]));
        if (normal.lengthSq() < tolerance ** 2) continue;
        normal.normalize();
        if (normal.dot(points[a]) < 0) normal.negate();
        const distances = points.map(p => normal.dot(p) - normal.dot(points[a]));
        if (distances.some(d => d > tolerance)) continue;
        const indices = distances.flatMap((d, i) => Math.abs(d) < tolerance ? [i] : []);
        const key = indices.join(',');
        if (faces.has(key)) continue;
        const center = indices.reduce((sum, i) => sum.add(points[i]), new Vector3()).multiplyScalar(1 / indices.length);
        const axis = points[indices[0]].clone().sub(center).normalize();
        const tangent = normal.clone().cross(axis);
        const angle = i => {
          const offset = points[i].clone().sub(center);
          return Math.atan2(offset.dot(tangent), offset.dot(axis));
        };
        indices.sort((i, j) => angle(i) - angle(j));
        const up = points[indices[0]].clone().sub(center);
        if (indices.length !== 3) up.add(points[indices[1]].clone().sub(center));
        up.normalize();
        const right = up.clone().cross(normal);
        const radius = Math.min(...indices.map((i, j) => {
          const edge = points[indices[(j + 1) % indices.length]].clone().sub(points[i]).normalize();
          return edge.cross(center.clone().sub(points[i])).length();
        }));
        faces.set(key, { indices, center, normal, up, right, radius, index: -1 });
      }
    }
  }
  return [...faces.values()];
}

function getShape(sides) {
  if (shapes.has(sides)) return shapes.get(sides);
  const points = verticesFor(sides);
  const faces = hullFaces(points);
  const numbered = faces.filter(face => sides === 2 ? Math.abs(face.normal.y) > .9 :
    sides === 3 ? Math.abs(face.normal.y) < .1 : true);
  if (numbered.length !== sides) throw new Error('Invalid face count for d' + sides);
  numbered.forEach((face, i) => { face.index = i; });
  const shape = {
    points, faces, numbered,
    radius: Math.max(...points.map(point => point.length())),
    hull: new CANNON.ConvexPolyhedron({
      vertices: points.map(p => new CANNON.Vec3(p.x, p.y, p.z)),
      faces: faces.map(face => face.indices),
    }),
  };
  shapes.set(sides, shape);
  return shape;
}

export function physicalFaces(defs, values) {
  return defs.flatMap(({ sides, fixed }, i) => {
    const value = values[i];
    if (sides === 100) {
      const percentile = value % 100;
      return [
        { sides: 10, index: Math.floor(percentile / 10), marks: Array.from({length: 10}, (_, n) => String(n * 10).padStart(2, '0')), fixed },
        { sides: 10, index: percentile % 10, marks: Array.from({length: 10}, (_, n) => String(n)), fixed },
      ];
    }
    return [{ sides, index: value - 1, marks: Array.from({length: sides}, (_, n) => String(n + 1)), fixed }];
  });
}

function revealRotation(face) {
  return new Quaternion().setFromRotationMatrix(
    viewBasis.clone().multiply(new Matrix4().makeRotationX(.13)).multiply(new Matrix4().makeRotationY(-.10)).multiply(new Matrix4().makeBasis(face.right, face.up, face.normal).transpose()),
  );
}

export function animateDice(canvas, defs, values, duration, onSettled) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  const records = physicalFaces(defs, values);
  const columns = Math.min(records.length, 2 + Number(records.length > 4));
  const rows = Math.ceil(records.length / columns);
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -35, 0) });
  world.defaultContactMaterial.restitution = .36;
  world.defaultContactMaterial.friction = .42;
  const ground = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
  ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(ground);
  const halfWidth = columns * 1.33 + .05;
  for (const [x, z, sx, sz] of [[-halfWidth, 0, .12, 3], [halfWidth, 0, .12, 3], [0, -2.7, halfWidth, .12], [0, 2.7, halfWidth, .12]]) {
    const wall = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(sx, 3, sz)) });
    wall.position.set(x, 3, z);
    world.addBody(wall);
  }
  const jitter = crypto.getRandomValues(new Uint16Array(records.length * 3));
  const dice = records.map((record, i) => {
    const shape = getShape(record.sides);
    const row = Math.floor(i / columns);
    const rowSize = Math.min(columns, records.length - row * columns);
    const x = (i % columns - (rowSize - 1) / 2) * 2.43;
    const target = viewUp.clone().multiplyScalar(((rows - 1) / 2 - row) * 2.48).add(new Vector3(x, .55, 0));
    const body = new CANNON.Body({ mass: 1, shape: shape.hull, linearDamping: .12, angularDamping: .13 });
    body.position.set(x * .7, 2.25 + (i % 2) * .34, -.9 + row * 1.65);
    body.velocity.set(x * .45, .4, 2.1 + (i % 2));
    const [spinX, spinY, spinZ] = Array.from(jitter.subarray(i * 3, i * 3 + 3), value => value / 65536);
    body.quaternion.setFromEuler(spinX * Math.PI, spinY * Math.PI, spinZ * Math.PI);
    body.angularVelocity.set(9 + spinX * 9, 3 + spinY * 8, -13 + spinZ * 9);
    if (record.fixed == null) world.addBody(body);
    return { ...record, shape, target, body, position: new Vector3(), rotation: new Quaternion(),
      final: revealRotation(shape.numbered[record.index]) };
  });
  const tumble = duration * .56;
  let handle = 0, start, last = 0;
  let canvasWidth = 0, canvasHeight = 0, pixelRatio = 1;

  function draw(reveal) {
    const width = canvas.clientWidth || canvasWidth || 240;
    const height = canvas.clientHeight || canvasHeight || 100;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (width !== canvasWidth || height !== canvasHeight || dpr !== pixelRatio) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvasWidth = width;
      canvasHeight = height;
      pixelRatio = dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const scale = Math.min(width / (columns * 2.5 + .55), height / (rows * 2.48 + .2)) * (.68 + .32 * reveal);
    const project = p => [width / 2 + p.x * scale, height / 2 - p.dot(viewUp) * scale + .47 * scale];
    const polygons = [];
    for (const [i, die] of dice.entries()) {
      // Keep the whole die visible even at the peak of its bounce.
      const [rawX, rawY] = project(die.position);
      const margin = die.shape.radius * scale + 2;
      const x = Math.max(margin, Math.min(width - margin, rawX));
      const y = Math.max(margin, Math.min(height - margin, rawY));
      const position = die.position.clone().addScaledVector(viewUp, (rawY - y) / scale);
      position.x += (x - rawX) / scale;
      const transform = v => v.clone().applyQuaternion(die.rotation).add(position);
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.beginPath();
      ctx.ellipse(x + 2, y + scale * .94, scale * .81, scale * .18, 0, 0, Math.PI * 2);
      ctx.fill();
      for (const face of die.shape.faces) {
        const normal = face.normal.clone().applyQuaternion(die.rotation);
        if (normal.dot(viewNormal) <= .001) continue;
        const center = transform(face.center);
        polygons.push({ die, face, normal, center, transform, depth: center.dot(viewNormal), i });
      }
    }
    polygons.sort((a, b) => a.depth - b.depth);
    for (const {die, face, normal, center, transform, i} of polygons) {
      const corners = face.indices.map(index => project(transform(die.shape.points[index])));
      const path = new Path2D();
      path.moveTo(...corners[0]);
      corners.slice(1).forEach(point => path.lineTo(...point));
      path.closePath();
      const light = .49 + .50 * Math.max(0, normal.dot(keyLight));
      const ivory = i % 2 === 0 ? [240, 221, 182] : [222, 198, 152];
      ctx.fillStyle = 'rgb(' + ivory.map(channel => Math.round(channel * light)).join(',') + ')';
      ctx.fill(path);
      // A fine brass edge distinguishes the flat, solid facets during rotation.
      ctx.strokeStyle = 'rgba(82,56,32,.55)';
      ctx.lineWidth = 1;
      ctx.stroke(path);
      const mark = die.marks[face.index];
      if (mark === undefined) continue;
      const [cx, cy] = project(center);
      const [rx, ry] = project(transform(face.center.clone().add(face.right)));
      const [ux, uy] = project(transform(face.center.clone().add(face.up)));
      ctx.save();
      ctx.clip(path);
      ctx.transform(rx - cx, ry - cy, cx - ux, cy - uy, cx, cy);
      // Draw in larger font units so Canvas can measure and render precisely.
      ctx.scale(.01, .01);
      ctx.font = '800 ' + Math.round(face.radius * (mark.length > 1 ? 155 : 188)) + 'px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#292017';
      ctx.fillText(mark, 0, 1, face.radius * 181);
      ctx.restore();
    }
  }

  function frame(now) {
    start ??= now;
    const elapsed = Math.min(now - start, duration);
    if (elapsed < tumble) world.step(1 / 120, Math.min((elapsed - last) / 1000, .05), 8);
    const progress = duration ? Math.max(0, (elapsed - tumble) / (duration - tumble)) : 1;
    const ease = 1 - (1 - progress) ** 3;
    for (const die of dice) {
      const { body } = die;
      if (die.fixed != null) {
        die.position.copy(die.target);
        die.rotation.copy(die.final);
      } else {
        die.position.set(body.position.x, body.position.y, body.position.z).lerp(die.target, ease);
        die.rotation.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w).slerp(die.final, ease);
      }
    }
    draw(ease);
    last = elapsed;
    if (elapsed < duration) handle = requestAnimationFrame(frame);
    else onSettled();
  }

  handle = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(handle);
}
