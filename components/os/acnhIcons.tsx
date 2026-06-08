import React from 'react';
import { AppID } from '../../types';

// 动森(NookPhone)风格 App 图标 —— 填充式多色 SVG：奶油底 + 暖棕圆头描边 + 单个强调色。
// 风格参照 animal-island-ui 仓库的 icon-chat / icon-variant 等（实心圆角几何 + 可爱表情，
// 而非细线 glyph）。所有图标 viewBox 100×100，绘在彩色圆角方块瓦片上，主体用奶油色读得清。
const CREAM = '#FBF7EA';
const BROWN = '#5E483B';

const wrap = (children: React.ReactNode) => (
  <svg viewBox="0 0 100 100" className="w-full h-full"
    style={{ filter: 'drop-shadow(0 1.5px 1px rgba(94,72,59,0.28))' }}>
    {children}
  </svg>
);

// 招牌叶子（Nook Inc.）——也是兜底图标
const leaf = wrap(<>
  <path d="M50 12 C76 23 86 50 75 79 C71 89 58 93 50 89 C42 93 29 89 25 79 C14 50 24 23 50 12Z" fill={CREAM} />
  <path d="M50 22 V83" stroke={BROWN} strokeWidth="4.5" strokeLinecap="round" />
  <path d="M50 42 L68 33 M50 57 L32 48 M50 70 L64 63" stroke={BROWN} strokeWidth="4" strokeLinecap="round" />
</>);

const ACNH_ICON_MAP: Partial<Record<AppID, React.ReactNode>> = {
  // 聊天气泡 + 三个棕点（直接照搬仓库 icon-chat 的构图）
  [AppID.Chat]: wrap(<>
    <path d="M24 24 H76 a15 15 0 0 1 15 15 v13 a15 15 0 0 1 -15 15 H56 l-6 10 -6 -10 H24 a15 15 0 0 1 -15 -15 v-13 a15 15 0 0 1 15 -15Z" fill={CREAM} />
    <circle cx="32" cy="45.5" r="6" fill={BROWN} /><circle cx="50" cy="45.5" r="6" fill={BROWN} /><circle cx="68" cy="45.5" r="6" fill={BROWN} />
  </>),
  // 村民笑脸 + 嫩芽（神经链接 / 都市人生）
  [AppID.Character]: wrap(<>
    <path d="M50 22 C58 15 68 19 65 28 C57 31 50 29 50 22Z" fill="#7CC36B" />
    <circle cx="50" cy="56" r="30" fill={CREAM} />
    <circle cx="40" cy="52" r="4.2" fill={BROWN} /><circle cx="60" cy="52" r="4.2" fill={BROWN} />
    <circle cx="32" cy="60" r="4.5" fill="#F6A8B8" /><circle cx="68" cy="60" r="4.5" fill="#F6A8B8" />
    <path d="M40 64 Q50 73 60 64" stroke={BROWN} strokeWidth="4.5" fill="none" strokeLinecap="round" />
  </>),
  [AppID.LifeSim]: wrap(<>
    <path d="M50 22 C58 15 68 19 65 28 C57 31 50 29 50 22Z" fill="#7CC36B" />
    <circle cx="50" cy="56" r="30" fill={CREAM} />
    <circle cx="40" cy="52" r="4.2" fill={BROWN} /><circle cx="60" cy="52" r="4.2" fill={BROWN} />
    <circle cx="32" cy="60" r="4.5" fill="#F6A8B8" /><circle cx="68" cy="60" r="4.5" fill="#F6A8B8" />
    <path d="M40 64 Q50 73 60 64" stroke={BROWN} strokeWidth="4.5" fill="none" strokeLinecap="round" />
  </>),
  // 博物馆/小屋（记忆宫殿）
  [AppID.MemoryPalace]: wrap(<>
    <path d="M50 18 L86 46 H14 Z" fill={CREAM} />
    <rect x="24" y="46" width="52" height="38" rx="5" fill={CREAM} />
    <rect x="42" y="60" width="16" height="24" rx="3" fill={BROWN} />
    <rect x="30" y="52" width="9" height="9" rx="2" fill="#82D5BB" /><rect x="61" y="52" width="9" height="9" rx="2" fill="#82D5BB" />
  </>),
  // 听筒（电话）
  [AppID.Call]: wrap(
    <path d="M30 20 C25 20 20 25 23 35 C30 60 42 73 67 80 C77 83 82 78 82 73 L73 60 C70 56 65 55 61 58 L56 61 C47 56 44 53 39 44 L42 39 C45 35 44 30 40 27 Z" fill={CREAM} />
  ),
  // 帐篷（小小窝）
  [AppID.Room]: wrap(<>
    <path d="M50 22 L84 80 H16 Z" fill={CREAM} />
    <path d="M50 42 L68 80 H32 Z" fill={BROWN} />
    <path d="M50 42 V80" stroke={CREAM} strokeWidth="3.5" />
  </>),
  // 智能手机（查手机）
  [AppID.CheckPhone]: wrap(<>
    <rect x="31" y="16" width="38" height="68" rx="11" fill={CREAM} />
    <rect x="37" y="25" width="26" height="42" rx="4" fill="#82D5BB" />
    <circle cx="50" cy="75" r="3.6" fill={BROWN} />
  </>),
  // 爱心（见面 / 特别时光备选）
  [AppID.Date]: wrap(
    <path d="M50 82 C22 60 14 46 14 33 C14 23 22 17 31 17 C39 17 46 21 50 30 C54 21 61 17 69 17 C78 17 86 23 86 33 C86 46 78 60 50 82Z" fill={CREAM} />
  ),
  // 护照/档案卡（档案）
  [AppID.User]: wrap(<>
    <rect x="25" y="18" width="50" height="64" rx="7" fill={CREAM} />
    <circle cx="50" cy="42" r="12" fill="#F7CD67" />
    <circle cx="46" cy="41" r="2.2" fill={BROWN} /><circle cx="54" cy="41" r="2.2" fill={BROWN} />
    <path d="M45 47 Q50 51 55 47" stroke={BROWN} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    <rect x="34" y="62" width="32" height="5" rx="2.5" fill={BROWN} /><rect x="38" y="71" width="24" height="5" rx="2.5" fill="#B7A98C" />
  </>),
  // 铃钱袋（存钱罐）
  [AppID.Bank]: wrap(<>
    <path d="M37 35 Q50 27 63 35 C77 46 80 67 69 79 C61 87 39 87 31 79 C20 67 23 46 37 35Z" fill={CREAM} />
    <path d="M41 31 L59 31 L55 40 L45 40Z" fill={BROWN} />
    <path d="M50 50 C43 50 39 56 39 63 H61 C61 56 57 50 50 50Z" fill="#F7CD67" />
    <rect x="46" y="63" width="8" height="3.5" fill={BROWN} /><circle cx="50" cy="70" r="3" fill={BROWN} />
  </>),
  // 两张脸（群聊）
  [AppID.GroupChat]: wrap(<>
    <circle cx="64" cy="52" r="19" fill="#EFE6CF" /><circle cx="38" cy="52" r="21" fill={CREAM} />
    <circle cx="31" cy="50" r="3.4" fill={BROWN} /><circle cx="45" cy="50" r="3.4" fill={BROWN} />
    <path d="M31 58 Q38 64 45 58" stroke={BROWN} strokeWidth="3.4" fill="none" strokeLinecap="round" />
  </>),
  // 火苗（Spark）
  [AppID.Social]: wrap(<>
    <path d="M52 16 C60 33 76 38 71 59 C68 78 58 86 50 86 C41 86 29 79 29 60 C29 47 40 45 42 34 C47 43 49 39 52 16Z" fill={CREAM} />
    <path d="M51 46 C55 55 61 57 58 67 C56 75 53 79 50 79 C46 79 42 74 42 64 C42 57 47 55 48 50Z" fill="#F7CD67" />
  </>),
  // 设置滑杆
  [AppID.Settings]: wrap(<>
    <rect x="22" y="33" width="56" height="6" rx="3" fill={CREAM} /><circle cx="62" cy="36" r="8" fill={CREAM} stroke={BROWN} strokeWidth="3.5" />
    <rect x="22" y="50" width="56" height="6" rx="3" fill={CREAM} /><circle cx="38" cy="53" r="8" fill={CREAM} stroke={BROWN} strokeWidth="3.5" />
    <rect x="22" y="67" width="56" height="6" rx="3" fill={CREAM} /><circle cx="66" cy="70" r="8" fill={CREAM} stroke={BROWN} strokeWidth="3.5" />
  </>),
  // 相机（相册 / 图库）
  [AppID.Gallery]: wrap(<>
    <path d="M37 33 L43 25 H57 L63 33Z" fill={CREAM} />
    <rect x="17" y="33" width="66" height="46" rx="11" fill={CREAM} />
    <circle cx="50" cy="56" r="14" fill="#82D5BB" /><circle cx="50" cy="56" r="6.5" fill={CREAM} />
    <circle cx="71" cy="44" r="3.5" fill="#F7CD67" />
  </>),
  [AppID.XhsStock]: wrap(<>
    <path d="M37 33 L43 25 H57 L63 33Z" fill={CREAM} />
    <rect x="17" y="33" width="66" height="46" rx="11" fill={CREAM} />
    <circle cx="50" cy="56" r="14" fill="#FC736D" /><circle cx="50" cy="56" r="6.5" fill={CREAM} />
    <circle cx="71" cy="44" r="3.5" fill="#F7CD67" />
  </>),
  // 音符（音乐 / 写歌）
  [AppID.Music]: wrap(<>
    <rect x="56" y="22" width="6.5" height="44" rx="3.2" fill={CREAM} />
    <path d="M62 22 C74 24 80 31 77 42 C75 35 68 32 62 35Z" fill={CREAM} />
    <ellipse cx="48" cy="66" rx="13" ry="10" fill={CREAM} transform="rotate(-18 48 66)" />
  </>),
  [AppID.Songwriting]: wrap(<>
    <rect x="56" y="22" width="6.5" height="44" rx="3.2" fill={CREAM} />
    <path d="M62 22 C74 24 80 31 77 42 C75 35 68 32 62 35Z" fill={CREAM} />
    <ellipse cx="48" cy="66" rx="13" ry="10" fill={CREAM} transform="rotate(-18 48 66)" />
  </>),
  // 手柄（TRPG）
  [AppID.Game]: wrap(<>
    <rect x="18" y="40" width="64" height="30" rx="15" fill={CREAM} />
    <rect x="30" y="52" width="14" height="5" rx="2.5" fill={BROWN} /><rect x="34.5" y="47.5" width="5" height="14" rx="2.5" fill={BROWN} />
    <circle cx="64" cy="50" r="4" fill="#FC736D" /><circle cx="72" cy="58" r="4" fill="#82D5BB" />
  </>),
  // 书本（日记 / 小说 / 自习 / 世界书 / 攻略）
  [AppID.Journal]: wrap(<>
    <path d="M50 30 C42 24 28 24 21 28 V75 C28 71 42 71 50 77 C58 71 72 71 79 75 V28 C72 24 58 24 50 30Z" fill={CREAM} />
    <path d="M50 30 V77" stroke={BROWN} strokeWidth="3.5" />
  </>),
  [AppID.Novel]: wrap(<>
    <path d="M50 30 C42 24 28 24 21 28 V75 C28 71 42 71 50 77 C58 71 72 71 79 75 V28 C72 24 58 24 50 30Z" fill={CREAM} />
    <path d="M50 30 V77" stroke={BROWN} strokeWidth="3.5" />
  </>),
  [AppID.Study]: wrap(<>
    <path d="M50 30 C42 24 28 24 21 28 V75 C28 71 42 71 50 77 C58 71 72 71 79 75 V28 C72 24 58 24 50 30Z" fill={CREAM} />
    <path d="M50 30 V77" stroke={BROWN} strokeWidth="3.5" />
  </>),
  [AppID.Worldbook]: wrap(<>
    <path d="M50 30 C42 24 28 24 21 28 V75 C28 71 42 71 50 77 C58 71 72 71 79 75 V28 C72 24 58 24 50 30Z" fill={CREAM} />
    <path d="M50 30 V77" stroke={BROWN} strokeWidth="3.5" />
  </>),
  [AppID.Guidebook]: wrap(<>
    <path d="M50 30 C42 24 28 24 21 28 V75 C28 71 42 71 50 77 C58 71 72 71 79 75 V28 C72 24 58 24 50 30Z" fill={CREAM} />
    <path d="M50 30 V77" stroke={BROWN} strokeWidth="3.5" />
  </>),
  // 日历（时光契约 / 见面会备）
  [AppID.Schedule]: wrap(<>
    <rect x="22" y="26" width="56" height="54" rx="8" fill={CREAM} />
    <rect x="22" y="26" width="56" height="16" rx="8" fill="#FC736D" />
    <rect x="33" y="20" width="6" height="14" rx="3" fill={BROWN} /><rect x="61" y="20" width="6" height="14" rx="3" fill={BROWN} />
    <circle cx="38" cy="56" r="4" fill={BROWN} /><circle cx="52" cy="56" r="4" fill={BROWN} /><circle cx="66" cy="56" r="4" fill="#B7A98C" />
    <circle cx="38" cy="69" r="4" fill="#B7A98C" /><circle cx="52" cy="69" r="4" fill={BROWN} />
  </>),
  // 星星（特别时光 / 彼方）
  [AppID.SpecialMoments]: wrap(
    <path d="M50 14 L61 39 L88 41 L67 60 L74 87 L50 72 L26 87 L33 60 L12 41 L39 39Z" fill={CREAM} />
  ),
  [AppID.VRWorld]: wrap(
    <path d="M50 14 L61 39 L88 41 L67 60 L74 87 L50 72 L26 87 L33 60 L12 41 L39 39Z" fill={CREAM} />
  ),
  // 调色板（外观 / 气泡工坊）
  [AppID.Appearance]: wrap(<>
    <path d="M50 20 C73 20 84 35 84 50 C84 62 74 64 68 64 C62 64 60 70 64 76 C66 80 62 84 54 84 C30 84 16 68 16 50 C16 33 30 20 50 20Z" fill={CREAM} />
    <circle cx="38" cy="42" r="5" fill="#FC736D" /><circle cx="55" cy="36" r="5" fill="#F7CD67" /><circle cx="66" cy="48" r="5" fill="#82D5BB" />
  </>),
  [AppID.ThemeMaker]: wrap(<>
    <path d="M50 20 C73 20 84 35 84 50 C84 62 74 64 68 64 C62 64 60 70 64 76 C66 80 62 84 54 84 C30 84 16 68 16 50 C16 33 30 20 50 20Z" fill={CREAM} />
    <circle cx="38" cy="42" r="5" fill="#FC736D" /><circle cx="55" cy="36" r="5" fill="#F7CD67" /><circle cx="66" cy="48" r="5" fill="#82D5BB" />
  </>),
  // 报纸（热点）
  [AppID.HotNews]: wrap(<>
    <rect x="20" y="26" width="60" height="50" rx="6" fill={CREAM} />
    <rect x="27" y="34" width="22" height="16" rx="3" fill="#B7A98C" />
    <rect x="54" y="34" width="20" height="4" rx="2" fill={BROWN} /><rect x="54" y="43" width="20" height="4" rx="2" fill={BROWN} />
    <rect x="27" y="56" width="46" height="4" rx="2" fill={BROWN} /><rect x="27" y="64" width="36" height="4" rx="2" fill="#B7A98C" />
  </>),
};

export const getAcnhIcon = (appId: string): React.ReactNode =>
  ACNH_ICON_MAP[appId as AppID] ?? leaf;
