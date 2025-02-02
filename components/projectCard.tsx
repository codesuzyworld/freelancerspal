"use client";

import Link from "next/link";

// Define the Project interface
interface Project {
  projectID: string;
  projectName: string;
  projectDesc: string;
  projectTags: string;
  imageUrl: string | null;
  created_at: string;
}

// Get response from Supabase, Either an array of projects or null
interface ProjectCardProps {
  projects: Project[] | null;
}



// Project Card Component
export default function ProjectCard({ projects }: ProjectCardProps) {  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
      {projects?.map((project) => (
        <Link href={`/project/${project.projectID}`} key={project.projectID} 
              className="max-w-30">
          <div className="bg-projectcard text-card-foreground h-[450px] rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
            {/* Project Image */}
            {project.imageUrl ? (
              <img 
                className="w-full h-48 object-cover flex-shrink-0" 
                src={project.imageUrl} 
                alt={project.projectName} 
              />
            ) : (
              <div className="w-full h-48 bg-muted flex-shrink-0" />
            )}

            {/* Project Details*/}
            <div className="flex-1 px-6 py-4 flex flex-col">
              <div className="font-bold text-xl mb-2">{project.projectName}</div>
              <p className="text-muted-foreground">
                {new Date(project.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>

              {/* Tags */}
              <div className="pt-4 pb-2">
                {project.projectTags
                  .split(',')
                  .map((tag: string, index: number) => (
                    <span key={index}
                          className="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2">
                      #{tag.trim()}
                    </span>
                ))}
              </div>  

              {/* Description*/}
              <p className="text-foreground text-base flex-1 overflow-y-auto">
                {project.projectDesc}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>  
  );
}

