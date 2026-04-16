import { db, careerPathsTable, rolesTable, competenciesTable } from "@workspace/db";

async function seed() {
  const existing = await db.select().from(careerPathsTable).limit(1);
  if (existing.length > 0) {
    console.log("Data already seeded, skipping.");
    process.exit(0);
  }

  // Career paths
  const [engineering] = await db.insert(careerPathsTable).values([
    { name: "Engineering", description: "Software engineering individual contributor track from Junior to Principal Engineer." },
  ]).returning();

  const [product] = await db.insert(careerPathsTable).values([
    { name: "Product Management", description: "Product management track from Associate PM to VP of Product." },
  ]).returning();

  const [people] = await db.insert(careerPathsTable).values([
    { name: "People & HR", description: "HR and People Operations track from HR Coordinator to Chief People Officer." },
  ]).returning();

  // Engineering roles
  const [juniorEng] = await db.insert(rolesTable).values([
    { careerPathId: engineering.id, title: "Junior Software Engineer", level: 1, jobSpec: "As a Junior Software Engineer, you will work on well-defined tasks under the guidance of senior engineers. You are expected to learn quickly, write clean code, participate in code reviews, and collaborate effectively within the team. You will focus on individual feature development and bug fixing, building your technical foundation across our core stack." },
  ]).returning();

  const [midEng] = await db.insert(rolesTable).values([
    { careerPathId: engineering.id, title: "Software Engineer", level: 2, jobSpec: "As a Software Engineer, you take full ownership of features from design to delivery. You write robust, testable code, contribute meaningfully to technical discussions, mentor junior engineers, and proactively identify and resolve issues. You are expected to understand system design principles and make sound technical decisions independently within your domain." },
  ]).returning();

  const [seniorEng] = await db.insert(rolesTable).values([
    { careerPathId: engineering.id, title: "Senior Software Engineer", level: 3, jobSpec: "As a Senior Software Engineer, you lead technical initiatives, design complex systems, and set the quality bar for your team. You drive architectural decisions, actively mentor others, collaborate cross-functionally to align on technical direction, and contribute to engineering culture and processes. You are a go-to expert for difficult technical challenges." },
  ]).returning();

  const [staffEng] = await db.insert(rolesTable).values([
    { careerPathId: engineering.id, title: "Staff Engineer", level: 4, jobSpec: "As a Staff Engineer, you have a broad organisational impact. You identify and solve ambiguous, high-leverage technical problems that span multiple teams. You shape engineering strategy, define best practices, develop senior talent, and represent engineering in cross-functional leadership discussions. Your influence extends well beyond your direct team." },
  ]).returning();

  // Competencies for Junior Engineer
  await db.insert(competenciesTable).values([
    { roleId: juniorEng.id, name: "Code Quality", description: "Writes clean, readable, and maintainable code. Follows coding standards and best practices.", category: "Technical" },
    { roleId: juniorEng.id, name: "Debugging", description: "Can identify and fix bugs in their own code and simple existing code.", category: "Technical" },
    { roleId: juniorEng.id, name: "Version Control", description: "Uses Git effectively: commits, branches, pull requests, and resolves merge conflicts.", category: "Technical" },
    { roleId: juniorEng.id, name: "Testing", description: "Writes unit tests and understands the importance of test coverage.", category: "Technical" },
    { roleId: juniorEng.id, name: "Communication", description: "Clearly communicates progress, blockers, and asks for help when needed.", category: "Collaboration" },
    { roleId: juniorEng.id, name: "Receiving Feedback", description: "Accepts and acts on constructive feedback in a positive and growth-oriented way.", category: "Collaboration" },
    { roleId: juniorEng.id, name: "Learning Mindset", description: "Proactively seeks to learn new skills and technologies relevant to the team's work.", category: "Growth" },
  ]);

  // Competencies for Software Engineer (Mid)
  await db.insert(competenciesTable).values([
    { roleId: midEng.id, name: "System Design", description: "Designs components and services with consideration for scalability, reliability, and maintainability.", category: "Technical" },
    { roleId: midEng.id, name: "Code Review", description: "Provides constructive, thorough code reviews that improve quality and share knowledge.", category: "Technical" },
    { roleId: midEng.id, name: "Technical Estimation", description: "Accurately estimates effort and complexity, flagging risks proactively.", category: "Technical" },
    { roleId: midEng.id, name: "Test Strategy", description: "Designs effective test strategies including unit, integration, and e2e tests.", category: "Technical" },
    { roleId: midEng.id, name: "Feature Ownership", description: "Takes full ownership of features from scoping through delivery and post-launch monitoring.", category: "Delivery" },
    { roleId: midEng.id, name: "Cross-team Collaboration", description: "Works effectively with product, design, and other engineering teams to deliver outcomes.", category: "Collaboration" },
    { roleId: midEng.id, name: "Junior Mentoring", description: "Actively supports junior engineers through code review, pair programming, and guidance.", category: "Leadership" },
    { roleId: midEng.id, name: "Incident Response", description: "Responds to production incidents calmly, diagnoses root cause, and implements fixes.", category: "Technical" },
  ]);

  // Competencies for Senior Engineer
  await db.insert(competenciesTable).values([
    { roleId: seniorEng.id, name: "Architecture Design", description: "Designs robust, scalable, and pragmatic system architectures for complex problems.", category: "Technical" },
    { roleId: seniorEng.id, name: "Technical Leadership", description: "Sets technical direction for the team, making and communicating sound architectural decisions.", category: "Leadership" },
    { roleId: seniorEng.id, name: "Mentorship", description: "Actively develops the skills of mid and junior engineers through coaching, sponsorship, and structured guidance.", category: "Leadership" },
    { roleId: seniorEng.id, name: "Delivery Execution", description: "Consistently delivers complex projects on time, managing risks and dependencies effectively.", category: "Delivery" },
    { roleId: seniorEng.id, name: "Cross-functional Influence", description: "Influences product and design decisions with engineering perspective, aligning technical and business goals.", category: "Collaboration" },
    { roleId: seniorEng.id, name: "Engineering Standards", description: "Drives adoption of best practices, tooling, and processes that raise the bar for the whole team.", category: "Technical" },
    { roleId: seniorEng.id, name: "Ambiguity Handling", description: "Navigates and structures ambiguous problems, breaking them down into actionable engineering plans.", category: "Delivery" },
    { roleId: seniorEng.id, name: "Stakeholder Communication", description: "Communicates technical concepts clearly to non-technical stakeholders, building trust and alignment.", category: "Collaboration" },
  ]);

  // Competencies for Staff Engineer
  await db.insert(competenciesTable).values([
    { roleId: staffEng.id, name: "Organisational Impact", description: "Identifies and solves problems that have a significant, measurable impact across multiple teams or the whole engineering organisation.", category: "Impact" },
    { roleId: staffEng.id, name: "Engineering Strategy", description: "Contributes to and shapes the multi-year engineering roadmap and technology strategy.", category: "Strategy" },
    { roleId: staffEng.id, name: "Executive Communication", description: "Communicates complex technical trade-offs and recommendations to senior leadership and executives.", category: "Communication" },
    { roleId: staffEng.id, name: "Senior Talent Development", description: "Actively develops senior and principal engineers, creating leverage for the organisation.", category: "Leadership" },
    { roleId: staffEng.id, name: "Platform Thinking", description: "Designs systems and platforms that enable the whole engineering organisation to move faster.", category: "Technical" },
    { roleId: staffEng.id, name: "Industry Awareness", description: "Stays current with industry trends, evaluates new technologies, and brings relevant insights back to the organisation.", category: "Strategy" },
    { roleId: staffEng.id, name: "Culture Building", description: "Actively shapes engineering culture through writing, speaking, processes, and exemplary behaviour.", category: "Leadership" },
  ]);

  // Product Management roles
  const [apm] = await db.insert(rolesTable).values([
    { careerPathId: product.id, title: "Associate Product Manager", level: 1, jobSpec: "As an Associate Product Manager, you support senior PMs in defining and delivering product features. You conduct user research, write detailed product specifications, manage backlogs, and collaborate with engineering and design to ship high-quality products. You are developing your instinct for prioritisation and your ability to translate user needs into product requirements." },
  ]).returning();

  const [pm] = await db.insert(rolesTable).values([
    { careerPathId: product.id, title: "Product Manager", level: 2, jobSpec: "As a Product Manager, you own one or more product areas end to end. You develop product strategy, prioritise the roadmap, deeply understand your users, and drive cross-functional teams to deliver impactful outcomes. You measure success with data, communicate confidently with stakeholders, and balance short-term delivery with long-term vision." },
  ]).returning();

  const [seniorPM] = await db.insert(rolesTable).values([
    { careerPathId: product.id, title: "Senior Product Manager", level: 3, jobSpec: "As a Senior Product Manager, you lead a significant product area with strong business impact. You define the vision, align stakeholders at all levels, and manage a team of PMs. You demonstrate commercial acumen, influence company strategy through your domain expertise, and grow the capabilities of those around you." },
  ]).returning();

  // Competencies for APM
  await db.insert(competenciesTable).values([
    { roleId: apm.id, name: "User Research", description: "Conducts structured user interviews, usability tests, and surveys to gather insights.", category: "Discovery" },
    { roleId: apm.id, name: "Spec Writing", description: "Writes clear, detailed, and unambiguous product specifications and user stories.", category: "Delivery" },
    { roleId: apm.id, name: "Backlog Management", description: "Maintains a prioritised, groomed backlog with clear rationale for prioritisation decisions.", category: "Delivery" },
    { roleId: apm.id, name: "Stakeholder Communication", description: "Clearly communicates product decisions and progress to stakeholders.", category: "Collaboration" },
    { roleId: apm.id, name: "Data Literacy", description: "Can define and track relevant metrics, and interpret data to inform product decisions.", category: "Discovery" },
  ]);

  // Competencies for PM
  await db.insert(competenciesTable).values([
    { roleId: pm.id, name: "Product Strategy", description: "Develops a coherent product strategy tied to business goals and user needs.", category: "Strategy" },
    { roleId: pm.id, name: "Roadmap Ownership", description: "Creates and maintains a compelling product roadmap with clear priorities and dependencies.", category: "Delivery" },
    { roleId: pm.id, name: "Cross-functional Leadership", description: "Effectively leads engineering, design, and data teams toward shared outcomes without direct authority.", category: "Leadership" },
    { roleId: pm.id, name: "Commercial Awareness", description: "Understands the business model, competitive landscape, and how the product drives commercial outcomes.", category: "Strategy" },
    { roleId: pm.id, name: "Customer Empathy", description: "Demonstrates deep understanding of customer needs and advocates for the user in all decisions.", category: "Discovery" },
    { roleId: pm.id, name: "Prioritisation", description: "Makes clear, defensible prioritisation decisions balancing user value, business impact, and technical effort.", category: "Delivery" },
  ]);

  // Competencies for Senior PM
  await db.insert(competenciesTable).values([
    { roleId: seniorPM.id, name: "Vision Setting", description: "Articulates an inspiring, compelling product vision that aligns the organisation around a shared direction.", category: "Strategy" },
    { roleId: seniorPM.id, name: "Executive Influence", description: "Influences executive decisions through clear, evidence-based recommendations and strategic thinking.", category: "Leadership" },
    { roleId: seniorPM.id, name: "Team Management", description: "Manages and develops a team of product managers, setting goals and supporting their growth.", category: "Leadership" },
    { roleId: seniorPM.id, name: "Market Expertise", description: "Recognised as a domain expert with deep understanding of the market, customers, and competitive dynamics.", category: "Strategy" },
    { roleId: seniorPM.id, name: "OKR Ownership", description: "Owns team OKRs and drives accountability for outcomes across the product area.", category: "Delivery" },
    { roleId: seniorPM.id, name: "Stakeholder Management", description: "Manages complex, sometimes conflicting stakeholder relationships across the business.", category: "Leadership" },
  ]);

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
