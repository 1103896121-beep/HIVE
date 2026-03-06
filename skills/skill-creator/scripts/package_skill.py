#!/usr/bin/env python3
import os
import argparse
import logging
import zipfile
import re
from pathlib import Path

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def parse_frontmatter(file_path: Path):
    """
    解析 SKILL.md 的 YAML frontmatter。
    返回一个字典，如果解析失败返回 None。
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 简单的 regex 匹配 YAML frontmatter
        match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
        if not match:
            return None
        
        yaml_block = match.group(1)
        metadata = {}
        for line in yaml_block.split('\n'):
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if ':' in line:
                key, value = line.split(':', 1)
                metadata[key.strip()] = value.strip()
        return metadata
    except Exception as e:
        logger.error(f"Error reading SKILL.md: {e}")
        return None

def validate_skill(skill_path: Path) -> bool:
    """
    验证 Skill 结构和元数据是否符合规范。
    """
    if not skill_path.is_dir():
        logger.error(f"Path is not a directory: {skill_path}")
        return False

    skill_md = skill_path / "SKILL.md"
    if not skill_md.exists():
        logger.error(f"Missing SKILL.md in {skill_path}")
        return False
    
    metadata = parse_frontmatter(skill_md)
    if not metadata:
        logger.error("Invalid or missing Frontmatter in SKILL.md")
        return False
        
    required_fields = ['name', 'description']
    missing_fields = [f for f in required_fields if f not in metadata]
    
    if missing_fields:
        logger.error(f"Missing required metadata fields in SKILL.md: {', '.join(missing_fields)}")
        return False
        
    logger.info("Skill validation passed.")
    return True

def package_skill(skill_path_str: str, output_path_str: str):
    """
    打包 Skill 为 zip 文件。
    """
    skill_path = Path(skill_path_str).resolve()
    
    if not output_path_str:
        output_path = skill_path.parent
    else:
        output_path = Path(output_path_str)
        if not output_path.exists():
            try:
                output_path.mkdir(parents=True)
            except Exception as e:
                logger.error(f"Failed to create output directory: {e}")
                return
            
    if not validate_skill(skill_path):
        logger.error("Validation failed. Aborting packaging.")
        return

    skill_name = skill_path.name
    # 尝试从 metadata 获取名字，如果有的话
    skill_md = skill_path / "SKILL.md"
    metadata = parse_frontmatter(skill_md)
    if metadata and 'name' in metadata:
        # 清理文件名安全字符
        safe_name = re.sub(r'[^\w\-]', '_', metadata['name'])
        if safe_name:
            skill_name = safe_name

    zip_filename = output_path / f"{skill_name}.zip"
    
    try:
        with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(skill_path):
                # 过滤掉隐藏目录和 __pycache__
                dirs[:] = [d for d in dirs if not d.startswith('.') and d != '__pycache__']
                
                for file in files:
                    # 过滤掉隐藏文件和 Python 编译文件
                    if file.startswith('.') or file.endswith('.pyc'): 
                        continue
                    
                    file_path = Path(root) / file
                    
                    # 避免将生成的 zip 包包含进去（如果它被创建在源目录中）
                    if file_path.resolve() == zip_filename.resolve():
                        continue

                    arcname = file_path.relative_to(skill_path)
                    zipf.write(file_path, arcname)
                    logger.debug(f"Added {arcname} to archive")
                    
        logger.info(f"Skill packaged successfully: {zip_filename}")
        
    except Exception as e:
        logger.error(f"Failed to package skill: {e}")

def main():
    parser = argparse.ArgumentParser(description="Validate and package a skill.")
    parser.add_argument("skill_path", help="Path to the skill directory")
    parser.add_argument("output_path", nargs='?', help="Output directory for the zip file (optional)")
    
    args = parser.parse_args()
    
    package_skill(args.skill_path, args.output_path)

if __name__ == "__main__":
    main()
