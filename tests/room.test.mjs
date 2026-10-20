import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { Room, EYE, LOOK, BOX } from '../web/room.js';

class Surface extends EventTarget {
  captures = new Set();
  focus() {}
  setPointerCapture(id) { this.captures.add(id); }
  hasPointerCapture(id) { return this.captures.has(id); }
  releasePointerCapture(id) { this.captures.delete(id); }
  emit(type, values = {}) {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { pointerId: 1, button: 0, isPrimary: true, clientX: 100, clientY: 100 }, values);
    this.dispatchEvent(event);
    return event;
  }
}

function roomFixture() {
  const room = Object.create(Room.prototype), canvas = new Surface(), container = new Surface(), actions = [];
  Object.assign(room, {
    container, settings: { kiosk: false, render_size: [640, 480] }, model: {},
    renderer: { domElement: canvas, setSize() {} },
    resident: new THREE.Group(), body: new THREE.Group(), dragging: false,
    camera: Object.assign(new THREE.PerspectiveCamera(42, 4 / 3, .1, 90), {}),
    ground: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    raycaster: { intersectObject: () => [{}], ray: new THREE.Ray() },
    onInteraction: (kind, payload) => actions.push({ kind, ...payload }),
  });
  room.camera.position.copy(EYE); room.camera.lookAt(LOOK);
  room.resident.position.set(.25, 0, .75);
  room.ray = event => room.raycaster.ray.set(new THREE.Vector3(event.clientX / 100, 10, event.clientY / 100), new THREE.Vector3(0, -1, 0));
  container.getBoundingClientRect = () => ({ width: 800, height: 600 });
  room.bindPointer();
  return { room, canvas, container, actions };
}

test('a fixed window: he is a third of the view and his whole box stays visible at any shape', () => {
  const { room, container } = roomFixture();
  for (const [width, height] of [[360, 720], [800, 600], [2560, 720]]) {
    container.getBoundingClientRect = () => ({ width, height });
    room.resize();
    room.camera.updateMatrixWorld();
    assert.ok(room.camera.position.equals(EYE), 'the camera never moves');
    const feet = new THREE.Vector3(0, 0, 0).project(room.camera), head = new THREE.Vector3(0, 1.7, 0).project(room.camera);
    const fraction = (head.y - feet.y) / 2;
    if (width >= height) assert.ok(fraction >= .27, `resident fills ${(fraction * 100).toFixed(1)}% at ${width}×${height}`);
    for (const [x, z] of [[-BOX.x, BOX.front], [BOX.x, BOX.front], [-BOX.x, -1.9], [BOX.x, -1.9]]) {
      for (const y of [0, 1.7]) {
        const p = new THREE.Vector3(x, y, z).project(room.camera);
        assert.ok(Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1, `corner ${x},${y},${z} visible at ${width}×${height}`);
      }
    }
  }
});

test('clicking the resident says hello without moving him', () => {
  const { canvas, actions } = roomFixture();
  canvas.emit('pointerdown');
  canvas.emit('pointerup', { clientX: 103 });
  assert.deepEqual(actions, [{ kind: 'tap' }]);
});

test('dragging preserves the grab offset and sends one move', () => {
  const { canvas, actions } = roomFixture();
  canvas.emit('pointerdown');
  canvas.emit('pointermove', { clientX: 120 });
  canvas.emit('pointerup', { clientX: 120 });
  assert.equal(actions.length, 1);
  assert.equal(actions[0].kind, 'move');
  assert.ok(Math.abs(actions[0].x - .45) < 1e-9);
  assert.equal(actions[0].z, .75);
});

test('cancelled and lost-capture drags restore position without a move penalty', () => {
  for (const reason of ['pointercancel', 'lostpointercapture']) {
    const { room, canvas, actions } = roomFixture();
    canvas.emit('pointerdown');
    canvas.emit('pointermove', { clientX: 140 });
    canvas.emit(reason);
    assert.deepEqual(room.resident.position.toArray(), [.25, 0, .75]);
    assert.equal(room.dragging, false);
    assert.deepEqual(actions, []);
  }
});

test('right clicks and secondary pointers cannot move or tap', () => {
  const { canvas, actions } = roomFixture();
  canvas.emit('pointerdown', { button: 2 });
  canvas.emit('pointerup', { button: 2 });
  canvas.emit('pointerdown');
  canvas.emit('pointermove', { pointerId: 2, isPrimary: false, clientX: 150 });
  canvas.emit('pointerup', { pointerId: 2, isPrimary: false, clientX: 150 });
  assert.deepEqual(actions, []);
  canvas.emit('pointerup');
  assert.deepEqual(actions, [{ kind: 'tap' }]);
});

test('keyboard arrows move in screen directions and Escape cancels a drag', () => {
  const { room, canvas, container, actions } = roomFixture();
  container.emit('keydown', { key: 'ArrowRight' });
  assert.equal(actions.length, 1);
  assert.equal(actions[0].kind, 'move');
  assert.ok(actions[0].x > .25 && actions[0].z === .75);
  canvas.emit('pointerdown');
  canvas.emit('pointermove', { clientX: 140 });
  container.emit('keydown', { key: 'Escape' });
  assert.equal(room.dragging, false);
  assert.equal(actions.length, 1);
});

test('appliance mode ignores room keyboard and pointer actions', () => {
  const { room, canvas, container, actions } = roomFixture();
  room.settings.kiosk = true;
  canvas.emit('pointerdown');
  canvas.emit('pointerup');
  container.emit('keydown', { key: 'ArrowRight' });
  container.emit('keydown', { key: 'Enter' });
  assert.deepEqual(actions, []);
});

test('walking knees flex backward throughout the stride and camera stays fixed', () => {
  const { room } = roomFixture();
  Object.assign(room, {
    state: {position: [0,0], yaw: 0, walking: true, seated: false, activity:'wander', feeling:'calm'},
    bones: {}, rest: {}, shadow: {position: {}, material: {}}, overlay: {textContent:''},
    speakingUntil: 0, knockPhase: 0,
  });
  const poses = new Map();
  room.pose = (name, x=0) => poses.set(name, x);
  const cameraPosition=room.camera.position.clone(), cameraRotation=room.camera.quaternion.clone();
  let leftBent=false,rightBent=false;
  for(let i=0;i<120;i++){
    room.animate(i/120*Math.PI*2/7.5,1/120);
    // This rig flexes backward with negative local X, as the seated pose does.
    assert.ok(poses.get('shin.L')<=0, 'left knee must not hyperextend forward');
    assert.ok(poses.get('shin.R')<=0, 'right knee must not hyperextend forward');
    leftBent ||= poses.get('shin.L')<-.1;
    rightBent ||= poses.get('shin.R')<-.1;
    assert.ok(room.camera.position.equals(cameraPosition));
    assert.ok(room.camera.quaternion.equals(cameraRotation));
  }
  assert.ok(leftBent && rightBent, 'both knees must flex during their swing phase');
  room.state.walking=false;room.animate(2,.016);
  assert.equal(poses.get('shin.L'),0);assert.equal(poses.get('shin.R'),0);
});
