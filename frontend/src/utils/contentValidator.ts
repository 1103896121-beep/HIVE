/**
 * 用户生成内容 (UGC) 合规性验证器
 * 根据 iOS App Store 规范拦截不当词汇
 */
export function validateContent(text: string): { isValid: boolean; message?: string } {
  if (!text || text.trim() === '') {
    return { isValid: false, message: 'Content cannot be empty.' };
  }

  // 基础敏感词库 (预留以后可接入接口实现动态过滤)
  const BAD_WORDS = [
    'fuck', 'bitch', 'shit', 'asshole', 'cunt', 'dick', 'pussy', 'whore',
    'admin', 'administrator', 'root', 'system', 'moderator',
    '测试敏感词', 'sb', '傻逼', '尼玛', '操你'
  ];

  const lowerText = text.toLowerCase();

  for (const word of BAD_WORDS) {
    if (lowerText.includes(word)) {
      return { isValid: false, message: 'content_violation' }; // 稍后可在组件处配合 i18n
    }
  }

  return { isValid: true };
}
