import * as THREE from 'three';

export class RealtimeMultiplayerManager {
    constructor(gameController) {
        this.game = gameController;
        this.playerName = 'صيad_المنامة';
        this.currentServerName = 'سيرفر المنامة الرئيسي';
        this.peerId = 'peer_' + Math.random().toString(36).substr(2, 9);
        
        this.channel = new BroadcastChannel('manama_fishing_room');
        this.remotePlayers = new Map(); // peerId -> { mesh, name, tagMesh, rodMesh, currentRodStyle }
        this.serversList = new Map();

        this.setupNetworkListeners();
        this.startHeartbeat();
    }

    setPlayerName(name) {
        if (name && name.trim()) {
            this.playerName = name.trim();
        }
    }

    createServer(serverName) {
        if (!serverName || !serverName.trim()) return;
        const sId = 'server_' + Math.random().toString(36).substr(2, 7);
        const sData = {
            serverId: sId,
            name: serverName.trim(),
            hostName: this.playerName,
            playerCount: 1,
            lastActive: Date.now()
        };
        this.serversList.set(sId, sData);
        this.currentServerName = sData.name;

        this.broadcastMessage({
            type: 'ANNOUNCE_SERVER',
            server: sData
        });

        this.game.toast(`🎉 تم إنشاء السيرفر [${sData.name}] بنجاح!`);
    }

    joinServer(serverId) {
        const s = this.serversList.get(serverId);
        if (s) {
            this.currentServerName = s.name;
            this.game.toast(`🌐 تم الانضمام للسيرفر [${s.name}] بنجاح!`);
        }
    }

    broadcastMessage(msg) {
        msg.peerId = this.peerId;
        msg.timestamp = Date.now();
        try { this.channel.postMessage(msg); } catch (e) {}

        try {
            localStorage.setItem('manama_net_msg', JSON.stringify(msg));
        } catch (e) {}
    }

    setupNetworkListeners() {
        const handleMsg = (data) => {
            if (!data || data.peerId === this.peerId) return;

            if (data.type === 'ANNOUNCE_SERVER') {
                this.serversList.set(data.server.serverId, data.server);
                if (this.game.renderServerBrowser) this.game.renderServerBrowser();
            } else if (data.type === 'JOIN' || data.type === 'UPDATE') {
                this.updateRemotePlayer(data);
            } else if (data.type === 'LEAVE') {
                this.removeRemotePlayer(data.peerId);
            } else if (data.type === 'TRADE_REQUEST' && data.targetPeerId === this.peerId) {
                this.game.receiveTradeRequest(data);
            } else if (data.type === 'CHALLENGE_REQUEST' && data.targetPeerId === this.peerId) {
                this.game.receiveChallengeRequest(data);
            }
        };

        this.channel.onmessage = (event) => handleMsg(event.data);

        window.addEventListener('storage', (e) => {
            if (e.key === 'manama_net_msg' && e.newValue) {
                try {
                    const data = JSON.parse(e.newValue);
                    handleMsg(data);
                } catch (err) {}
            }
        });

        window.addEventListener('beforeunload', () => {
            this.broadcastMessage({ type: 'LEAVE' });
        });
    }

    startHeartbeat() {
        setInterval(() => {
            this.broadcastMessage({
                type: 'ANNOUNCE_SERVER',
                server: {
                    serverId: 'server_' + this.peerId,
                    name: `سيرفر ${this.playerName}`,
                    hostName: this.playerName,
                    playerCount: this.remotePlayers.size + 1
                }
            });

            if (this.game.player) {
                const pos = this.game.player.camera.position;
                const rotY = this.game.player.yaw;

                this.broadcastMessage({
                    type: 'UPDATE',
                    name: this.playerName,
                    position: { x: pos.x, y: pos.y, z: pos.z },
                    rotationY: rotY,
                    rodStyle: this.game.equippedRodId || 'rod-classic',
                    heldFish: this.game.currentFish ? this.game.currentFish.nameAr : null
                });
            }

            const now = Date.now();
            this.remotePlayers.forEach((pData, peerId) => {
                if (now - pData.lastSeen > 4000) {
                    this.removeRemotePlayer(peerId);
                }
            });
        }, 50);
    }

    createDetailedHumanAvatar(name) {
        const pGroup = new THREE.Group();

        // High Quality Thobe / Body Silhouette like the NPCs
        const thobeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.36, 2.5, 14), thobeMat);
        body.position.y = 1.25;

        // Head Sphere
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 16), new THREE.MeshStandardMaterial({ color: 0xd2b48c }));
        head.position.y = 2.75;

        // Ghutra Head Cap
        const ghutra = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.6, 12), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        ghutra.position.set(0, 3.1, 0);

        // Detailed Facial Features (Eyes, Nose, Mouth)
        const face = new THREE.Group();
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06), eyeMat);
        eyeL.position.set(-0.12, 2.8, 0.35);
        const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.03), pupilMat);
        pupilL.position.set(-0.12, 2.8, 0.39);

        const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.06), eyeMat);
        eyeR.position.set(0.12, 2.8, 0.35);
        const pupilR = new THREE.Mesh(new THREE.SphereGeometry(0.03), pupilMat);
        pupilR.position.set(0.12, 2.8, 0.39);

        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 8), new THREE.MeshStandardMaterial({ color: 0xc8a27a }));
        nose.position.set(0, 2.73, 0.38);

        const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.04), new THREE.MeshBasicMaterial({ color: 0x800000 }));
        mouth.position.set(0, 2.63, 0.36);

        face.add(eyeL, pupilL, eyeR, pupilR, nose, mouth);

        // Name Tag Above Head
        const tagMesh = this.createNameTagMesh(name);
        tagMesh.position.set(0, 3.65, 0);

        pGroup.add(body, head, ghutra, face, tagMesh);
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

        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.038, 3.5), shaftMat);
        shaft.position.set(0, 1.75, 0);

        const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.09), new THREE.MeshStandardMaterial({ color: reelColor, metalness: 0.9 }));
        reel.rotation.x = Math.PI / 2;
        reel.position.set(0, 0.4, -0.06);

        rodGroup.add(shaft, reel);
        rodGroup.position.set(0.35, 1.6, 0.4);
        rodGroup.rotation.x = Math.PI / 4;

        return rodGroup;
    }

    updateRemotePlayer(data) {
        let pData = this.remotePlayers.get(data.peerId);

        if (!pData) {
            const avatarMesh = this.createDetailedHumanAvatar(data.name);
            const rodMesh = this.createCustom3DRodModel(data.rodStyle);
            avatarMesh.add(rodMesh);

            this.game.scene.add(avatarMesh);

            pData = {
                mesh: avatarMesh,
                rodMesh: rodMesh,
                currentRodStyle: data.rodStyle,
                name: data.name,
                targetPos: new THREE.Vector3(data.position.x, 3.4, data.position.z),
                targetRotY: data.rotationY,
                lastSeen: Date.now()
            };
            this.remotePlayers.set(data.peerId, pData);
            this.game.toast(`🌐 انضم الصياد [${data.name}] للسيرفر!`);
        }

        pData.lastSeen = Date.now();
        pData.targetPos.set(data.position.x, 3.4, data.position.z);
        pData.targetRotY = data.rotationY;

        // Update Rod Skin Model if Player Switched Rod
        if (pData.currentRodStyle !== data.rodStyle) {
            pData.mesh.remove(pData.rodMesh);
            pData.rodMesh = this.createCustom3DRodModel(data.rodStyle);
            pData.mesh.add(pData.rodMesh);
            pData.currentRodStyle = data.rodStyle;
        }

        // Smooth Interpolation
        pData.mesh.position.lerp(pData.targetPos, 0.45);
        pData.mesh.rotation.y = data.rotationY;
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
