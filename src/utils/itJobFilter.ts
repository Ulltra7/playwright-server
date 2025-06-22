
// Keywords that strongly indicate IT/Tech jobs
const IT_KEYWORDS = [
  // Programming languages
  "javascript",
  "typescript",
  "python",
  "java",
  "c#",
  "c++",
  "php",
  "ruby",
  "go",
  "golang",
  "rust",
  "kotlin",
  "swift",
  "scala",
  "r programming",
  "matlab",
  "perl",
  "bash",
  "powershell",

  // Web technologies
  "react",
  "angular",
  "vue",
  "node.js",
  "nodejs",
  "django",
  "flask",
  "rails",
  "laravel",
  "spring",
  "asp.net",
  ".net",
  "jquery",
  "webpack",

  // IT roles
  "developer",
  "entwickler",
  "programmer",
  "programmierer",
  "software engineer",
  "software-engineer",
  "web developer",
  "frontend",
  "backend",
  "full stack",
  "fullstack",
  "data scientist",
  "data engineer",
  "machine learning",
  "ml engineer",
  "ai engineer",
  "devops engineer",
  "cloud engineer",
  "sre",
  "qa engineer",
  "test engineer",

  // Technologies & concepts
  "api",
  "microservices",
  "blockchain",
  "machine learning",
  "artificial intelligence",
  "data science",
  "big data",
  "cloud",
  "aws",
  "azure",
  "docker",
  "kubernetes",
  "git",
  "agile",
  "scrum",
  "linux",
  "database",
  "sql",
  "mongodb",
  "redis",
];

// Strong indicators of NON-IT jobs
const NON_IT_KEYWORDS = [
  // Construction & Trades
  "Bauleiter",
  "Construction Manager",
  "Bauingenieur",
  "Civil Engineer",
  "Baggerfahrer",
  "Excavator Operator",
  "Maurer",
  "Mason",
  "Bauhelfer",
  "Construction Helper",
  "Anlagenmechaniker",
  "Plant Mechanic",
  "Polier",
  "Foreman in Construction",
  "Fliesenleger",
  "Tiler",
  "Bauüberwacher",
  "Tiefbau",
  "Glasfaser",
  "Bauoberleitung",

  // Mechanical & Technical (non-IT)
  "Augenoptikermeister/in",
  "Optician Master",
  "Kfz-Mechaniker",
  "Automotive Mechanic",
  "Kfz-Mechatroniker",
  "Automotive Mechatronics Technician",
  "Elektriker",
  "Elektroniker",
  "Industriemechaniker",
  "Industrial Mechanic",
  "Tischler/Holzmechaniker",
  "Carpenter/Wood Mechanic",
  "Schlosser",
  "Locksmith/Metal Worker",
  "Servicetechniker SHK",
  "Service Technician for Heating, Sanitation, Air Conditioning",

  // Transportation
  "Lokführer",
  "Train Driver",
  "Triebfahrzeugführer",
  "Locomotive Driver",

  // Service & Hospitality
  "Servicekraft im Ausschank",
  "Service Staff in Beverage Service",

  // Sales & Customer Service
  "Verkaufsmitarbeiter",
  "Sales Employee",
  "Sales Manager",
  "Customer Service Representative",
  "Sales Representative",
  "Vertriebsmitarbeiter",
  "Kundenberater",
  "Customer Advisor",

  // Marketing & Media (non-technical)
  "Artist Manager",
  "Influencer Manager",
  "Marketing Manager",
  "Content Creator",
  "Social Media Manager",
  "Video Editor",
  "Graphic Designer",
  "Event Manager",
  "Eventmanager",
  "Fotograf",
  "Photographer",

  // Finance & Accounting
  "Accountant",
  "Buchhalter",
  "Tax Consultant",
  "Financial Advisory",
  "Finance Manager",
  "Finance",
  "Controller",
  "Controlling",
  "Finanzbuchhaltung",
  "Buchhaltung",
  "Finanz",
  "Rechnungswesen",
  "Accounting",
  "Treasury",
  "Wirtschaftsprüfer",
  "Steuerberater",

  // HR & Recruitment
  "HR Specialist",
  "Recruiter",
  "Talent Acquisition",
  "Personalreferent",

  // Business & Operations
  "Business Development Manager",
  "Project Manager",
  "Logistics Coordinator",
  "Quality Manager",
  "Operations Manager",
];

/**
 * Check if a job is IT-related
 * @returns true if the job should be kept (is IT-related), false if it should be filtered out
 */
export function isITJob(
  title: string,
  description?: string,
  technologies?: string[]
): boolean {
  const titleLower = title.toLowerCase();
  const descriptionLower = (description || "").toLowerCase();
  const combinedText = `${titleLower} ${descriptionLower}`;

  // Quick wins - if it has technologies listed, it's likely IT
  if (technologies && technologies.length > 0) {
    return true;
  }

  // Check for strong IT indicators in title
  const itTitleKeywords = [
    "developer",
    "engineer",
    "programmer",
    "software",
    "data",
    "devops",
    "frontend",
    "backend",
    "fullstack",
    "full-stack",
    "qa",
    "test",
    "architect",
    "admin",
    "administrator",
    "analyst",
  ];

  if (itTitleKeywords.some((keyword) => titleLower.includes(keyword))) {
    // Double-check it's not a non-IT variant (e.g., "civil engineer")
    const nonITQualifiers = [
      "civil",
      "mechanical",
      "electrical",
      "chemical",
      "industrial",
    ];
    if (!nonITQualifiers.some((qualifier) => titleLower.includes(qualifier))) {
      return true;
    }
  }

  // Count IT vs non-IT keywords
  let itScore = 0;
  let nonItScore = 0;

  // Count IT keywords
  for (const keyword of IT_KEYWORDS) {
    if (combinedText.includes(keyword)) {
      itScore++;
    }
  }

  // Count non-IT keywords
  for (const keyword of NON_IT_KEYWORDS) {
    if (titleLower.includes(keyword.toLowerCase())) {
      nonItScore += 2; // Title matches are stronger indicators
    } else if (descriptionLower.includes(keyword.toLowerCase())) {
      nonItScore++;
    }
  }

  // Decision logic
  if (itScore >= 3) return true; // Strong IT indication
  if (nonItScore >= 2 && itScore === 0) return false; // Strong non-IT indication
  if (itScore > nonItScore) return true; // More IT than non-IT indicators

  // For edge cases, default to including if we have any IT indicators
  return itScore > 0;
}

/**
 * Filter an array of jobs to keep only IT-related ones
 */
export function filterJobs<
  T extends { title: string; description?: string; technologies?: string[] }
>(
  jobs: T[]
): {
  itJobs: T[];
  filteredOut: Array<{ job: T; reason: string }>;
} {
  const itJobs: T[] = [];
  const filteredOut: Array<{ job: T; reason: string }> = [];

  for (const job of jobs) {
    if (isITJob(job.title, job.description, job.technologies)) {
      itJobs.push(job);
    } else {
      // Determine specific reason for filtering
      let reason = "Not identified as IT job";
      const titleLower = job.title.toLowerCase();

      for (const keyword of NON_IT_KEYWORDS) {
        if (titleLower.includes(keyword.toLowerCase())) {
          reason = `Non-IT job type: ${keyword}`;
          break;
        }
      }

      filteredOut.push({ job, reason });
    }
  }

  return { itJobs, filteredOut };
}
