import React, { useEffect, useState } from 'react';
import { querySwVersion } from '../../utils/swVersion';

/**
 * Settings 底部的版本信息脚注。
 *
 * 与右下角的 BuildBadge 不同：BuildBadge 只在 dev / fork 构建可见（正式版树摇掉），
 * 这里在**所有**构建（含正式版）里都低调显示，方便用户截图报障时附带版本上下文：
 *   - APP_VERSION：手工维护的产品版本名（之前硬编码的 v2.2）
 *   - build：vite.config 注入的 __BUILD_BRANCH__@__BUILD_COMMIT__
 *   - sw：运行时向 Service Worker 查询的 SW_VERSION
 *
 * 构建全局（__BUILD_BRANCH__ 等）由 vite define 始终注入，prod 也有值，
 * 所以无需任何 dev 条件判断。SW 未注册 / 未响应时 sw 显示 '?'。
 */

const APP_VERSION = 'v2.2 (Realtime Awareness)';

const VersionInfo: React.FC = () => {
    const [swVersion, setSwVersion] = useState<string>('…');

    useEffect(() => {
        let cancelled = false;
        querySwVersion().then((v) => { if (!cancelled) setSwVersion(v); });
        return () => { cancelled = true; };
    }, []);

    const buildLabel = `${__BUILD_BRANCH__}@${__BUILD_COMMIT__}`;

    return (
        <div className="flex flex-col items-center gap-1.5 pt-2 pb-8 select-none">
            <div className="text-[10px] text-slate-300 font-mono tracking-widest uppercase">
                {APP_VERSION}
            </div>
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-400/80">
                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 tracking-wide">
                    build&nbsp;<span className="text-slate-500">{buildLabel}</span>
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 tracking-wide">
                    sw&nbsp;<span className="text-slate-500">{swVersion}</span>
                </span>
            </div>
        </div>
    );
};

export default VersionInfo;
