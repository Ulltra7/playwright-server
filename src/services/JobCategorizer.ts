export type JobCategory = 
  | 'frontend_developer'
  | 'backend_developer'
  | 'fullstack_developer'
  | 'ai_engineer'
  | 'data_scientist'
  | 'it_manager'
  | 'designer'
  | 'devops_engineer'
  | 'mobile_developer'
  | 'qa_engineer'
  | 'other_it'
  | 'non_it';

export class JobCategorizer {
  // Keywords for each job category
  private readonly CATEGORY_KEYWORDS = {
    frontend_developer: {
      title: ['frontend', 'front-end', 'ui developer', 'react developer', 'angular developer', 'vue developer', 'web developer'],
      technologies: ['react', 'angular', 'vue', 'svelte', 'javascript', 'typescript', 'html', 'css', 'sass', 'tailwind', 'bootstrap', 'jquery', 'webpack', 'next.js', 'nuxt', 'gatsby'],
      weight: 1.5
    },
    backend_developer: {
      title: ['backend', 'back-end', 'server', 'api developer', 'java developer', 'python developer', 'php developer', 'node developer'],
      technologies: ['node.js', 'express', 'django', 'flask', 'spring', 'laravel', '.net', 'ruby on rails', 'fastapi', 'nest.js', 'golang', 'rust', 'sql', 'postgresql', 'mysql', 'mongodb'],
      weight: 1.5
    },
    fullstack_developer: {
      title: ['full stack', 'fullstack', 'full-stack'],
      technologies: [], // Will match if has both frontend and backend techs
      weight: 2.0
    },
    ai_engineer: {
      title: ['ai engineer', 'ml engineer', 'machine learning', 'deep learning', 'ai developer', 'artificial intelligence'],
      technologies: ['tensorflow', 'pytorch', 'scikit-learn', 'keras', 'opencv', 'nlp', 'computer vision', 'neural network', 'llm', 'gpt', 'bert'],
      weight: 2.0
    },
    data_scientist: {
      title: ['data scientist', 'data analyst', 'data engineer', 'analytics engineer', 'bi developer', 'business intelligence'],
      technologies: ['pandas', 'numpy', 'jupyter', 'tableau', 'power bi', 'spark', 'hadoop', 'airflow', 'databricks', 'snowflake', 'dbt', 'etl'],
      weight: 2.0
    },
    it_manager: {
      title: ['it manager', 'tech lead', 'team lead', 'engineering manager', 'cto', 'technical manager', 'project manager', 'scrum master', 'product owner'],
      technologies: ['agile', 'scrum', 'kanban', 'jira', 'confluence'],
      weight: 1.8
    },
    designer: {
      title: ['ui designer', 'ux designer', 'ux/ui', 'product designer', 'web designer', 'graphic designer', 'interaction designer'],
      technologies: ['figma', 'sketch', 'adobe xd', 'photoshop', 'illustrator', 'invision', 'zeplin', 'framer'],
      weight: 1.5
    },
    devops_engineer: {
      title: ['devops', 'devsecops', 'site reliability', 'sre', 'cloud engineer', 'infrastructure', 'platform engineer'],
      technologies: ['docker', 'kubernetes', 'jenkins', 'gitlab', 'terraform', 'ansible', 'aws', 'azure', 'gcp', 'helm', 'prometheus', 'grafana'],
      weight: 1.8
    },
    mobile_developer: {
      title: ['mobile developer', 'ios developer', 'android developer', 'react native', 'flutter developer'],
      technologies: ['swift', 'kotlin', 'react native', 'flutter', 'ionic', 'xamarin', 'objective-c', 'java', 'android', 'ios'],
      weight: 1.5
    },
    qa_engineer: {
      title: ['qa engineer', 'test engineer', 'quality assurance', 'automation engineer', 'sdet'],
      technologies: ['selenium', 'cypress', 'jest', 'mocha', 'junit', 'testng', 'playwright', 'appium', 'postman', 'jmeter'],
      weight: 1.3
    }
  };

  // Non-IT indicators (stronger exclusion)
  private readonly NON_IT_KEYWORDS = {
    healthcare: ['nurse', 'doctor', 'physician', 'medical', 'patient', 'hospital', 'clinic', 'therapist', 'pharmacy'],
    retail: ['cashier', 'shop assistant', 'store manager', 'verkäufer', 'einzelhandel'],
    hospitality: ['waiter', 'waitress', 'bartender', 'barista', 'hotel', 'receptionist', 'cook', 'chef'],
    construction: ['carpenter', 'plumber', 'electrician', 'builder', 'handwerker'],
    education: ['teacher', 'tutor', 'kindergarten', 'daycare'], // Unless combined with IT terms
    logistics: ['driver', 'delivery', 'courier', 'warehouse', 'forklift']
  };

  /**
   * Categorize a job based on title, description, and technologies
   */
  categorizeJob(jobTitle: string, description: string = '', technologies: string[] = []): {
    category: JobCategory;
    confidence: number;
    scores: Record<string, number>;
  } {
    const titleLower = jobTitle.toLowerCase();
    const descLower = description.toLowerCase();
    const techsLower = technologies.map(t => t.toLowerCase());
    
    // Check for non-IT first
    const nonITScore = this.calculateNonITScore(titleLower, descLower);
    if (nonITScore > 2) {
      return {
        category: 'non_it',
        confidence: nonITScore / 3,
        scores: { non_it: nonITScore }
      };
    }

    // Calculate scores for each category
    const scores: Record<string, number> = {};
    
    for (const [category, keywords] of Object.entries(this.CATEGORY_KEYWORDS)) {
      let score = 0;
      
      // Title matching (highest weight)
      for (const titleKeyword of keywords.title) {
        if (titleLower.includes(titleKeyword)) {
          score += 3 * keywords.weight;
        }
      }
      
      // Technology matching
      for (const tech of techsLower) {
        if (keywords.technologies.some(kwTech => tech.includes(kwTech.toLowerCase()) || kwTech.toLowerCase().includes(tech))) {
          score += 1 * keywords.weight;
        }
      }
      
      // Description matching (lower weight)
      for (const techKeyword of keywords.technologies) {
        if (descLower.includes(techKeyword.toLowerCase())) {
          score += 0.5 * keywords.weight;
        }
      }
      
      scores[category] = score;
    }
    
    // Special handling for fullstack
    if (scores.frontend_developer > 2 && scores.backend_developer > 2) {
      scores.fullstack_developer = (scores.frontend_developer + scores.backend_developer) * 1.2;
    }
    
    // Find the best match
    let bestCategory: JobCategory = 'other_it';
    let bestScore = 0;
    
    for (const [category, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category as JobCategory;
      }
    }
    
    // If no strong match but has IT indicators, classify as other_it
    if (bestScore < 1 && this.hasITIndicators(titleLower, descLower, techsLower)) {
      bestCategory = 'other_it';
      bestScore = 1;
    }
    
    // Calculate confidence (0-1)
    const maxPossibleScore = 10; // Approximate max score
    const confidence = Math.min(bestScore / maxPossibleScore, 1);
    
    return {
      category: bestCategory,
      confidence,
      scores
    };
  }

  private calculateNonITScore(title: string, description: string): number {
    let score = 0;
    
    for (const [, keywords] of Object.entries(this.NON_IT_KEYWORDS)) {
      for (const keyword of keywords) {
        if (title.includes(keyword)) {
          score += 3;
        }
        if (description.includes(keyword)) {
          score += 1;
        }
      }
    }
    
    return score;
  }

  private hasITIndicators(title: string, description: string, technologies: string[]): boolean {
    const itIndicators = [
      'software', 'developer', 'engineer', 'programmer', 'coding', 'programming',
      'tech', 'it', 'digital', 'computer', 'system', 'application', 'web'
    ];
    
    const combinedText = `${title} ${description} ${technologies.join(' ')}`.toLowerCase();
    
    return itIndicators.some(indicator => combinedText.includes(indicator)) || technologies.length > 0;
  }

  /**
   * Get category display name
   */
  getCategoryDisplayName(category: JobCategory): string {
    const displayNames: Record<JobCategory, string> = {
      frontend_developer: 'Frontend Developer',
      backend_developer: 'Backend Developer',
      fullstack_developer: 'Full Stack Developer',
      ai_engineer: 'AI/ML Engineer',
      data_scientist: 'Data Scientist',
      it_manager: 'IT Manager/Lead',
      designer: 'UI/UX Designer',
      devops_engineer: 'DevOps Engineer',
      mobile_developer: 'Mobile Developer',
      qa_engineer: 'QA Engineer',
      other_it: 'Other IT',
      non_it: 'Non-IT'
    };
    
    return displayNames[category] || category;
  }
}