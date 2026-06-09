import React from 'react';
import { OSTheme } from '../../types';

type Props = {
    theme: OSTheme;
    updateTheme: (updates: Partial<OSTheme>) => void;
};

const presets: Array<{ name: string; desc: string; config: Partial<OSTheme> }> = [
    {
        name: '默认聊天',
        desc: '柔和通用的聊天壳',
        config: {
            chatChromeStyle: 'soft',
            chatBackgroundStyle: 'plain',
            chatHeaderStyle: 'default',
            chatHeaderAlign: 'left',
            chatHeaderDensity: 'default',
            chatStatusStyle: 'subtle',
            chatAvatarShape: 'circle',
            chatAvatarSize: 'medium',
            chatAvatarMode: 'grouped',
            chatBubbleStyle: 'modern',
            chatMessageSpacing: 'default',
            chatInputStyle: 'rounded',
            chatSendButtonStyle: 'circle',
            chatShowTimestamp: 'hover',
        },
    },
    {
        name: 'WeChat',
        desc: '平整克制的熟悉感',
        config: {
            chatChromeStyle: 'flat',
            chatBackgroundStyle: 'paper',
            chatHeaderStyle: 'wechat',
            chatHeaderAlign: 'left',
            chatHeaderDensity: 'compact',
            chatStatusStyle: 'dot',
            chatAvatarShape: 'square',
            chatAvatarSize: 'medium',
            chatAvatarMode: 'grouped',
            chatBubbleStyle: 'wechat',
            chatMessageSpacing: 'default',
            chatInputStyle: 'wechat',
            chatSendButtonStyle: 'pill',
            chatShowTimestamp: 'hover',
        },
    },
    {
        name: 'Telegram',
        desc: '轻盈通透的玻璃感',
        config: {
            chatChromeStyle: 'floating',
            chatBackgroundStyle: 'mesh',
            chatHeaderStyle: 'telegram',
            chatHeaderAlign: 'center',
            chatHeaderDensity: 'default',
            chatStatusStyle: 'pill',
            chatAvatarShape: 'circle',
            chatAvatarSize: 'medium',
            chatAvatarMode: 'grouped',
            chatBubbleStyle: 'flat',
            chatMessageSpacing: 'spacious',
            chatInputStyle: 'telegram',
            chatSendButtonStyle: 'circle',
            chatShowTimestamp: 'always',
        },
    },
    {
        name: 'Discord',
        desc: '频道感更强的界面',
        config: {
            chatChromeStyle: 'floating',
            chatBackgroundStyle: 'grid',
            chatHeaderStyle: 'discord',
            chatHeaderAlign: 'left',
            chatHeaderDensity: 'default',
            chatStatusStyle: 'pill',
            chatAvatarShape: 'rounded',
            chatAvatarSize: 'medium',
            chatAvatarMode: 'grouped',
            chatBubbleStyle: 'shadow',
            chatMessageSpacing: 'compact',
            chatInputStyle: 'discord',
            chatSendButtonStyle: 'minimal',
            chatShowTimestamp: 'always',
        },
    },
    {
        name: 'iMessage',
        desc: '更圆润、更轻的气质',
        config: {
            chatChromeStyle: 'soft',
            chatBackgroundStyle: 'mesh',
            chatHeaderStyle: 'minimal',
            chatHeaderAlign: 'center',
            chatHeaderDensity: 'airy',
            chatStatusStyle: 'subtle',
            chatAvatarShape: 'circle',
            chatAvatarSize: 'large',
            chatAvatarMode: 'grouped',
            chatBubbleStyle: 'ios',
            chatMessageSpacing: 'spacious',
            chatInputStyle: 'ios',
            chatSendButtonStyle: 'circle',
            chatShowTimestamp: 'always',
        },
    },
    {
        name: '像素终端',
        desc: '伪窗口风格的聊天壳',
        config: {
            chatChromeStyle: 'pixel',
            chatBackgroundStyle: 'grid',
            chatHeaderStyle: 'pixel',
            chatHeaderAlign: 'left',
            chatHeaderDensity: 'compact',
            chatStatusStyle: 'pill',
            chatAvatarShape: 'square',
            chatAvatarSize: 'small',
            chatAvatarMode: 'grouped',
            chatBubbleStyle: 'outline',
            chatMessageSpacing: 'compact',
            chatInputStyle: 'pixel',
            chatSendButtonStyle: 'pill',
            chatShowTimestamp: 'always',
        },
    },
];

const defaults = {
    chatAvatarShape: 'circle',
    chatAvatarSize: 'medium',
    chatAvatarMode: 'grouped',
    chatBubbleStyle: 'modern',
    chatMessageSpacing: 'default',
    chatShowTimestamp: 'hover',
    chatHeaderStyle: 'default',
    chatInputStyle: 'default',
    chatChromeStyle: 'soft',
    chatBackgroundStyle: 'plain',
    chatHeaderAlign: 'left',
    chatHeaderDensity: 'default',
    chatStatusStyle: 'subtle',
    chatSendButtonStyle: 'circle',
} as const;

const groupClass = 'rounded-3xl border border-slate-100 bg-white p-5 shadow-sm';

// 白框自定义 CSS 快捷模板：点一下「追加」进编辑框。
// 上排是几套完整风格（想换风格建议先「清空」再点）；下排是可叠加的小片段（贴图/挪位/开关/描金）。
const CHROME_CSS_FULL_PRESETS: { name: string; code: string }[] = [
    { name: '彩虹波浪', code: `.sully-chat-header{
  position:relative;
  background:repeating-linear-gradient(90deg,#ffd6ea 0 40px,#ffe8a3 40px 80px,#d7f5c5 80px 120px,#cfe7ff 120px 160px,#e6d2ff 160px 200px)!important;
  border-bottom:none!important;
  box-shadow:0 4px 12px rgba(0,0,0,.08),inset 0 -4px rgba(255,255,255,.4);
  overflow:visible;
}
.sully-chat-header::after{content:"";position:absolute;left:0;right:0;bottom:-12px;height:24px;background:radial-gradient(circle at 12px 0,transparent 12px,rgba(255,255,255,.9) 13px);background-size:24px 24px;background-repeat:repeat-x;}
.sully-chat-header::before{content:"";position:absolute;left:0;right:0;top:0;height:6px;background:repeating-linear-gradient(90deg,#c18b5b 0 20px,#b67d4f 20px 40px);}` },
    { name: '霓虹夜', code: `.sully-chat-header{
  background:#0e0b1e!important;
  border-bottom:1px solid rgba(168,85,247,.45)!important;
  box-shadow:0 0 26px rgba(168,85,247,.35);
}
.sully-chat-name{color:#e9d5ff!important;text-shadow:0 0 8px rgba(192,132,252,.9);}
.sully-chat-status{color:#a78bfa!important;}
.sully-chat-trigger,.sully-chat-back{color:#67e8f9!important;}` },
    { name: '奶油渐变', code: `.sully-chat-header{
  background:linear-gradient(135deg,#fff1f6,#fde7c9 55%,#e7f0ff)!important;
  border-bottom:none!important;
  box-shadow:0 6px 18px rgba(180,150,120,.14);
  border-bottom-left-radius:20px;border-bottom-right-radius:20px;
}` },
    { name: '像素窗口', code: `.sully-chat-header{
  position:relative;
  background:#dfe7ef!important;
  border:none!important;border-bottom:2px solid #8aa0b6!important;
  box-shadow:inset 0 2px #fff,inset 0 -2px #b7c4d2;
}
.sully-chat-header::before{content:"● ● ●";position:absolute;left:14px;top:calc(var(--safe-top) + 6px);letter-spacing:4px;color:#ff6b6b;font-size:9px;}` },
];
const CHROME_CSS_SNIPPETS: { name: string; code: string }[] = [
    { name: '头部贴图', code: '.sully-chat-header{background:url(在此粘贴图片直链) center/cover!important;border-bottom:none!important;}' },
    { name: '头像放大', code: '.sully-chat-avatar{width:52px!important;height:52px!important;}' },
    { name: '隐藏情绪栏', code: '.sully-chat-buffs{display:none!important;}' },
    { name: '隐藏token', code: '.sully-chat-token{display:none!important;}' },
    { name: '隐藏小闪电', code: '.sully-chat-trigger{display:none!important;}' },
    { name: '闪电描金', code: '.sully-chat-trigger{color:#d4af37!important;filter:drop-shadow(0 0 4px rgba(212,175,55,.6));}' },
    { name: '输入栏毛玻璃', code: '.sully-chat-inputbar{background:rgba(255,255,255,.45)!important;backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);}' },
];

const choices = {
    chrome: [
        { value: 'soft', label: '柔雾', desc: '轻薄玻璃感' },
        { value: 'flat', label: '平面', desc: '更干净利落' },
        { value: 'floating', label: '悬浮', desc: '层次更明显' },
        { value: 'pixel', label: '像素', desc: '硬边伪窗口' },
    ],
    background: [
        { value: 'plain', label: '纯净' },
        { value: 'grid', label: '网格' },
        { value: 'paper', label: '纸面' },
        { value: 'mesh', label: '氛围' },
    ],
    header: [
        { value: 'default', label: '默认' },
        { value: 'minimal', label: '极简' },
        { value: 'gradient', label: '渐变' },
        { value: 'wechat', label: '微信感' },
        { value: 'telegram', label: 'Telegram' },
        { value: 'discord', label: 'Discord' },
        { value: 'pixel', label: '像素窗' },
    ],
    bubble: [
        { value: 'modern', label: '现代' },
        { value: 'flat', label: '扁平' },
        { value: 'outline', label: '描边' },
        { value: 'shadow', label: '立体' },
        { value: 'wechat', label: '微信感' },
        { value: 'ios', label: 'iOS' },
    ],
    input: [
        { value: 'default', label: '默认' },
        { value: 'rounded', label: '圆润' },
        { value: 'flat', label: '扁平' },
        { value: 'wechat', label: '微信感' },
        { value: 'ios', label: 'iOS' },
        { value: 'telegram', label: 'Telegram' },
        { value: 'discord', label: 'Discord' },
        { value: 'pixel', label: '像素窗' },
    ],
    align: [
        { value: 'left', label: '左对齐' },
        { value: 'center', label: '居中' },
    ],
    density: [
        { value: 'compact', label: '紧凑' },
        { value: 'default', label: '默认' },
        { value: 'airy', label: '舒展' },
    ],
    status: [
        { value: 'subtle', label: '弱提示' },
        { value: 'pill', label: '状态胶囊' },
        { value: 'dot', label: '圆点在线' },
    ],
    send: [
        { value: 'circle', label: '圆按钮' },
        { value: 'pill', label: '胶囊按钮' },
        { value: 'minimal', label: '极简图标' },
    ],
    avatarShape: [
        { value: 'circle', label: '圆形' },
        { value: 'rounded', label: '圆角' },
        { value: 'square', label: '方形' },
    ],
    avatarSize: [
        { value: 'small', label: '小' },
        { value: 'medium', label: '中' },
        { value: 'large', label: '大' },
    ],
    avatarMode: [
        { value: 'grouped', label: '连续共用', desc: '一串消息只露一次头像' },
        { value: 'every_message', label: '每条都显示', desc: '每条消息都带头像' },
    ],
    spacing: [
        { value: 'compact', label: '紧凑' },
        { value: 'default', label: '默认' },
        { value: 'spacious', label: '宽松' },
    ],
    timestamp: [
        { value: 'always', label: '始终显示' },
        { value: 'hover', label: '悬停显示' },
        { value: 'never', label: '不显示' },
    ],
} as const;

const cardButton = (active: boolean) =>
    `rounded-2xl border px-3 py-2 text-left transition-all active:scale-[0.98] ${
        active ? 'border-primary/40 bg-primary/10 text-primary shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
    }`;

const avatarClass = (shape: string, size: string) => {
    const sizeClass = size === 'small' ? 'h-7 w-7' : size === 'large' ? 'h-12 w-12' : 'h-9 w-9';
    const radiusClass = shape === 'square' ? 'rounded-sm' : shape === 'rounded' ? 'rounded-xl' : 'rounded-full';
    return `${sizeClass} ${radiusClass}`;
};

const shellClass = (style: string) => {
    if (style === 'flat') return 'border border-slate-200 shadow-none';
    if (style === 'floating') return 'border border-white/70 shadow-[0_22px_60px_rgba(148,163,184,0.28)]';
    if (style === 'pixel') return 'border-[3px] border-[#7b5a40] shadow-[6px_6px_0_rgba(123,90,64,0.24)]';
    return 'border border-white/70 shadow-[0_15px_40px_rgba(148,163,184,0.18)]';
};

const backgroundStyleForPreview = (style: string, chrome: string): React.CSSProperties => {
    const base = chrome === 'pixel' ? '#efe1cf' : '#f8fafc';
    if (style === 'grid') {
        return {
            backgroundColor: base,
            backgroundImage:
                'linear-gradient(rgba(148,163,184,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.14) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
        };
    }
    if (style === 'paper') {
        return {
            backgroundColor: chrome === 'pixel' ? '#f4e8d9' : '#f9f7f2',
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.12) 1px, transparent 0)',
            backgroundSize: '16px 16px',
        };
    }
    if (style === 'mesh') {
        return {
            backgroundColor: '#f8fafc',
            backgroundImage:
                'radial-gradient(circle at 15% 20%, rgba(59,130,246,0.18), transparent 28%), radial-gradient(circle at 85% 15%, rgba(244,114,182,0.18), transparent 24%), radial-gradient(circle at 60% 75%, rgba(45,212,191,0.18), transparent 26%)',
        };
    }
    return { backgroundColor: base };
};

const previewBubbleStyle = (bubble: string, isUser: boolean, theme: OSTheme): React.CSSProperties => {
    const hue = theme.hue ?? 216;
    const saturation = theme.saturation ?? 88;
    const lightness = theme.lightness ?? 57;
    const primary = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    const base: React.CSSProperties = {
        background: isUser ? primary : '#ffffff',
        color: isUser ? '#ffffff' : '#334155',
        borderRadius: bubble === 'ios' ? 24 : bubble === 'wechat' ? 18 : 20,
        padding: '10px 14px',
        maxWidth: '72%',
    };
    if (bubble === 'outline') return { ...base, background: 'transparent', color: isUser ? primary : '#475569', border: `2px solid ${isUser ? primary : '#cbd5e1'}` };
    if (bubble === 'shadow') return { ...base, boxShadow: '0 10px 20px rgba(15,23,42,0.12)' };
    if (bubble === 'flat') return { ...base, boxShadow: 'none' };
    if (bubble === 'wechat') return { ...base, background: isUser ? '#95ec69' : '#ffffff', color: '#0f172a', boxShadow: 'none', border: '1px solid rgba(15,23,42,0.05)' };
    if (bubble === 'ios') return { ...base, background: isUser ? primary : 'rgba(255,255,255,0.86)', boxShadow: '0 8px 16px rgba(148,163,184,0.12)', border: '1px solid rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)' };
    return { ...base, boxShadow: '0 6px 14px rgba(148,163,184,0.12)', border: '1px solid rgba(148,163,184,0.12)' };
};

const ChoiceGroup: React.FC<{
    title: string;
    items: ReadonlyArray<{ value: string; label: string; desc?: string }>;
    value: string;
    onPick: (value: string) => void;
}> = ({ title, items, value, onPick }) => (
    <div>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">{title}</div>
        <div className="flex flex-wrap gap-2">
            {items.map((item) => (
                <button key={item.value} onClick={() => onPick(item.value)} className={cardButton(value === item.value)}>
                    <div className="text-[11px] font-bold">{item.label}</div>
                    {item.desc && <div className="mt-0.5 text-[9px] opacity-70">{item.desc}</div>}
                </button>
            ))}
        </div>
    </div>
);

export const ChatAppearanceEditor: React.FC<Props> = ({ theme, updateTheme }) => {
    const avatarShape = theme.chatAvatarShape || defaults.chatAvatarShape;
    const avatarSize = theme.chatAvatarSize || defaults.chatAvatarSize;
    const avatarMode = theme.chatAvatarMode || defaults.chatAvatarMode;
    const bubbleStyle = theme.chatBubbleStyle || defaults.chatBubbleStyle;
    const messageSpacing = theme.chatMessageSpacing || defaults.chatMessageSpacing;
    const showTimestamp = theme.chatShowTimestamp || defaults.chatShowTimestamp;
    const headerStyle = theme.chatHeaderStyle || defaults.chatHeaderStyle;
    const inputStyle = theme.chatInputStyle || defaults.chatInputStyle;
    const chromeStyle = theme.chatChromeStyle || defaults.chatChromeStyle;
    const backgroundStyle = theme.chatBackgroundStyle || defaults.chatBackgroundStyle;
    const headerAlign = theme.chatHeaderAlign || defaults.chatHeaderAlign;
    const headerDensity = theme.chatHeaderDensity || defaults.chatHeaderDensity;
    const statusStyle = theme.chatStatusStyle || defaults.chatStatusStyle;
    const sendButtonStyle = theme.chatSendButtonStyle || defaults.chatSendButtonStyle;
    const pendingIndicator = theme.chatPendingIndicator !== false;
    const showHeaderBuffs = theme.chatHideHeaderBuffs !== true;

    const headerClass =
        headerStyle === 'minimal'
            ? 'bg-white/90 border-b border-slate-100'
            : headerStyle === 'gradient'
              ? 'bg-gradient-to-r from-primary/20 via-primary/10 to-white border-b border-slate-100'
              : headerStyle === 'wechat'
                ? 'bg-[#f7f7f7] border-b border-black/5'
                : headerStyle === 'telegram'
                  ? 'bg-white/80 backdrop-blur-xl border-b border-sky-100'
                  : headerStyle === 'discord'
                    ? 'bg-slate-900 border-b border-white/10'
                    : headerStyle === 'pixel'
                      ? 'bg-[#c99872] border-b-[3px] border-[#7b5a40]'
                      : 'bg-white/80 border-b border-slate-100';

    const headerTextClass = headerStyle === 'discord' ? 'text-white' : headerStyle === 'pixel' ? 'text-[#fff7ed]' : 'text-slate-700';
    const previewGap = messageSpacing === 'compact' ? 'gap-1.5' : messageSpacing === 'spacious' ? 'gap-4' : 'gap-2.5';
    const previewPad = headerDensity === 'compact' ? 'px-4 py-3' : headerDensity === 'airy' ? 'px-5 py-[18px]' : 'px-4 py-3.5';
    const previewMessages = [
        { id: 'ai-1', role: 'assistant', text: '今天这套聊天壳已经比之前像样多了。' },
        { id: 'ai-2', role: 'assistant', text: '现在还能决定头像是连续共用，还是每条都显示。' },
        { id: 'user-1', role: 'user', text: '对，我想把头像频率也做成可以 DIY 的。' },
        { id: 'user-2', role: 'user', text: '这样不同软件的味道会更明显。' },
    ] as const;

    return (
        <div className="space-y-5">
            <section className={groupClass}>
                <div className="mb-3">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">聊天壳预设</h2>
                    <p className="mt-1 text-[10px] text-slate-400">先把聊天界面做成可换壳，再继续拆细到更多模块级 DIY。</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {presets.map((preset) => (
                        <button
                            key={preset.name}
                            onClick={() => updateTheme(preset.config)}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition-all hover:border-primary/30 hover:bg-white active:scale-[0.98]"
                        >
                            <div className="text-xs font-bold text-slate-700">{preset.name}</div>
                            <div className="mt-1 text-[10px] text-slate-400">{preset.desc}</div>
                        </button>
                    ))}
                </div>
            </section>

            <section className={groupClass}>
                <div className="mb-3">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">实时预览</h2>
                    <p className="mt-1 text-[10px] text-slate-400">头部、消息区和输入栏都会跟着你的选择同步变化。</p>
                </div>
                <div className={`sully-chat-root overflow-hidden rounded-[28px] ${shellClass(chromeStyle)}`} style={backgroundStyleForPreview(backgroundStyle, chromeStyle)}>
                    {/* 实时套用「白框自定义」CSS：预览各零件挂了同样的 .sully-chat-* 钩子，故能即时反映。
                        注意：预览外壳 overflow-hidden 会裁掉溢出效果（如波浪下沿），真聊天里完整可见。 */}
                    {theme.chatChromeCustomCss && <style>{theme.chatChromeCustomCss}</style>}
                    <div className={`sully-chat-header relative ${headerClass} ${previewPad}`}>
                        <div className={`flex items-center gap-3 ${headerAlign === 'center' ? 'justify-center text-center' : 'justify-between text-left'}`}>
                            <div className={`flex items-center gap-3 ${headerAlign === 'center' ? 'justify-center' : ''}`}>
                                <div
                                    className={`sully-chat-avatar ${avatarClass(avatarShape, avatarSize)} shrink-0`}
                                    style={{
                                        background: headerStyle === 'discord' ? 'linear-gradient(135deg, rgba(99,102,241,0.9), rgba(34,197,94,0.9))' : 'linear-gradient(135deg, rgba(59,130,246,0.18), rgba(244,114,182,0.18))',
                                        border: headerStyle === 'pixel' ? '2px solid #8f674a' : '1px solid rgba(255,255,255,0.5)',
                                    }}
                                />
                                <div className={`sully-chat-status ${headerAlign === 'center' ? 'flex flex-col items-center' : ''}`}>
                                    <div className={`sully-chat-name text-xs font-bold ${headerTextClass}`}>聊天对象</div>
                                    {statusStyle === 'pill' && <div className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${headerStyle === 'discord' ? 'bg-emerald-500/20 text-emerald-200' : headerStyle === 'pixel' ? 'bg-[#fff7ed] text-[#8f674a]' : 'bg-emerald-50 text-emerald-500'}`}>online</div>}
                                    {statusStyle === 'dot' && <div className={`flex items-center gap-1 text-[9px] ${headerStyle === 'discord' ? 'text-slate-300' : headerStyle === 'pixel' ? 'text-[#f3ddc7]' : 'text-slate-400'}`}><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />online</div>}
                                    {statusStyle === 'subtle' && <div className={`text-[9px] uppercase ${headerStyle === 'discord' ? 'text-slate-400' : headerStyle === 'pixel' ? 'text-[#f3ddc7]' : 'text-slate-400'}`}>online</div>}
                                </div>
                            </div>
                            {headerAlign !== 'center' && <div className={`sully-chat-token text-[9px] font-mono ${headerStyle === 'discord' ? 'text-slate-400' : headerStyle === 'pixel' ? 'text-[#f3ddc7]' : 'text-slate-400'}`}>42 tok</div>}
                        </div>
                    </div>
                    <div className={`flex min-h-[190px] flex-col p-4 ${previewGap}`}>
                        {previewMessages.map((message, index) => {
                            const isUser = message.role === 'user';
                            const nextRole = index < previewMessages.length - 1 ? previewMessages[index + 1].role : null;
                            const shouldShowAvatar = avatarMode === 'every_message' || nextRole !== message.role;
                            const avatarTone = isUser ? 'bg-primary/25' : 'bg-pink-200';
                            return (
                                <div key={message.id} className={`flex items-end gap-2 ${isUser ? 'justify-end' : ''}`}>
                                    {!isUser && <div className={`${avatarClass(avatarShape, avatarSize)} shrink-0 ${avatarTone} ${shouldShowAvatar ? '' : 'opacity-0'}`} />}
                                    <div style={previewBubbleStyle(bubbleStyle, isUser, theme)}>
                                        {message.text}
                                        {showTimestamp === 'always' && nextRole !== message.role && (
                                            <div className={`mt-1 text-right text-[8px] ${isUser ? 'opacity-70' : 'opacity-55'}`}>{isUser ? '14:33' : '14:32'}</div>
                                        )}
                                    </div>
                                    {isUser && <div className={`${avatarClass(avatarShape, avatarSize)} shrink-0 ${avatarTone} ${shouldShowAvatar ? '' : 'opacity-0'}`} />}
                                </div>
                            );
                        })}
                    </div>
                    <div className={`sully-chat-inputbar border-t px-3 py-3 ${chromeStyle === 'pixel' ? 'border-[#8f674a] bg-[#eadfce]' : headerStyle === 'discord' ? 'border-white/10 bg-slate-900/90' : 'border-slate-100 bg-white/80'}`}>
                        <div className="flex items-end gap-2">
                            <button className={`flex h-10 w-10 shrink-0 items-center justify-center ${chromeStyle === 'pixel' ? 'rounded-[4px] border-2 border-[#8f674a] bg-[#f8f0e0] text-[#8f674a]' : headerStyle === 'discord' ? 'rounded-full bg-slate-800 text-slate-200' : 'rounded-full bg-slate-100 text-slate-500'}`}>+</button>
                            <div className={`flex min-h-10 flex-1 items-center px-4 text-[11px] ${inputStyle === 'flat' ? 'rounded-none border-b border-slate-200 bg-transparent' : inputStyle === 'wechat' ? 'rounded-full border border-slate-200 bg-white' : inputStyle === 'ios' ? 'rounded-[26px] border border-white/80 bg-white/80 shadow-inner' : inputStyle === 'telegram' ? 'rounded-2xl border border-sky-100 bg-white' : inputStyle === 'discord' ? 'rounded-2xl border border-white/10 bg-slate-800 text-white' : inputStyle === 'pixel' ? 'rounded-[4px] border-2 border-[#8f674a] bg-[#f8f0e0]' : inputStyle === 'rounded' ? 'rounded-full bg-slate-100' : 'rounded-[22px] bg-slate-100'}`}>
                                输入消息...
                            </div>
                            <button className={`shrink-0 ${sendButtonStyle === 'pill' ? (chromeStyle === 'pixel' ? 'h-10 min-w-[68px] rounded-[4px] border-2 border-[#8f674a] bg-[#c99872] px-4 text-[11px] font-bold text-[#fff7ed]' : 'h-10 min-w-[68px] rounded-full bg-primary px-4 text-[11px] font-bold text-white') : sendButtonStyle === 'minimal' ? (chromeStyle === 'pixel' ? 'flex h-10 w-10 items-center justify-center rounded-[4px] border-2 border-[#8f674a] bg-[#c99872] text-[#fff7ed]' : 'flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-primary') : (chromeStyle === 'pixel' ? 'flex h-10 w-10 items-center justify-center rounded-[4px] border-2 border-[#8f674a] bg-[#c99872] text-[#fff7ed]' : 'flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-lg')}`}>
                                {sendButtonStyle === 'pill' ? '发送' : '➤'}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section className={groupClass}>
                <ChoiceGroup title="聊天壳" items={choices.chrome} value={chromeStyle} onPick={(value) => updateTheme({ chatChromeStyle: value as OSTheme['chatChromeStyle'] })} />
                <div className="mt-4">
                    <ChoiceGroup title="消息区背景" items={choices.background} value={backgroundStyle} onPick={(value) => updateTheme({ chatBackgroundStyle: value as OSTheme['chatBackgroundStyle'] })} />
                </div>
            </section>

            <section className={groupClass}>
                <ChoiceGroup title="头部风格" items={choices.header} value={headerStyle} onPick={(value) => updateTheme({ chatHeaderStyle: value as OSTheme['chatHeaderStyle'] })} />
                <div className="mt-4">
                    <ChoiceGroup title="头部对齐" items={choices.align} value={headerAlign} onPick={(value) => updateTheme({ chatHeaderAlign: value as OSTheme['chatHeaderAlign'] })} />
                </div>
                <div className="mt-4">
                    <ChoiceGroup title="头部密度" items={choices.density} value={headerDensity} onPick={(value) => updateTheme({ chatHeaderDensity: value as OSTheme['chatHeaderDensity'] })} />
                </div>
                <div className="mt-4">
                    <ChoiceGroup title="在线状态样式" items={choices.status} value={statusStyle} onPick={(value) => updateTheme({ chatStatusStyle: value as OSTheme['chatStatusStyle'] })} />
                </div>
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2.5">
                    <div className="min-w-0 pr-3">
                        <div className="text-[11px] font-bold text-slate-700">显示情绪栏</div>
                        <div className="mt-0.5 text-[10px] text-slate-400">角色名下方的情绪 buff 胶囊；关掉后顶栏更干净（位置/样式也可在「白框自定义」里用 .sully-chat-buffs 调）。</div>
                    </div>
                    <button
                        onClick={() => updateTheme({ chatHideHeaderBuffs: showHeaderBuffs })}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${showHeaderBuffs ? 'bg-primary' : 'bg-slate-300'}`}
                        aria-pressed={showHeaderBuffs}
                    >
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${showHeaderBuffs ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                </div>
            </section>

            <section className={groupClass}>
                <ChoiceGroup title="消息气泡" items={choices.bubble} value={bubbleStyle} onPick={(value) => updateTheme({ chatBubbleStyle: value as OSTheme['chatBubbleStyle'] })} />
                <div className="mt-4">
                    <ChoiceGroup title="头像形状" items={choices.avatarShape} value={avatarShape} onPick={(value) => updateTheme({ chatAvatarShape: value as OSTheme['chatAvatarShape'] })} />
                </div>
                <div className="mt-4">
                    <ChoiceGroup title="头像尺寸" items={choices.avatarSize} value={avatarSize} onPick={(value) => updateTheme({ chatAvatarSize: value as OSTheme['chatAvatarSize'] })} />
                </div>
                <div className="mt-4">
                    <ChoiceGroup title="头像出现频率" items={choices.avatarMode} value={avatarMode} onPick={(value) => updateTheme({ chatAvatarMode: value as OSTheme['chatAvatarMode'] })} />
                </div>
                <div className="mt-4">
                    <ChoiceGroup title="消息密度" items={choices.spacing} value={messageSpacing} onPick={(value) => updateTheme({ chatMessageSpacing: value as OSTheme['chatMessageSpacing'] })} />
                </div>
                <div className="mt-4">
                    <ChoiceGroup title="时间戳" items={choices.timestamp} value={showTimestamp} onPick={(value) => updateTheme({ chatShowTimestamp: value as OSTheme['chatShowTimestamp'] })} />
                </div>
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2.5">
                    <div className="min-w-0 pr-3">
                        <div className="text-[11px] font-bold text-slate-700">发送准备中圆点</div>
                        <div className="mt-0.5 text-[10px] text-slate-400">Instant Push 期间，自己的气泡左侧显示三个跳动的小圆点。</div>
                    </div>
                    <button
                        onClick={() => updateTheme({ chatPendingIndicator: !pendingIndicator })}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${pendingIndicator ? 'bg-primary' : 'bg-slate-300'}`}
                        aria-pressed={pendingIndicator}
                    >
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${pendingIndicator ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                </div>
            </section>

            <section className={groupClass}>
                <ChoiceGroup title="输入栏风格" items={choices.input} value={inputStyle} onPick={(value) => updateTheme({ chatInputStyle: value as OSTheme['chatInputStyle'] })} />
                <div className="mt-4">
                    <ChoiceGroup title="发送按钮" items={choices.send} value={sendButtonStyle} onPick={(value) => updateTheme({ chatSendButtonStyle: value as OSTheme['chatSendButtonStyle'] })} />
                </div>
            </section>

            <section className={groupClass}>
                <div className="mb-1">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">白框自定义 (CSS)</h2>
                    <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                        直接写 CSS，自定义整块顶栏与白框——换色 / 贴图 / 圆角 / 不规则外形（clip-path）/ 挪位 / 显隐。
                        可用选择器：<code className="mx-0.5 rounded bg-slate-100 px-1 text-slate-500">.sully-chat-header</code> 顶栏整块、
                        <code className="mx-0.5 rounded bg-slate-100 px-1 text-slate-500">.sully-chat-back</code> 返回、
                        <code className="mx-0.5 rounded bg-slate-100 px-1 text-slate-500">.sully-chat-avatar</code> 头像、
                        <code className="mx-0.5 rounded bg-slate-100 px-1 text-slate-500">.sully-chat-name</code> 名字、
                        <code className="mx-0.5 rounded bg-slate-100 px-1 text-slate-500">.sully-chat-status</code> 状态行、
                        <code className="mx-0.5 rounded bg-slate-100 px-1 text-slate-500">.sully-chat-buffs</code> 情绪栏、
                        <code className="mx-0.5 rounded bg-slate-100 px-1 text-slate-500">.sully-chat-token</code> token、
                        <code className="mx-0.5 rounded bg-slate-100 px-1 text-slate-500">.sully-chat-trigger</code> 小闪电、
                        <code className="mx-0.5 rounded bg-slate-100 px-1 text-slate-500">.sully-chat-inputbar</code> 输入栏、
                        <code className="mx-0.5 rounded bg-slate-100 px-1 text-slate-500">.sully-chat-root</code> 整屏。
                        挪位用 <code className="rounded bg-slate-100 px-1 text-slate-500">position:absolute</code>（顶栏已是 relative）；覆盖默认样式记得加 <code className="rounded bg-slate-100 px-1 text-slate-500">!important</code>。
                    </p>
                </div>
                <div className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">完整风格（换风格建议先清空）</div>
                <div className="mb-3 flex flex-wrap gap-1.5">
                    {CHROME_CSS_FULL_PRESETS.map((p) => (
                        <button
                            key={p.name}
                            onClick={() => updateTheme({ chatChromeCustomCss: (theme.chatChromeCustomCss ? theme.chatChromeCustomCss.trimEnd() + '\n\n' : '') + p.code })}
                            className="rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-[11px] font-bold text-primary transition-all hover:bg-primary/15 active:scale-95"
                        >
                            {p.name}
                        </button>
                    ))}
                </div>
                <div className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">可叠加片段</div>
                <div className="mb-3 flex flex-wrap gap-1.5">
                    {CHROME_CSS_SNIPPETS.map((p) => (
                        <button
                            key={p.name}
                            onClick={() => updateTheme({ chatChromeCustomCss: (theme.chatChromeCustomCss ? theme.chatChromeCustomCss.trimEnd() + '\n' : '') + p.code })}
                            className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition-all hover:bg-slate-200 active:scale-95"
                        >
                            + {p.name}
                        </button>
                    ))}
                </div>
                <textarea
                    value={theme.chatChromeCustomCss || ''}
                    onChange={(e) => updateTheme({ chatChromeCustomCss: e.target.value })}
                    placeholder={'/* 例如 */\n.sully-chat-header{\n  background: linear-gradient(135deg,#ffd9ec,#d9c7ff) !important;\n  border-bottom: none !important;\n}'}
                    spellCheck={false}
                    rows={6}
                    className="w-full resize-y rounded-2xl border border-slate-700 bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-200 outline-none focus:border-primary/50 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                />
                {theme.chatChromeCustomCss && (
                    <button onClick={() => updateTheme({ chatChromeCustomCss: '' })} className="mt-2 text-[11px] font-semibold text-rose-400 hover:text-rose-500">
                        清空自定义 CSS
                    </button>
                )}
            </section>

            <div className="px-2 pb-2 text-center text-[10px] leading-relaxed text-slate-400">
                这一版先把聊天外观做成模块化换壳。后面如果你想继续往深处玩，我们还可以拆成每个角色单独一套聊天壳，甚至让不同 app 模拟不同平台 UI。
            </div>
        </div>
    );
};