#!/usr/bin/env python3
import os
import argparse
import logging
from pathlib import Path

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

SKILL_TEMPLATE = """---
name: {skill_name}
description: [TODO: Add a short description of what this skill does and when to use it]
---

# {skill_title}

[TODO: Provide a purposeful overview of the skill]

## Usage

[TODO: Describe when and how to use this skill]

### Examples

[TODO: Provide concrete examples of how users might trigger this skill]

## Resources

[TODO: Describe the resources included in this skill]
"""

def create_directory(path: Path):
    """创建目录，如果不存在的话"""
    if not path.exists():
        path.mkdir(parents=True)
        logger.info(f"Created directory: {path}")
    else:
        logger.info(f"Directory already exists: {path}")

def create_file(path: Path, content: str):
    """创建文件并写入内容"""
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    logger.info(f"Created file: {path}")

def init_skill(skill_name: str, output_path: str):
    """初始化 Skill 项目结构"""
    base_path = Path(output_path) / skill_name
    
    if base_path.exists():
        logger.warning(f"Skill directory '{base_path}' already exists.")
        # 这里可以选择报错退出，或者继续（可能会覆盖文件）
        # 为了安全起见，我们提示用户但继续执行（假设用户知道自己在做什么），或者直接报错
        # 鉴于这通常是一个交互式工具，我们可以在此处停止，但这取决于需求。
        # 让我们安全行事，可以继续检查子目录。
    
    create_directory(base_path)

    # 1. 生成 SKILL.md
    skill_md_path = base_path / "SKILL.md"
    if not skill_md_path.exists():
        content = SKILL_TEMPLATE.format(
            skill_name=skill_name,
            skill_title=skill_name.replace("-", " ").title()
        )
        create_file(skill_md_path, content)
    else:
        logger.warning(f"SKILL.md already exists at {skill_md_path}, skipping.")

    # 2. 创建资源目录
    directories = ["scripts", "references", "assets"]
    for dir_name in directories:
        dir_path = base_path / dir_name
        create_directory(dir_path)
        
        # 添加示例文件
        if dir_name == "scripts":
            create_file(dir_path / "example_script.py", "# TODO: Add your python scripts here\n\ndef main():\n    pass\n")
        elif dir_name == "references":
            create_file(dir_path / "example_reference.md", "# Example Reference\n\nAdd your reference documentation here.")
        elif dir_name == "assets":
            create_file(dir_path / ".gitkeep", "")

    logger.info(f"Skill '{skill_name}' initialized successfully at {base_path}")

def main():
    parser = argparse.ArgumentParser(description="Initialize a new skill structure.")
    parser.add_argument("name", help="The name of the skill (e.g., 'my-new-skill')")
    parser.add_argument("--path", default=".", help="The directory where the skill should be created (default: current directory)")
    
    args = parser.parse_args()
    
    try:
        init_skill(args.name, args.path)
    except Exception as e:
        logger.error(f"Failed to initialize skill: {e}")
        exit(1)

if __name__ == "__main__":
    main()
