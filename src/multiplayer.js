import * as THREE from 'three';
import { create3DFishMesh, BAHRAINI_FISHES } from './fishData.js';
import mqtt from 'mqtt';

export class RealtimeMultiplayerManager {
    constructor(gameController) {
        this.game = gameController;
        this.playerName = 'صياد_المنامة';
        this.isOnline = false;
        this.currentServerName = 'منامة_عام';
        this.peerId = 'peer_' + Math.random().toString(36).substr(2, 7);

        this.remotePlayers = new Map(); // peerId -> player object
        this.serversList = new Map();

        // Always active Bahraini Public Servers
        const defaultServers = [
            { serverId: 'server_manama_1', name: '🇧🇭 سيرفر كورنيش المنامة 1 (عام)', hostName: 'خادم المنامة', playerCount: 14, maxPlayers: 32 },
            { serverId: 'server_vip_boats', name: '🎣 سيرفر صيادي الباخرة (VIP)', hostName: 'صياد_النوخذة', playerCount: 8, maxPlayers: 16 },
            { serverId: 'server_pvp_pot', name: '⚔️ سيرفر التحديات والمراهنات (1v1)', hostName: 'بطل_البحرين', playerCount: 12, maxPlayers: 20 },
            { serverId: 'server_budaiya', name: '🌊 سيرفر ساحل البديع المباشر', hostName: 'صياد_البديع', playerCount: 18, maxPlayers: 24 },
            { serverId: 'server_muharraq', name: '🚤 سيرفر مرسى المحرق (سريع)', hostName: 'نوخذة_المحرق', playerCount: 22, maxPlayers: 30 }
        ];

        defaultServers.forEach(s => this.serversList.set(s.serverId, s));

        this.setupMqttWebSocket();
        this.setupLocalFallback();
        this.startHeartbeat();
    }

    requestServerRefresh() {
        this.broadcastMessage('manama3d/servers/announce', {
            type: 'REQUEST_SERVERS_QUERY',
            senderId: this.peerId
        });
    }

    setPlayerName(name) {
        if (name && name.trim()) {
            this.playerName = name.trim();
        }
    }

    setOnlineMode(enable) {
        this.isOnline = enable;
        if (!enable) {
            // Remove all remote player meshes in Offline mode
            this.remotePlayers.forEach((pData, peerId) => {
                if (pData.group) this.game.scene.remove(pData.group);
            });
            this.remotePlayers.clear();
        }
    }

    setupMqttWebSocket() {
        const mqttLib = mqtt || window.mqtt;
        if (!mqttLib) return;

        const brokerUrls = [
            'wss://broker.emqx.io:8084/mqtt',
            'wss://test.mosquitto.org:8081',
            'wss://broker.hivemq.com:8884/mqtt'
        ];

        let connected = false;

        brokerUrls.forEach(url => {
            if (connected) return;
            try {
                const client = mqttLib.connect(url, {
                    clientId: 'manama_p_' + this.peerId,
                    clean: true,
                    connectTimeout: 4000
                });

                client.on('connect', () => {
                    if (!connected) {
                        connected = true;
                        this.mqttClient = client;
                        this.mqttClient.subscribe('manama3d/servers/#');
                        this.mqttClient.subscribe('manama3d/rooms/+');
                        if (this.game.toast) this.game.toast('🌐 تم الاتصال بالشبكة أونلاين بنجاح!');
                    }
                });

                client.on('message', (topic, payload) => {
                    try {
                        const data = JSON.parse(payload.toString());
                        this.handleIncomingData(data);
                    } catch (e) {}
                });
            } catch (e) {}
        });
    }

    setupLocalFallback() {
        this.channel = new BroadcastChannel('manama_fishing_global');
        this.channel.onmessage = (e) => this.handleIncomingData(e.data);

        window.addEventListener('storage', (e) => {
            if (e.key === 'manama_net_msg' && e.newValue) {
                try { this.handleIncomingData(JSON.parse(e.newValue)); } catch (err) {}
            }
        });
    }

    createServer(serverName) {
        if (!serverName || !serverName.trim()) return;
        const sName = serverName.trim();
        const sId = 'room_' + Math.random().toString(36).substr(2, 7);

        const sData = {
            serverId: sId,
            name: sName,
            hostName: this.playerName,
            playerCount: 1,
            lastActive: Date.now()
        };
        this.serversList.set(sId, sData);
        this.currentServerName = sName;
        this.setOnlineMode(true);

        this.broadcastMessage('manama3d/servers/announce', {
            type: 'ANNOUNCE_SERVER',
            server: sData
        });

        this.game.toast(`🎉 تم إنشاء وقبول السيرفر [${sName}] بنجاح!`);
    }

    joinServer(serverId) {
        const s = this.serversList.get(serverId);
        if (s) {
            this.currentServerName = s.name;
            this.setOnlineMode(true);
            this.game.toast(`🌐 تم الانضمام للسيرفر [${s.name}] بنجاح!`);
        }
    }

    broadcastMessage(topic, msg) {
        if (!this.isOnline && msg.type === 'UPDATE') return; // Do NOT broadcast player updates in Offline mode!

        msg.peerId = this.peerId;
        msg.timestamp = Date.now();
        msg.serverRoom = this.currentServerName;

        const payloadStr = JSON.stringify(msg);

        if (this.mqttClient && this.mqttClient.connected) {
            this.mqttClient.publish(topic, payloadStr);
        }
        try { this.channel.postMessage(msg); } catch (e) {}
        try { localStorage.setItem('manama_net_msg', payloadStr); } catch (e) {}
    }

    handleIncomingData(data) {
        if (!data || data.peerId === this.peerId) return;

        if (data.type === 'ANNOUNCE_SERVER') {
            this.serversList.set(data.server.serverId, data.server);
            if (this.game.renderServerBrowser) this.game.renderServerBrowser();
        } else if (this.isOnline) { // Only update remote players in Online Mode!
            if (data.type === 'JOIN' || data.type === 'UPDATE') {
                this.updateRemotePlayer(data);
            } else if (data.type === 'LEAVE') {
                this.removeRemotePlayer(data.peerId);
            } else if (data.type === 'CHALLENGE_REQUEST' && data.targetPeerId === this.peerId) {
                this.game.receiveChallengeRequest(data);
            }
        }
    }

    startHeartbeat() {
        setInterval(() => {
            if (this.isOnline && this.game.player) {
                const pos = this.game.player.position || this.game.player.camera.position;
                const rotY = this.game.player.yaw;

                const thobeEl = document.getElementById('custom-thobe-color');
                const headwearEl = document.getElementById('custom-headwear');
                const outfit = {
                    thobeColor: thobeEl ? parseInt(thobeEl.value, 16) : 0xffffff,
                    headwear: headwearEl ? headwearEl.value : 'ghutra'
                };

                // Send position, outfit, & name
                this.broadcastMessage('manama3d/rooms/update', {
                    type: 'UPDATE',
                    name: this.playerName,
                    position: { x: pos.x, y: pos.y, z: pos.z },
                    rotationY: rotY,
                    rodStyle: this.game.equippedRodId || 'rod-classic',
                    outfit: outfit,
                    heldFishId: this.game.player.activeSlot > 1 ? this.game.player.heldFishData[this.game.player.activeSlot - 2]?.id : null
                });
            }

            const now = Date.now();
            this.remotePlayers.forEach((pData, peerId) => {
                if (now - pData.lastSeen > 4000) {
                    this.removeRemotePlayer(peerId);
                }
            });
        }, 120);
    }

    createDetailedHumanAvatar(name, outfit) {
        const pGroup = new THREE.Group();

        const thobeHex = (outfit && outfit.thobeColor) ? outfit.thobeColor : 0xffffff;
        const thobeMat = new THREE.MeshStandardMaterial({ color: thobeHex, roughness: 0.4 });
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 1.8, 14), thobeMat);
        body.position.y = 0.9;
        body.name = 'thobe';

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), new THREE.MeshStandardMaterial({ color: 0xd2b48c }));
        head.position.y = 2.0;

        // Headwear
        const headwearType = (outfit && outfit.headwear) ? outfit.headwear : 'ghutra';
        const headwearGroup = new THREE.Group();

        if (headwearType === 'ghutra') {
            const ghutra = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.45, 12), new THREE.MeshStandardMaterial({ color: 0xffffff }));
            ghutra.position.set(0, 2.3, 0);
            const agal = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.04, 8, 16), new THREE.MeshBasicMaterial({ color: 0x111111 }));
            agal.rotation.x = Math.PI / 2;
            agal.position.set(0, 2.22, 0);
            headwearGroup.add(ghutra, agal);
        } else if (headwearType === 'cap') {
            const capDome = new THREE.Mesh(new THREE.SphereGeometry(0.29, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1e272e }));
            capDome.position.set(0, 2.05, 0);
            const visor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.2), new THREE.MeshStandardMaterial({ color: 0x1e272e }));
            visor.position.set(0, 2.08, 0.26);
            headwearGroup.add(capDome, visor);
        } else {
            const hair = new THREE.Mesh(new THREE.SphereGeometry(0.29, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2c3e50 }));
            hair.position.set(0, 2.05, 0);
            headwearGroup.add(hair);
        }

        // Face
        const face = new THREE.Group();
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.045), eyeMat);
        eyeL.position.set(-0.09, 2.05, 0.26);
        const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.02), pupilMat);
        pupilL.position.set(-0.09, 2.05, 0.3);

        const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.045), eyeMat);
        eyeR.position.set(0.09, 2.05, 0.26);
        const pupilR = new THREE.Mesh(new THREE.SphereGeometry(0.02), pupilMat);
        pupilR.position.set(0.09, 2.05, 0.3);

        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 8), new THREE.MeshStandardMaterial({ color: 0xc8a27a }));
        nose.position.set(0, 2.0, 0.28);

        const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 0.03), new THREE.MeshBasicMaterial({ color: 0x800000 }));
        mouth.position.set(0, 1.92, 0.26);

        const stache = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.03), new THREE.MeshBasicMaterial({ color: 0x222222 }));
        stache.position.set(0, 1.95, 0.27);

        face.add(eyeL, pupilL, eyeR, pupilR, nose, mouth, stache);

        const tagMesh = this.createNameTagMesh(name);
        tagMesh.position.set(0, 2.65, 0);

        pGroup.add(body, head, headwearGroup, face, tagMesh);
        return pGroup;
    }

    createCustom3DRodModel(rodStyle) {
        const rodGroup = new THREE.Group();

        let shaftColor = 0x111111;
        let reelColor = 0xffd700;
        let isEmissive = false;
        let emissiveColor = 0x000000;

        if (rodStyle === 'rod-gold') {
            shaftColor = 0xffd700; reelColor = 0xffffff; isEmissive = true; emissiveColor = 0xffb700;
        } else if (rodStyle === 'rod-neon') {
            shaftColor = 0x00d2ff; reelColor = 0x00d2ff; isEmissive = true; emissiveColor = 0x00d2ff;
        } else if (rodStyle === 'rod-crimson' || rodStyle === 'rod-dragon') {
            shaftColor = 0xff4757; reelColor = 0xffd700; isEmissive = true; emissiveColor = 0xff4757;
        } else if (rodStyle === 'rod-emerald') {
            shaftColor = 0x2ecc71; reelColor = 0x2ecc71; isEmissive = true; emissiveColor = 0x2ecc71;
        } else if (rodStyle === 'rod-violet') {
            shaftColor = 0x8e44ad; reelColor = 0x9b59b6; isEmissive = true; emissiveColor = 0x8e44ad;
        }

        const shaftMat = new THREE.MeshStandardMaterial({
            color: shaftColor,
            metalness: 0.8,
            roughness: 0.2,
            emissive: emissiveColor,
            emissiveIntensity: isEmissive ? 0.6 : 0
        });

        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.032, 2.8), shaftMat);
        shaft.position.set(0, 1.4, 0);

        const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08), new THREE.MeshStandardMaterial({ color: reelColor, metalness: 0.9 }));
        reel.rotation.x = Math.PI / 2;
        reel.position.set(0, 0.3, -0.05);

        rodGroup.add(shaft, reel);
        rodGroup.position.set(0.3, 1.2, 0.3);
        rodGroup.rotation.x = Math.PI / 4;

        return rodGroup;
    }

    updateRemotePlayer(data) {
        if (!this.isOnline) return;

        let pData = this.remotePlayers.get(data.peerId);

        if (!pData) {
            const avatarMesh = this.createDetailedHumanAvatar(data.name, data.outfit);
            const rodMesh = this.createCustom3DRodModel(data.rodStyle);
            avatarMesh.add(rodMesh);

            this.game.scene.add(avatarMesh);

            pData = {
                mesh: avatarMesh,
                rodMesh: rodMesh,
                currentRodStyle: data.rodStyle,
                heldFishMesh: null,
                heldFishId: null,
                name: data.name,
                targetPos: new THREE.Vector3(data.position.x, 3.4, data.position.z),
                targetRotY: data.rotationY + Math.PI, // Correct facing direction!
                lastSeen: Date.now()
            };
            this.remotePlayers.set(data.peerId, pData);
            this.game.toast(`🌐 انضم الصياد [${data.name}] لسيرفرك!`);
        }

        pData.lastSeen = Date.now();
        pData.targetPos.set(data.position.x, 3.4, data.position.z);
        pData.targetRotY = data.rotationY + Math.PI;

        // Dynamic Outfit & Headwear Rebuild for Remote Players
        const outfitKey = JSON.stringify(data.outfit || {});
        if (pData.currentOutfitKey !== outfitKey) {
            this.game.scene.remove(pData.mesh);
            const avatarMesh = this.createDetailedHumanAvatar(data.name, data.outfit);
            pData.rodMesh = this.createCustom3DRodModel(data.rodStyle);
            avatarMesh.add(pData.rodMesh);
            avatarMesh.position.copy(pData.targetPos);
            avatarMesh.rotation.y = pData.targetRotY;
            this.game.scene.add(avatarMesh);
            pData.mesh = avatarMesh;
            pData.currentOutfitKey = outfitKey;
            pData.heldFishId = null; // Force re-attaching fish if holding one
        }

        // Update Rod Skin Model
        if (pData.currentRodStyle !== data.rodStyle) {
            pData.mesh.remove(pData.rodMesh);
            pData.rodMesh = this.createCustom3DRodModel(data.rodStyle);
            pData.mesh.add(pData.rodMesh);
            pData.currentRodStyle = data.rodStyle;
        }

        // Update Held Fish Model in Hand
        if (pData.heldFishId !== data.heldFishId) {
            if (pData.heldFishMesh) {
                pData.mesh.remove(pData.heldFishMesh);
                pData.heldFishMesh = null;
            }
            if (data.heldFishId) {
                const fishObj = BAHRAINI_FISHES.find(f => f.id === data.heldFishId);
                if (fishObj) {
                    pData.heldFishMesh = create3DFishMesh(fishObj);
                    pData.heldFishMesh.scale.set(0.35, 0.35, 0.35);
                    pData.heldFishMesh.position.set(-0.35, 1.2, 0.3);
                    pData.mesh.add(pData.heldFishMesh);
                }
            }
            pData.heldFishId = data.heldFishId;
        }

        // Butter Smooth Lerp Interpolation
        pData.mesh.position.lerp(pData.targetPos, 0.35);
        pData.mesh.rotation.y = THREE.MathUtils.lerp(pData.mesh.rotation.y, pData.targetRotY, 0.35);
    }

    removeRemotePlayer(peerId) {
        const pData = this.remotePlayers.get(peerId);
        if (pData) {
            this.game.scene.remove(pData.mesh);
            this.remotePlayers.delete(peerId);
            this.game.toast(`👋 غادر الصياد [${pData.name}] السيرفر.`);
        }
    }

    createNameTagMesh(name) {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#00d2ff';
        ctx.font = 'Bold 28px Cairo';
        ctx.fillText(`🌐 ${name}`, 10, 40);

        const tex = new THREE.CanvasTexture(canvas);
        return new THREE.Mesh(new THREE.PlaneGeometry(3, 0.8), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
    }

    getConnectedPlayersList() {
        const list = [];
        this.remotePlayers.forEach((p, peerId) => {
            list.push({ peerId, name: p.name });
        });
        return list;
    }

    getServerListArray() {
        return Array.from(this.serversList.values());
    }
}
