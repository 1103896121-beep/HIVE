
import { 
  Briefcase, BookOpen, PenTool, Dumbbell, Sparkles, 
  Music, Palette, Languages, FlaskConical, 
  GraduationCap, LayoutGrid, Hash, Code
} from 'lucide-react';

interface SubjectIconProps {
  name: string;
  size?: number;
  className?: string;
}

export function SubjectIcon({ name, size = 24, className = "" }: SubjectIconProps) {
  if (!name) return <Hash size={size} className={className} />;
  
  const n = name.toLowerCase();
  
  if (n.includes('work') || n.includes('工作')) return <Briefcase size={size} className={className} />;
  if (n.includes('study') || n.includes('学习')) return <BookOpen size={size} className={className} />;
  if (n.includes('writing') || n.includes('写作')) return <PenTool size={size} className={className} />;
  if (n.includes('fitness') || n.includes('健身')) return <Dumbbell size={size} className={className} />;
  if (n.includes('meditation') || n.includes('冥想') || n.includes('mind')) return <Sparkles size={size} className={className} />;
  if (n.includes('music') || n.includes('音乐')) return <Music size={size} className={className} />;
  if (n.includes('art') || n.includes('艺术') || n.includes('design')) return <Palette size={size} className={className} />;
  if (n.includes('language') || n.includes('语言') || n.includes('english')) return <Languages size={size} className={className} />;
  if (n.includes('science') || n.includes('科学') || n.includes('math')) return <FlaskConical size={size} className={className} />;
  if (n.includes('exam') || n.includes('备考') || n.includes('history')) return <GraduationCap size={size} className={className} />;
  if (n.includes('coding') || n.includes('编程')) return <Code size={size} className={className} />;
  if (n.includes('reading') || n.includes('阅读')) return <BookOpen size={size} className={className} />;
  if (n.includes('project') || n.includes('项目')) return <LayoutGrid size={size} className={className} />;
  
  // Default icon for Others or unmapped
  return <Hash size={size} className={className} />;
}
