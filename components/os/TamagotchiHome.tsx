import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useOS } from '../../context/OSContext';
import { INSTALLED_APPS } from '../../constants';
import { AppID, CharacterProfile, RoomItem } from '../../types';
import { DB } from '../../utils/db';
import AppIcon from './AppIcon';
import TokenImg from './TokenImg';
import { useBlobRefUrl } from '../../utils/blobRef';
import { FURNITURE_ICONS } from '../../utils/furnitureIcons';
import { isDevDebugAvailable, subscribeDevDebugAvailability } from '../../utils/devDebug';

// ===== 电子宠物主题（tamagotchi skin）=====
// 桌面不再是「放图标的手机」，而是一台养成机：屏幕主体是角色**真实的小屋**
// （小小窝 App 里用户亲手装修的那间，家具/地毯/墙地面/立绘原样搬入，只读舞台），
// 角色在里面呼吸、游荡、被戳会念聊天里说过的话；底部 CARE/TALK/HOME/ALBUM/SETTINGS 五键 dock。
// 视觉基调照抄参考稿：薰衣草底 + 奶油卡片 + 柔紫描边 + 像素字（Courier Prime）。
//
// 性能红线（此文件的宪法）：
//   · 零常驻 JS 动画 —— 循环动效全部 CSS keyframes 且只碰 transform/opacity；
//     JS 只用 ≥15s 的一次性 setTimeout 换游荡坐标。
//   · 禁 backdrop-filter；blur 仅限小面积静态装饰；每元素阴影 ≤1 层。
//   · 渲染隔离 —— 舞台/状态卡拆 memo 子组件，分钟跳动不触达家具层 reconcile。
//   · 图片全走 TokenImg / useBlobRefUrl（blobref 令牌自动解析回收）+ lazy。

// —— 调色板（薰衣草奶油 · 参考稿取色）——
const PAL = {
    frame: '#b3a3e0',    // 柔紫描边
    frameSoft: 'rgba(179,163,224,0.45)',
    cream: '#fdf9f2',    // 奶油卡片底
    creamSoft: 'rgba(253,249,242,0.82)',
    ink: '#7a6cb8',      // 主文字 · 紫
    fade: '#a99bd4',     // 次文字 · 浅紫
    heart: '#f2a7bb',    // 爱心/经验条粉
    heartDeep: '#e8879f',
    care: '#f2a3b0',     // dock · CARE 粉
    talk: '#a9d8c2',     // dock · TALK 薄荷
    album: '#cabdf0',    // dock · ALBUM 淡紫
    night: '#3a3560',    // 夜钟深紫
};
const FONT_PX = `'Courier Prime', monospace`;                   // 像素/LCD 字
const FONT_CN = `'ZCOOL KuaiLe', 'Noto Sans SC', sans-serif`;   // 中文圆润

const FLOOR_HORIZON = 65; // 与 RoomApp 一致：地平线 65%

// —— 兜底家具（角色从没装修过小屋时）——
// 注意：不能 import RoomApp（它是 lazy chunk，引了会把整个小屋 App 拽进主包），
// 这里放一份轻量镜像：通用默认 = RoomApp.DEFAULT_FURNITURE；Sully = SULLY_FURNITURE 的
// 摆位副本（去掉了舞台用不到的 descriptionPrompt）。Sully 首次进过小小窝后 roomConfig
// 会自动落库，此副本只服务于「装完还没进过屋」的新档。
const FALLBACK_DEFAULT: RoomItem[] = [
    { id: 'desk', name: '书桌', type: 'furniture', image: FURNITURE_ICONS.sofa, x: 20, y: 55, scale: 1.2, rotation: 0, isInteractive: true },
    { id: 'plant', name: '盆栽', type: 'decor', image: FURNITURE_ICONS.plant, x: 85, y: 40, scale: 0.8, rotation: 0, isInteractive: true },
];
const FALLBACK_SULLY: RoomItem[] = [
    { id: 'item-1768927221380', name: 'Sully床', type: 'furniture', image: 'https://sharkpan.xyz/f/A3XeUZ/BED.png', x: 78.46, y: 97.39, scale: 2.4, rotation: 0, isInteractive: true },
    { id: 'item-1768927255102', name: 'Sully电脑桌', type: 'furniture', image: 'https://sharkpan.xyz/f/G5n3Ul/DNZ.png', x: 28.85, y: 69.94, scale: 2.4, rotation: 0, isInteractive: true },
    { id: 'item-1768927271632', name: 'Sully垃圾桶', type: 'furniture', image: 'https://sharkpan.xyz/f/75Nvsj/LJT.png', x: 10.28, y: 80.5, scale: 0.9, rotation: 0, isInteractive: true },
    { id: 'item-1768927286526', name: 'Sully洞洞板', type: 'furniture', image: 'https://sharkpan.xyz/f/85K5ij/DDB.png', x: 32.61, y: 48.72, scale: 2.6, rotation: 0, isInteractive: true },
    { id: 'item-1768927303472', name: 'Sully书柜', type: 'furniture', image: 'https://sharkpan.xyz/f/zlpWS5/SG.png', x: 79.84, y: 68.94, scale: 2, rotation: 0, isInteractive: true },
];
const FALLBACK_WALL = 'radial-gradient(circle at 50% 50%, #fdfbf7 0%, #e2e8f0 100%)';
const FALLBACK_FLOOR = 'repeating-linear-gradient(90deg, #e7e5e4 0px, #e7e5e4 20px, #d6d3d1 21px)';

// 与 RoomApp.getBgStyle 同口径：url 类走 background 简写（含缩放/平铺），渐变串原样返回
const getBgStyle = (img: string | undefined, scale: number | undefined, repeat: boolean | undefined, fallback: string): string => {
    if (!img) return fallback;
    const isUrl = img.startsWith('http') || img.startsWith('data') || img.startsWith('blob:');
    if (!isUrl) return img;
    const size = scale && scale > 0 ? `${scale}%` : 'cover';
    return `url(${img}) center center / ${size} ${repeat ? 'repeat' : 'no-repeat'}`;
};

// 与 RoomApp 一致的图层法则：地毯压进 [1,11] 底层区间，家具按 y 排 z，角色 y+20 必然在最上
const itemZ = (item: RoomItem) => item.type === 'rug' ? 1 + Math.floor(item.y / 10) : Math.floor(item.y);

const isNightHour = (h: number) => h < 6 || h >= 23;

// 戳一戳兜底短语（角色还没说过话时用）
const POKE_FALLBACK = ['嗯？', '干嘛啦…', '我在呢！', '(被戳了一下)', '別戳了别戳了', '✦?', '在想事情…', '要陪我玩吗！'];

// 等级口径与 MobileGameHome 完全一致：每条消息 10 exp，三角曲线升级
const deriveStats = (msgCount: number) => {
    const totalExp = msgCount * 10;
    const base = 150;
    const level = Math.max(1, Math.floor((1 + Math.sqrt(1 + (8 * totalExp) / base)) / 2));
    const need = (base * level * (level - 1)) / 2;
    const exp = Math.max(0, Math.round(totalExp - need));
    const expMax = base * level;
    return { level, exp, expMax };
};

// ─── 状态卡（参考稿：头像 + 时间/名字 + Lv + 爱心经验条）───────────
const StatusCard = React.memo<{ hh: string; mm: string; level: number; expPct: number; charName: string; avatar?: string; multiChar: boolean; onSwitch: () => void }>(
    ({ hh, mm, level, expPct, charName, avatar, multiChar, onSwitch }) => (
        <div className="rounded-2xl px-3.5 py-2.5 mt-2.5 flex items-center gap-3"
            style={{ background: PAL.creamSoft, border: `2px solid ${PAL.frame}` }}>
            <button onClick={onSwitch} className={`relative shrink-0 ${multiChar ? 'active:scale-95 transition-transform' : ''}`}>
                <div className="w-[52px] h-[52px] rounded-2xl overflow-hidden" style={{ border: `2px solid ${PAL.frameSoft}`, background: '#fff' }}>
                    {avatar ? <img src={avatar} className="w-full h-full object-cover" alt="" loading="lazy" draggable={false} /> : <div className="w-full h-full flex items-center justify-center text-lg" style={{ color: PAL.fade }}>✦</div>}
                </div>
                {multiChar && <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px]" style={{ background: PAL.cream, border: `1.5px solid ${PAL.frame}`, color: PAL.ink }}>⇄</span>}
            </button>
            <div className="flex-1 min-w-0" style={{ fontFamily: FONT_PX, color: PAL.ink }}>
                <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[19px] font-bold tabular-nums tracking-[0.06em]">{hh}:{mm}</span>
                    <span className="text-[15px] font-bold tracking-wide shrink-0">Lv.{level}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-[13px] truncate tracking-wide" style={{ color: PAL.fade }}>{charName}</span>
                    <span className="text-[10px] shrink-0" style={{ color: PAL.heart }}>✦</span>
                </div>
                {/* 爱心经验条 */}
                <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[11px] leading-none" style={{ color: PAL.heart }}>♥</span>
                    <div className="flex-1 h-[6px] rounded-full overflow-hidden" style={{ background: 'rgba(179,163,224,0.22)' }}>
                        <div className="h-full rounded-full" style={{ width: `${expPct}%`, background: `linear-gradient(90deg, ${PAL.heart}, ${PAL.heartDeep})` }} />
                    </div>
                </div>
            </div>
        </div>
    )
);

// ─── 舞台家具（静态贴纸，逐件 memo）───────────────────────────
const StageItem = React.memo<{ item: RoomItem }>(({ item }) => (
    <div className="absolute pointer-events-none select-none"
        style={{
            left: `${item.x}%`, top: `${item.y}%`,
            width: `${80 * item.scale}px`,
            transform: `translate(-50%, -100%) rotate(${item.rotation}deg)`,
            zIndex: itemZ(item),
        }}>
        <TokenImg value={item.image} className="w-full h-auto object-contain" draggable={false} loading="lazy" alt="" />
    </div>
));

// ─── 天窗挂饰（参考稿：舞台顶部小窗 + 悬星，纯静态 CSS）────────────
const StageWindow = React.memo(() => (
    <div className="absolute top-[4%] left-[5%] right-[5%] h-[13%] pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0 rounded-xl overflow-hidden" style={{ border: '3px solid rgba(255,255,255,0.85)', background: 'linear-gradient(180deg, #bfe0f7 0%, #dff0fc 70%, #f0f8fe 100%)' }}>
            {/* 云朵（静态圆角块，无 blur） */}
            <div className="absolute top-[28%] left-[12%] w-[26%] h-[36%] rounded-full" style={{ background: 'rgba(255,255,255,0.85)' }} />
            <div className="absolute top-[18%] left-[22%] w-[18%] h-[34%] rounded-full" style={{ background: 'rgba(255,255,255,0.75)' }} />
            <div className="absolute top-[42%] right-[16%] w-[22%] h-[32%] rounded-full" style={{ background: 'rgba(255,255,255,0.7)' }} />
            <span className="absolute top-[12%] right-[38%] text-[9px]" style={{ color: '#fff' }}>✦</span>
        </div>
        {/* 悬挂的小星星 / 月亮 */}
        {[
            { x: '18%', drop: 14, char: '⭐', size: 11 },
            { x: '46%', drop: 22, char: '✦', size: 10 },
            { x: '64%', drop: 12, char: '💫', size: 10 },
            { x: '86%', drop: 26, char: '🌙', size: 12 },
        ].map((s, i) => (
            <div key={i} className="absolute top-full flex flex-col items-center" style={{ left: s.x }}>
                <span style={{ width: 1, height: s.drop, background: PAL.frameSoft }} />
                <span className="leading-none select-none" style={{ fontSize: s.size, color: PAL.fade }}>{s.char}</span>
            </div>
        ))}
    </div>
));

// ─── 角色（呼吸 / 游荡 / 戳一戳念聊天台词 / 夜间飘 Zzz），自治状态不外溢 ─
const Actor = React.memo<{ actorImg: string | undefined; night: boolean; pokeLines: string[]; unread: number; onChat: () => void }>(
    ({ actorImg, night, pokeLines, unread, onChat }) => {
        const [pos, setPos] = useState({ x: 48, y: 80 });
        const [bounce, setBounce] = useState(false);
        const [pokeText, setPokeText] = useState('');
        const pokeIdx = useRef(0); // 台词按顺序循环（最新一条开始往回念）

        // 游荡：≥18s 一次性的 setTimeout 链（无 rAF / 无短 interval），夜里停下休息
        useEffect(() => {
            if (night) return;
            let t: ReturnType<typeof setTimeout>;
            const wander = () => {
                setPos({ x: 22 + Math.random() * 56, y: 70 + Math.random() * 22 });
                t = setTimeout(wander, 18000 + Math.random() * 22000);
            };
            t = setTimeout(wander, 15000);
            return () => clearTimeout(t);
        }, [night]);

        const poke = (e: React.MouseEvent) => {
            e.stopPropagation();
            setBounce(true);
            setTimeout(() => setBounce(false), 450);
            // 从聊天里 ta 最近的回复按顺序循环取一条；一条没有就用兜底短语
            const lines = pokeLines.length > 0 ? pokeLines : POKE_FALLBACK;
            setPokeText(lines[pokeIdx.current % lines.length]);
            pokeIdx.current += 1;
            setTimeout(() => setPokeText(''), 3200);
        };

        // 气泡优先级：戳一戳台词 > 未读提醒
        const bubble = pokeText || (unread > 0 ? `♥ ${unread} 条新消息!` : '');
        const bubbleIsChat = !pokeText && unread > 0;

        return (
            <div onClick={poke}
                className="absolute cursor-pointer"
                style={{
                    left: `${pos.x}%`, top: `${pos.y}%`, width: '104px',
                    transform: 'translate(-50%, -100%)',
                    zIndex: Math.floor(pos.y) + 20,
                    transition: 'left 1.4s ease-in-out, top 1.4s ease-in-out',
                }}>
                <img src={actorImg} alt="" draggable={false} loading="lazy"
                    className="w-full h-auto object-contain select-none"
                    style={{
                        animation: bounce ? 'tama-bounce 0.45s ease-out' : (night ? 'none' : 'tama-breathe 3.2s ease-in-out infinite'),
                        willChange: 'transform',
                    }} />
                {night && (
                    <span className="absolute -top-4 right-0 text-[13px] font-bold select-none" style={{ fontFamily: FONT_PX, color: PAL.ink, animation: 'tama-zzz 2.6s ease-in-out infinite' }}>Zzz</span>
                )}
                {bubble && (
                    <div onClick={(e) => { if (bubbleIsChat) { e.stopPropagation(); onChat(); } }}
                        className="absolute bottom-[102%] left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-xl rounded-bl-none max-w-[180px] animate-pop-in"
                        style={{ background: PAL.cream, border: `2px solid ${PAL.frame}`, zIndex: 60 }}>
                        <p className="text-[10px] font-bold leading-snug break-words" style={{ fontFamily: FONT_PX, color: PAL.ink }}>{bubble}</p>
                    </div>
                )}
            </div>
        );
    }
);

// ─── 右上角小电子钟：白天=天空底，夜里=星空底 +「夜深啦！」──────────
const StageClock = React.memo<{ hh: string; mm: string; night: boolean }>(({ hh, mm, night }) => (
    <div className="absolute top-2 right-2 z-[72] rounded-xl px-2.5 py-1.5 pointer-events-none select-none"
        style={{
            border: '2px solid rgba(255,255,255,0.85)',
            background: night
                ? `linear-gradient(160deg, ${PAL.night} 0%, #575083 100%)`
                : 'linear-gradient(160deg, #bfe0f7 0%, #e8f5fd 100%)',
        }}>
        {night && (
            <>
                <span className="absolute top-[3px] left-[7px] text-[6px]" style={{ color: '#efe8b8' }}>✦</span>
                <span className="absolute bottom-[4px] right-[8px] text-[5px]" style={{ color: '#cdc6f0' }}>✦</span>
            </>
        )}
        <div className="flex items-center gap-1.5" style={{ fontFamily: FONT_PX }}>
            <span className="text-[11px] leading-none">{night ? '🌙' : '☁️'}</span>
            <div className="leading-none">
                <div className="text-[12px] font-bold tabular-nums tracking-[0.06em]" style={{ color: night ? '#f5f2ff' : PAL.ink }}>{hh}:{mm}</div>
                {night && <div className="text-[8px] mt-[2px] tracking-wide" style={{ color: '#cdc6f0', fontFamily: FONT_CN }}>夜深啦！</div>}
            </div>
        </div>
    </div>
));

// ─── 小屋舞台：props 全为原始值/memo 引用，分钟跳动只更新角落电子钟 ───
const RoomStage = React.memo<{
    items: RoomItem[]; wallStyle: string; floorStyle: string;
    actorImg: string | undefined; night: boolean; pokeLines: string[]; unread: number;
    hh: string; mm: string;
    onVisit: () => void; onChat: () => void;
}>(({ items, wallStyle, floorStyle, actorImg, night, pokeLines, unread, hh, mm, onVisit, onChat }) => (
    <div onClick={onVisit}
        className="relative flex-1 min-h-0 rounded-[1.7rem] overflow-hidden cursor-pointer active:opacity-95"
        style={{ border: `2.5px solid ${PAL.frame}`, boxShadow: `0 0 0 5px rgba(179,163,224,0.16)`, contain: 'layout paint' }}>
        {/* 墙 / 地板（与 RoomApp 同分割线） */}
        <div className="absolute top-0 left-0 w-full h-[65%] z-0" style={{ background: wallStyle }} />
        <div className="absolute bottom-0 left-0 w-full h-[35%] z-0" style={{ background: floorStyle }} />
        <div className="absolute top-[65%] w-full h-6 bg-gradient-to-b from-black/10 to-transparent pointer-events-none z-0" />
        <StageWindow />

        {items.map(item => <StageItem key={item.id} item={item} />)}

        <Actor actorImg={actorImg} night={night} pokeLines={pokeLines} unread={unread} onChat={onChat} />

        {/* ✦LIVE 徽标 + 角落电子钟 */}
        <div className="absolute top-2 left-2 z-[72] rounded-lg px-2 py-[3px] pointer-events-none select-none"
            style={{ background: PAL.creamSoft, border: `1.5px solid ${PAL.frameSoft}` }}>
            <span className="text-[9px] font-bold tracking-[0.14em]" style={{ fontFamily: FONT_PX, color: PAL.ink }}>✦ LIVE</span>
        </div>
        <StageClock hh={hh} mm={mm} night={night} />
    </div>
));

// ─── 底部五键 dock（参考稿：CARE / TALK / HOME / ALBUM / SETTINGS）───
const DOCK_GLYPHS: Record<string, React.ReactNode> = {
    heart: <svg viewBox="0 0 24 24" className="w-full h-full" fill="#fff"><path d="M12 21s-7.5-4.9-9.8-9.2C.7 8.9 2.4 5.4 5.7 5.1c1.9-.2 3.7.8 4.7 2.4h3.2c1-1.6 2.8-2.6 4.7-2.4 3.3.3 5 3.8 3.5 6.7C19.5 16.1 12 21 12 21z" transform="scale(0.92) translate(1,1)" /></svg>,
    talk: <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.3c-1.4 0-2.8-.3-4-.9L3 20l1.2-4.3a8 8 0 0 1-1.2-4.2A8.4 8.4 0 0 1 11.5 3.2 8.4 8.4 0 0 1 21 11.5z" /><circle cx="8.5" cy="11.5" r="0.6" fill="#fff" /><circle cx="12" cy="11.5" r="0.6" fill="#fff" /><circle cx="15.5" cy="11.5" r="0.6" fill="#fff" /></svg>,
    home: <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9h13v-9" /><path d="M10 19v-5h4v5" /></svg>,
    album: <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3.5" width="16" height="17" rx="2.5" /><path d="M8 3.5v17" /><path d="M14.2 8.4l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z" fill="#fff" stroke="none" /></svg>,
    gear: <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.5a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.5h4l.4-2.5a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z" /></svg>,
};

const DockKey: React.FC<{ glyph: string; label: string; tint: string; badge?: number; onClick: () => void }> = ({ glyph, label, tint, badge = 0, onClick }) => (
    <button onClick={onClick} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
        <div className="relative w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: tint, border: `2px solid rgba(255,255,255,0.75)`, boxShadow: `0 2px 6px ${PAL.frameSoft}` }}>
            <div className="w-5 h-5">{DOCK_GLYPHS[glyph]}</div>
            {badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] px-1 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ background: PAL.heartDeep, border: '1.5px solid #fff' }}>{badge > 99 ? '99+' : badge}</span>
            )}
        </div>
        <span className="text-[9px] font-bold tracking-[0.1em]" style={{ fontFamily: FONT_PX, color: PAL.ink }}>{label}</span>
    </button>
);

// ─── 主组件 ───────────────────────────────────────────────────
const TamagotchiHome: React.FC = () => {
    const { openApp, characters, activeCharacterId, setActiveCharacterId, virtualTime, unreadMessages, isDataLoaded, lastMsgTimestamp } = useOS();

    const [stat, setStat] = useState<{ msgCount: number; pokeLines: string[] }>({ msgCount: 0, pokeLines: [] });
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [devDebugVisible, setDevDebugVisible] = useState(() => isDevDebugAvailable());
    useEffect(() => subscribeDevDebugAvailability(setDevDebugVisible), []);

    const char: CharacterProfile | null = useMemo(
        () => characters.find(c => c.id === activeCharacterId) || characters[0] || null,
        [characters, activeCharacterId]
    );

    // 取数：消息数（Lv/经验条）+ ta 最近 30 条文字回复（戳一戳台词，最新在前按顺序循环）
    useEffect(() => {
        if (!isDataLoaded || !char) { setStat({ msgCount: 0, pokeLines: [] }); return; }
        DB.getMessagesByCharId(char.id).then(msgs => {
            const visible = msgs.filter(m => m.role !== 'system');
            const lines = visible
                .filter(m => m.role === 'assistant')
                .map(m => m.content.replace(/\[.*?\]/g, '').trim())
                .filter(t => t.length > 0)
                .slice(-30)
                .reverse()
                .map(t => t.length > 42 ? t.slice(0, 42) + '…' : t);
            setStat({ msgCount: visible.length, pokeLines: lines });
        }).catch(() => {});
    }, [char?.id, lastMsgTimestamp, isDataLoaded]);

    // 小屋数据：优先角色 roomConfig，兜底镜像样板房（见文件头注释）
    const isSully = char?.id === 'preset-sully-v2' || char?.name === 'Sully';
    const items = useMemo<RoomItem[]>(() => {
        const saved = char?.roomConfig?.items;
        if (saved && saved.length > 0) return saved;
        return isSully ? FALLBACK_SULLY : FALLBACK_DEFAULT;
    }, [char?.roomConfig?.items, isSully]);

    // blobref 令牌 → 可渲染 url（hook 需无条件顶层调用）
    const wallImg = useBlobRefUrl(char?.roomConfig?.wallImage);
    const floorImg = useBlobRefUrl(char?.roomConfig?.floorImage);
    const actorImg = useBlobRefUrl(char?.sprites?.['chibi'] || char?.avatar);
    const wallStyle = getBgStyle(wallImg, char?.roomConfig?.wallScale, char?.roomConfig?.wallRepeat, FALLBACK_WALL);
    const floorStyle = getBgStyle(floorImg, char?.roomConfig?.floorScale, char?.roomConfig?.floorRepeat, FALLBACK_FLOOR);

    const night = isNightHour(virtualTime.hours);
    const hh = virtualTime.hours.toString().padStart(2, '0');
    const mm = virtualTime.minutes.toString().padStart(2, '0');
    const { level, exp, expMax } = deriveStats(stat.msgCount);
    const expPct = Math.min(100, Math.round((exp / expMax) * 100));
    const totalUnread = useMemo(() => Object.values(unreadMessages).reduce((a, b) => a + b, 0), [unreadMessages]);
    const charUnread = char ? (unreadMessages[char.id] || 0) : 0;

    const openRoom = useCallback(() => openApp(AppID.Room), [openApp]);
    const openChat = useCallback(() => openApp(AppID.Chat), [openApp]);
    const switchChar = useCallback(() => {
        if (characters.length < 2 || !char) return;
        const idx = characters.findIndex(c => c.id === char.id);
        setActiveCharacterId(characters[(idx + 1) % characters.length].id);
    }, [characters, char, setActiveCharacterId]);

    const drawerApps = useMemo(
        () => INSTALLED_APPS.filter(a => a.id !== AppID.CharCreatorDev || devDebugVisible),
        [devDebugVisible]
    );

    return (
        <div className="h-full w-full relative z-10 overflow-hidden select-none flex flex-col px-4"
            style={{ color: PAL.ink, fontFamily: FONT_CN, paddingTop: 'calc(var(--safe-top, 0px) + 0.75rem)', paddingBottom: 'calc(var(--safe-bottom, 0px) + 0.9rem)' }}>
            {/* 本皮肤专用 keyframes（只碰 transform/opacity） */}
            <style>{`
                @keyframes tama-breathe { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
                @keyframes tama-bounce { 0% { transform: scale(1); } 35% { transform: scale(1.12, 0.9); } 70% { transform: scale(0.95, 1.06); } 100% { transform: scale(1); } }
                @keyframes tama-zzz { 0%,100% { opacity: 0.35; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-4px); } }
            `}</style>

            {/* ===== 报头（小头像 + 品牌字 + ⋯）===== */}
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 min-w-0" style={{ fontFamily: FONT_PX }}>
                    {char && (
                        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0" style={{ border: `2px solid ${PAL.frameSoft}`, background: '#fff' }}>
                            <img src={char.avatar} className="w-full h-full object-cover" alt="" loading="lazy" draggable={false} />
                        </div>
                    )}
                    <span className="text-[10px]" style={{ color: PAL.heart }}>✦</span>
                    <span className="text-[13px] font-bold tracking-[0.26em] truncate" style={{ color: PAL.ink, textShadow: '0 1px 0 rgba(255,255,255,0.8)' }}>SULLY·GOTCHI</span>
                    <span className="text-[9px] shrink-0" style={{ color: PAL.fade }}>✦</span>
                </div>
                <button onClick={() => setDrawerOpen(true)} aria-label="全部应用"
                    className="w-10 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform shrink-0"
                    style={{ background: PAL.cream, border: `2px solid ${PAL.frame}` }}>
                    <span className="text-[15px] font-bold leading-none tracking-widest" style={{ fontFamily: FONT_PX, color: PAL.ink }}>⋯</span>
                </button>
            </div>

            {char ? (
                <>
                    <StatusCard hh={hh} mm={mm} level={level} expPct={expPct} charName={char.name} avatar={char.avatar} multiChar={characters.length > 1} onSwitch={switchChar} />

                    {/* ===== 小屋舞台 ===== */}
                    <div className="flex-1 min-h-0 flex flex-col mt-3">
                        <RoomStage
                            items={items} wallStyle={wallStyle} floorStyle={floorStyle}
                            actorImg={actorImg} night={night} pokeLines={stat.pokeLines} unread={charUnread}
                            hh={hh} mm={mm}
                            onVisit={openRoom} onChat={openChat}
                        />
                        <div className="text-center text-[9px] mt-1.5 tracking-[0.3em] shrink-0" style={{ fontFamily: FONT_PX, color: PAL.fade }}>
                            ✦ TAP SCREEN TO VISIT ✦
                        </div>
                    </div>

                    {/* ===== 五键 dock：CARE / TALK / HOME / ALBUM / SETTINGS ===== */}
                    <div className="shrink-0 rounded-2xl px-3 pt-2 pb-1.5 mt-1 flex items-end justify-between"
                        style={{ background: PAL.creamSoft, border: `2px solid ${PAL.frame}` }}>
                        <DockKey glyph="heart" label="CARE" tint={PAL.care} onClick={() => openApp(AppID.Date)} />
                        <DockKey glyph="talk" label="TALK" tint={PAL.talk} badge={totalUnread} onClick={openChat} />
                        {/* 中央 HOME：参考稿里独立小框、略微抬高 */}
                        <button onClick={openRoom} className="flex flex-col items-center gap-1 -mt-5 active:scale-95 transition-transform">
                            <div className="w-[3.4rem] h-[3.4rem] rounded-2xl flex items-center justify-center"
                                style={{ background: PAL.cream, border: `2px solid ${PAL.frame}`, boxShadow: `0 3px 8px ${PAL.frameSoft}`, color: PAL.ink }}>
                                <div className="w-7 h-7">{DOCK_GLYPHS.home}</div>
                            </div>
                            <span className="text-[9px] font-bold tracking-[0.1em]" style={{ fontFamily: FONT_PX, color: PAL.ink }}>HOME</span>
                        </button>
                        <DockKey glyph="album" label="ALBUM" tint={PAL.album} onClick={() => openApp(AppID.MemoryPalace)} />
                        <DockKey glyph="gear" label="SETTINGS" tint={PAL.album} onClick={() => openApp(AppID.Settings)} />
                    </div>
                </>
            ) : (
                /* 零角色兜底：像素小蛋 */
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <div className="w-24 h-28 rounded-[50%_50%_46%_46%/58%_58%_42%_42%]"
                        style={{ background: `linear-gradient(180deg, ${PAL.cream}, #e8ddfb)`, border: `2.5px solid ${PAL.frame}`, animation: 'tama-breathe 2.4s ease-in-out infinite' }} />
                    <p className="text-[12px] text-center leading-relaxed" style={{ fontFamily: FONT_PX, color: PAL.fade }}>EMPTY EGG…</p>
                    <button onClick={() => openApp(AppID.Character)} className="px-5 py-2.5 rounded-2xl text-[13px] font-bold text-white active:scale-95 transition-transform"
                        style={{ background: `linear-gradient(180deg, ${PAL.heart}, ${PAL.heartDeep})`, border: `2px solid rgba(255,255,255,0.7)`, fontFamily: FONT_CN }}>
                        去神经链接领养一只
                    </button>
                </div>
            )}

            {/* ===== 全部应用抽屉（逃生舱口：外观 / 全部 App 都在这） ===== */}
            {drawerOpen && (
                <div className="absolute inset-0 z-40 flex flex-col animate-fade-in" style={{ background: 'rgba(240,235,250,0.97)' }} onClick={() => setDrawerOpen(false)}>
                    <div className="flex items-center justify-between px-6" style={{ paddingTop: 'calc(var(--safe-top, 0px) + 1.25rem)', paddingBottom: '0.5rem' }}>
                        <h2 className="text-lg tracking-wide" style={{ fontFamily: FONT_CN, color: PAL.ink }}>全部应用</h2>
                        <button onClick={(e) => { e.stopPropagation(); setDrawerOpen(false); }} aria-label="关闭"
                            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
                            style={{ background: '#fff', border: `2px solid ${PAL.frame}` }}>
                            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke={PAL.ink} strokeWidth="2.5"><path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /></svg>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-8" onClick={(e) => e.stopPropagation()}>
                        <div className="grid grid-cols-4 gap-y-5 gap-x-2 place-items-center">
                            {drawerApps.map(app => (
                                <AppIcon key={app.id} app={app} size="md" onClick={() => { setDrawerOpen(false); openApp(app.id); }} />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TamagotchiHome;
