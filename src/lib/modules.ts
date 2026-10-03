/**
 * 模块注册中心
 * 新增模块只需：
 *   1. 在 src/app/(modules)/<模块名>/ 下放页面
 *   2. 在下面的 modules 数组加一项
 *   3. 导航、首页、面包屑自动出现
 */
export interface ModuleInfo {
  key: string;
  name: string;
  path: string;
  description: string;
  icon: string; // emoji 字符
  status: 'active' | 'placeholder';
}

export const modules: ModuleInfo[] = [
  {
    key: 'family',
    name: '家庭生活记录',
    path: '/family',
    description: '照片、视频、家庭微电影，记录每一个温馨瞬间',
    icon: 'H',
    status: 'active',
  },
  {
    key: 'growth',
    name: '个人成长',
    path: '/growth',
    description: '随笔、读书笔记、技能成长轨迹',
    icon: 'G',
    status: 'placeholder',
  },
  {
    key: 'memories',
    name: '时光收藏',
    path: '/memories',
    description: '精选回忆、人生里程碑',
    icon: 'M',
    status: 'placeholder',
  },
  {
    key: 'tools',
    name: '实用工具',
    path: '/tools',
    description: '日常好用的小工具合集',
    icon: 'T',
    status: 'placeholder',
  },
  {
    key: 'about',
    name: '关于我',
    path: '/about',
    description: '自我介绍、联系方式',
    icon: 'A',
    status: 'placeholder',
  },
];

export function getModule(pathname: string): ModuleInfo | undefined {
  return modules.find((m) => pathname === m.path || pathname.startsWith(m.path + '/'));
}
