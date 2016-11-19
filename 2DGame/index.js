import Exponent from 'exponent';
import React from 'react';
import {
  Alert,
  Dimensions,
  Image,
  PanResponder,
  View,
} from 'react-native';

// Can't use `import ...` form because THREE uses oldskool module stuff.
const THREE = require('three');

// `THREEView` wraps a `GLView` and creates a THREE renderer that uses
// that `GLView`. The class needs to be constructed with a factory so that
// the `THREE` module can be injected without exponent-sdk depending on the
// `'three'` npm package.
const THREEView = Exponent.createTHREEViewClass(THREE);

import Assets from '../Assets';


//// Game

// Render the game as a `View` component.

export default class Game extends React.Component {
  shouldComponentUpdate() {
    return false;
  }
  render() {

  this.shouldComponentUpdate = () => { return false; };

  //// Camera

  // An orthographic projection from 3d to 2d can be viewed as simply dropping
  // one of the 3d dimensions (say 'Z'), after some rotation and scaling. The
  // scaling here is specified by the width and height of the camera's view,
  // which ends up defining the boundaries of the viewport through which the
  // 2d world is visualized.
  //
  // Let `p`, `q` be two distinct points that are sent to the same point in 2d
  // space. The direction of `p - q` (henceforth 'Z') then serves simply to
  // specify depth (ordering of overlap) between the 2d elements of this world.
  //
  // The width of the view will be 4 world-space units. The height is set based
  // on the phone screen's aspect ratio.
  const width = 4;
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const height = (screenHeight / screenWidth) * width;
  const camera = new THREE.OrthographicCamera(
    -width / 2, width / 2,
    height / 2, -height / 2,
    1, 10000,
  );
  camera.position.z = 1000;

  let translateWindowToGLCoordinates = ({x, y}) => {
    let xp = (x / screenWidth);
    let yp = (y / screenHeight);
    let tx = xp * width;
    let ty = yp * height;

    return {
      x: (tx - width / 2),
      y: - (ty - height / 2),
    };

  };



  //// Scene, sprites

  // We just use a regular `THREE.Scene`
  const scene = new THREE.Scene();

  // Making a sprite involves three steps which are outlined below. You probably
  // would want to combine them into a utility function with defaults pertinent
  // to your game.

  // 1: Geometry
  // This defines the local shape of the object. In this case the geometry
  // will simply be a 1x1 plane facing the camera.
  let size = 1.2
  const geometry = new THREE.PlaneBufferGeometry(size, size / 2);

  // 2: Material
  // This defines how the surface of the shape is painted. In this case we
  // want to paint a texture loaded from an asset and also tint it.
  // Nearest-neighbor filtering with `THREE.NearestFilter` is nice for
  // pixel art styles.
  const texture = THREEView.textureFromAsset(Assets['shark']);
  texture.minFilter = texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    // color: 0xff0000,    // Sprites can be tinted with a color.
    transparent: true,  // Use the image's alpha channel for alpha.
  });

  // 3: Mesh
  // A mesh is a node in THREE's scenegraph and refers to a geometry and a
  // material to draw itself. It can be translated and rotated as any other
  // scenegraph node.
  const mesh = new THREE.Mesh(geometry, material);
  // scene.add(mesh);

  // Geometries and materials can be reused.
  const mesh2 = new THREE.Mesh(geometry, material);
  mesh2.position.x = mesh2.position.y = 0.5;
  mesh2.position.z = -40;     // This puts this sprite behind our previous one.
  mesh2.rotation.z = Math.PI;
  // scene.add(mesh2);

  const aquariumGeometry = new THREE.PlaneBufferGeometry(width, height);
  const aquariumTexture = THREEView.textureFromAsset(Assets['aquarium']);
  aquariumTexture.minFilter = aquariumTexture.magFilter = THREE.NearestFilter;
  aquariumTexture.needsUpdate = true;

  const materialAquarium = new THREE.MeshBasicMaterial({
    map: aquariumTexture,
    // color: 0xff0000,    // Sprites can be tinted with a color.
    transparent: true,  // Use the image's alpha channel for alpha.
  });

  const aquariumMesh = new THREE.Mesh(aquariumGeometry, materialAquarium);
  aquariumMesh.position.x = 0;
  aquariumMesh.position.y = 0;
  aquariumMesh.position.z = -50;
  aquariumMesh.rotation.z = Math.PI;
  scene.add(aquariumMesh);

  const dubloonSize = 0.6;
  const dubloonGeometry = new THREE.PlaneBufferGeometry(1 * dubloonSize, 1 * dubloonSize);
  const dubloonTexture = THREEView.textureFromAsset(Assets['dubloon']);
  dubloonTexture.minFilter = dubloonTexture.magFilter = THREE.NearestFilter;
  dubloonTexture.needsUpdate = true;

  const dubloonMaterial = new THREE.MeshBasicMaterial({
    map: dubloonTexture,
    color: '#ffcc00',
    transparent: true,
  });

  const dubloonMesh = new THREE.Mesh(dubloonGeometry, dubloonMaterial);
  dubloonMesh.position.x = 0;
  dubloonMesh.position.y = 0;
  dubloonMesh.position.z = -30;
  dubloonMesh.rotation.z = Math.PI;
  scene.add(dubloonMesh);

  let randomlyPlaceDubloon = () => {
    dubloonMesh.position.x = Math.random() * width - (width / 2);
    dubloonMesh.position.y = Math.random() * height - (height / 2);
  }
  randomlyPlaceDubloon();

  let score = 0;


  const diverFactor = 2;
  const diverGeometry = new THREE.PlaneBufferGeometry(1 / diverFactor, 2 / diverFactor);
  const diverTexture = THREEView.textureFromAsset(Assets['diver']);
  diverTexture.minFilter = diverTexture.magFilter = THREE.NearestFilter;
  diverTexture.needsUpdate = true;

  const diverMaterial = new THREE.MeshBasicMaterial({
    map: diverTexture,
    color: 'white',
    transparent: true,
  });

  const diverMesh = new THREE.Mesh(diverGeometry, diverMaterial);
  diverMesh.position.x = 0;
  diverMesh.position.y = -1.5;
  diverMesh.position.z = -20;
  diverMesh.rotation.z = Math.PI;
  scene.add(diverMesh);

  let target = {
    on: true,
    x: diverMesh.position.x,
    y: diverMesh.position.y,
    rotation: diverMesh.rotation.z,
  };

  let current = {
    x: diverMesh.position.x,
    y: diverMesh.position.y,
    rotation: diverMesh.rotation.z,
    speed: 0.01,
  };





  //// Events

  // This function is called every frame, with `dt` being the time in seconds
  // elapsed since the last call.
  const tick = (dt) => {

    let ddx = Math.abs(current.x - dubloonMesh.position.x);
    let ddy = Math.abs(current.y - dubloonMesh.position.y);
    if ((ddx < dubloonSize) && (ddy < dubloonSize)) {
      // WIN
      score += 1;
      this.props.setScore(score);
      randomlyPlaceDubloon();
    }

    mesh.rotation.z += 2 * dt;
    let rd1 = target.rotation - current.rotation;
    let rd2 = target.rotation + Math.PI * 2 - current.rotation;
    let rd3 = target.rotation - Math.PI * 2 - current.rotation;
    let rd = rd1;
    if (Math.abs(rd2) < Math.abs(rd)) {
      rd = rd2;
    }
    if (Math.abs(rd3) < Math.abs(rd)) {
      rd = rd3;
    }

    if (Math.random() < 0.01) {
      // console.log({rd, targetRotation: target.rotation, currentRotation: current.rotation,});
    }
    if (Math.abs(rd) > Math.PI) {
      // console.log("Something is wrong-- ", {rd,});
    }

    // console.log({rd})  ;

    // console.log({rd});
    current.rotation += (rd / 20);

    let dx = - Math.sin(current.rotation + Math.PI) * current.speed;
    let dy = Math.cos(current.rotation + Math.PI) * current.speed;
    current.x = current.x + dx;
    current.y = current.y + dy;
    diverMesh.position.x = current.x
    diverMesh.position.y = current.y;
    diverMesh.rotation.z = current.rotation;

  }

  // These functions are called on touch and release of the view respectively.
  const touch = (_, gesture) => {
    // console.log("TOUCH:", {
    //   gesture,
    // });
    material.color.setHex(0x00ff00);
  };
  const release = (_, gesture) => {
    // console.log("RELEASE:", {
    //   gesture,
    // });

    material.color.set('white');

    // material.color.setHex(0xff0000);
  }

  const panMove = (_, gesture) => {
    let {x, y} = translateWindowToGLCoordinates({
      x: gesture.x0,
      y: gesture.y0,
    });

    target.x = x;
    target.y = y;

    // compute angle
    let tr = Math.atan2((target.x - current.x), (current.y - target.y));
    if (tr < 0) {
      tr += Math.PI * 2;
    }
    if (tr > Math.PI * 2) {
      tr -= Math.PI * 2;
    }
    target.rotation = tr;


    // diverMesh.position.x = x;
    // diverMesh.position.y = y;
    // console.log("MOVE:", {
    //   gesture, x, y,
    // });

  };


  //// React component

  // We bind our `touch` and `release` callbacks using a `PanResponder`. The
  // `THREEView` takes our `scene` and `camera` and renders them every frame.
  // It also takes our `tick` callbacks and calls it every frame.
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: touch,
    onPanResponderRelease: release,
    onPanResponderTerminate: release,
    onPanResponderMove: panMove,
    onShouldBlockNativeResponder: () => false,
  });
  return (
      <THREEView
        {...this.props}
        {...panResponder.panHandlers}
        scene={scene}
        camera={camera}
        tick={tick}
      />
  );
}
}
