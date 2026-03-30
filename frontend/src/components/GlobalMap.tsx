import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Minimize2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { presenceService } from '../api';

/**
 * 使用 Three.js 渲染摄影级地球
 * 贴图来源：NASA Visible Earth (公共领域)
 * 使用暗色调地球贴图 URL 以保持 Hive 的深色视觉一致性
 */
const EARTH_TEXTURE_URL = 'https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg';
const EARTH_NIGHT_URL = 'https://unpkg.com/three-globe@2.31.1/example/img/earth-night.jpg';

export const GlobalMap: React.FC<{ onExit: () => void }> = ({ onExit }) => {
    const { t } = useTranslation();
    const [stats, setStats] = React.useState({ total_online: 0, active_hives: 0, total_sparks_today: 0 });
    const mountRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        const width = mount.clientWidth;
        const height = mount.clientHeight;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x050505);

        // Camera
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.z = 6.0;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        mount.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Texture Loader
        const textureLoader = new THREE.TextureLoader();

        // Earth Sphere
        const earthGeometry = new THREE.SphereGeometry(1, 64, 64);
        const earthMaterial = new THREE.MeshPhongMaterial({
            shininess: 25,
            // NOTE: 先用简单暗色材质，贴图异步加载
            color: 0x111111,
        });
        const earth = new THREE.Mesh(earthGeometry, earthMaterial);
        scene.add(earth);

        // 异步加载主贴图 (NASA Blue Marble)
        textureLoader.load(EARTH_TEXTURE_URL, (texture) => {
            earthMaterial.map = texture;
            earthMaterial.color = new THREE.Color(0xffffff);
            earthMaterial.needsUpdate = true;
        });

        // 异步加载夜景贴图作为自发光 (Emissive Map)
        textureLoader.load(EARTH_NIGHT_URL, (nightTexture) => {
            earthMaterial.emissiveMap = nightTexture;
            earthMaterial.emissive = new THREE.Color(0xffff88); // 柔和的金黄色灯光
            earthMaterial.emissiveIntensity = 0.5;
            earthMaterial.needsUpdate = true;
        });

        // 大气层 (发光外壳)
        const atmosphereGeometry = new THREE.SphereGeometry(1.02, 64, 64);
        const atmosphereMaterial = new THREE.ShaderMaterial({
            vertexShader: `
                varying vec3 vNormal;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec3 vNormal;
                void main() {
                    float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                    gl_FragColor = vec4(0.96, 0.65, 0.14, 1.0) * intensity * 0.4;
                }
            `,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
            transparent: true,
        });
        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        scene.add(atmosphere);

        // 用户标记点 (上海附近: lat 31, lon 121)
        const markerLat = 31;
        const markerLon = 121;
        const phi = (90 - markerLat) * (Math.PI / 180);
        const theta = (markerLon + 180) * (Math.PI / 180);
        const markerRadius = 1.01;

        const markerGeometry = new THREE.SphereGeometry(0.02, 16, 16);
        const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xF5A623 });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.set(
            -markerRadius * Math.sin(phi) * Math.cos(theta),
            markerRadius * Math.cos(phi),
            markerRadius * Math.sin(phi) * Math.sin(theta)
        );
        earth.add(marker);

        // 标记点发光波纹
        const pulseGeometry = new THREE.RingGeometry(0.03, 0.06, 32);
        const pulseMaterial = new THREE.MeshBasicMaterial({
            color: 0xF5A623,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
        });
        const pulseRing = new THREE.Mesh(pulseGeometry, pulseMaterial);
        pulseRing.position.copy(marker.position);
        pulseRing.lookAt(new THREE.Vector3(0, 0, 0));
        earth.add(pulseRing);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x333333, 1.5);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8);
        directionalLight.position.set(5, 3, 5);
        scene.add(directionalLight);

        // 微弱的补光
        const fillLight = new THREE.DirectionalLight(0x334455, 0.4);
        fillLight.position.set(-5, -3, -5);
        scene.add(fillLight);

        // Animation Loop
        let animFrame: number;
        let pulseScale = 0;
        const animate = () => {
            animFrame = requestAnimationFrame(animate);
            earth.rotation.y += 0.004;

            // 波纹脉冲
            pulseScale += 0.02;
            const scale = 1 + Math.sin(pulseScale) * 0.5;
            pulseRing.scale.set(scale, scale, scale);
            (pulseRing.material as THREE.MeshBasicMaterial).opacity = 0.6 - Math.sin(pulseScale) * 0.3;

            renderer.render(scene, camera);
        };
        animate();

        // Resize handler
        const handleResize = () => {
            const w = mount.clientWidth;
            const h = mount.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animFrame);
            window.removeEventListener('resize', handleResize);
            renderer.dispose();
            mount.removeChild(renderer.domElement);
        };
    }, []);

    // Fetch stats
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await presenceService.getStats();
                setStats(data);
            } catch (err) {
                console.error('Failed to fetch global stats:', err);
            }
        };
        fetchStats();
        const interval = setInterval(fetchStats, 60000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="absolute inset-0 z-50 bg-[#050505] flex flex-col animate-in fade-in zoom-in duration-1000">
            {/* Header */}
            <div className="absolute top-16 left-0 right-0 px-8 flex justify-between items-start pointer-events-none z-10 w-full">
                <div className="animate-in fade-in slide-in-from-top-4 duration-700 delay-300">
                    <div className="text-[10px] text-[#F5A623] font-black uppercase tracking-[0.4em] mb-1">{t('global_map.status_title')}</div>
                    <div className="text-3xl font-black text-white tracking-tighter">
                        {stats.total_online === 0 ? '--' : stats.total_online.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">{t('global_map.total_focusing')}</div>

                    <div className="mt-8 flex gap-8">
                        <div>
                            <div className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-1">{t('global_map.active_hives')}</div>
                            <div className="text-lg font-black text-zinc-300">
                                {stats.active_hives === 0 ? '--' : stats.active_hives.toLocaleString()}
                            </div>
                        </div>
                        <div>
                            <div className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-1">{t('global_map.daily_sparks')}</div>
                            <div className="text-lg font-black text-zinc-300">
                                {stats.total_sparks_today === 0 ? '--' : stats.total_sparks_today.toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/5 backdrop-blur-md">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#F5A623] animate-pulse"></div>
                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">{t('global_map.live_sync')}</span>
                    </div>
                </div>
            </div>

            {/* Three.js Mount */}
            <div ref={mountRef} className="flex-1 w-full h-full" />

            {/* Footer */}
            <div className="absolute bottom-12 left-0 right-0 px-8 flex flex-col items-center gap-5 z-10">
                <div className="p-4 rounded-3xl bg-white/[0.03] border border-white/5 backdrop-blur-xl text-center max-w-[280px]">
                    <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                        {t('global_map.manifesto')}
                    </p>
                </div>

                <button
                    onClick={onExit}
                    className="flex items-center gap-3 px-8 py-4 rounded-full bg-white text-black font-bold uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-2xl"
                >
                    <Minimize2 size={16} strokeWidth={3} />
                    {t('global_map.return_squad')}
                </button>
            </div>
        </div>
    );
};
