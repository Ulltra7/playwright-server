export type JobRole = 
  | 'frontend_developer'
  | 'backend_developer'
  | 'fullstack_developer'
  | 'mobile_developer'
  | 'devops_engineer'
  | 'data_scientist'
  | 'ai_engineer'
  | 'qa_engineer'
  | 'designer'
  | 'it_manager';

interface RoleKeywords {
  titleKeywords: string[];
  techKeywords: string[];
}

export const JOB_ROLE_KEYWORDS: Record<JobRole, RoleKeywords> = {
  frontend_developer: {
    titleKeywords: ['frontend', 'front-end', 'front end', 'ui developer', 'react developer', 'angular developer', 'vue developer'],
    techKeywords: ['react', 'angular', 'vue', 'typescript', 'javascript', 'css', 'html', 'tailwind', 'nextjs', 'redux', 'webpack']
  },
  backend_developer: {
    titleKeywords: ['backend', 'back-end', 'back end', 'server', 'api developer', 'java developer', 'python developer', '.net developer', 'php developer'],
    techKeywords: ['node.js', 'nodejs', 'django', 'spring', 'express', 'fastapi', 'flask', 'laravel', 'rails', 'asp.net', 'postgresql', 'mysql', 'mongodb']
  },
  fullstack_developer: {
    titleKeywords: ['full stack', 'fullstack', 'full-stack'],
    techKeywords: ['react', 'node.js', 'mongodb', 'express', 'vue', 'angular', 'postgresql', 'mysql']
  },
  mobile_developer: {
    titleKeywords: ['mobile developer', 'ios developer', 'android developer', 'react native', 'flutter developer'],
    techKeywords: ['swift', 'kotlin', 'react native', 'flutter', 'ios', 'android', 'xcode', 'android studio']
  },
  devops_engineer: {
    titleKeywords: ['devops', 'devsecops', 'site reliability', 'sre', 'cloud engineer', 'infrastructure'],
    techKeywords: ['docker', 'kubernetes', 'terraform', 'aws', 'azure', 'gcp', 'jenkins', 'gitlab', 'ansible', 'helm', 'prometheus']
  },
  data_scientist: {
    titleKeywords: ['data scientist', 'data analyst', 'data engineer', 'analytics engineer'],
    techKeywords: ['pandas', 'numpy', 'tensorflow', 'pytorch', 'scikit-learn', 'spark', 'hadoop', 'sql', 'python', 'r', 'tableau']
  },
  ai_engineer: {
    titleKeywords: ['ai engineer', 'ml engineer', 'machine learning', 'deep learning', 'ai developer'],
    techKeywords: ['tensorflow', 'pytorch', 'scikit-learn', 'keras', 'opencv', 'nlp', 'llm', 'transformers', 'cuda']
  },
  qa_engineer: {
    titleKeywords: ['qa engineer', 'test engineer', 'quality assurance', 'automation engineer', 'sdet'],
    techKeywords: ['selenium', 'cypress', 'jest', 'playwright', 'puppeteer', 'testng', 'junit', 'postman', 'jmeter']
  },
  designer: {
    titleKeywords: ['ui designer', 'ux designer', 'product designer', 'web designer', 'visual designer'],
    techKeywords: ['figma', 'sketch', 'adobe xd', 'photoshop', 'illustrator', 'invision', 'zeplin', 'principle']
  },
  it_manager: {
    titleKeywords: ['it manager', 'tech lead', 'team lead', 'engineering manager', 'scrum master', 'product owner', 'technical lead'],
    techKeywords: ['agile', 'scrum', 'jira', 'confluence', 'project management']
  }
};