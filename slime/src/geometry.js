import * as THREE from '../../kart3d/vendor/three.module.min.js';
import { mergeVertices } from '../../kart3d/vendor/BufferGeometryUtils.js';
// Icosahedral triangles avoid pinched poles and give uniformly spaced springs.
export function jellyTopology(coarse){
  const g=new THREE.IcosahedronGeometry(1,coarse?20:26);g.deleteAttribute('normal');g.deleteAttribute('uv');
  const shared=mergeVertices(g,1e-5);g.dispose();
  const unit=shared.attributes.position.array.slice(),indices=shared.index.array.slice();shared.dispose();
  return{unit,indices};
}
