export interface Project {
  id: string;
  title: string;
  category: string;
  year: string;
  description: string;
  role: string;
  tools: string[];
  url?: string;
  sample: boolean;
}
export interface Portfolio {
  sample: boolean;
  name: string;
  role: string;
  introduction: string;
  biography: string;
  skills: string[];
  resumeUrl?: string;
  links: { label: string; url?: string; detail: string }[];
  projects: Project[];
}
// Replace this module with your own content. Optional URLs stay unavailable until supplied.
export const portfolio: Portfolio = {
  sample: true,
  name: "Steve Tang",
  role: "Your title goes here",
  introduction: "A little about the person behind the desktop.",
  biography:
    "This is a space for your story. Share what you do, what you care about, and the kind of work you want to put into the world. Replace this sample introduction with a few words that sound like you.",
  skills: ["Your specialty", "Your favorite tools", "What you’re learning"],
  links: [
    { label: "Email", detail: "Start a conversation" },
    { label: "GitHub", detail: "Explore the source" },
    { label: "LinkedIn", detail: "Connect professionally" },
  ],
  projects: [
    {
      id: "selected",
      title: "Selected Work",
      category: "Case study",
      year: "Sample",
      description:
        "Give a project a home here. Introduce the problem, walk through your contribution, and show what changed. This is sample content, ready for your first case study.",
      role: "Your contribution",
      tools: ["Research", "Design", "Development"],
      sample: true,
    },
    {
      id: "experiments",
      title: "Experiments",
      category: "Creative exploration",
      year: "Sample",
      description:
        "A place for the ideas you built just to see what would happen. Add a prototype, a weekend project, or an interaction you couldn’t stop thinking about.",
      role: "Your contribution",
      tools: ["Prototyping", "Interaction"],
      sample: true,
    },
    {
      id: "open-source",
      title: "Open Source",
      category: "Development",
      year: "Sample",
      description:
        "Share a tool, library, or contribution you’re proud of. Explain how it works, why you made it, and where someone can try it for themselves.",
      role: "Your contribution",
      tools: ["Code", "Documentation"],
      sample: true,
    },
  ],
};
