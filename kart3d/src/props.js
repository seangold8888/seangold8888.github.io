// 블렌더에서 만든 로우폴리 소품(props.glb)을 한 번 읽어 두고, 이름별 지오메트리·재질을 돌려준다.
// 재질은 씬의 다른 물체와 같은 Lambert 로 바꿔 조명 톤을 맞추고 드로우 비용을 낮춘다.
import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';

let promise = null;
const cache = new Map();

export function loadProps(url = './assets/props.glb') {
  if (promise) return promise;
  promise = new Promise((resolve) => {
    const loader = new GLTFLoader();
    loader.load(url, (gltf) => {
      gltf.scene.traverse((node) => {
        if (!node.isMesh) return;
        // 한 소품이 재질 여러 개면 그룹으로 나뉘어 있다(geometry.groups + 재질 배열).
        const mats = Array.isArray(node.material) ? node.material : [node.material];
        const lambert = mats.map((m) => new THREE.MeshLambertMaterial({ color: m.color ? m.color.clone() : 0xffffff }));
        const name = node.name.replace(/\.\d+$/, '');
        cache.set(name, { geometry: node.geometry, material: lambert.length === 1 ? lambert[0] : lambert });
      });
      resolve(cache);
    }, undefined, (err) => {
      console.warn('소품 glb를 읽지 못했어요. 기본 도형으로 그립니다.', err);
      resolve(cache);
    });
  });
  return promise;
}

export function prop(name) { return cache.get(name) || null; }
export function propsReady() { return cache.size > 0; }
