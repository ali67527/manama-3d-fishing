import * as THREE from 'three';

export const BAHRAINI_FISHES = [
  {
    id: 'safi',
    nameAr: 'صافي بحريني',
    nameEn: 'Safi (Rabbitfish)',
    rarity: 'عادي',
    rarityClass: 'common',
    minWeight: 0.3,
    maxWeight: 1.2,
    basePrice: 2.5,
    color: 0x8c9ea3,
    accentColor: 0x3d4d52,
    bodyType: 'oval',
    pullForce: 0.8,
    resistInterval: 2500,
    description: 'من أشهر الأسماك البحرينية المحبوبة، جسمه بيضاوي مفلطح ولذيذ جداً عند القلي.'
  },
  {
    id: 'shaari',
    nameAr: 'شعري خليجي',
    nameEn: 'Shaari (Emperor)',
    rarity: 'عادي',
    rarityClass: 'common',
    minWeight: 0.5,
    maxWeight: 2.5,
    basePrice: 4.0,
    color: 0xd4af37,
    accentColor: 0xaa8822,
    bodyType: 'high_back',
    pullForce: 1.0,
    resistInterval: 2200,
    description: 'سمكة ذهبية بظهر مرتفع، تتواجد بكثرة قرب كورنيش المنامة والمكاسر الصخرية.'
  },
  {
    id: 'faskar',
    nameAr: 'فسكر ملون',
    nameEn: 'Faskar (Two-bar Bream)',
    rarity: 'غير عادي',
    rarityClass: 'uncommon',
    minWeight: 0.4,
    maxWeight: 1.8,
    basePrice: 6.5,
    color: 0xf1c40f,
    accentColor: 0x2c3e50,
    bodyType: 'striped',
    pullForce: 1.1,
    resistInterval: 2000,
    description: 'سمكة زاهية الألوان بشرائط سوداء وصفراء تميز مياه الخليج العربي.'
  },
  {
    id: 'badah',
    nameAr: 'بدح فضي',
    nameEn: 'Badah (Mojarra)',
    rarity: 'عادي',
    rarityClass: 'common',
    minWeight: 0.2,
    maxWeight: 0.8,
    basePrice: 2.0,
    color: 0xbdc3c7,
    accentColor: 0x7f8c8d,
    bodyType: 'small',
    pullForce: 0.6,
    resistInterval: 2800,
    description: 'سمكة صغيرة لامعة تتواجد في المياه الضحلة والسواحل الرملية.'
  },
  {
    id: 'sbeity',
    nameAr: 'سبيطي ملكي',
    nameEn: 'Sbeity (Seabream)',
    rarity: 'نادر',
    rarityClass: 'rare',
    minWeight: 1.5,
    maxWeight: 5.5,
    basePrice: 16.0,
    color: 0x34495e,
    accentColor: 0x1abc9c,
    bodyType: 'torpedo',
    pullForce: 1.6,
    resistInterval: 1600,
    description: 'ملك الأسماك البحرينية! سمكة حذرة وقوية جداً تتطلب مهارة عالية لسحبها.'
  },
  {
    id: 'agam',
    nameAr: 'قام (عقام)',
    nameEn: 'Agam (Barracuda)',
    rarity: 'نادر',
    rarityClass: 'rare',
    minWeight: 2.0,
    maxWeight: 7.0,
    basePrice: 22.0,
    color: 0x27ae60,
    accentColor: 0x2ecc71,
    bodyType: 'barracuda',
    pullForce: 1.9,
    resistInterval: 1400,
    description: 'مفترس سريع بجسم استواني طويل وأسنان حادة يهاجم الطعم بقوة عالية.'
  },
  {
    id: 'chanad',
    nameAr: 'كنعد خليجي',
    nameEn: 'Chanad (King Mackerel)',
    rarity: 'نادر',
    rarityClass: 'rare',
    minWeight: 3.0,
    maxWeight: 10.0,
    basePrice: 32.0,
    color: 0x2980b9,
    accentColor: 0x3498db,
    bodyType: 'streamlined',
    pullForce: 2.2,
    resistInterval: 1200,
    description: 'من أسرع وأقوى الأسماك السابحة في الأعماق، ذو قيمة اقتصادية وغذائية ممتازة.'
  },
  {
    id: 'hamour',
    nameAr: 'هامور بحريني أسطوري',
    nameEn: 'Hamour (Bahraini Grouper)',
    rarity: 'أسطوري',
    rarityClass: 'legendary',
    minWeight: 4.0,
    maxWeight: 14.0,
    basePrice: 55.0,
    color: 0xe67e22,
    accentColor: 0xd35400,
    bodyType: 'grouper',
    pullForce: 2.7,
    resistInterval: 900,
    description: 'فخر البحرين والخليج! سمكة ضخمة أسطورية تعيش بين الشُعب والمكاسر.'
  },
  {
    id: 'naiser',
    nameAr: 'نيسر مخطط',
    nameEn: 'Naiser (Sweetlips)',
    rarity: 'غير عادي',
    rarityClass: 'uncommon',
    minWeight: 0.6,
    maxWeight: 2.2,
    basePrice: 8.0,
    color: 0x9b59b6,
    accentColor: 0x8e44ad,
    bodyType: 'sweetlips',
    pullForce: 1.2,
    resistInterval: 1900,
    description: 'سمكة ملونة بشفاه عريضة وخطوط أرجوانية زاهية.'
  },
  {
    id: 'sobaity_gold',
    nameAr: 'صبيطي ذهبي',
    nameEn: 'Golden Seabream',
    rarity: 'نادر',
    rarityClass: 'rare',
    minWeight: 1.8,
    maxWeight: 6.0,
    basePrice: 20.0,
    color: 0xf39c12,
    accentColor: 0xe67e22,
    bodyType: 'yellowfin',
    pullForce: 1.7,
    resistInterval: 1500,
    description: 'نوع فاخر جداً بذيل وزعانف صفراء براقة وقوة سحب متواصلة.'
  },
  {
    id: 'bayad',
    nameAr: 'بياض المنامة',
    nameEn: 'Bayad (Snapper)',
    rarity: 'غير عادي',
    rarityClass: 'uncommon',
    minWeight: 0.8,
    maxWeight: 3.2,
    basePrice: 10.0,
    color: 0xecf0f1,
    accentColor: 0x95a5a6,
    bodyType: 'snapper',
    pullForce: 1.3,
    resistInterval: 1800,
    description: 'سمكة بيضاء براقة تعيش قرب كورنيش المنامة ولها طعم شهي.'
  },
  {
    id: 'jesh',
    nameAr: 'جش عالي السرعة',
    nameEn: 'Jesh (Trevally)',
    rarity: 'نادر',
    rarityClass: 'rare',
    minWeight: 1.2,
    maxWeight: 4.8,
    basePrice: 18.0,
    color: 0x16a085,
    accentColor: 0x1abc9c,
    bodyType: 'trevally',
    pullForce: 1.8,
    resistInterval: 1300,
    description: 'سمكة رياضية مفلطحة وسريعة القفز فوق سطح البحر.'
  },
  {
    id: 'sheim',
    nameAr: 'شيم خوري أسطوري',
    nameEn: 'Sheim (Threadfin)',
    rarity: 'أسطوري',
    rarityClass: 'legendary',
    minWeight: 3.5,
    maxWeight: 12.0,
    basePrice: 60.0,
    color: 0xe74c3c,
    accentColor: 0xc0392b,
    bodyType: 'high_back',
    pullForce: 2.8,
    resistInterval: 850,
    description: 'من أندر وأغلى أسماك البحرين التاريخية، ذات خيوط صدرية ممتدة.'
  },
  {
    id: 'rabeeh',
    nameAr: 'ربيب بحريني',
    nameEn: 'Golden Trevally',
    rarity: 'غير عادي',
    rarityClass: 'uncommon',
    minWeight: 0.9,
    maxWeight: 3.5,
    basePrice: 11.0,
    color: 0xf1c40f,
    accentColor: 0xd4af37,
    bodyType: 'trevally',
    pullForce: 1.4,
    resistInterval: 1700,
    description: 'سمكة ذهبية بشرائط سوداء رفيعة تحب السباحة في مجموعات.'
  },
  {
    id: 'hamra',
    nameAr: 'حمراء خائرية',
    nameEn: 'Red Emperor',
    rarity: 'نادر',
    rarityClass: 'rare',
    minWeight: 2.2,
    maxWeight: 8.0,
    basePrice: 28.0,
    color: 0xc0392b,
    accentColor: 0x962d22,
    bodyType: 'snapper',
    pullForce: 2.0,
    resistInterval: 1250,
    description: 'سمكة حمراء زاهية تعيش في الأعماق الصخرية وتتمتع بقوة شد عالية.'
  },
  {
    id: 'qarqfan',
    nameAr: 'قرقفان مخطط',
    nameEn: 'Qarqfan (Striped Seabream)',
    rarity: 'عادي',
    rarityClass: 'common',
    minWeight: 0.3,
    maxWeight: 1.5,
    basePrice: 3.5,
    color: 0xbdc3c7,
    accentColor: 0x34495e,
    bodyType: 'striped',
    pullForce: 0.9,
    resistInterval: 2400,
    description: 'سمكة شاطئية مخططة بخطوط فضية وسوداء سهلة الصيد للمبتدئين.'
  }
];

export function create3DFishMesh(fishData) {
  const group = new THREE.Group();
  const mainMat = new THREE.MeshStandardMaterial({
    color: fishData.color,
    emissive: fishData.color,
    emissiveIntensity: 0.25,
    roughness: 0.3,
    metalness: 0.4
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: fishData.accentColor,
    roughness: 0.4
  });

  let bodyGeo;
  switch (fishData.bodyType) {
    case 'grouper':
      bodyGeo = new THREE.SphereGeometry(0.7, 16, 16);
      bodyGeo.scale(1.4, 0.9, 0.6);
      break;
    case 'barracuda':
      bodyGeo = new THREE.CylinderGeometry(0.2, 0.3, 2.2, 12);
      bodyGeo.rotateZ(Math.PI / 2);
      break;
    case 'streamlined':
      bodyGeo = new THREE.ConeGeometry(0.45, 1.8, 12);
      bodyGeo.rotateZ(-Math.PI / 2);
      break;
    case 'high_back':
      bodyGeo = new THREE.SphereGeometry(0.65, 16, 16);
      bodyGeo.scale(1.2, 1.3, 0.45);
      break;
    case 'sweetlips':
    case 'yellowfin':
    case 'snapper':
    case 'trevally':
    case 'striped':
    case 'oval':
    default:
      bodyGeo = new THREE.SphereGeometry(0.6, 16, 16);
      bodyGeo.scale(1.3, 0.8, 0.4);
      break;
  }

  const bodyMesh = new THREE.Mesh(bodyGeo, mainMat);
  group.add(bodyMesh);

  // Tail fin
  const tailGeo = new THREE.BufferGeometry();
  const tailVertices = new Float32Array([
    -0.7, 0, 0,
    -1.3, 0.5, 0,
    -1.3, -0.5, 0
  ]);
  tailGeo.setAttribute('position', new THREE.BufferAttribute(tailVertices, 3));
  tailGeo.computeVertexNormals();
  const tailMesh = new THREE.Mesh(tailGeo, accentMat);
  group.add(tailMesh);

  // Dorsal fin
  const dorsalGeo = new THREE.BufferGeometry();
  const dorsalVertices = new Float32Array([
    0.2, 0.5, 0,
    -0.4, 0.9, 0,
    -0.5, 0.4, 0
  ]);
  dorsalGeo.setAttribute('position', new THREE.BufferAttribute(dorsalVertices, 3));
  dorsalGeo.computeVertexNormals();
  const dorsalMesh = new THREE.Mesh(dorsalGeo, accentMat);
  group.add(dorsalMesh);

  // Eyes (White + Black pupil)
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const eyeGeo = new THREE.SphereGeometry(0.1, 8, 8);
  const pupilGeo = new THREE.SphereGeometry(0.05, 8, 8);

  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(0.4, 0.15, 0.22);
  const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
  leftPupil.position.set(0.44, 0.15, 0.28);

  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.4, 0.15, -0.22);
  const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
  rightPupil.position.set(0.44, 0.15, -0.28);

  group.add(leftEye, leftPupil, rightEye, rightPupil);

  // Mouth
  const mouthMat = new THREE.MeshBasicMaterial({ color: 0xc0392b });
  const mouthGeo = new THREE.SphereGeometry(0.09, 8, 8);
  const mouth = new THREE.Mesh(mouthGeo, mouthMat);
  mouth.position.set(0.62, -0.05, 0);
  group.add(mouth);

  return group;
}
