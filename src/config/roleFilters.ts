// Role filter configuration for frontend
// Groups related job roles together for easier filtering

export interface RoleFilterGroup {
  key: string;
  displayName: string;
  description: string;
  roleNames: string[]; // job_roles.name values from database
  icon?: string; // Optional icon name for UI
}

export const ROLE_FILTER_GROUPS: RoleFilterGroup[] = [
  {
    key: 'frontend',
    displayName: 'Frontend Developer',
    description: 'Client-side web development roles',
    roleNames: ['frontend_developer'],
    icon: 'CodeBracketIcon'
  },
  {
    key: 'backend',
    displayName: 'Backend Developer',
    description: 'Server-side development roles',
    roleNames: ['backend_developer', 'fullstack_developer'],
    icon: 'ServerIcon'
  },
  {
    key: 'mobile',
    displayName: 'Mobile Developer',
    description: 'iOS and Android development',
    roleNames: ['mobile_developer'],
    icon: 'DevicePhoneMobileIcon'
  },
  {
    key: 'data',
    displayName: 'Data & AI',
    description: 'Data science, engineering, and AI/ML roles',
    roleNames: ['data_scientist', 'data_engineer', 'ai_ml_engineer', 'data_analyst'],
    icon: 'ChartBarIcon'
  },
  {
    key: 'management',
    displayName: 'IT Management',
    description: 'Technical leadership and management roles',
    roleNames: ['it_manager', 'project_manager', 'product_manager', 'scrum_master'],
    icon: 'UsersIcon'
  },
  {
    key: 'devops',
    displayName: 'DevOps & Cloud',
    description: 'Infrastructure and deployment roles',
    roleNames: ['devops_engineer', 'site_reliability_engineer', 'cloud_architect'],
    icon: 'CloudIcon'
  },
  {
    key: 'qa',
    displayName: 'QA & Testing',
    description: 'Quality assurance and testing roles',
    roleNames: ['qa_engineer', 'test_automation_engineer', 'sdet'],
    icon: 'BeakerIcon'
  },
  {
    key: 'design',
    displayName: 'Design',
    description: 'UI/UX and visual design roles',
    roleNames: ['ux_ui_designer', 'product_designer', 'graphic_designer'],
    icon: 'PaintBrushIcon'
  },
  {
    key: 'security',
    displayName: 'Security',
    description: 'Cybersecurity and information security roles',
    roleNames: ['security_engineer', 'security_analyst', 'penetration_tester'],
    icon: 'ShieldCheckIcon'
  }
];

// For the simplified view you requested, here are the main filters:
export const MAIN_ROLE_FILTERS: RoleFilterGroup[] = [
  {
    key: 'frontend',
    displayName: 'Frontend Developer',
    description: 'Client-side web development',
    roleNames: ['frontend_developer']
  },
  {
    key: 'backend',
    displayName: 'Backend Developer',
    description: 'Server-side development',
    roleNames: ['backend_developer', 'fullstack_developer']
  },
  {
    key: 'mobile',
    displayName: 'Mobile Developer',
    description: 'iOS and Android development',
    roleNames: ['mobile_developer']
  },
  {
    key: 'data',
    displayName: 'Data Scientist',
    description: 'Data science, AI/ML, and data engineering',
    roleNames: ['data_scientist', 'data_engineer', 'ai_ml_engineer']
  },
  {
    key: 'management',
    displayName: 'IT Manager',
    description: 'Product, project management and leadership',
    roleNames: ['it_manager', 'project_manager', 'product_manager', 'scrum_master']
  },
  {
    key: 'designer',
    displayName: 'Designer',
    description: 'UI/UX and visual design',
    roleNames: ['ux_ui_designer']
  }
];