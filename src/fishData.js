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
    basePrice: 15,
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
    basePrice: 25,
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
    basePrice: 35,
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
    basePrice: 12,
    color: 0xbdc3c7,
    accentColor: 0x7f8c8d,
    bodyType: 'small',
    pullForce: 0.6,
    resistInterval: 2800,
    description: 'سمكة فضية صغيرة الحجم سريعة الحركة قرب السواحل الرملية.'
  },
  {
    id: 'sbeity',
    nameAr: 'صبيطي ملكي',
    nameEn: 'Sbeity (Silvery Bream)',
    rarity: 'نادر',
    rarityClass: 'rare',
    minWeight: 1.5,
    maxWeight: 6.0,
    basePrice: 85,
    color: 0x95a5a6,
    accentColor: 0x34495e,
    bodyType: 'streamlined',
    pullForce: 1.6,
    resistInterval: 1600,
    description: 'سمكة ذكية ومقاومة جداً، تعتبر هدفاً رئيسياً لكل صياد بحريني محترف.'
  },
  {
    id: 'agam',
    nameAr: 'عقام جبار',
    nameEn: 'Agam (Barracuda)',
    rarity: 'نادر',
    rarityClass: 'rare',
    minWeight: 2.0,
    maxWeight: 8.0,
    basePrice: 110,
    color: 0x7f8c8d,
    accentColor: 0x2c3e50,
    bodyType: 'barracuda',
    pullForce: 2.0,
    resistInterval: 1300,
    description: 'مفترس سريع بجسم اسطواني مستطيل وأسنان حادة وقوة سحب هائلة.'
  },
  {
    id: 'chanad',
    nameAr: 'كنعد ذهبي',
    nameEn: 'Chanad (King Mackerel)',
    rarity: 'مبهر',
    rarityClass: 'epic',
    minWeight: 3.0,
    maxWeight: 12.0,
    basePrice: 180,
    color: 0x3498db,
    accentColor: 0xf1c40f,
    bodyType: 'torpedo',
    pullForce: 2.4,
    resistInterval: 1100,
    description: 'من أسرع وأغلى أسماك البحرين، جسم انسيابي كالصاوخ يقطع المياه بقوة.'
  },
  {
    id: 'hamour',
    nameAr: 'هامور بحريني فاخر',
    nameEn: 'Hamour (Grouper)',
    rarity: 'أسطوري',
    rarityClass: 'legendary',
    minWeight: 4.0,
    maxWeight: 18.0,
    basePrice: 300,
    color: 0xe67e22,
    accentColor: 0xd35400,
    bodyType: 'grouper',
    pullForce: 2.8,
    resistInterval: 900,
    description: 'ملك أسماك الخليج بلا منازع! حجم ضخم وقوة سحب أسطورية تجني لك ثروة كبيرة.'
  },
  {
    id: 'naiser',
    nameAr: 'نيسر مخطط',
    nameEn: 'Naiser (Sweetlips)',
    rarity: 'غير عادي',
    rarityClass: 'uncommon',
    minWeight: 0.6,
    maxWeight: 2.2,
    basePrice: 40,
    color: 0x1abc9c,
    accentColor: 0x16a085,
    bodyType: 'sweetlips',
    pullForce: 1.2,
    resistInterval: 1900,
    description: 'سمكة بكتف مرتفع وشفاه بارزة وألوان مميزة تعيش قرب الشعب المرجانية.'
  },
  {
    id: 'sobaity_yellow',
    nameAr: 'صبيطي أصفر الزعنفة',
    nameEn: 'Yellowfin Seabream',
    rarity: 'نادر',
    rarityClass: 'rare',
    minWeight: 1.2,
    maxWeight: 4.5,
    basePrice: 75,
    color: 0xf39c12,
    accentColor: 0xe67e22,
    bodyType: 'yellowfin',
    pullForce: 1.5,
    resistInterval: 1700,
    description: 'نوع نادر من الصبيطي يتميز بزعانفه ذات اللون الأصفر الذهبي البراق.'
  },
  {
    id: 'bayad',
    nameAr: 'بياض حمراء',
    nameEn: 'Bayad (Red Snapper)',
    rarity: 'مبهر',
    rarityClass: 'epic',
    minWeight: 2.5,
    maxWeight: 9.0,
    basePrice: 150,
    color: 0xe74c3c,
    accentColor: 0xc0392b,
    bodyType: 'snapper',
    pullForce: 2.2,
    resistInterval: 1200,
    description: 'سمكة بياض ذات لون أحمر ياقوتي وجسم قوي تعيش في أعماق المياه الخليجية.'
  },
  {
    id: 'jesh',
    nameAr: 'جش ناعم',
    nameEn: 'Jesh (Trevally)',
    rarity: 'أسطوري',
    rarityClass: 'legendary',
    minWeight: 3.5,
    maxWeight: 15.0,
    basePrice: 250,
    color: 0x9b59b6,
    accentColor: 0x8e44ad,
    bodyType: 'trevally',
    pullForce: 2.6,
    resistInterval: 1000,
    description: 'سمكة سريعة للغاية بجسم مفلطح وقوي، تقاوم بشراسة عند تعليقها بالسنارة.'
  }
];

export function create3DFishMesh(fishData) {
  const fishGroup = new THREE.Group();

  const mainColor = fishData.color || 0x3498db;
  const accentColor = fishData.accentColor || 0x2980b9;

  const bodyMat = new THREE.MeshStandardMaterial({
    color: mainColor,
    roughness: 0.3,
    metalness: 0.2
  });

  const finMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.4,
    side: THREE.DoubleSide
  });

  let bodyMesh;

  // ANATOMICALLY PROPORTIONAL FISH BODY GEOMETRIES
  if (fishData.bodyType === 'grouper') {
    // Thick oval body with taper
    const geo = new THREE.SphereGeometry(0.7, 32, 16);
    geo.scale(1.6, 1.0, 0.65);
    bodyMesh = new THREE.Mesh(geo, bodyMat);
  } else if (fishData.bodyType === 'torpedo' || fishData.bodyType === 'barracuda') {
    // Elongated torpedo shape
    const geo = new THREE.ConeGeometry(0.45, 2.4, 16);
    geo.rotateZ(-Math.PI / 2);
    geo.scale(1.0, 0.7, 0.7);
    bodyMesh = new THREE.Mesh(geo, bodyMat);
  } else if (fishData.bodyType === 'striped' || fishData.bodyType === 'high_back') {
    // Tall diamond oval
    const geo = new THREE.SphereGeometry(0.65, 32, 16);
    geo.scale(1.4, 1.3, 0.55);
    bodyMesh = new THREE.Mesh(geo, bodyMat);
  } else {
    // Standard sleek stream fish
    const geo = new THREE.SphereGeometry(0.6, 32, 16);
    geo.scale(1.5, 0.85, 0.5);
    bodyMesh = new THREE.Mesh(geo, bodyMat);
  }

  fishGroup.add(bodyMesh);

  // PROPORTIONAL EYES (Small, correctly placed on head sides)
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x050505 });

  // Left Eye
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), eyeMat);
  eyeL.position.set(0.55, 0.12, 0.22);
  const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), pupilMat);
  pupilL.position.set(0.58, 0.12, 0.26);
  fishGroup.add(eyeL, pupilL);

  // Right Eye
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), eyeMat);
  eyeR.position.set(0.55, 0.12, -0.22);
  const pupilR = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), pupilMat);
  pupilR.position.set(0.58, 0.12, -0.26);
  fishGroup.add(eyeR, pupilR);

  // PROPORTIONAL MOUTH (Small at snout tip)
  const mouth = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.07, 12), new THREE.MeshBasicMaterial({ color: 0xc0392b, side: THREE.DoubleSide }));
  mouth.rotation.y = Math.PI / 2;
  mouth.position.set(0.78, -0.05, 0);
  fishGroup.add(mouth);

  // TAIL FIN (Caudal Fin at rear tip -0.85)
  const tailShape = new THREE.Shape();
  tailShape.moveTo(0, 0);
  tailShape.lineTo(-0.45, 0.35);
  tailShape.lineTo(-0.35, 0);
  tailShape.lineTo(-0.45, -0.35);
  tailShape.closePath();

  const tailGeo = new THREE.ShapeGeometry(tailShape);
  const tailMesh = new THREE.Mesh(tailGeo, finMat);
  tailMesh.position.set(-0.75, 0, 0);
  fishGroup.add(tailMesh);

  // DORSAL FIN (Top)
  const dorsalShape = new THREE.Shape();
  dorsalShape.moveTo(-0.4, 0);
  dorsalShape.lineTo(-0.1, 0.35);
  dorsalShape.lineTo(0.3, 0);
  dorsalShape.closePath();

  const dorsalGeo = new THREE.ShapeGeometry(dorsalShape);
  const dorsalMesh = new THREE.Mesh(dorsalGeo, finMat);
  dorsalMesh.position.set(0, 0.45, 0);
  fishGroup.add(dorsalMesh);

  // PECTORAL FINS (Side fins)
  const pecGeo = new THREE.ConeGeometry(0.12, 0.35, 3);
  pecGeo.rotateX(Math.PI / 2);

  const pecL = new THREE.Mesh(pecGeo, finMat);
  pecL.position.set(0.1, -0.15, 0.32);
  pecL.rotation.y = Math.PI / 4;

  const pecR = new THREE.Mesh(pecGeo, finMat);
  pecR.position.set(0.1, -0.15, -0.32);
  pecR.rotation.y = -Math.PI / 4;

  fishGroup.add(pecL, pecR);

  return fishGroup;
}
