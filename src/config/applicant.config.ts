export interface ApplicantInfo {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  linkedIn?: string;
  github?: string;
  portfolio?: string;
  cvPath: string;
  coverLetterString: string;
}

export const applicantConfig: ApplicantInfo = {
  firstName: "Johannes",
  lastName: "Ull",
  fullName: "Ull",
  email: "johannes.ull.dev@gmail.com",
  phoneNumber: "+41 78 220 46 12",
  address: {
    street: "Your Street",
    city: "Your City",
    postalCode: "XXXX",
    country: "Switzerland",
  },
  linkedIn: "https://linkedin.com/in/your-profile",
  github: "https://github.com/ulltra7",
  portfolio: "https://your-portfolio.com",
  cvPath: "/data/CV.pdf",
  coverLetterString: `
Hello,
I am writing to express my interest in the software developer position at your company. With 8 years of extensive experience in full-stack development, a strong background in architecting and delivering complex software solutions, and a proven ability to drive significant impact, I am confident I can be an immediate and valuable contributor to your team.

My career has been defined by taking ownership of challenging projects and delivering high-performance, scalable solutions across diverse domains. At Ulltra Software Sarl, I architected and developed a full-lifecycle AI research platform for TUM Munich, enabling automated data preparation and novel idea generation through integrated generative AI. This experience demonstrates my capability to build sophisticated end-to-end systems from conception to deployment. Furthermore, my role in leading the comprehensive re-architecture of a financial market maker's core trading web application resulted in a tenfold performance boost, showcasing my expertise in optimizing critical systems.

I also bring significant experience from roles at Draftbit Inc., where I engineered core GraphQL/TypeScript backend services for their leading low-code mobile app builder, managing dynamic component structures, and at 21Shares AG, where I led frontend development for an internal order management system handling millions in daily trading volume for the world's largest crypto ETP issuer. My proficiency across technologies including React, Node.js, Python, GraphQL, and TypeScript, combined with this diverse project experience, uniquely positions me to handle the technical breadth required for this role and ensure the delivery of high-quality software.

Thank you for considering my application. I have attached my CV for your review and welcome the opportunity to discuss how my skills and experience can benefit [Company Name] in a dedicated interview.

Sincerely, Johannes Ull
`,
};
