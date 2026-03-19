import re

# 基础敏感词库 (示例，后续可移至数据库表动态热重载)
BAD_WORDS = [
    'fuck', 'bitch', 'shit', 'asshole', 'cunt', 'dick', 'pussy', 'whore',
    'admin', 'administrator', 'root', 'system', 'moderator',
    '测试敏感词', 'sb', '傻逼', '尼玛', '操你'
]

def validate_content(text: str) -> bool:
    """
    检查文本是否包含违规/敏感词汇或者为空
    :param text: 要检查的文本
    :return: True 表示合规，False 表示包含违规内容
    """
    if not text or not text.strip():
        return True
        
    lower_text = text.lower()
    for word in BAD_WORDS:
        if word in lower_text:
            return False
            
    return True
