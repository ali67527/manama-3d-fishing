import * as THREE from 'three';
import { create3DFishMesh, BAHRAINI_FISHES } from './fishData.js';

export class EnvironmentManager {
    constructor(scene) {
        this.scene = scene;
        this.turbines = [];
        this.boats = [];
        this.npcs = [];
        this.npcFishermen = [];
        this.onlinePlayers = []; // Other online players on the pier!
        this.cars = [];
        this.clouds = [];
        this.beacons = [];
        this.streetLights = [];
        this.lighthouseLight = null;

        // Time System
        this.timeMode = 'sunset';
        this.autoTimeEnabled = true;
        this.sunsetTimer = 0;
        this.dayCycleTimer = 0;

        // Rare Rain Weather
        this.rainActive = false;
        this.rainTimer = 0;
        this.rainParticles = null;

        this.setupSkyAndLights();
        this.createCloudsAndSun();
        this.createWaterAndSeaFoam();
        this.createRainSystem();
        this.createShorelineRocks();
        this.createGroundedSolidIslands();
        this.createManamaSkyline();
        this.createCoastlineVillas();
        this.createStreetAndCars();
        this.createPromenadeAndPier();
        this.createFishMarketKiosks();
        this.createPierFishVendor();
        this.createGroundedCooler();
        this.createSingleDetailedYacht();
        this.createDynamicNPCFishermen();
        this.createDiverseMaleAndFemaleNPCs();
        this.createCleanPalmTreesPromenade();
    }

    setupSkyAndLights() {
        this.scene.background = new THREE.Color(0x74b9ff);
        this.scene.fog = new THREE.FogExp2(0x74b9ff, 0.0005);

        this.ambientLight = new THREE.AmbientLight(0xffecd2, 1.0);
        this.scene.add(this.ambientLight);

        this.dirLight = new THREE.DirectionalLight(0xfffa65, 2.4);
        this.dirLight.position.set(0, 400, -600);
        this.dirLight.castShadow = true;
        this.scene.add(this.dirLight);
    }

    createCloudsAndSun() {
        const sunGroup = new THREE.Group();
        const sunMesh = new THREE.Mesh(
            new THREE.SphereGeometry(45, 32, 32),
            new THREE.MeshBasicMaterial({ color: 0xffea00 })
        );
        const sunHalo = new THREE.Mesh(
            new THREE.RingGeometry(45, 75, 32),
            new THREE.MeshBasicMaterial({ color: 0xfffa65, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
        );
        sunGroup.add(sunMesh, sunHalo);
        sunGroup.position.set(0, 500, -1300);
        this.scene.add(sunGroup);
        this.sunGroup = sunGroup;

        for (let i = 0; i < 28; i++) {
            const cloudGroup = new THREE.Group();
            for (let j = 0; j < 12; j++) {
                const puffGeo = new THREE.SphereGeometry(Math.random() * 16 + 10, 16, 16);
                const puffMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
                const puff = new THREE.Mesh(puffGeo, puffMat);
                puff.position.set((j - 6) * 9 + (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 8);
                cloudGroup.add(puff);
            }

            const zPos = (i % 2 === 0) ? (Math.random() * 300 - 150) : (Math.random() * 500 - 600);
            cloudGroup.position.set(Math.random() * 1400 - 700, Math.random() * 80 + 240, zPos);
            this.scene.add(cloudGroup);
            this.clouds.push({ mesh: cloudGroup, speed: Math.random() * 5 + 3 });
        }
    }

    createWaterAndSeaFoam() {
        const waterGeo = new THREE.PlaneGeometry(3000, 3000, 128, 128);
        const waterMat = new THREE.MeshPhongMaterial({
            color: 0x0077ff,
            emissive: 0x001144,
            specular: 0xffffff,
            shininess: 110,
            side: THREE.DoubleSide
        });

        this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
        this.waterMesh.rotation.x = -Math.PI / 2;
        this.waterMesh.position.y = 0;
        this.scene.add(this.waterMesh);

        const foamGeo = new THREE.PlaneGeometry(420, 6);
        foamGeo.rotateX(-Math.PI / 2);
        const foamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65 });
        const foamMesh = new THREE.Mesh(foamGeo, foamMat);
        foamMesh.position.set(0, 0.05, 1.8);
        this.scene.add(foamMesh);
        this.foamMesh = foamMesh;
    }

    createRainSystem() {
        const rainCount = 800;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(rainCount * 6);

        for (let i = 0; i < rainCount; i++) {
            const x = Math.random() * 500 - 250;
            const y = Math.random() * 120 + 5;
            const z = Math.random() * 300 - 100;

            positions[i * 6] = x;
            positions[i * 6 + 1] = y;
            positions[i * 6 + 2] = z;

            positions[i * 6 + 3] = x;
            positions[i * 6 + 4] = y - 2.5;
            positions[i * 6 + 5] = z;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.LineBasicMaterial({ color: 0xa4b0be, transparent: true, opacity: 0.7 });

        this.rainParticles = new THREE.LineSegments(geometry, material);
        this.rainParticles.visible = false;
        this.scene.add(this.rainParticles);
    }

    createShorelineRocks() {
        for (let x = -200; x <= 200; x += 12) {
            if (Math.abs(x) < 16) continue;

            const rockGeo = new THREE.DodecahedronGeometry(Math.random() * 1.6 + 1.2, 1);
            const rockMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.9 });
            const rock = new THREE.Mesh(rockGeo, rockMat);
            rock.position.set(x + (Math.random() - 0.5) * 3, 1.2, 1.2);
            rock.rotation.set(Math.random(), Math.random(), Math.random());
            this.scene.add(rock);
        }
    }

    createCleanPalmTree(scale = 1.0) {
        const palmGroup = new THREE.Group();

        const trunkGroup = new THREE.Group();
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.8 });
        const ringMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 });

        for (let i = 0; i < 6; i++) {
            const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.35 - i * 0.02, 0.45 - i * 0.02, 1.8, 10), trunkMat);
            seg.position.y = i * 1.6;
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42 - i * 0.02, 0.03, 6, 10), ringMat);
            ring.position.y = i * 1.6 - 0.8;
            ring.rotation.x = Math.PI / 2;
            trunkGroup.add(seg, ring);
        }
        palmGroup.add(trunkGroup);

        const coconutMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 });
        for (let c = 0; c < 5; c++) {
            const coconut = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 10), coconutMat);
            const angle = (Math.PI * 2 / 5) * c;
            coconut.position.set(Math.cos(angle) * 0.48, 9.6, Math.sin(angle) * 0.48);
            palmGroup.add(coconut);
        }

        const leafMat1 = new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.4, side: THREE.DoubleSide });
        const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x1e8449, roughness: 0.5, side: THREE.DoubleSide });

        for (let i = 0; i < 8; i++) {
            const leaf = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 7.5), leafMat1);
            leaf.position.set(0, 10.0, 0);
            leaf.rotation.x = Math.PI / 3.0;
            leaf.rotation.y = (Math.PI * 2 / 8) * i;
            palmGroup.add(leaf);
        }

        for (let i = 0; i < 4; i++) {
            const leaf = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 6.0), leafMat2);
            leaf.position.set(0, 9.6, 0);
            leaf.rotation.x = Math.PI / 2.2;
            leaf.rotation.y = (Math.PI * 2 / 4) * i + 0.4;
            palmGroup.add(leaf);
        }

        palmGroup.scale.set(scale, scale, scale);
        return palmGroup;
    }

    createGroundedSolidIslands() {
        const islandConfigs = [
            { x: -320, z: 240, r: 85, h: 14 },
            { x: 340, z: 280, r: 95, h: 16 },
            { x: -440, z: 420, r: 120, h: 20 },
            { x: 420, z: -180, r: 75, h: 12 }
        ];

        islandConfigs.forEach((config, idx) => {
            const islandGroup = new THREE.Group();
            islandGroup.position.set(config.x, 0, config.z);

            const sandBaseMat = new THREE.MeshStandardMaterial({ color: 0xdfb15b, roughness: 0.9 });
            const sandBase = new THREE.Mesh(
                new THREE.CylinderGeometry(config.r, config.r * 1.15, 8, 24),
                sandBaseMat
            );
            sandBase.position.y = 2.0;
            islandGroup.add(sandBase);

            const hillMat = new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.8 });
            const hill = new THREE.Mesh(
                new THREE.ConeGeometry(config.r * 0.85, config.h, 24),
                hillMat
            );
            hill.position.y = 4.0 + config.h / 2;
            islandGroup.add(hill);

            const houseMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
            const roofMat = new THREE.MeshStandardMaterial({ color: 0xd63031, roughness: 0.5 });

            const house = new THREE.Group();
            const houseBody = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 9), houseMat);
            houseBody.position.y = 3.0;
            const houseRoof = new THREE.Mesh(new THREE.ConeGeometry(9.5, 4.5, 4), roofMat);
            houseRoof.position.y = 8.25;
            houseRoof.rotation.y = Math.PI / 4;
            house.add(houseBody, houseRoof);
            house.position.set(0, 4.0 + config.h * 0.4, 0);
            islandGroup.add(house);

            const dock = new THREE.Mesh(new THREE.BoxGeometry(8, 0.4, 18), new THREE.MeshStandardMaterial({ color: 0x5c4033 }));
            dock.position.set(0, 2.0, config.r * 0.85);

            const umbrellaPole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4), new THREE.MeshStandardMaterial({ color: 0xffffff }));
            umbrellaPole.position.set(12, 4.0 + config.h * 0.2, 8);
            const umbrellaTop = new THREE.Mesh(new THREE.ConeGeometry(3, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0x00d2ff }));
            umbrellaTop.position.set(12, 6.0 + config.h * 0.2, 8);

            islandGroup.add(dock, umbrellaPole, umbrellaTop);

            for (let p = 0; p < 4; p++) {
                const angle = (Math.PI * 2 / 4) * p + 0.3;
                const islandPalm = this.createCleanPalmTree(1.1);
                const px = Math.cos(angle) * (config.r * 0.5);
                const pz = Math.sin(angle) * (config.r * 0.5);
                islandPalm.position.set(px, 4.0 + config.h * 0.25, pz);
                islandGroup.add(islandPalm);
            }

            if (idx === 0) {
                const lhGroup = new THREE.Group();
                lhGroup.position.set(20, 4.0 + config.h * 0.5, -15);

                const base = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 4.5, 22, 16), new THREE.MeshStandardMaterial({ color: 0xffffff }));
                base.position.y = 11;
                const cap = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 4, 16), new THREE.MeshStandardMaterial({ color: 0xd63031 }));
                cap.position.y = 24;
                const lamp = new THREE.Mesh(new THREE.SphereGeometry(2.0), new THREE.MeshBasicMaterial({ color: 0xfffa65 }));
                lamp.position.y = 27;

                this.lighthouseLight = new THREE.SpotLight(0xfffa65, 5, 400, Math.PI / 5, 0.5);
                this.lighthouseLight.position.set(0, 27, 0);

                lhGroup.add(base, cap, lamp, this.lighthouseLight);
                islandGroup.add(lhGroup);
            }

            this.scene.add(islandGroup);
        });
    }

    createManamaSkyline() {
        const skylineGroup = new THREE.Group();
        skylineGroup.position.z = -460;

        const bwtcMat = new THREE.MeshStandardMaterial({ color: 0x1e3799, roughness: 0.25, metalness: 0.6 });

        const tower1 = new THREE.Mesh(new THREE.ConeGeometry(22, 190, 4), bwtcMat);
        tower1.position.set(-80, 95, 0);
        const tower2 = new THREE.Mesh(new THREE.ConeGeometry(22, 190, 4), bwtcMat);
        tower2.position.set(-35, 95, 0);

        const spire1 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.8, 25), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        spire1.position.set(-80, 202, 0);
        const spire2 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.8, 25), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        spire2.position.set(-35, 202, 0);

        skylineGroup.add(tower1, tower2, spire1, spire2);

        const bwtcBeacon1 = new THREE.Mesh(new THREE.SphereGeometry(1.5), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        bwtcBeacon1.position.set(-80, 215, 0);
        const bwtcBeacon2 = new THREE.Mesh(new THREE.SphereGeometry(1.5), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        bwtcBeacon2.position.set(-35, 215, 0);
        skylineGroup.add(bwtcBeacon1, bwtcBeacon2);
        this.beacons.push(bwtcBeacon1, bwtcBeacon2);

        for (let i = 0; i < 3; i++) {
            const bridge = new THREE.Mesh(new THREE.BoxGeometry(45, 4, 4), new THREE.MeshStandardMaterial({ color: 0xf5f6fa }));
            bridge.position.set(-57.5, 50 + i * 38, 0);
            skylineGroup.add(bridge);

            const turbineGroup = new THREE.Group();
            turbineGroup.position.set(-57.5, 50 + i * 38, 3.5);
            for (let j = 0; j < 3; j++) {
                const blade = new THREE.Mesh(new THREE.BoxGeometry(1.5, 18, 0.4), new THREE.MeshStandardMaterial({ color: 0xffffff }));
                blade.position.y = 9;
                const pivot = new THREE.Group();
                pivot.rotation.z = (Math.PI * 2 / 3) * j;
                pivot.add(blade);
                turbineGroup.add(pivot);
            }
            skylineGroup.add(turbineGroup);
            this.turbines.push(turbineGroup);
        }

        const bfhMat = new THREE.MeshStandardMaterial({ color: 0x0c2461, roughness: 0.2, metalness: 0.7 });
        const bfh1 = new THREE.Mesh(new THREE.BoxGeometry(28, 170, 28), bfhMat);
        bfh1.position.set(45, 85, 0);
        const bfh2 = new THREE.Mesh(new THREE.BoxGeometry(28, 170, 28), bfhMat);
        bfh2.position.set(90, 85, 0);
        skylineGroup.add(bfh1, bfh2);

        const bfhBeacon1 = new THREE.Mesh(new THREE.SphereGeometry(1.5), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        bfhBeacon1.position.set(45, 171, 0);
        const bfhBeacon2 = new THREE.Mesh(new THREE.SphereGeometry(1.5), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        bfhBeacon2.position.set(90, 171, 0);
        skylineGroup.add(bfhBeacon1, bfhBeacon2);
        this.beacons.push(bfhBeacon1, bfhBeacon2);

        for (let i = 0; i < 40; i++) {
            const posX = (i < 20) ? -120 - i * 20 : 120 + (i - 20) * 20;
            const h = Math.random() * 120 + 40;
            const w = Math.random() * 22 + 14;

            const bMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(0.08, 0.12, Math.random() * 0.35 + 0.15),
                roughness: 0.3
            });

            const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), bMat);
            b.position.set(posX, h / 2, Math.random() * 80 - 40);
            skylineGroup.add(b);

            const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.2), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
            beacon.position.set(posX, h + 0.6, b.position.z);
            skylineGroup.add(beacon);
            this.beacons.push(beacon);
        }

        this.scene.add(skylineGroup);
    }

    createCoastlineVillas() {
        for (let x = -200; x <= 200; x += 35) {
            if (Math.abs(x) < 45) continue;

            const villa = new THREE.Group();
            villa.position.set(x, 4.0, -45);

            const walls = new THREE.Mesh(new THREE.BoxGeometry(22, 8, 16), new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.6 }));
            walls.position.y = 4;

            const roof = new THREE.Mesh(new THREE.ConeGeometry(18, 5, 4), new THREE.MeshStandardMaterial({ color: 0xd63031 }));
            roof.position.y = 10.5;
            roof.rotation.y = Math.PI / 4;

            villa.add(walls, roof);
            this.scene.add(villa);
        }
    }

    createStreetAndCars() {
        const road = new THREE.Mesh(new THREE.BoxGeometry(500, 0.2, 16), new THREE.MeshStandardMaterial({ color: 0x222222 }));
        road.position.set(0, 4.01, -34);
        this.scene.add(road);

        const carColors = [0xe74c3c, 0xf1c40f, 0xecf0f1, 0x3498db, 0x2ecc71];
        for (let i = 0; i < 8; i++) {
            const carGroup = new THREE.Group();
            const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.3, 2.1), new THREE.MeshStandardMaterial({ color: carColors[i % carColors.length] }));
            body.position.y = 0.65;
            const roof = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.9, 1.9), new THREE.MeshStandardMaterial({ color: 0x111111 }));
            roof.position.set(-0.2, 1.6, 0);

            carGroup.add(body, roof);
            const laneZ = i % 2 === 0 ? -31 : -37;
            carGroup.position.set((i - 4) * 60, 4.2, laneZ);
            this.scene.add(carGroup);

            this.cars.push({ mesh: carGroup, speed: i % 2 === 0 ? 14 : -14 });
        }
    }

    createPromenadeAndPier() {
        const promMat = new THREE.MeshStandardMaterial({ color: 0x353b48, roughness: 0.5 });
        const promenade = new THREE.Mesh(new THREE.BoxGeometry(400, 4, 32), promMat);
        promenade.position.set(0, 2, -15);
        this.scene.add(promenade);

        const backWall = new THREE.Mesh(new THREE.BoxGeometry(400, 3, 1), new THREE.MeshStandardMaterial({ color: 0xdcdde1 }));
        backWall.position.set(0, 5.5, -23);
        this.scene.add(backWall);

        const seaWall = new THREE.Mesh(new THREE.BoxGeometry(400, 0.8, 0.8), new THREE.MeshStandardMaterial({ color: 0xdcdde1 }));
        seaWall.position.set(0, 4.4, 0.5);
        this.scene.add(seaWall);

        const pierMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.7 });
        const pier = new THREE.Mesh(new THREE.BoxGeometry(22, 3, 54), pierMat);
        pier.position.set(0, 1.8, 22);
        this.scene.add(pier);

        // Wooden Staircase for Pier Exit (5 steps connecting pier to promenade)
        const stairMat = new THREE.MeshStandardMaterial({ color: 0x4a3224, roughness: 0.6 });
        for (let i = 0; i < 5; i++) {
            const step = new THREE.Mesh(new THREE.BoxGeometry(8, 0.4, 1.2), stairMat);
            step.position.set(0, 1.8 + (i * 0.4), -4 + (i * 0.8));
            this.scene.add(step);
        }

        // Parked Shoreline Bahraini Boat on Sand
        const boatGroup = new THREE.Group();
        boatGroup.position.set(45, 0.6, 8);
        boatGroup.rotation.y = Math.PI / 6;

        const hullGeo = new THREE.ConeGeometry(2.5, 9, 8);
        hullGeo.rotateX(Math.PI / 2);
        hullGeo.scale(1, 0.5, 1);
        const hullMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 });
        const hull = new THREE.Mesh(hullGeo, hullMat);

        const deckMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.7 });
        const deck = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 6), deckMat);
        deck.position.y = 0.5;

        // Oars
        const oarMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
        const oar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5), oarMat);
        oar1.rotation.z = Math.PI / 3;
        oar1.position.set(1.2, 0.8, 0);

        boatGroup.add(hull, deck, oar1);
        this.scene.add(boatGroup);

        // Bucket
        const bucketGroup = new THREE.Group();
        bucketGroup.position.set(-7.5, 3.7, 45);
        const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.9), new THREE.MeshStandardMaterial({ color: 0xeb4d4b }));
        const waterInside = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.1), new THREE.MeshBasicMaterial({ color: 0x0066ff }));
        waterInside.position.y = 0.35;
        bucketGroup.add(bucket, waterInside);
        this.scene.add(bucketGroup);

        const pilingMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.9 });
        for (let z = 5; z <= 60; z += 10) {
            for (let x of [-10, 0, 10]) {
                const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 10), pilingMat);
                pile.position.set(x, -2, z);
                this.scene.add(pile);
            }
        }

        const railMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.5 });
        for (let z = 2; z <= 62; z += 8) {
            const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.7), railMat);
            p1.position.set(-10.5, 3.65, z);
            const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.7), railMat);
            p2.position.set(10.5, 3.65, z);
            this.scene.add(p1, p2);
        }

        const beamL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 62), railMat);
        beamL.position.set(-10.5, 4.0, 32);
        const beamR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 62), railMat);
        beamR.position.set(10.5, 4.0, 32);
        this.scene.add(beamL, beamR);

        for (let x = -160; x <= 160; x += 45) {
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 10), new THREE.MeshStandardMaterial({ color: 0x1e272e }));
            pole.position.set(x, 9.0, -20);
            const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.55), new THREE.MeshBasicMaterial({ color: 0xfffa65 }));
            bulb.position.set(x, 14.0, -20);

            const pLight = new THREE.PointLight(0xfffa65, 2.5, 45);
            pLight.position.copy(bulb.position);
            this.scene.add(pole, bulb, pLight);

            this.streetLights.push({ bulb, light: pLight });
        }
    }

    createFishMarketKiosks() {
        const stallPositions = [-75, 0, 75];
        stallPositions.forEach((posX, idx) => {
            const kioskGroup = new THREE.Group();
            kioskGroup.position.set(posX, 4.0, -18);

            const counter = new THREE.Mesh(new THREE.BoxGeometry(6.5, 2.2, 3.2), new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.4 }));
            counter.position.y = 1.1;

            const ice = new THREE.Mesh(new THREE.BoxGeometry(6.1, 0.25, 2.8), new THREE.MeshStandardMaterial({ color: 0xe0f7fa, roughness: 0.2 }));
            ice.position.y = 2.3;

            const dFish1 = create3DFishMesh(BAHRAINI_FISHES[idx * 3 % BAHRAINI_FISHES.length]);
            dFish1.scale.set(0.4, 0.4, 0.4);
            dFish1.position.set(-1.6, 2.45, 0.2);

            const dFish2 = create3DFishMesh(BAHRAINI_FISHES[(idx * 3 + 1) % BAHRAINI_FISHES.length]);
            dFish2.scale.set(0.4, 0.4, 0.4);
            dFish2.position.set(1.4, 2.45, -0.2);

            const postMat = new THREE.MeshStandardMaterial({ color: 0x5c4033 });
            for (let px of [-3.1, 3.1]) {
                for (let pz of [-1.4, 1.4]) {
                    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 4.8), postMat);
                    post.position.set(px, 2.4, pz);
                    kioskGroup.add(post);
                }
            }

            const awningMat = new THREE.MeshStandardMaterial({ color: idx % 2 === 0 ? 0xe74c3c : 0x2980b9, roughness: 0.5 });
            const awningRoof = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.4, 4.2), awningMat);
            awningRoof.position.set(0, 4.7, 0);

            const trim = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.3, 0.15), new THREE.MeshStandardMaterial({ color: 0xffffff }));
            trim.position.set(0, 4.5, 2.1);

            const vendor = new THREE.Group();
            const vBody = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.4, 2.6), new THREE.MeshStandardMaterial({ color: 0x27ae60 }));
            vBody.position.y = 1.3;
            const vHead = new THREE.Mesh(new THREE.SphereGeometry(0.4), new THREE.MeshStandardMaterial({ color: 0xd2b48c }));
            vHead.position.y = 2.9;

            const faceGroup = this.createDetailedFace();
            faceGroup.position.set(0, 2.9, 0.35);

            vendor.add(vBody, vHead, faceGroup);
            vendor.position.set(0, 0, -1.8);

            kioskGroup.add(counter, ice, dFish1, dFish2, awningRoof, trim, vendor);
            this.scene.add(kioskGroup);
        });
    }

    createDetailedFace() {
        const face = new THREE.Group();

        const eyeRMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06), eyeRMat);
        eyeL.position.set(-0.12, 0.05, 0.05);
        const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.03), pupilMat);
        pupilL.position.set(-0.12, 0.05, 0.09);

        const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.06), eyeRMat);
        eyeR.position.set(0.12, 0.05, 0.05);
        const pupilR = new THREE.Mesh(new THREE.SphereGeometry(0.03), pupilMat);
        pupilR.position.set(0.12, 0.05, 0.09);

        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 8), new THREE.MeshStandardMaterial({ color: 0xc8a27a }));
        nose.position.set(0, -0.02, 0.08);

        const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.04), new THREE.MeshBasicMaterial({ color: 0x800000 }));
        mouth.position.set(0, -0.12, 0.06);

        face.add(eyeL, pupilL, eyeR, pupilR, nose, mouth);
        return face;
    }

    createCleanPalmTreesPromenade() {
        for (let x = -170; x <= 170; x += 28) {
            if (Math.abs(x) < 22) continue;

            const promenadePalm = this.createCleanPalmTree(1.0);
            promenadePalm.position.set(x, 4.0, -18);
            this.scene.add(promenadePalm);
        }
    }

    createDynamicNPCFishermen() {
        this.spotOptions = [
            { x: -8.5, z: 45, rotY: -Math.PI / 2 },
            { x: 8.5, z: 45, rotY: Math.PI / 2 },
            { x: -8.5, z: 58, rotY: 0 },
            { x: 8.5, z: 58, rotY: 0 }
        ];

        for (let i = 0; i < 2; i++) {
            this.spawnNewFishermanBot(i);
        }
    }

    spawnNewFishermanBot(idx) {
        const spot = this.spotOptions[Math.floor(Math.random() * this.spotOptions.length)];

        const fisherGroup = new THREE.Group();
        fisherGroup.position.set(spot.x, 3.4, spot.z);
        fisherGroup.rotation.y = spot.rotY;

        const shirtColors = [0x34495e, 0x27ae60, 0xd35400, 0x2980b9];
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.35, 2.6, 12), new THREE.MeshStandardMaterial({ color: shirtColors[Math.floor(Math.random() * shirtColors.length)] }));
        body.position.y = 1.3;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), new THREE.MeshStandardMaterial({ color: 0xd2b48c }));
        head.position.y = 2.9;

        const face = this.createDetailedFace();
        face.position.set(0, 2.9, 0.35);

        fisherGroup.add(body, head, face);

        const rodGroup = new THREE.Group();
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.035, 3.5), new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.7 }));
        shaft.position.set(0, 1.75, 0);
        const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08), new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9 }));
        reel.rotation.x = Math.PI / 2;
        reel.position.set(0, 0.4, -0.06);
        rodGroup.add(shaft, reel);

        rodGroup.position.set(0.3, 1.8, 0.4);
        rodGroup.rotation.x = Math.PI / 4;

        const lineGeo = new THREE.BufferGeometry();
        const linePos = new Float32Array([0, 3.5, 0, 0, -4.2, 10.0]);
        lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
        const lineMesh = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }));
        rodGroup.add(lineMesh);

        const bobber = new THREE.Mesh(new THREE.SphereGeometry(0.18), new THREE.MeshBasicMaterial({ color: 0xff4757 }));
        bobber.position.set(0, -4.2, 10.0);
        rodGroup.add(bobber);

        const caughtFish = create3DFishMesh(BAHRAINI_FISHES[Math.floor(Math.random() * BAHRAINI_FISHES.length)]);
        caughtFish.scale.set(0.35, 0.35, 0.35);
        caughtFish.position.set(-0.4, 1.2, 0.4);
        caughtFish.visible = false;

        fisherGroup.add(rodGroup, caughtFish);
        this.scene.add(fisherGroup);

        this.npcFishermen[idx] = {
            mesh: fisherGroup,
            rodGroup,
            caughtFish,
            bobber,
            time: Math.random() * 10,
            state: 'FISHING',
            timer: 0,
            spot
        };
    }

    createDiverseMaleAndFemaleNPCs() {
        // DISTINCT MALE (Thobe/Cap) AND FEMALE (Hijab Veil/Abaya) NPCS WITHOUT LEGS (BOBBING MOTION)
        const maleShirts = [0x34495e, 0x27ae60, 0xd35400];
        const femaleDressColors = [0x8e44ad, 0x2980b9, 0x16a085, 0xc0392b];

        for (let i = 0; i < 4; i++) {
            const isFemale = i % 2 === 1;
            const npc = new THREE.Group();

            if (isFemale) {
                // DISTINCT FEMALE SILHOUETTE: Full Abaya/Dress cone body + Hijab veil
                const dress = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.32, 0.65, 2.5, 16),
                    new THREE.MeshStandardMaterial({ color: femaleDressColors[i % femaleDressColors.length], roughness: 0.4 })
                );
                dress.position.y = 1.25;

                const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 16), new THREE.MeshStandardMaterial({ color: 0xffe0bd }));
                head.position.y = 2.75;

                // Hijab Veil wrapping head
                const hijab = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.1, 16), new THREE.MeshStandardMaterial({ color: 0x111111 }));
                hijab.position.set(0, 2.65, 0);

                const face = this.createDetailedFace();
                face.position.set(0, 2.75, 0.35);

                npc.add(dress, head, hijab, face);
            } else {
                // DISTINCT MALE SILHOUETTE: Thobe/Shirt + Ghutra Cap
                const body = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.46, 0.36, 2.5, 12),
                    new THREE.MeshStandardMaterial({ color: maleShirts[i % maleShirts.length], roughness: 0.5 })
                );
                body.position.y = 1.25;

                const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 16), new THREE.MeshStandardMaterial({ color: 0xd2b48c }));
                head.position.y = 2.75;

                const cap = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.6, 12), new THREE.MeshStandardMaterial({ color: 0xffffff }));
                cap.position.set(0, 3.1, 0);

                const face = this.createDetailedFace();
                face.position.set(0, 2.75, 0.35);

                npc.add(body, head, cap, face);
            }

            // Shopping Bag
            const bagGroup = new THREE.Group();
            const bagBody = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 0.22), new THREE.MeshStandardMaterial({ color: 0xe67e22 }));
            bagGroup.add(bagBody);
            bagGroup.position.set(0.5, 1.1, 0);
            bagGroup.visible = false;

            npc.add(bagGroup);
            npc.position.set((i - 2) * 55, 4.0, -12);
            this.scene.add(npc);

            this.npcs.push({
                mesh: npc,
                bagGroup,
                isShopper: true,
                targetKioskX: [-75, 0, 75][i % 3],
                shoppingState: 'WALKING_PROMENADE',
                shopTimer: 0,
                time: Math.random() * 100,
                speed: 0.05,
                direction: i % 2 === 0 ? 1 : -1
            });
        }
    }

    createOnlinePlayersOnPier() {
        // SIMULATED MULTIPLAYER ANGLERS FISHING ALONG THE PIER
        const onlineColors = [0xf1c40f, 0x9b59b6];
        for (let i = 0; i < 2; i++) {
            const pGroup = new THREE.Group();

            const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.35, 2.6), new THREE.MeshStandardMaterial({ color: onlineColors[i] }));
            body.position.y = 1.3;
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.4), new THREE.MeshStandardMaterial({ color: 0xffccaa }));
            head.position.y = 2.9;

            const face = this.createDetailedFace();
            face.position.set(0, 2.9, 0.35);

            // Online Player Name Tag Floating Above Head
            const nameCanvas = document.createElement('canvas');
            nameCanvas.width = 256; nameCanvas.height = 64;
            const ctx = nameCanvas.getContext('2d');
            ctx.fillStyle = '#00d2ff';
            ctx.font = 'Bold 28px Cairo';
            ctx.fillText(i === 0 ? '🌐 صياد المنامة_99' : '🌐 بطل_البحرين_07', 10, 40);

            const tex = new THREE.CanvasTexture(nameCanvas);
            const tagMesh = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.8), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
            tagMesh.position.set(0, 3.8, 0);

            // Rod
            const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 3.5), new THREE.MeshStandardMaterial({ color: i === 0 ? 0xffd700 : 0x00d2ff }));
            rod.position.set(0.3, 1.8, 0.4);
            rod.rotation.x = Math.PI / 4;

            pGroup.add(body, head, face, tagMesh, rod);
            pGroup.position.set(i === 0 ? -4.5 : 4.5, 3.4, 32);
            this.scene.add(pGroup);

            this.onlinePlayers.push({ mesh: pGroup, name: i === 0 ? 'صياد المنامة_99' : 'بطل_البحرين_07' });
        }
    }

    createSingleDetailedYacht() {
        const boatGroup = new THREE.Group();
        const hull = new THREE.Mesh(new THREE.BoxGeometry(26, 4.2, 7.5), new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 120 }));
        hull.position.y = 2.1;

        const cabin = new THREE.Mesh(new THREE.BoxGeometry(13, 3.0, 5.8), new THREE.MeshPhongMaterial({ color: 0x1e3799 }));
        cabin.position.set(-2, 5.2, 0);

        const win = new THREE.Mesh(new THREE.BoxGeometry(11, 1.3, 5.9), new THREE.MeshBasicMaterial({ color: 0xfffa65 }));
        win.position.set(-2, 5.4, 0);

        const buoy = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.15, 8, 16), new THREE.MeshBasicMaterial({ color: 0xff4757 }));
        buoy.position.set(-12.5, 2.6, 0);
        buoy.rotation.y = Math.PI / 2;

        boatGroup.add(hull, cabin, win, buoy);
        boatGroup.position.set(-50, 0, 120);
        this.scene.add(boatGroup);

        this.boats = [{ mesh: boatGroup, speed: 0.12 }];
    }

    createPierFishVendor() {
        const vendorGroup = new THREE.Group();
        vendorGroup.position.set(-6.5, 3.4, 18);

        const thobe = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.85, 2.7), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        thobe.position.y = 1.35;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.5), new THREE.MeshStandardMaterial({ color: 0xd2b48c }));
        head.position.y = 3.0;
        const ghutra = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.9), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        ghutra.position.y = 3.45;

        const face = this.createDetailedFace();
        face.position.set(0, 3.0, 0.42);

        const tray = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.2, 1.6), new THREE.MeshStandardMaterial({ color: 0x8b4513 }));
        tray.position.set(0, 1.4, 1.2);

        const dFish = create3DFishMesh(BAHRAINI_FISHES[0]);
        dFish.scale.set(0.5, 0.5, 0.5);
        dFish.position.set(0, 1.55, 1.2);

        vendorGroup.add(thobe, head, ghutra, face, tray, dFish);
        this.pierVendorMesh = vendorGroup;
        this.scene.add(vendorGroup);
    }

    createGroundedCooler() {
        const coolerGroup = new THREE.Group();
        coolerGroup.position.set(6.0, 3.4, 12);

        const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 0.9), new THREE.MeshStandardMaterial({ color: 0x00d2ff }));
        const lid = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.15, 0.95), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        lid.position.y = 0.5;

        coolerGroup.add(body, lid);
        this.coolerMesh = coolerGroup;
        this.scene.add(coolerGroup);
    }

    setTimeOfDay(mode) {
        if (mode === 'night') mode = 'day'; // NIGHT COMPLETELY REMOVED
        this.timeMode = mode;

        if (mode === 'day') {
            this.scene.background.setHex(0x74b9ff);
            this.scene.fog.color.setHex(0x74b9ff);
            this.ambientLight.color.setHex(0xffffff);
            this.ambientLight.intensity = 1.0;
            this.dirLight.color.setHex(0xfffa65);
            this.dirLight.intensity = 2.4;
            if (this.waterMesh) this.waterMesh.material.color.setHex(0x0077ff);
        } else if (mode === 'sunset') {
            this.scene.background.setHex(0xfd7e14);
            this.scene.fog.color.setHex(0xfd7e14);
            this.ambientLight.color.setHex(0xffecd2);
            this.ambientLight.intensity = 0.9;
            this.dirLight.color.setHex(0xffb703);
            this.dirLight.intensity = 2.2;
            if (this.waterMesh) this.waterMesh.material.color.setHex(0x0066ff);
        }

        this.streetLights.forEach(sl => {
            sl.light.intensity = 1.0;
            sl.light.distance = 30;
            sl.bulb.material.color.setHex(0xfffa65);
        });
    }

    triggerRainWeather(enable) {
        this.rainActive = enable;
        if (this.rainParticles) this.rainParticles.visible = enable;

        if (enable) {
            this.scene.background.setHex(0x6c7a89);
            this.scene.fog.color.setHex(0x6c7a89);
            this.ambientLight.color.setHex(0x556677);
            if (this.waterMesh) this.waterMesh.material.color.setHex(0x2c3e50);
        } else {
            this.setTimeOfDay(this.timeMode);
        }
    }

    update(delta, time) {
        // DAY & SUNSET ONLY CYCLE (NO NIGHT)
        if (this.autoTimeEnabled) {
            this.dayCycleTimer += delta;

            if (this.timeMode === 'day' && this.dayCycleTimer > 600) {
                this.setTimeOfDay('sunset');
                this.sunsetTimer = 0;
            } else if (this.timeMode === 'sunset') {
                this.sunsetTimer += delta;
                if (this.sunsetTimer >= 60.0) {
                    this.setTimeOfDay('day');
                    this.dayCycleTimer = 0;
                }
            }
        }

        // RARE RAIN WEATHER
        this.rainTimer += delta;
        if (this.rainTimer > 600) {
            this.rainTimer = 0;
            if (Math.random() < 0.15) {
                this.triggerRainWeather(true);
                setTimeout(() => this.triggerRainWeather(false), 25000);
            }
        }

        if (this.rainActive && this.rainParticles) {
            const pos = this.rainParticles.geometry.attributes.position;
            for (let i = 0; i < pos.count; i += 2) {
                let y = pos.getY(i);
                y -= delta * 60;
                if (y < 0) y = 120;
                pos.setY(i, y);
                pos.setY(i + 1, y - 2.5);
            }
            pos.needsUpdate = true;
        }

        const sunAngle = (this.dayCycleTimer / 60) * (Math.PI / 1.5) - Math.PI / 4;
        if (this.sunGroup) {
            this.sunGroup.position.x = Math.cos(sunAngle) * 500;
            this.sunGroup.position.y = Math.max(-60, Math.sin(sunAngle) * 320 + 50);
        }

        const beaconVisible = Math.sin(time * 2.0) > 0.5;
        this.beacons.forEach(b => b.visible = beaconVisible);

        this.clouds.forEach(c => {
            c.mesh.position.x += c.speed * delta;
            if (c.mesh.position.x > 650) c.mesh.position.x = -650;
        });

        this.turbines.forEach(t => t.rotation.z += delta * 2.5);

        if (this.lighthouseLight) {
            this.lighthouseLight.rotation.y += delta * 1.5;
        }

        this.boats.forEach(b => {
            b.mesh.position.x += b.speed * delta * 40;
            if (b.mesh.position.x > 240) b.mesh.position.x = -240;
            if (b.mesh.position.x < -240) b.mesh.position.x = 240;
        });

        this.cars.forEach(c => {
            c.mesh.position.x += c.speed * delta * 4;
            if (c.mesh.position.x > 220) c.mesh.position.x = -220;
            if (c.mesh.position.x < -220) c.mesh.position.x = 220;
        });

        // Bot Anglers State (NO LEGS, BOBBING ONLY WHEN WALKING)
        this.npcFishermen.forEach((f, idx) => {
            if (!f) return;
            f.timer += delta;

            if (f.state === 'FISHING') {
                f.caughtFish.visible = false;
                f.rodGroup.visible = true;
                f.mesh.rotation.y = f.spot.rotY;
                f.mesh.position.y = 3.4; // STILL WHILE FISHING (NO BOBBING!)

                if (f.bobber) f.bobber.position.y = -4.2 + Math.sin(time * 3) * 0.12;

                if (f.timer > 9) {
                    f.state = 'CATCHING';
                    f.timer = 0;
                }
            } else if (f.state === 'CATCHING') {
                f.caughtFish.visible = true;
                f.mesh.position.y = 3.4;
                if (f.timer > 3) {
                    f.state = 'WALKING_AWAY';
                    f.timer = 0;
                }
            } else if (f.state === 'WALKING_AWAY') {
                f.rodGroup.visible = false;
                f.mesh.rotation.y = Math.PI;
                f.mesh.position.z -= delta * 6;

                // BOBBING MOTION ONLY WHILE WALKING AWAY!
                f.mesh.position.y = 3.4 + Math.abs(Math.sin(time * 10)) * 0.15;

                if (f.mesh.position.z < -20) {
                    this.scene.remove(f.mesh);
                    f.state = 'DESPAWNED_WAITING';
                    f.timer = 0;
                }
            } else if (f.state === 'DESPAWNED_WAITING') {
                if (f.timer > 10) {
                    this.spawnNewFishermanBot(idx);
                }
            }
        });

        // PROMENADE PEDESTRIANS & SHOPPERS (BOBBING MOTION ONLY WHEN MOVING!)
        this.npcs.forEach(n => {
            n.time += delta * 6;

            if (n.shoppingState === 'WALKING_PROMENADE') {
                n.mesh.position.x += n.speed * n.direction * delta * 60;
                n.mesh.rotation.y = n.direction === 1 ? Math.PI / 2 : -Math.PI / 2;
                n.mesh.position.y = 4.0 + Math.abs(Math.sin(n.time * 2)) * 0.14; // WALKING BOBBING!
                n.bagGroup.visible = false;

                if (Math.abs(n.mesh.position.x - n.targetKioskX) < 3.0 && Math.random() < 0.05) {
                    n.shoppingState = 'GOING_TO_KIOSK';
                }

                if (n.mesh.position.x > 120) n.direction = -1;
                if (n.mesh.position.x < -120) n.direction = 1;
            } else if (n.shoppingState === 'GOING_TO_KIOSK') {
                n.mesh.position.z -= delta * 5;
                n.mesh.rotation.y = Math.PI;
                n.mesh.position.y = 4.0 + Math.abs(Math.sin(n.time * 2)) * 0.14;
                if (n.mesh.position.z <= -16.5) {
                    n.shoppingState = 'BUYING';
                    n.shopTimer = 0;
                }
            } else if (n.shoppingState === 'BUYING') {
                n.shopTimer += delta;
                n.mesh.position.y = 4.0; // STILL WHILE BUYING (NO BOBBING!)
                if (n.shopTimer > 3.0) {
                    n.bagGroup.visible = true;
                    n.shoppingState = 'WALKING_AWAY';
                }
            } else if (n.shoppingState === 'WALKING_AWAY') {
                n.mesh.position.z += delta * 5;
                n.mesh.rotation.y = 0;
                n.mesh.position.y = 4.0 + Math.abs(Math.sin(n.time * 2)) * 0.14;
                if (n.mesh.position.z >= -12.0) {
                    n.targetKioskX = [-75, 0, 75][Math.floor(Math.random() * 3)];
                    n.shoppingState = 'WALKING_PROMENADE';
                }
            }
        });

        if (this.waterMesh) {
            const pos = this.waterMesh.geometry.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                const u = pos.getX(i);
                const v = pos.getY(i);
                const wave = Math.sin(u * 0.03 + time * 2) * 0.4 + Math.cos(v * 0.03 + time * 2) * 0.4;
                pos.setZ(i, wave);
            }
            pos.needsUpdate = true;
        }

        if (this.foamMesh) {
            this.foamMesh.position.y = 0.05 + Math.sin(time * 2.5) * 0.08;
            this.foamMesh.position.z = 1.8 + Math.sin(time * 2.0) * 0.3;
        }
    }
}
