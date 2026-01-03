export const JOB_PREFERENCES = {
  // Remote work preferences
  remote: {
    preferred: ["remote", "hybrid"] as const,
    minRemoteDaysPerWeek: 4,
  },

  // Technologies - based on CV
  technologies: {
    primary: [
      "React",
      "Node.js",
      "TypeScript",
      "JavaScript",
      "Python",
      "Flutter",
      "GraphQL",
    ],
    secondary: [
      "Angular",
      "Vue.js",
      "MongoDB",
      "PostgreSQL",
      "Websockets",
      "Next.js",
      "React Native",
      "Playwright",
      "Web3",
      "Ethers.js",
    ],
    familiar: ["Java", "PHP", "Solidity"],
  },

  // Target roles
  roles: {
    target: ["frontend", "backend", "fullstack", "ai_engineer", "lead"],
    exclude: ["ml_engineer", "data_scientist", "devops", "qa"],
  },

  // Seniority - 8 years experience
  seniority: {
    minimum: "senior" as const,
    preferred: ["senior", "lead"] as const,
  },

  // Languages spoken
  languages: ["German", "English", "French"],

  // Domain experience (bonus points)
  preferredDomains: ["fintech", "trading", "crypto", "web3", "ai", "saas", "automation"],
};
